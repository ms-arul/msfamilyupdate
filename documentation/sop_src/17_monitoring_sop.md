<div class="chapter-header">
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
| **API Latency** | $< 180	ext{ ms}$ | $> 350	ext{ ms}$ | Log warning, profile slow queries. |
| **DB CPU Load** | $< 35\%$ | $> 75\%$ for 5m | Ping DB Administrator to check query locks. |
| **Sentry Error Rate**| 0 Per Min | $> 5$ Errors / Min | Notify DevOps On-Call Team via PagerDuty. |

<div class="callout callout-info">
    <div class="callout-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
    <div class="callout-content">
        <div class="callout-title">Sentry Integration</div>
        <div>Frontend runtime exceptions are forwarded to Sentry, grouping duplicate events to prevent alert fatigue.</div>
    </div>
</div>
