// Supabase Edge Function: send-notification
// Sends push notifications via FCM HTTP v1 API using a Firebase Service Account.
// Secrets required: FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_PROJECT_ID

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// ─── CORS Headers ────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Helper: Base64url encode ────────────────────────────────────────────────
function base64url(input: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...input));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlEncodeString(str: string): string {
  return base64url(new TextEncoder().encode(str));
}

// ─── Helper: Import RSA private key for signing ─────────────────────────────
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Clean up PEM — handle escaped newlines from env vars
  const pemContent = pem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

// ─── Helper: Create a signed JWT for Google OAuth2 ──────────────────────────
async function createSignedJwt(
  clientEmail: string,
  privateKey: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: expiry,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const encodedHeader = base64urlEncodeString(JSON.stringify(header));
  const encodedPayload = base64urlEncodeString(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Sign with RSA-SHA256
  const key = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = base64url(new Uint8Array(signature));
  return `${unsignedToken}.${encodedSignature}`;
}

// ─── Helper: Exchange JWT for Google OAuth2 access token ────────────────────
async function getAccessToken(
  clientEmail: string,
  privateKey: string
): Promise<string> {
  const jwt = await createSignedJwt(clientEmail, privateKey);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OAuth2 token exchange failed (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  return data.access_token;
}

// ─── Main Handler ───────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // ── Parse request body ──────────────────────────────────────────────
    const { token, title, body, priority, data: dataPayload } = await req.json();

    if (!token || (!title && !body && !dataPayload)) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: token and (title/body or data)",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Load secrets from environment ───────────────────────────────────
    const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
    const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");
    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");

    if (!clientEmail || !privateKey || !projectId) {
      console.error("Missing Firebase secrets in environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Get OAuth2 access token ─────────────────────────────────────────
    const accessToken = await getAccessToken(clientEmail, privateKey);

    // ── Send FCM v1 push notification ───────────────────────────────────
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const isHighPriority = priority === 'high';

    const fcmPayload: any = {
      message: {
        token: token,
      },
    };

    if (title && body) {
      fcmPayload.message.notification = {
        title: title,
        body: body,
      };
      fcmPayload.message.android = {
        priority: isHighPriority ? 'HIGH' : 'NORMAL',
        notification: {
          channel_id: isHighPriority ? 'ms_family_calls' : 'ms_family_notifications',
          sound: isHighPriority ? 'call_receiving' : 'notification',
          default_vibrate_timings: false,
          vibrate_timings: ['0s', '0.3s', '0.2s', '0.3s'],
        },
      };
    } else {
      // Data-only background message
      fcmPayload.message.android = {
        priority: 'HIGH', // High priority required to bypass doze mode
      };
    }

    if (dataPayload) {
      // FCM v1 requires all values in data payload to be strings
      const stringifiedData: Record<string, string> = {};
      for (const [key, val] of Object.entries(dataPayload)) {
        stringifiedData[key] = typeof val === 'string' ? val : JSON.stringify(val);
      }
      fcmPayload.message.data = stringifiedData;
    }

    const fcmResponse = await fetch(fcmUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fcmPayload),
    });

    const fcmResult = await fcmResponse.json();

    if (!fcmResponse.ok) {
      console.error("FCM error:", JSON.stringify(fcmResult));
      return new Response(
        JSON.stringify({
          error: "FCM send failed",
          details: fcmResult,
        }),
        {
          status: 400, // Map all FCM failures to 400 Bad Request instead of forwarding 404/etc
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Success ─────────────────────────────────────────────────────────
    console.log("Push notification sent successfully:", fcmResult.name);
    return new Response(
      JSON.stringify({
        success: true,
        messageId: fcmResult.name,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err.message);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
