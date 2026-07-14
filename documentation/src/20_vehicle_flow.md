<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 20</div>
    <h1>Vehicle Service &amp; Alert Sequence</h1>
    <div class="chapter-subtitle">Database columns, service schedules, and alert triggers</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the database design and notifications schedule used to track vehicle maintenance.
    </div>
</div>

## 1. Service Alert Pipeline
Describes how service date thresholds trigger notifications.

```mermaid
%% id: flow-vehicle
%% caption: Vehicle Service Alert Logic
flowchart LR
    Service[Service / Insurance Entry] --> SaveDB[(Postgres Database)]
    SaveDB --> Scheduler[Scheduler Service]
    Scheduler --> Evaluate{Days to expiry / milestone?}
    Evaluate -->|Expiry < 30 Days| TriggerWarning[Create Warning Notification]
    Evaluate -->|Expiry < 7 Days| TriggerAlert[Create Critical Notification]
    
    TriggerWarning --> Notify[In-App Notification & Push]
    TriggerAlert --> Notify
```

---

## 2. Table: `vehicles`
Stores vehicle details.

<!-- table: Vehicles Database Schema -->
| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Unique vehicle ID. |
| `name` | `TEXT` | - | Display name (e.g. Model Y). |
| `license_plate`| `TEXT` | `UNIQUE` | Registration number. |
| `purchase_date`| `DATE` | - | Purchase date. |
| `family_id` | `UUID` | `REFERENCES family_groups(id)` | Link to family container. |
