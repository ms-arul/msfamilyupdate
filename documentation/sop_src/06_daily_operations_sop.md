<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 06</div>
    <h1>Daily Operations Runbook</h1>
    <div class="chapter-subtitle">Daily System Health Checks and Log Auditing Procedures</div>
</div>

## SOP-OPS-01: Daily System Health Check

### 1. Purpose
Ensures core services (API endpoints, database pools, notification engines, and AI integrations) are operational.

### 2. Scope
Applies to production web apps, native bridges, and database connections.

### 3. Step-by-Step Procedure
1. **API Gateway Ping:** Ping the Supabase REST endpoint:
   ```bash
   curl -i -s -o /dev/null -w "%{http_code}" https://YOUR_SUPABASE_PROJECT.supabase.co/rest/v1/
   ```
   *Expected Result:* HTTP Code `200` or `401` (Unauthorized indicates endpoint is live but requires credentials).
2. **Database Connection Count:** Log into the Supabase Dashboard and check Postgres active clients.
   *Threshold limit:* Alert if connection utilization exceeds 85% of pool bounds.
3. **Storage Usage Check:** Run a storage directory size sweep:
   ```sql
   SELECT sum(size) FROM storage.objects WHERE bucket_id = 'proofs';
   ```
4. **Log Sweep:** Check Sentry dashboard for errors categorized as `Fatal` or `Error`.

<div class="callout callout-warning">
    <div class="callout-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div>
    <div class="callout-content">
        <div class="callout-title">Exception Handling</div>
        <div>If the REST endpoint returns HTTP 5xx, immediately route to the <a href="#14_disaster_recovery_sop">Disaster Recovery SOP</a>.</div>
    </div>
</div>
