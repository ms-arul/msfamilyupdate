<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 15</div>
    <h1>Encryption, Keys &amp; Audits SOP</h1>
    <div class="chapter-subtitle">Secrets Rotation, Key Management, and OWASP Auditing Guidelines</div>
</div>

## SOP-SEC-01: API Secrets &amp; Key Rotation

### 1. Purpose
Protects systems by regularly rotating API keys, database access tokens, and encryption keys.

### 2. Rotation Schedule

<!-- table: Cryptographic Key Rotations -->
| Key Type | Identifier | Frequency | Actions |
| :--- | :--- | :--- | :--- |
| **Supabase Anon Key** | `apikey` | 180 Days | Regenerate in dashboard, update Vercel environment. |
| **Google Gemini Key** | `VITE_GEMINI_API_KEY` | 90 Days | Generate in Google AI Studio, update Edge variables. |
| **JWT Signing Secret**| `JWT_SECRET` | 365 Days | Regenerate in Auth settings, invalidating current sessions. |

<div class="callout callout-security">
    <div class="callout-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></div>
    <div class="callout-content">
        <div class="callout-title">Secrets Safety Policy</div>
        <div>API keys must not be hardcoded in the codebase. Always load secrets from environment variables or a secure key management service.</div>
    </div>
</div>
