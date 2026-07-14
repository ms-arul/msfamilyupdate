<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 31</div>
    <h1>Observability &amp; Monitoring</h1>
    <div class="chapter-subtitle">Error tracking, Edge function logs, and Query performance metrics</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the logging and diagnostic systems used to monitor application health.
    </div>
</div>

## 1. Monitoring Topology
Shows the flow of error logs from client to storage.

```mermaid
%% id: diag-monitoring
%% caption: System Monitoring & Observability Topology
graph TD
    App[Application Frontend] -->|Error events| Sentry[Sentry Error Tracking]
    EdgeFunc[Supabase Edge Functions] -->|Function logs| SupaLogs[Supabase Logging Platform]
    Database[(Postgres Instance)] -->|Query stats| DBMonitor[Postgres PG_STAT_STATEMENTS]
    
    Sentry --> Alert[Alert Manager / PagerDuty]
    SupaLogs --> Alert
    DBMonitor --> Alert
```
