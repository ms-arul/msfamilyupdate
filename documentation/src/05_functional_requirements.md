<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 05</div>
    <h1>Functional Requirements</h1>
    <div class="chapter-subtitle">Feature Requirements, Priority Matrix, and Acceptance Criteria</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the system's functional requirements, feature specifications, and acceptance criteria.
    </div>
</div>

## 1. MoSCoW Prioritization Matrix

<!-- table: Core Functional Priority Matrix -->
| Requirement ID | Module | Feature Description | Priority | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **FR-FIN-01** | Finance | Manual transaction entry (income, expense, savings) | **Must Have** | Auth-01 |
| **FR-FIN-02** | Finance | Monthly ledger resets and category aggregation | **Must Have** | FR-FIN-01 |
| **FR-FIN-03** | Finance | Category breakdown graphs and historic search | **Must Have** | FR-FIN-01 |
| **FR-SMS-01** | SMS Sync | Background SMS intercepting and parsing engine | **Must Have** | Device Perms |
| **FR-SMS-02** | SMS Sync | Verification queue for low-confidence parses | **Should Have** | FR-SMS-01 |
| **FR-DOC-01** | Vault | Document upload with title, category, and pin | **Must Have** | Storage-01 |
| **FR-DOC-02** | Vault | Gemini-powered OCR metadata extraction and summary | **Should Have** | FR-DOC-01, Gemini-API |
| **FR-GPS-01** | Tracking | Live location sharing with battery status on map | **Must Have** | Device GPS |
| **FR-CALL-01**| Calling | P2P VoIP audio calls between family members | **Should Have** | WebRTC, Realtime |
| **FR-LN-01**  | Loans | EMI scheduling and payment status tracking | **Must Have** | FR-FIN-01 |
| **FR-LN-02**  | Loans | Automated notifications for upcoming EMIs | **Must Have** | Local Notifs |
| **FR-SAV-01** | Savings | Track physical assets (Gold/Silver) | **Should Have** | FR-FIN-01 |
| **FR-SAV-02** | Savings | Fetch daily gold rates and trigger price alerts | **Could Have** | Gemini-API |

---

## 2. Detailed Acceptance Criteria & Business Rules

### FR-SMS-01: Native SMS Parsing Engine
* **Business Rule:** Only SMS messages from registered financial institutions may be processed. Personal messages must be ignored.
* **Acceptance Criteria:**
  1. The native `SmsBackgroundReceiver` intercepts incoming messages.
  2. The text is parsed using regex patterns in `SmsParserEngine`.
  3. If the confidence score is $\ge 70\%$, the transaction is auto-inserted and an in-app `SmsToast` is shown.
  4. If the confidence is $< 70\%$, the record is routed to the `PendingSmsTransactions` confirmation queue.

<div class="callout callout-security">
    <div class="callout-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></div>
    <div class="callout-content">
        <div class="callout-title">Security &amp; Consent</div>
        <div>SMS parsing runs entirely on-device. Personal messages are ignored by the parser, preserving user privacy.</div>
    </div>
</div>
