import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HMAC signature verification using native Deno / Web Crypto API
async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify", "sign"]
  );

  const msg = encoder.encode(`${orderId}|${paymentId}`);
  const sigBuffer = await crypto.subtle.sign("HMAC", key, msg);

  // Convert signature buffer to hex
  const sigArray = Array.from(new Uint8Array(sigBuffer));
  const sigHex = sigArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return sigHex === signature;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, ""); // normalize slashes

    // Initialize Supabase Client (Service Role client to perform secure DB writes)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables on server");
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error("Missing Razorpay API credentials on server");
    }

    // ── Endpoint: Create Order ──────────────────────────────────────────────
    if (path.endsWith("/create-order")) {
      const { plan_id, family_id, user_id } = await req.json();
      if (!plan_id) {
        return new Response(JSON.stringify({ error: "Missing plan_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Enforce Family Premium restrictions
      if (plan_id === "family_monthly" || plan_id === "family_yearly") {
        if (!family_id || !user_id) {
          return new Response(JSON.stringify({ error: "Family ID and User ID are required for Family Premium plans." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Query database to check if user is family admin
        const { data: memberData, error: memberError } = await supabase
          .from("family_members")
          .select("role")
          .eq("family_id", family_id)
          .eq("user_id", user_id)
          .maybeSingle();

        if (memberError || !memberData || memberData.role !== "admin") {
          return new Response(JSON.stringify({ error: "Only the Family Owner/Admin can purchase or manage Family Premium." }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Calculate price securely on the backend (prevents client-side spoofing)
      let amount = 0;
      if (plan_id === "personal_monthly") {
        amount = 900; // ₹9.00 in paise
      } else if (plan_id === "personal_yearly") {
        amount = 9900; // ₹99.00 in paise
      } else if (plan_id === "family_monthly") {
        amount = 2900; // ₹29.00 in paise
      } else if (plan_id === "family_yearly") {
        amount = 29900; // ₹299.00 in paise
      } else {
        return new Response(JSON.stringify({ error: "Invalid plan_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Call Razorpay Order API
      const authHeader = "Basic " + btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
      const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify({
          amount: amount,
          currency: "INR",
          receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        }),
      });

      if (!razorpayResponse.ok) {
        const errorText = await razorpayResponse.text();
        console.error("Razorpay order creation failed:", errorText);
        return new Response(
          JSON.stringify({ error: "Razorpay failed to create order", details: errorText }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const orderData = await razorpayResponse.json();
      return new Response(
        JSON.stringify({ order_id: orderData.id, amount: orderData.amount }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Endpoint: Verify Payment & Subscribe ────────────────────────────────
    if (path.endsWith("/verify-payment")) {
      const {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        plan_id,
        family_id,
        user_id,
      } = await req.json();

      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !plan_id || !user_id) {
        return new Response(JSON.stringify({ error: "Missing required verification fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1. Verify Razorpay Signature
      const isValid = await verifySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        razorpayKeySecret
      );

      if (!isValid) {
        return new Response(JSON.stringify({ error: "Invalid payment signature verification failed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Signature is valid! Activate subscription via Supabase Database Function
      // Note: subscribe_to_plan SQL function handles splitting family vs personal based on plan_id automatically now.
      const { data, error } = await supabase.rpc("subscribe_to_plan", {
        p_plan_id: plan_id,
        p_payment_method: "razorpay",
        p_payment_ref: razorpay_payment_id,
        p_family_id: family_id || null,
        p_user_id: user_id,
      });

      if (error) {
        console.error("Failed to activate subscription via RPC:", error);
        return new Response(JSON.stringify({ error: "Failed to activate subscription in DB", details: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default 404
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Request handling error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
