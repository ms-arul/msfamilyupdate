<div class="chapter-header">
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
