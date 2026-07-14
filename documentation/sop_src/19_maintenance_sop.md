<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 19</div>
    <h1>Log Rotations &amp; DB Vacuum SOP</h1>
    <div class="chapter-subtitle">Regular Database Maintenance and Log Rotation Runbooks</div>
</div>

## SOP-MNT-01: PostgreSQL Database Maintenance

### 1. Purpose
Improves database query performance and manages storage space through regular database maintenance.

### 2. Step-by-Step Database Maintenance Runbook

<!-- table: Database Maintenance Actions -->
| Step | Action | Command | Frequency |
| :--- | :--- | :--- | :--- |
| **1** | Run VACUUM to reclaim space | `VACUUM (ANALYZE, VERBOSE) public.transactions;` | Weekly |
| **2** | Rebuild indexes to improve queries | `REINDEX TABLE public.transactions;` | Monthly |
| **3** | Clean up notification history | `DELETE FROM public.notifications WHERE created_at < now() - INTERVAL '90 days';` | Monthly |
| **4** | Archive historical sync logs | `COPY public.sync_logs TO PROGRAM 'gzip > sync_logs_archive.gz';` | Quarterly |

### 3. Recovery Steps: Query Lockups
If maintenance commands hang due to database lockups:
1. Find the blocking process PID:
   ```sql
   SELECT pid, query, state FROM pg_stat_activity WHERE state != 'idle';
   ```
2. Terminate the blocking query:
   ```sql
   SELECT pg_terminate_backend(BLOCKING_PID);
   ```
