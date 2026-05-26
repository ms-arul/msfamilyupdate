// Supabase Edge Function: daily-rates-push
// Fetches daily metal rates and broadcasts an FCM push notification to all users.
// Designed to be invoked via pg_cron on a daily schedule.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ─── Helpers for Rate Fetching ──────────────────────────────────────────────

async function getUsdToInr(): Promise<number> {
  try {
    const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
    if (!res.ok) throw new Error('Currency API failed');
    const data = await res.json();
    if (data && data.usd && data.usd.inr) {
      return data.usd.inr;
    }
    return 83; // Safe default
  } catch (error) {
    console.warn('Currency API failed, using default USD to INR = 83', error);
    return 83;
  }
}

async function smartFetch(url: string) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (response.ok) return await response.json();
    throw new Error('Direct fetch failed');
  } catch (e) {
    console.warn(`Direct fetch to ${url} failed, trying proxy...`);
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error('Proxy fetch failed');
    const data = await res.json();
    return typeof data.contents === 'string' ? JSON.parse(data.contents) : data;
  }
}

async function fetchLiveRates() {
  const [goldData, silverData] = await Promise.all([
    smartFetch("https://api.gold-api.com/price/XAU"),
    smartFetch("https://api.gold-api.com/price/XAG")
  ]);

  const goldUSD = goldData.price;
  const silverUSD = silverData.price;

  if (!goldUSD || !silverUSD) {
    throw new Error("Missing rate data from Gold-API");
  }

  const usdToInr = await getUsdToInr();

  const gold24 = (goldUSD / 31.1035) * usdToInr;
  const gold22 = gold24 * 0.916; 
  const silver = (silverUSD / 31.1035) * usdToInr;

  return {
    gold24: Math.round(gold24),
    gold22: Math.round(gold22),
    silver: parseFloat(silver.toFixed(2))
  };
}

// ─── FCM JWT Auth Helpers ───────────────────────────────────────────────────

function base64url(input: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...input));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlEncodeString(str: string): string {
  return base64url(new TextEncoder().encode(str));
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
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

async function createSignedJwt(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = { alg: "RS256", typ: "JWT" };
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

  const key = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = base64url(new Uint8Array(signature));
  return `${unsignedToken}.${encodedSignature}`;
}

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
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
    throw new Error(`OAuth2 token exchange failed: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req: Request) => {
  try {
    // 1. Fetch live rates
    console.log("Fetching live metal rates...");
    const rates = await fetchLiveRates();
    console.log(`Fetched rates: Gold(22K): ₹${rates.gold22}, Silver: ₹${rates.silver}`);

    // 2. Setup Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 3. Fetch all unique FCM tokens
    console.log("Fetching FCM tokens from database...");
    const { data: tokensData, error: tokenError } = await supabase
      .from('fcm_tokens')
      .select('token');

    if (tokenError) throw new Error(`Database error: ${tokenError.message}`);
    
    // Deduplicate tokens
    const tokens = [...new Set(tokensData?.map(t => t.token) || [])];
    if (tokens.length === 0) {
      return new Response(JSON.stringify({ message: "No FCM tokens found. Skipping." }), { status: 200 });
    }
    console.log(`Found ${tokens.length} unique tokens.`);

    // 4. Setup FCM Credentials
    const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
    const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");
    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");

    if (!clientEmail || !privateKey || !projectId) {
      throw new Error("Missing Firebase secrets in environment variables");
    }

    const accessToken = await getAccessToken(clientEmail, privateKey);
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    // 5. Construct Message
    const title = "Daily Metal Rates 🌟";
    const body = `Gold 22K: ₹${rates.gold22.toLocaleString('en-IN')}/g | Silver: ₹${rates.silver.toLocaleString('en-IN')}/g. Great time to save & invest!`;

    // 6. Broadcast Pushes
    console.log("Broadcasting push notifications...");
    let successCount = 0;
    let failureCount = 0;

    const results = await Promise.allSettled(
      tokens.map(async (token) => {
        const payload = {
          message: {
            token,
            notification: { title, body },
            data: { route: "/savings" }
          }
        };

        const res = await fetch(fcmUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(`FCM error for token ${token.substring(0, 10)}... : ${JSON.stringify(errData)}`);
        }
        
        return res.json();
      })
    );

    results.forEach(r => {
      if (r.status === 'fulfilled') successCount++;
      else {
        failureCount++;
        console.error(r.reason);
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Pushed daily rates. Success: ${successCount}, Failures: ${failureCount}`,
        rates
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Daily rates push failed:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
