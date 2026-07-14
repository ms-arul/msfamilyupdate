<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 20</div>
    <h1>Runbook &amp; Troubleshooting Index</h1>
    <div class="chapter-subtitle">Operational Runbooks for Database Errors and API Connection Failures</div>
</div>

## Operational Runbook Directory

### Runbook 01: Database Connection Failures
* **Symptoms:** App displays `Database Connection Timeout` or returns HTTP `504` Gateway Timeout.
* **Possible Causes:** Database connection pool is exhausted, or the Supabase instance is down.
* **Resolution Steps:**
  1. Ping the database using PGAdmin or psql:
     ```bash
     psql -h db.YOUR_PROJECT.supabase.co -U postgres -d postgres -c "SELECT 1;"
     ```
  2. If the connection fails, check Supabase service status.
  3. If the connection succeeds but latency is high, check connection pool allocation:
     ```sql
     SELECT count(*), state FROM pg_stat_activity GROUP BY state;
     ```
  4. Terminate idle connections to free up slots in the pool.

---

### Runbook 02: WebRTC Audio Connection Failures
* **Symptoms:** VoIP calls disconnect immediately, or users experience silent calls.
* **Possible Causes:** NAT firewall is blocking connection paths, or ice candidates are failing.
* **Resolution Steps:**
  1. Verify STUN/TURN server configuration inside `CallContext.tsx`.
  2. Check ICE candidate exchange logs in WebRTC inspector.
  3. Fail back to public Google STUN server (`stun:stun.l.google.com:19302`) if necessary.
