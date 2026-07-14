<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 11</div>
    <h1>AI Gemini API Operations SOP</h1>
    <div class="chapter-subtitle">Prompt Versioning, Rate Limits, and Safety Validation Policies</div>
</div>

## SOP-AI-01: Prompt Deployment &amp; Recovery

### 1. Purpose
Manages changes to prompts and safety settings for the Gemini 2.5 Flash integrations.

### 2. Operational Boundaries

<!-- table: Gemini API Rate Limits -->
| Parameter | Threshold | Action |
| :--- | :--- | :--- |
| **Max Requests Per Minute** | 15 RPM | Throttle requests, route to local regex cache. |
| **Safety Threshold** | High Block | Return a generic validation error to the client. |
| **Retry Limit** | 3 Attempts | Fail over to local text extraction. |

<div class="callout callout-adr">
    <div class="callout-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div>
    <div class="callout-content">
        <div class="callout-title">ADR Reference: Gemini API Gateway</div>
        <div>All Gemini API calls are routed through Supabase Edge Functions. This hides API keys and provides a layer for rate-limiting. Detailed decisions are documented in <a href="#37_adr">ADR-003</a>.</div>
    </div>
</div>
