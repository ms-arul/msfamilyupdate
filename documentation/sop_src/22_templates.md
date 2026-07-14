<div class="chapter-header">
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
