<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 13</div>
    <h1>Database &amp; Storage Backup SOP</h1>
    <div class="chapter-subtitle">Backup Schedules, pg_dump configurations, and Restore Validations</div>
</div>

## SOP-BCK-01: Automated Database Backup

### 1. Purpose
Protects against data loss by maintaining regular backups of the PostgreSQL database and storage configurations.

### 2. Backup Schedule

<!-- table: System Backup Schedules -->
| Target | Type | Frequency | Location | Retention |
| :--- | :--- | :--- | :--- | :--- |
| **Postgres Database** | Logical pg_dump | Daily at 01:00 UTC | AWS S3 Bucket | 30 Days |
| **Postgres Database** | Physical WAL | Continuous | AWS S3 Bucket | 7 Days |
| **Storage (Proofs)** | Sync Copy | Daily at 02:00 UTC | Secondary GCS Bucket | 90 Days |

### 3. Step-by-Step Restore Procedure
1. **Provision Test DB Instance:** Launch a clean PostgreSQL server in staging.
2. **Fetch Backup:** Download the target backup file from the S3 storage bucket.
3. **Execute Restore:**
   ```bash
   pg_restore --no-owner --clean -h localhost -U postgres -d staging_db backup_file.dump
   ```
4. **Data Verification:** Query row counts for verification.
