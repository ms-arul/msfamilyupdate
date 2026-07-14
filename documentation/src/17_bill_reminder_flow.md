<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 17</div>
    <h1>Bill Scheduler &amp; Alert Sequence</h1>
    <div class="chapter-subtitle">WorkManager triggers, Database checks, and Local Notification Dispatch</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Explains how the native scheduler triggers notifications for upcoming bills and EMIs.
    </div>
</div>

## 1. Native Scheduling Sequence
Details the background execution steps that monitor payment schedules.

```mermaid
%% id: seq-scheduler
%% caption: Background Bill Scheduler and Notification Sequence
sequenceDiagram
    autonumber
    participant Win as Android OS (WorkManager)
    participant Worker as LoanReminderWorker.kt
    participant Dao as TransactionDao (Room DB)
    participant Supa as Supabase Postgres DB
    participant Notif as LocalNotifications Plugin
    actor User as Family Member

    Win->>Worker: Triggers periodic work (every 12 hours)
    Worker->>Dao: Queries active EMIs & bills
    Dao-->>Worker: Returns list of scheduled payments
    
    loop For each upcoming bill
        Worker->>Worker: Calculates date delta (current_date - due_date)
        alt Due in less than 48 hours and not notified
            Worker->>Notif: schedule(notification_payload)
            Notif->>User: Displays push notification alert ("EMI Due Tomorrow")
            Worker->>Dao: Marks bill as "notified = true"
            Worker->>Supa: Upserts alert log to notifications table
        end
    end
    Worker-->>Win: Returns Result.success()
```
