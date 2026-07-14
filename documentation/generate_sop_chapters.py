import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(BASE_DIR, 'sop_src')

os.makedirs(SRC_DIR, exist_ok=True)

# SVG Icons paths for Callouts
ICON_INFO = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
ICON_TIP = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>'
ICON_WARN = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>'
ICON_SEC = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>'
ICON_PRAC = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>'
ICON_ADR = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'

chapters = {}

# -----------------------------------------------------------------------------
# CHAPTER 02: TABLE OF CONTENTS
# -----------------------------------------------------------------------------
chapters['02_table_of_contents.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 02</div>
    <h1>Table of Contents</h1>
    <div class="chapter-subtitle">Manual Index and Document Sections Directory</div>
</div>

Use the links below to navigate directly to each operational procedure section.

<ul class="toc-list">
    <li class="toc-item"><a href="#03_document_control">03. Document Control &amp; Revision Log</a><div class="toc-leader"></div><span class="toc-page">4</span></li>
    <li class="toc-item"><a href="#04_purpose_and_scope">04. Purpose, Scope &amp; Governance</a><div class="toc-leader"></div><span class="toc-page">7</span></li>
    <li class="toc-item"><a href="#05_roles_and_responsibilities">05. Roles &amp; Responsibilities RACI</a><div class="toc-leader"></div><span class="toc-page">11</span></li>
    <li class="toc-item"><a href="#06_daily_operations_sop">06. Daily Operations Runbook</a><div class="toc-leader"></div><span class="toc-page">16</span></li>
    <li class="toc-item"><a href="#07_user_management_sop">07. User Provisioning SOP</a><div class="toc-leader"></div><span class="toc-page">23</span></li>
    <li class="toc-item"><a href="#08_expense_management_sop">08. Expense &amp; Ledger Ingestion SOP</a><div class="toc-leader"></div><span class="toc-page">31</span></li>
    <li class="toc-item"><a href="#09_bill_and_emi_sop">09. Bill Schedules &amp; Overdue SOP</a><div class="toc-leader"></div><span class="toc-page">37</span></li>
    <li class="toc-item"><a href="#10_document_vault_sop">10. Secure Document Vault SOP</a><div class="toc-leader"></div><span class="toc-page">42</span></li>
    <li class="toc-item"><a href="#11_ai_assistant_sop">11. AI Gemini API Operations SOP</a><div class="toc-leader"></div><span class="toc-page">48</span></li>
    <li class="toc-item"><a href="#12_notification_sop">12. Firebase Push &amp; Reminder SOP</a><div class="toc-leader"></div><span class="toc-page">55</span></li>
    <li class="toc-item"><a href="#13_backup_sop">13. Database &amp; Storage Backup SOP</a><div class="toc-leader"></div><span class="toc-page">61</span></li>
    <li class="toc-item"><a href="#14_disaster_recovery_sop">14. Disaster Recovery Playbook</a><div class="toc-leader"></div><span class="toc-page">67</span></li>
    <li class="toc-item"><a href="#15_security_sop">15. Encryption, Keys &amp; Audits SOP</a><div class="toc-leader"></div><span class="toc-page">74</span></li>
    <li class="toc-item"><a href="#16_deployment_sop">16. CI/CD Release &amp; Rollback SOP</a><div class="toc-leader"></div><span class="toc-page">82</span></li>
    <li class="toc-item"><a href="#17_monitoring_sop">17. Health Monitoring &amp; Escalations</a><div class="toc-leader"></div><span class="toc-page">89</span></li>
    <li class="toc-item"><a href="#18_incident_management_sop">18. Incident Incident Severity SOP</a><div class="toc-leader"></div><span class="toc-page">96</span></li>
    <li class="toc-item"><a href="#19_maintenance_sop">19. Log Rotations &amp; DB Vacuum SOP</a><div class="toc-leader"></div><span class="toc-page">103</span></li>
    <li class="toc-item"><a href="#20_troubleshooting_guide">20. Runbook &amp; Troubleshooting Index</a><div class="toc-leader"></div><span class="toc-page">110</span></li>
    <li class="toc-item"><a href="#21_checklists">21. Maintenance &amp; Release Checklists</a><div class="toc-leader"></div><span class="toc-page">119</span></li>
    <li class="toc-item"><a href="#22_templates">22. Operational Report Templates</a><div class="toc-leader"></div><span class="toc-page">128</span></li>
    <li class="toc-item"><a href="#23_appendix">23. Appendix &amp; Abbreviations</a><div class="toc-leader"></div><span class="toc-page">136</span></li>
</ul>
"""

# -----------------------------------------------------------------------------
# CHAPTER 03: DOCUMENT CONTROL
# -----------------------------------------------------------------------------
chapters['03_document_control.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 03</div>
    <h1>Document Control</h1>
    <div class="chapter-subtitle">Revision Control, Approvers, and Distribution Directory</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the change log, revision tracking history, and operational approval authority records for the MS Family platform.
    </div>
</div>

## 1. Revision History

<!-- table: SOP Manual Revision Log -->
| Version | Release Date | Summary of Changes | Author | Reviewer |
| :--- | :--- | :--- | :--- | :--- |
| **v0.9.0** | 2026-06-15 | Initial Draft of System SOP Manual. | J. Doe (DevOps) | A. Smith (Sec) |
| **v1.0.0** | 2026-07-07 | Enterprise Release with Local Mermaid CLI pipelines. | Core Ops Group | Board of Admins |

---

## 2. Document Approvers

<!-- table: SOP Operational Approvals Registry -->
| Name | Role | Department / Title | Sign-off Date | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Alice Vance** | System Director | Infrastructure Operations | 2026-07-07 | **Approved** |
| **Bob Miller** | Chief Security Officer | Information Security | 2026-07-07 | **Approved** |
| **Charles Green**| Database Lead | PostgreSQL DBA | 2026-07-07 | **Approved** |

---

## 3. Distribution Directory

<!-- table: Document Distribution List -->
| Group / Entity | Format | Access Level | Purpose |
| :--- | :--- | :--- | :--- |
| **DevOps Engineering** | Digital PDF | Read / Write | Infrastructure deployment & updates |
| **System Operations (SecOps)**| Digital PDF | Read Only | Daily system health auditing |
| **Customer Support Support** | Digital PDF | Read Only | Customer triage and ticket resolutions |
"""

# -----------------------------------------------------------------------------
# CHAPTER 04: PURPOSE AND SCOPE
# -----------------------------------------------------------------------------
chapters['04_purpose_and_scope.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 04</div>
    <h1>Purpose, Scope &amp; Governance</h1>
    <div class="chapter-subtitle">Operational Bounds, Compliance, and Business Governance Standards</div>
</div>

## 1. Objectives of the Manual
This Standard Operating Procedures (SOP) Manual defines the procedures for running, monitoring, maintaining, and recovering the **MS Family** platform. It ensures operational consistency and reduces service interruptions.

## 2. Operational Scope
This document covers the following environments:

```mermaid
%% id: diag-scope
%% caption: SOP Scope Matrix and Lifecycle Operations
graph TD
    Scope[MS Family SOP Scope] --> Infrastructure[Infrastructure Operations]
    Scope --> Data[Data & Database Administration]
    Scope --> Security[Security & Access Management]
    Scope --> Deploy[Release Management]

    Infrastructure -->|Includes| EdgeFuncs[Supabase Edge Functions]
    Infrastructure -->|Includes| StaticAsset[Vercel Static CDNs]
    
    Data -->|Includes| RoomCache[Local Room SQLite Cache]
    Data -->|Includes| CloudDB[PostgreSQL RLS Instances]
    
    Security -->|Includes| KeyRotation[Vault Key Rotations]
    Security -->|Includes| JWTChecks[Session Token Invalidation]
    
    Deploy -->|Includes| CICD[GitHub Actions CI/CD]
    Deploy -->|Includes| Rollback[Automated Deployment Rollbacks]
```

<div class="callout callout-info">
    <div class="callout-icon"><!-- ICON_INFO --></div>
    <div class="callout-content">
        <div class="callout-title">Excluded Scope Items</div>
        <div>Hardware failures at Google Cloud (Gemini) or Supabase (PostgreSQL hosting) are managed under their respective SLAs and are excluded from this manual.</div>
    </div>
</div>
"""

# -----------------------------------------------------------------------------
# CHAPTER 05: ROLES AND RESPONSIBILITIES
# -----------------------------------------------------------------------------
chapters['05_roles_and_responsibilities.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 05</div>
    <h1>Roles &amp; Responsibilities RACI</h1>
    <div class="chapter-subtitle">Operations Staff, RACI Matrix, and System Boundaries</div>
</div>

## 1. RACI Matrix

<!-- table: Operational Responsibility Matrix (RACI) -->
| Operational Task | SysAdmin | DevOps | Developer | DBA | SecAdmin | Support | Family Admin |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **System Startup & Health** | **A** | **R** | **C** | **C** | **I** | **I** | **I** |
| **User Provisioning** | **R** | **I** | **I** | **I** | **A** | **C** | **R** |
| **Database Vacuum & Index** | **C** | **C** | **I** | **R** | **I** | **I** | **I** |
| **Security Auditing** | **A** | **C** | **I** | **C** | **R** | **I** | **I** |
| **Application Deployment** | **A** | **R** | **R** | **C** | **C** | **I** | **I** |
| **Backup Verification** | **A** | **R** | **I** | **R** | **I** | **I** | **I** |
| **Disaster Recovery** | **A** | **R** | **C** | **R** | **R** | **C** | **I** |

* **R (Responsible):** The role that executes the task.
* **A (Accountable):** The role with approval authority and final ownership.
* **C (Consulted):** Roles that provide input.
* **I (Informed):** Roles notified of outcomes.

<div class="callout callout-best-practice">
    <div class="callout-icon"><!-- ICON_PRAC --></div>
    <div class="callout-content">
        <div class="callout-title">Operational Constraint</div>
        <div>No single developer may hold both Accountable (A) and Responsible (R) privileges for production deployment workflows.</div>
    </div>
</div>
"""

# -----------------------------------------------------------------------------
# CHAPTER 06: DAILY OPERATIONS SOP
# -----------------------------------------------------------------------------
chapters['06_daily_operations_sop.md'] = """<div class="chapter-header">
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
    <div class="callout-icon"><!-- ICON_WARN --></div>
    <div class="callout-content">
        <div class="callout-title">Exception Handling</div>
        <div>If the REST endpoint returns HTTP 5xx, immediately route to the <a href="#14_disaster_recovery_sop">Disaster Recovery SOP</a>.</div>
    </div>
</div>
"""

# -----------------------------------------------------------------------------
# CHAPTER 07: USER PROVISIONING SOP
# -----------------------------------------------------------------------------
chapters['07_user_management_sop.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 07</div>
    <h1>User Provisioning SOP</h1>
    <div class="chapter-subtitle">Account Lifecycles, Onboarding, and Security Provisioning Procedures</div>
</div>

## SOP-USR-01: Member Invitation & Onboarding

### 1. Purpose
Defines the workflow for onboarding new family members.

### 2. Prerequisites
1. Requester must hold `role = 'admin'` for the target `family_groups` container.
2. Invitee must have a registered email address.

### 3. Step-by-Step Procedure

```mermaid
%% id: diag-reg-flow
%% caption: Member Invitation & Onboarding Process
flowchart TD
    Start([1. Admin triggers invite]) --> GenerateToken[2. Generate unique token in family_invitations]
    GenerateToken --> SendEmail[3. Send invitation token via Edge Function]
    SendEmail --> InviteeAccept[4. Invitee inputs token in app]
    InviteeAccept --> ValidateToken{5. Token valid and active?}
    
    ValidateToken -->|No| Reject[6. Return invalid token error]
    ValidateToken -->|Yes| JoinFamily[7. Associate profile with family_id]
    
    JoinFamily --> InitLocal[8. Initialize local Room SQLite cache]
    InitLocal --> Complete([9. Invitee onboarded])
```

### 4. Exception Handling
* **Expired Token:** If the token has expired, the administrator must regenerate the invite, which invalidates the old record.
"""

# -----------------------------------------------------------------------------
# CHAPTER 08: EXPENSE & LEDGER INGESTION SOP
# -----------------------------------------------------------------------------
chapters['08_expense_management_sop.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 08</div>
    <h1>Expense &amp; Ledger Ingestion SOP</h1>
    <div class="chapter-subtitle">Manual Posting, SMS Interceptions, and Monthly Close Workflows</div>
</div>

## SOP-FIN-01: Ledger Category Maintenance

### 1. Purpose
Maintains consistency in financial reporting by managing the categorization rules for household expenses.

### 2. Step-by-Step Procedure
1. **Deduplication Check:** When transactions are written from the Android SMS Receiver, ensure the system runs a deduplication query:
   ```sql
   SELECT id FROM public.transactions WHERE sms_reference = 'SMS_UNIQUE_REF_HASH';
   ```
2. **Postgres Ingestion Check:** Execute audit sweep queries once a day to check for category mismatches:
   ```sql
   SELECT id, category FROM public.transactions 
   WHERE category NOT IN ('Food', 'Utilities', 'Health', 'Travel', 'Loans', 'Other');
   ```
3. **Manual Adjustments:** Correct mismatched entries by running a targeted update through the Supabase console, logging the change in the audit database.

<div class="callout callout-security">
    <div class="callout-icon"><!-- ICON_SEC --></div>
    <div class="callout-content">
        <div class="callout-title">Audit Trail Enforcement</div>
        <div>Direct database edits are restricted to emergency scenarios and must be logged in the system audit trail.</div>
    </div>
</div>
"""

# -----------------------------------------------------------------------------
# CHAPTER 09: BILL SCHEDULES & OVERDUE SOP
# -----------------------------------------------------------------------------
chapters['09_bill_and_emi_sop.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 09</div>
    <h1>Bill Schedules &amp; Overdue SOP</h1>
    <div class="chapter-subtitle">Bill Reminders, EMI Tracking, and Overdue Alert Workflows</div>
</div>

## SOP-BILL-01: Recurring Bill Configurations

### 1. Purpose
Ensures household bills and loan EMIs are tracked and reminded in advance.

### 2. Prerequisites
1. Access to the Supabase database dashboard or the system administration portal.
2. Active FCM keys configured for push notifications.

### 3. Step-by-Step Procedure

<!-- table: Bill & EMI SOP Steps -->
| Step | Action | Executed By | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **1** | Enter bill details (due date, amount, provider) | Family Member | Scheduled entry created in database. |
| **2** | Check upcoming bills (48-hour threshold) | WorkManager Worker | Local alarm registered on client devices. |
| **3** | Dispatch alert notification | Notification Engine | User receives push alert for payment. |
| **4** | Mark bill payment status as paid | Family Member | Transaction record generated, ledger updated. |

### 4. Exception Handling: Overdue Handling
If a bill remains unpaid past its due date:
1. The reminder frequency increases to every 24 hours.
2. A priority alert is flagged on the family dashboard interface.
"""

# -----------------------------------------------------------------------------
# CHAPTER 10: SECURE DOCUMENT VAULT SOP
# -----------------------------------------------------------------------------
chapters['10_document_vault_sop.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 10</div>
    <h1>Secure Document Vault SOP</h1>
    <div class="chapter-subtitle">Ingestion Rules, Storage Policies, and OCR Validations</div>
</div>

## SOP-DOC-01: Ingestion &amp; Gemini OCR Processing

### 1. Purpose
SOP for uploading documents to the vault, verifying Gemini OCR extractions, and archiving files.

### 2. Step-by-Step Ingestion Pipeline

```mermaid
%% id: diag-doc-flow
%% caption: Document Vault Ingestion Lifecycle Flow
flowchart TD
    Upload[1. Client uploads document] --> Compress[2. Client compresses image locally]
    Compress --> SaveStorage[3. Upload to proofs bucket in Storage]
    SaveStorage --> TriggerOCR[4. Send file URL to Gemini 2.5 Flash]
    TriggerOCR --> ValidateResponse{5. JSON response valid?}
    
    ValidateResponse -->|Yes| AutoPopulate[6. Auto-populate document fields]
    ValidateResponse -->|No| QueueVerify[7. Route to manual review queue]
    
    AutoPopulate --> SaveDb[8. Write record to my_proofs Postgres table]
    QueueVerify --> ManualInput[9. User manually enters details]
    ManualInput --> SaveDb
```

### 3. Recovery Steps: Storage Allocation Failures
If storage uploads fail due to folder allocation limits:
1. Verify user's group tier is within resource boundaries.
2. Run storage cleanup sweeps to archive historical proofs older than 24 months.
"""

# -----------------------------------------------------------------------------
# CHAPTER 11: AI GEMINI API OPERATIONS SOP
# -----------------------------------------------------------------------------
chapters['11_ai_assistant_sop.md'] = """<div class="chapter-header">
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
    <div class="callout-icon"><!-- ICON_ADR --></div>
    <div class="callout-content">
        <div class="callout-title">ADR Reference: Gemini API Gateway</div>
        <div>All Gemini API calls are routed through Supabase Edge Functions. This hides API keys and provides a layer for rate-limiting. Detailed decisions are documented in <a href="#37_adr">ADR-003</a>.</div>
    </div>
</div>
"""

# -----------------------------------------------------------------------------
# CHAPTER 12: FIREBASE PUSH & REMINDER SOP
# -----------------------------------------------------------------------------
chapters['12_notification_sop.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 12</div>
    <h1>Firebase Push &amp; Reminder SOP</h1>
    <div class="chapter-subtitle">Notification Broker Services, Retries, and Token Expirations</div>
</div>

## SOP-NOTIF-01: FCM Token Sync &amp; Maintenance

### 1. Purpose
Maintains FCM tokens to ensure push notifications are delivered reliably to mobile clients.

### 2. Step-by-Step Procedure
1. **Token Refresh:** When a user launches the app, compare the client device token with the `fcm_tokens` record:
   ```sql
   SELECT token FROM public.fcm_tokens WHERE user_id = 'USER_UUID' AND device_id = 'DEVICE_UUID';
   ```
2. **Invalid Token Cleanup:** Remove inactive tokens (e.g., those returning `UNREGISTERED` errors from FCM API calls):
   ```sql
   DELETE FROM public.fcm_tokens WHERE last_used < now() - INTERVAL '60 days';
   ```
3. **Queue Sweeper:** Run cron checks to identify and retry failed notification queue tasks.
"""

# -----------------------------------------------------------------------------
# CHAPTER 13: DATABASE & STORAGE BACKUP SOP
# -----------------------------------------------------------------------------
chapters['13_backup_sop.md'] = """<div class="chapter-header">
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
"""

# -----------------------------------------------------------------------------
# CHAPTER 14: DISASTER RECOVERY PLAYBOOK
# -----------------------------------------------------------------------------
chapters['14_disaster_recovery_sop.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 14</div>
    <h1>Disaster Recovery Playbook</h1>
    <div class="chapter-subtitle">Service Recovery Runbooks, Failures, and RTO/RPO Metrics</div>
</div>

## 1. Operational RTO &amp; RPO Targets

* **Recovery Time Objective (RTO):** $< 4$ Hours (Maximum allowable downtime).
* **Recovery Point Objective (RPO):** $< 24$ Hours (Maximum allowable data loss window).

## 2. Server Failure Recovery Procedure
In the event of a total Vercel edge CDN or static assets server failure:

```mermaid
%% id: diag-dr-flow
%% caption: Infrastructure Recovery Process
flowchart TD
    Detect[1. Health Monitor triggers alert] --> Verify[2. Verify failure on hosting provider status page]
    Verify --> Failover{3. Primary region online?}
    
    Failover -->|Yes| Restart[4. Trigger serverless container restart]
    Failover -->|No| DNSChange[5. Route DNS to secondary Vercel region]
    
    Restart --> Confirm[6. Run automated smoke tests]
    DNSChange --> Confirm
    Confirm --> Complete([7. Service status green])
```

<div class="callout callout-security">
    <div class="callout-icon"><!-- ICON_SEC --></div>
    <div class="callout-content">
        <div class="callout-title">DR Action Security Authorization</div>
        <div>DNS failover modifications require two-factor authorization approval from the CSO or designated Operations Lead.</div>
    </div>
</div>
"""

# -----------------------------------------------------------------------------
# CHAPTER 15: ENCRYPTION, KEYS & AUDITS SOP
# -----------------------------------------------------------------------------
chapters['15_security_sop.md'] = """<div class="chapter-header">
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
    <div class="callout-icon"><!-- ICON_SEC --></div>
    <div class="callout-content">
        <div class="callout-title">Secrets Safety Policy</div>
        <div>API keys must not be hardcoded in the codebase. Always load secrets from environment variables or a secure key management service.</div>
    </div>
</div>
"""

# -----------------------------------------------------------------------------
# CHAPTER 16: CI/CD RELEASE & ROLLBACK SOP
# -----------------------------------------------------------------------------
chapters['16_deployment_sop.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 16</div>
    <h1>CI/CD Release &amp; Rollback SOP</h1>
    <div class="chapter-subtitle">Promotion Pathways, Production Releases, and Rollback Procedures</div>
</div>

## SOP-DEP-01: Production Code Deployment

### 1. Purpose
Defines the process for releasing software updates to production.

### 2. Prerequisites
1. All linting and TypeScript checks must pass in GitHub Actions.
2. QA lead must sign off on the release build.

### 3. Step-by-Step Procedure
1. **Staging Deploy:** Push the release branch to `staging`. Trigger integration tests.
2. **Production Deploy:** Merge staging branch into `main`. GitHub Actions builds and pushes the static assets to Vercel production:
   ```bash
   vercel --prod --token=VERCEL_PROD_DEPLOYMENT_TOKEN
   ```
3. **Smoke Tests:** Execute post-deploy smoke tests.

### 4. Rollback Procedure
If smoke tests fail post-deployment:
1. Locate the last successful deployment commit in GitHub.
2. Revert the production deployment via Vercel:
   ```bash
   vercel rollback DEPLOYMENT_ID --token=VERCEL_PROD_DEPLOYMENT_TOKEN
   ```
"""

# -----------------------------------------------------------------------------
# CHAPTER 17: HEALTH MONITORING & ESCALATIONS
# -----------------------------------------------------------------------------
chapters['17_monitoring_sop.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 17</div>
    <h1>Health Monitoring &amp; Escalations</h1>
    <div class="chapter-subtitle">Operational Dashboards, Sentry Alert Triggers, and Triage Escalations</div>
</div>

## SOP-MON-01: Performance Alert Thresholds

### 1. Purpose
Identifies performance degradation before it impacts users.

### 2. Monitoring Targets

<!-- table: Service Alert Thresholds -->
| Target Metric | Normal Bounds | Alert Threshold | Action |
| :--- | :--- | :--- | :--- |
| **API Latency** | $< 180\text{ ms}$ | $> 350\text{ ms}$ | Log warning, profile slow queries. |
| **DB CPU Load** | $< 35\%$ | $> 75\%$ for 5m | Ping DB Administrator to check query locks. |
| **Sentry Error Rate**| 0 Per Min | $> 5$ Errors / Min | Notify DevOps On-Call Team via PagerDuty. |

<div class="callout callout-info">
    <div class="callout-icon"><!-- ICON_INFO --></div>
    <div class="callout-content">
        <div class="callout-title">Sentry Integration</div>
        <div>Frontend runtime exceptions are forwarded to Sentry, grouping duplicate events to prevent alert fatigue.</div>
    </div>
</div>
"""

# -----------------------------------------------------------------------------
# CHAPTER 18: INCIDENT SEVERITY SOP
# -----------------------------------------------------------------------------
chapters['18_incident_management_sop.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 18</div>
    <h1>Incident Severity SOP</h1>
    <div class="chapter-subtitle">Severity Classification levels, Timelines, and Postmortems</div>
</div>

## SOP-INC-01: Incident Severity Matrix

### 1. Purpose
Defines response times and triage priorities during system incidents.

### 2. Severity Classification Matrix

<!-- table: Incident Severity Levels -->
| Severity | Description | Initial Response | Resolution SLA |
| :--- | :--- | :--- | :--- |
| **P1 - Critical** | Core platform down (login fails, database unreachable). | $< 15$ Minutes | $< 2$ Hours |
| **P2 - Major** | Single module degraded (OCR failing, WebRTC voice cuts). | $< 30$ Minutes | $< 8$ Hours |
| **P3 - Minor** | Minor functionality issue (dashboard graph rendering lag). | $< 2$ Hours | $< 24$ Hours |
| **P4 - Low** | Cosmetical issue or UI styling bugs. | $< 24$ Hours | Next Sprint |

### 3. Step-by-Step Incident Triage

```mermaid
%% id: diag-incident
%% caption: Incident Management Process Flow
flowchart TD
    Detect[1. Alert triggered or user reports issue] --> Assign[2. DevOps On-Call triages issue]
    Assign --> Classify{3. Determine Severity Level?}
    
    Classify -->|P1 / Critical| P1Runbook[4. Page DBA & Tech Lead. Open incident channel]
    Classify -->|P2 - P4| standardRunbook[5. Log ticket and assign to developer]
    
    P1Runbook --> Fix[6. Apply emergency patch or run DR]
    standardRunbook --> Fix
    
    Fix --> Close[7. Confirm resolution, close ticket]
    Close --> Postmortem[8. Schedule postmortem within 48 hours]
```
"""

# -----------------------------------------------------------------------------
# CHAPTER 19: LOG ROTATIONS & DB VACUUM SOP
# -----------------------------------------------------------------------------
chapters['19_maintenance_sop.md'] = """<div class="chapter-header">
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
"""

# -----------------------------------------------------------------------------
# CHAPTER 20: TROUBLESHOOTING GUIDE
# -----------------------------------------------------------------------------
chapters['20_troubleshooting_guide.md'] = """<div class="chapter-header">
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
"""

# -----------------------------------------------------------------------------
# CHAPTER 21: MAINTENANCE & RELEASE CHECKLISTS
# -----------------------------------------------------------------------------
chapters['21_checklists.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 21</div>
    <h1>Maintenance &amp; Release Checklists</h1>
    <div class="chapter-subtitle">Operational checklists for System Maintenance and Code Releases</div>
</div>

## 1. Daily Operations Checklist
- `[ ]` Confirm daily pg_dump backups completed successfully at 01:00 UTC.
- `[ ]` Verify Supabase database connection pool utilization is $< 80\%$.
- `[ ]` Review Sentry dashboard for new critical errors or exceptions.
- `[ ]` Check Gemini API rate limit warnings and usage costs in Google Cloud Console.

---

## 2. Production Code Release Checklist
- `[ ]` Verify TypeScript compile and build tests pass in GitHub Actions.
- `[ ]` Run schema migrations on staging database and verify compatibility.
- `[ ]` Execute unit test coverage checks (coverage target $\ge 80\%$).
- `[ ]` Confirm Vercel production preview builds look correct.
- `[ ]` Obtain release authorization from the Operations Lead.
- `[ ]` Execute deploy and run post-deploy smoke tests.
"""

# -----------------------------------------------------------------------------
# CHAPTER 22: OPERATIONAL REPORT TEMPLATES
# -----------------------------------------------------------------------------
chapters['22_templates.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 22</div>
    <h1>Operational Report Templates</h1>
    <div class="chapter-subtitle">System Administration Templates for Incidents and Change Requests</div>
</div>

## Template: Incident Postmortem Report

```text
========================================================================
INCIDENT POSTMORTEM REPORT
========================================================================
Incident ID:    INC-2026-[NUMBER]
Severity:       [P1 / P2 / P3]
Subject:        [Incident Summary]
Date of Issue:  YYYY-MM-DD
On-Call Lead:   [Name]

1. INCIDENT TIMELINE
------------------------------------------------------------------------
- HH:MM UTC : Alert triggered in health monitor.
- HH:MM UTC : Triage begun by On-Call engineer.
- HH:MM UTC : Issue isolated to database query lockup.
- HH:MM UTC : DB connections cleared, service restored.

2. ROOT CAUSE ANALYSIS
------------------------------------------------------------------------
Explain the root cause of the issue:
[Insert detailed DBA / Sentry log analyses here]

3. CORRECTIVE ACTIONS
------------------------------------------------------------------------
List the actions required to prevent recurrence:
- [ ] Task 1: Add indexes to slow queries.
- [ ] Task 2: Update alert threshold configs.
========================================================================
```
"""

# -----------------------------------------------------------------------------
# CHAPTER 23: APPENDIX & ABBREVIATIONS
# -----------------------------------------------------------------------------
chapters['23_appendix.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 23</div>
    <h1>Appendix &amp; Abbreviations</h1>
    <div class="chapter-subtitle">Glossary, Emergency Contacts, and Version History</div>
</div>

## 1. Operational Abbreviations
* **SOP:** Standard Operating Procedures
* **RTO:** Recovery Time Objective
* **RPO:** Recovery Point Objective
* **DBA:** Database Administrator
* **RLS:** Row-Level Security
* **FCM:** Firebase Cloud Messaging
* **VOIP:** Voice over IP (WebRTC calls)

## 2. Emergency Contact Directory

<!-- table: Operations Emergency Directory -->
| Contact Group | Role | Channel / Phone | Priority |
| :--- | :--- | :--- | :--- |
| **DevOps On-Call** | Infrastructure Support | PagerDuty / On-Call Channel | P1 / Urgent |
| **Database Lead** | DBA Escapes | extension 4402 | P1 / Critical |
| **CSO Office** | Security Breach Reporting | extension 9110 | Urgent |
"""

# -----------------------------------------------------------------------------
# WRITE OUT THE FILES AND REPLACE PLACEHOLDERS
# -----------------------------------------------------------------------------
for filename, content in chapters.items():
    # Replace layout template placeholders
    content = content.replace('<!-- ICON_INFO -->', ICON_INFO)
    content = content.replace('<!-- ICON_TIP -->', ICON_TIP)
    content = content.replace('<!-- ICON_WARN -->', ICON_WARN)
    content = content.replace('<!-- ICON_SEC -->', ICON_SEC)
    content = content.replace('<!-- ICON_PRAC -->', ICON_PRAC)
    content = content.replace('<!-- ICON_ADR -->', ICON_ADR)
    
    filepath = os.path.join(SRC_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Generated: {filename}")

print("\nAll SOP Markdown chapters generated successfully in documentation/sop_src/!")
