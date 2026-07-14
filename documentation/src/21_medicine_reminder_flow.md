<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 21</div>
    <h1>Medication Reminder Sequence</h1>
    <div class="chapter-subtitle">AlarmManager registrations, heads-up prompts, and adherence logging</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the scheduling engine and database logs used to manage medication compliance.
    </div>
</div>

## 1. Medication Reminder Pipeline
Shows the native scheduling sequence and user compliance logging.

```mermaid
%% id: flow-medicine
%% caption: Medication Reminder Schedule and Compliance Flow
flowchart TD
    Prescription[Add Medicine & Schedule] --> SyncLocal[Sync to Room SQLite]
    SyncLocal --> RegisterAlarms[Register Alarms in Android AlarmManager]
    RegisterAlarms --> TimeTrigger{Scheduled time reached?}
    TimeTrigger -->|Yes| PushNotif[Trigger Native Alarm Notification]
    PushNotif --> UserResponse{User clicks notification?}
    UserResponse -->|Taken| RecordAdherence[Update Database: status = taken]
    UserResponse -->|Snoozed| Reschedule[Delay alert by 10 minutes]
    UserResponse -->|Missed| RecordMissed[Update Database: status = missed]
```
