<div class="chapter-header">
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
