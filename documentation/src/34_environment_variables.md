<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 34</div>
    <h1>Configuration &amp; Environments</h1>
    <div class="chapter-subtitle">Environment Variables, Deployment Modes, and Key Security</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the environment variables, settings, and key configurations.
    </div>
</div>

## Environment Variables Configuration

<!-- table: Environment Variables Registry -->
| Variable Name | Example Value | Description | Security Recommendation |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://x.supabase.co` | API URL for the Supabase instance. | Publicly visible in client bundle. |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Anonymous public API key. | Encrypted but visible in client bundle. |
| `VITE_GEMINI_API_KEY` | `AIzaSy...` | Developer API key for Google Gemini. | Should be routed through an Edge Function. |
| `FCM_SERVER_KEY` | `AAAA...` | Firebase Cloud Messaging server key. | **Keep Secret.** Store only in Edge Functions. |
| `CLERK_PUBLISHABLE_KEY` | `pk_live...` | Clerk authentication keys. | Publicly visible in client bundle. |
