import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(BASE_DIR, 'src')

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
    <div class="chapter-subtitle">Structural Outline and Index of the Architecture Specifications</div>
</div>

Welcome to the **MS Family Technical Design &amp; Architecture Documentation**. Use the links below to navigate directly to each chapter section.

<ul class="toc-list">
    <li class="toc-item"><a href="#03_executive_summary">03. Executive Summary</a><div class="toc-leader"></div><span class="toc-page">4</span></li>
    <li class="toc-item"><a href="#04_project_overview">04. Project Overview</a><div class="toc-leader"></div><span class="toc-page">8</span></li>
    <li class="toc-item"><a href="#05_functional_requirements">05. Functional Requirements</a><div class="toc-leader"></div><span class="toc-page">12</span></li>
    <li class="toc-item"><a href="#06_non_functional_requirements">06. Non-Functional Requirements</a><div class="toc-leader"></div><span class="toc-page">19</span></li>
    <li class="toc-item"><a href="#07_system_architecture">07. System Architecture</a><div class="toc-leader"></div><span class="toc-page">25</span></li>
    <li class="toc-item"><a href="#08_c4_model">08. C4 Model Blueprint</a><div class="toc-leader"></div><span class="toc-page">31</span></li>
    <li class="toc-item"><a href="#09_high_level_architecture">09. High-Level Layered Architecture</a><div class="toc-leader"></div><span class="toc-page">38</span></li>
    <li class="toc-item"><a href="#10_low_level_architecture">10. Low-Level Component Design</a><div class="toc-leader"></div><span class="toc-page">44</span></li>
    <li class="toc-item"><a href="#11_database_design">11. Database Design &amp; ERD</a><div class="toc-leader"></div><span class="toc-page">52</span></li>
    <li class="toc-item"><a href="#12_database_schema">12. Database Physical Schema</a><div class="toc-leader"></div><span class="toc-page">58</span></li>
    <li class="toc-item"><a href="#13_user_flows">13. Core User Flows</a><div class="toc-leader"></div><span class="toc-page">68</span></li>
    <li class="toc-item"><a href="#14_application_flow">14. Application Lifecycle Flow</a><div class="toc-leader"></div><span class="toc-page">76</span></li>
    <li class="toc-item"><a href="#15_auth_flow">15. Authentication &amp; Lock Sequence</a><div class="toc-leader"></div><span class="toc-page">80</span></li>
    <li class="toc-item"><a href="#16_expense_flow">16. Expense &amp; OCR Ingestion Sequence</a><div class="toc-leader"></div><span class="toc-page">84</span></li>
    <li class="toc-item"><a href="#17_bill_reminder_flow">17. Bill Scheduler &amp; Alert Sequence</a><div class="toc-leader"></div><span class="toc-page">88</span></li>
    <li class="toc-item"><a href="#18_ai_assistant_flow">18. AI Assistant Reasoning Sequence</a><div class="toc-leader"></div><span class="toc-page">92</span></li>
    <li class="toc-item"><a href="#19_document_vault_flow">19. Secure Document Ingestion Sequence</a><div class="toc-leader"></div><span class="toc-page">96</span></li>
    <li class="toc-item"><a href="#20_vehicle_flow">20. Vehicle Service &amp; Alert Sequence</a><div class="toc-leader"></div><span class="toc-page">100</span></li>
    <li class="toc-item"><a href="#21_medicine_reminder_flow">21. Medication Reminder Sequence</a><div class="toc-leader"></div><span class="toc-page">104</span></li>
    <li class="toc-item"><a href="#22_api_documentation">22. REST API Specifications</a><div class="toc-leader"></div><span class="toc-page">108</span></li>
    <li class="toc-item"><a href="#23_security_architecture">23. Security &amp; Threat Architecture</a><div class="toc-leader"></div><span class="toc-page">118</span></li>
    <li class="toc-item"><a href="#24_frontend_architecture">24. Frontend Core Architecture</a><div class="toc-leader"></div><span class="toc-page">126</span></li>
    <li class="toc-item"><a href="#25_backend_architecture">25. Backend Core Architecture</a><div class="toc-leader"></div><span class="toc-page">131</span></li>
    <li class="toc-item"><a href="#26_state_management">26. State Management &amp; Persistence</a><div class="toc-leader"></div><span class="toc-page">135</span></li>
    <li class="toc-item"><a href="#27_devops_cicd">27. DevOps &amp; CI/CD Pipeline</a><div class="toc-leader"></div><span class="toc-page">139</span></li>
    <li class="toc-item"><a href="#28_deployment_architecture">28. Deployment Architecture Blueprint</a><div class="toc-leader"></div><span class="toc-page">143</span></li>
    <li class="toc-item"><a href="#29_scalability">29. Horizontal &amp; Vertical Scalability</a><div class="toc-leader"></div><span class="toc-page">146</span></li>
    <li class="toc-item"><a href="#30_performance_optimization">30. Performance Tuning &amp; Optimization</a><div class="toc-leader"></div><span class="toc-page">150</span></li>
    <li class="toc-item"><a href="#31_monitoring">31. Observability &amp; Monitoring</a><div class="toc-leader"></div><span class="toc-page">154</span></li>
    <li class="toc-item"><a href="#32_testing_strategy">32. Verification &amp; Testing Strategy</a><div class="toc-leader"></div><span class="toc-page">158</span></li>
    <li class="toc-item"><a href="#33_folder_structure">33. Codebase Directory Tree</a><div class="toc-leader"></div><span class="toc-page">162</span></li>
    <li class="toc-item"><a href="#34_environment_variables">34. Configuration &amp; Environments</a><div class="toc-leader"></div><span class="toc-page">166</span></li>
    <li class="toc-item"><a href="#35_design_system">35. Design System &amp; Tokens</a><div class="toc-leader"></div><span class="toc-page">170</span></li>
    <li class="toc-item"><a href="#36_uml_diagrams">36. UML Core Blueprints</a><div class="toc-leader"></div><span class="toc-page">174</span></li>
    <li class="toc-item"><a href="#37_adr">37. Architecture Decision Records (ADRs)</a><div class="toc-leader"></div><span class="toc-page">182</span></li>
    <li class="toc-item"><a href="#38_ai_architecture">38. AI &amp; LLM Engineering Pattern</a><div class="toc-leader"></div><span class="toc-page">188</span></li>
    <li class="toc-item"><a href="#39_future_roadmap">39. Product Evolution Roadmap</a><div class="toc-leader"></div><span class="toc-page">192</span></li>
    <li class="toc-item"><a href="#40_appendix">40. Appendix &amp; Bibliography</a><div class="toc-leader"></div><span class="toc-page">196</span></li>
</ul>
"""

# -----------------------------------------------------------------------------
# CHAPTER 03: EXECUTIVE SUMMARY
# -----------------------------------------------------------------------------
chapters['03_executive_summary.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 03</div>
    <h1>Executive Summary</h1>
    <div class="chapter-subtitle">Vision, Mission, and Platform Value Proposition</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> This chapter outlines the strategic objectives, problem space, and the business case for the MS Family platform.
    </div>
</div>

## Project Identity
* **System Title:** MS Family Home &amp; Family Management Platform
* **Document Version:** v1.0.0-Enterprise
* **Authoring Body:** Core Software Engineering &amp; Architecture Group

## 1. System Vision
The MS Family platform addresses the fragmentation of household logistics and family financial operations. By combining modern web architectures, native mobile integrations, and generative AI interfaces, the platform provides a unified workspace for managing shared household resources.

```mermaid
%% id: diag-vision
%% caption: High-Level Platform Data and Feedback Loop
graph LR
    User[Family Member] -->|Input Data / SMS / Receipts| MSF[MS Family Platform]
    MSF -->|Processing| AI[Gemini AI Insights]
    MSF -->|Synchronization| Sync[Real-Time Sync]
    MSF -->|Native Operations| Native[Background Workers / Push Services]
    AI -->|Output| Feedback[Budget Alerts & Financial Intelligence]
    Sync -->|Output| Family[Shared Household Dashboard]
    Native -->|Output| Reminders[Critical Bill & Geolocation Alerts]
```

## 2. Mission
The platform coordinates household management by:
1. Fusing shared ledgers with automatic native SMS background receipt detection.
2. Indexing documents in a secure vault with Gemini-based metadata extraction.
3. Automating medication and loan EMI reminders via background scheduling services.
4. Providing real-time family location tracking and peer-to-peer WebRTC calls.

<div class="callout callout-info">
    <div class="callout-icon"><!-- ICON_INFO --></div>
    <div class="callout-content">
        <div class="callout-title">Strategic Alignment</div>
        <div>MS Family consolidates multiple household tools (finance ledgers, document storage, calendars, and location sharing) into a single, secure application.</div>
    </div>
</div>
"""

# -----------------------------------------------------------------------------
# CHAPTER 04: PROJECT OVERVIEW
# -----------------------------------------------------------------------------
chapters['04_project_overview.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 04</div>
    <h1>Project Overview</h1>
    <div class="chapter-subtitle">Context, Ecosystem Structure, and Module Definitions</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> An introduction to the software modules, dependencies, and deployment structure of the MS Family system.
    </div>
</div>

## 1. System Context
The MS Family platform is built as a responsive Single-Page Application (SPA) using React, Vite, TypeScript, and Tailwind CSS. It is wrapped as a native hybrid app via Capacitor, allowing access to native Android APIs.

```mermaid
%% id: diag-context
%% caption: Component Ecosystem and Integrations
graph TD
    Client[React + TypeScript + Capacitor SPA]
    Storage[Supabase Object Storage]
    Postgres[(PostgreSQL Database)]
    Edge[Supabase Edge Functions]
    Gemini[Google Gemini 2.5 Flash]
    FCM[Firebase Cloud Messaging]

    Client <-->|Realtime / JWT Auth| Postgres
    Client <-->|REST API / Files| Storage
    Client -->|Trigger Notifications| Edge
    Client -->|Image Processing & Insights| Gemini
    Edge -->|Push Alerts| FCM
    FCM -->|Push Notification| Client
```

## 2. Module Specifications

### Financial Ledger & Analytics
Tracks income, expenses, and savings goals linked to user profiles. Features Recharts-based visual graphs and monthly resets.

### Smart SMS Ingestion
Native Android receivers (`SmsBackgroundReceiver`) capture banking transaction SMS alerts, parse details locally, and upsert records to Supabase.

### Secure Document Vault (MyProofs)
Uploads receipt and prescription files to Supabase Storage, using the Gemini API to run OCR and extract metadata (merchant, total, and document summary).

### Location Tracking & Geolocation
Tracks family member locations in real-time, displaying them on a shared Leaflet map with battery status reports.

### WebRTC VoIP calling
Provides direct peer-to-peer voice calls using Supabase Realtime channels for signaling.

<div class="callout callout-best-practice">
    <div class="callout-icon"><!-- ICON_PRAC --></div>
    <div class="callout-content">
        <div class="callout-title">Architecture Target</div>
        <div>Offline availability is supported by caching data in a local Room SQLite database before syncing changes with Supabase.</div>
    </div>
</div>
"""

# -----------------------------------------------------------------------------
# CHAPTER 05: FUNCTIONAL REQUIREMENTS
# -----------------------------------------------------------------------------
chapters['05_functional_requirements.md'] = """<div class="chapter-header">
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
    <div class="callout-icon"><!-- ICON_SEC --></div>
    <div class="callout-content">
        <div class="callout-title">Security &amp; Consent</div>
        <div>SMS parsing runs entirely on-device. Personal messages are ignored by the parser, preserving user privacy.</div>
    </div>
</div>
"""

# -----------------------------------------------------------------------------
# CHAPTER 06: NON-FUNCTIONAL REQUIREMENTS
# -----------------------------------------------------------------------------
chapters['06_non_functional_requirements.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 06</div>
    <h1>Non-Functional Requirements</h1>
    <div class="chapter-subtitle">Performance Targets, Reliability, Security, and Compliance</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Outlines the non-functional requirements, latency thresholds, security standards, and device support targets.
    </div>
</div>

## 1. Performance & Latency Targets
* **Initial Page Load:** The app loader must resolve in $< 1.5$ seconds on 3G networks.
* **Cached Database Queries:** Local Room SQLite queries must display data within $300\text{ ms}$.
* **API Response Time:** Supabase queries and Edge Functions must respond within $250\text{ ms}$.
* **Gemini OCR Processing:** Image uploads and OCR analysis must complete within $5.0$ seconds.

```mermaid
%% id: diag-performance
%% caption: System Latency Target Budgets
gantt
    title Latency Targets by System Operation
    dateFormat  X
    axisFormat %s
    section Core Operations
    Offline Room DB Load (300ms)    :active, 0, 300
    Supabase API Queries (250ms)     :active, 0, 250
    UI Page Transition (150ms)       :active, 0, 150
    section Heavy Processing
    Gemini OCR Parsing (5.0s)       :active, 0, 5000
    WebRTC Call Signaling (1.2s)     :active, 0, 1200
```

## 2. Availability & Reliability
* **System Uptime:** Hosted services must maintain $\ge 99.9\%$ availability.
* **Offline Fallback:** When offline, the app must route write operations to the local cache (`TransactionCachePlugin`) and sync them once the connection is restored.
* **Network Monitoring:** Active network state is tracked via `@capacitor/network` to handle offline-to-online transitions.

<div class="callout callout-warning">
    <div class="callout-icon"><!-- ICON_WARN --></div>
    <div class="callout-content">
        <div class="callout-title">Sync Retries</div>
        <div>The sync worker uses an exponential backoff strategy for failed sync operations to prevent overloading the database.</div>
    </div>
</div>
"""

# -----------------------------------------------------------------------------
# CHAPTER 07: SYSTEM ARCHITECTURE
# -----------------------------------------------------------------------------
chapters['07_system_architecture.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 07</div>
    <h1>System Architecture</h1>
    <div class="chapter-subtitle">Cloud Topology, Client-Server Paths, and Processing Nodes</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Outlines the cloud architecture, API gateways, security policies, and integrations of the MS Family system.
    </div>
</div>

## 1. Cloud Architecture Blueprint
The platform uses a decoupled serverless architecture, separating database operations, background tasks, and AI integrations.

```mermaid
%% id: diag-cloud-arch
%% caption: Detailed System Cloud Architecture Diagram
flowchart TB
    User[Mobile / Web Client]
    Vercel[Vercel CDN / Static Assets]
    
    subgraph Supabase Platform
        Auth[Clerk / Supabase Auth]
        Gateway[Database Gateway / RLS]
        DB[(Supabase Postgres Database)]
        Storage[Supabase Object Storage]
        Edge[Supabase Edge Functions]
    end

    subgraph External Services
        Gemini[Google Gemini 2.5 Flash]
        FCM[Firebase Cloud Messaging]
    end

    User -->|Fetch Web Bundle| Vercel
    User -->|JWT Auth Session| Auth
    User -->|Realtime Subscriptions / SQL Queries| Gateway
    Gateway -->|Enforces RLS| DB
    User -->|Upload Documents / Proofs| Storage
    User -->|Trigger Notifications / Webhook Calls| Edge
    User -->|API Prompt / Receipt Payload| Gemini
    Edge -->|Payload Broadcast| FCM
    FCM -->|Push Alerts| User
```

## 2. Core Processing Nodes

### Client Edge Layer
Vite bundles assets for web and mobile. On Android, Capacitor bridges JavaScript requests to Kotlin workers (such as GPS tracking, Biometrics, and SMS receivers).

### API & Security Gateway (Supabase)
Intercepts client requests, validates JWT tokens, and evaluates Row-Level Security (RLS) policies against the target rows before executing database queries.

### Serverless Layer
Deno Edge Functions handle background notifications via FCM and fetch external currency/gold rates.

<div class="callout callout-adr">
    <div class="callout-icon"><!-- ICON_ADR --></div>
    <div class="callout-content">
        <div class="callout-title">ADR Reference: Decoupled Gateways</div>
        <div>Using Supabase's direct PostgREST API reduces network hops, routing read/write actions directly to PostgreSQL through RLS policies. Detailed decisions are documented in <a href="#37_adr">ADR-002</a>.</div>
    </div>
</div>
"""

# -----------------------------------------------------------------------------
# CHAPTER 08: C4 MODEL BLUEPRINT
# -----------------------------------------------------------------------------
chapters['08_c4_model.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 08</div>
    <h1>C4 Model Blueprint</h1>
    <div class="chapter-subtitle">C4 Context, Containers, Components, and Code Views</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Displays C4 blueprints illustrating system contexts, containers, components, and code interfaces.
    </div>
</div>

## 1. Level 1: System Context Diagram
Shows how the system interacts with users and external services.

```mermaid
%% id: diag-c4-context
%% caption: C4 Level 1 - System Context Diagram
flowchart TD
    User[Family Member] -->|Manages finance, tracking, calling| MSF[MS Family Application]
    MSF <-->|Authenticates user| Auth[Clerk / Supabase Auth]
    MSF <-->|Stores metadata & files| Supabase[Supabase Postgres & Storage]
    MSF -->|Submits receipts / Requests insights| Gemini[Gemini AI Service]
    MSF <-->|Sends/Receives signal| WebRTC[WebRTC STUN Servers]
    Supabase -->|Triggers alerts| FCM[Firebase Cloud Messaging]
    FCM -->|Push Notifications| User
```

---

## 2. Level 2: Container Diagram
Explains the logical containers that compose the MS Family system.

```mermaid
%% id: diag-c4-container
%% caption: C4 Level 2 - Container Diagram
flowchart TB
    User[Family Member]
    
    subgraph Client Application Container
        React[React Single Page App]
        Capacitor[Capacitor Native Bridges]
        SQLite[Room SQLite Local Cache]
    end

    subgraph Supabase Cloud Container
        API[PostgREST Database API]
        Storage[Object Storage API]
        Realtime[Realtime Broadcast Engine]
        Postgres[(PostgreSQL Database)]
    end
    
    User -->|Interacts with| React
    React -->|Calls Native APIs| Capacitor
    Capacitor <-->|Syncs data| SQLite
    React -->|REST Queries| API
    React -->|Upload/Download| Storage
    React <-->|WebSocket signaling| Realtime
    API -->|Reads/Writes| Postgres
    Realtime -->|Monitors updates| Postgres
```

---

## 3. Level 3: Component Diagram (Frontend & Client)
Illustrates component relationships inside the client application wrapper.

```mermaid
%% id: diag-c4-component
%% caption: C4 Level 3 - Component Diagram
flowchart TD
    UI[Pages / Components] -->|Uses state| FinCtx[Finance Context]
    UI -->|Uses state| CallCtx[Call Context]
    UI -->|Uses state| AuthCtx[Auth Context]
    
    FinCtx -->|Queries API| SupabaseClient[Supabase Client JS]
    FinCtx -->|Saves state| CachePlg[Transaction Cache Plugin]
    
    CallCtx -->|WebSocket signaling| SupabaseRealtime[Supabase Realtime Broadcast]
    CallCtx -->|Native mic access| MicPlugin[Mic Permission Plugin]
    
    CachePlg -->|Bridged call| RoomDB[(Room SQLite DB)]
    
    SmsReceiver[SmsBackgroundReceiver] -->|Inserts data| RoomDB
    SmsReceiver -->|Triggers worker| SmsSyncWorker[SmsSyncWorker]
    SmsSyncWorker -->|Background Sync| SupabaseClient
```
"""

# -----------------------------------------------------------------------------
# CHAPTER 09: HIGH-LEVEL LAYERED ARCHITECTURE
# -----------------------------------------------------------------------------
chapters['09_high_level_architecture.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 09</div>
    <h1>High-Level Layered Architecture</h1>
    <div class="chapter-subtitle">Presentation, Business, Service, Cache, and Database Layering Patterns</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Outlines the n-tier architecture pattern of the MS Family system, showing the boundary responsibilities for each layer.
    </div>
</div>

## 1. N-Tier Layering Model
The platform separates UI components from core business logic, background workers, and database operations.

```mermaid
%% id: diag-layers
%% caption: MS Family Layered Architecture Blueprint
flowchart TD
    subgraph PresLayer ["Presentation Layer"]
        UI[React UI Pages & Tailwind Styles]
        Components[shadcn/ui Design Elements]
    end

    subgraph BizLayer ["Business Logic Layer"]
        Contexts[React Context Providers: Auth, Finance, Family, Call, Language]
        Hooks[Custom Hooks: usePushNotifications, useFinance]
    end

    subgraph SvcLayer ["Service Coordination Layer"]
        SmsService[SmsService & Parser Engine]
        LocationService[Tracking & Geolocation Service]
        CallSignaler[WebRTC Signaling Broker]
        GeminiService[Gemini API Bridge Client]
    end

    subgraph RepoLayer ["Repository & Local Cache Layer"]
        SupabaseClient[Supabase JS Client]
        LocalCache[Transaction Cache Plugin / Room SQLite]
    end

    subgraph DbLayer ["Database Layer"]
        Postgres[(PostgreSQL Database)]
        RLS[Row Level Security & Pl/pgSQL RPCs]
    end

    PresLayer --> BizLayer
    BizLayer --> SvcLayer
    SvcLayer --> RepoLayer
    RepoLayer --> DbLayer
```

## 2. Layer Definitions

### Presentation Layer
Builds the UI using React, Tailwind CSS, and shadcn/ui. Handles user input, state visualization, page routing, and charts.

### Business Logic Layer
Encapsulates transaction business rules, balance calculations, WebRTC signaling state transitions, and user session context.

### Service Coordination Layer
Bridges JavaScript frameworks with native phone APIs (such as geolocation background services and SMS interceptors).

### Repository & Cache Layer
Coordinates data reads and writes, routing queries to local Room databases when offline.
"""

# -----------------------------------------------------------------------------
# CHAPTER 10: LOW-LEVEL COMPONENT DESIGN
# -----------------------------------------------------------------------------
chapters['10_low_level_architecture.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 10</div>
    <h1>Low-Level Component Design</h1>
    <div class="chapter-subtitle">Bridge interfaces, Room structures, and background Kotlin workers</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the native plugins, Room database interfaces, and background Kotlin/Java worker scripts.
    </div>
</div>

## 1. Code Execution Map
Illustrates the interaction between JavaScript contexts and native Kotlin engines.

```mermaid
%% id: diag-low-level
%% caption: Code Components Interaction Diagram
flowchart TD
    subgraph WebRuntime ["Web Runtime (JS/TS)"]
        App[App.tsx Router] --> Page[Dashboard.tsx]
        Page --> useFinance[useFinance Hook]
        useFinance --> FinCtx[FinanceContext.tsx]
        FinCtx --> |Bridge Call| CachePlugin[TransactionCachePlugin JS]
    end

    subgraph AndroidRuntime ["Android Native Runtime (Kotlin/Java)"]
        CachePlugin -->|JSON serialization| CacheBridge[TransactionCachePlugin.kt]
        CacheBridge -->|SQL DAO call| RoomDao[TransactionDao.kt]
        RoomDao -->|Inserts/Queries| SQLite[(Room SQLite Database)]
        
        SmsReceiver[SmsBackgroundReceiver.java] -->|Captures PDU| SmsParser[SmsParserEngine.kt]
        SmsReceiver -->|Parsed JSON| SmsSync[SmsSyncWorker.kt]
        SmsSync -->|Room Write| RoomDao
        SmsSync -->|Supabase Write| SupabaseAuth[SupabaseTokenHelper.java]
    end
```

## 2. Native Component Specifications

### SmsParserEngine.kt
Runs regular expression parser trees to extract transaction types, amounts, and merchant details from SMS messages.

<div class="code-container">
    <div class="code-header">
        <span>android/app/.../SmsParserEngine.kt</span>
        <span class="code-lang-badge">kotlin</span>
    </div>
```kotlin
// Pre-compiled regex models for standard banking alert patterns
val amountRegex = Regex("(?i)(?:rs\\.?|inr|amt)\\s*([\\d,]+\\.?\\d*)")
val debitRegex = Regex("(?i)(?:debited|spent|paid|withdrawn|charged)")
val creditRegex = Regex("(?i)(?:credited|deposited|received|added)")
```
</div>

### TransactionCachePlugin.kt
Exposes SQLite methods to the React layer, translating JavaScript objects into database rows.
"""

# -----------------------------------------------------------------------------
# CHAPTER 11: DATABASE DESIGN & ERD
# -----------------------------------------------------------------------------
chapters['11_database_design.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 11</div>
    <h1>Database Design &amp; ERD</h1>
    <div class="chapter-subtitle">Relational Structure, Keys, Constraints, and Indexing Strategies</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Outlines the relational schema database model, indexes, and normalization configurations.
    </div>
</div>

## 1. Database Entity Relationship Diagram
Displays the schema tables, primary/foreign keys, and data relationships.

```mermaid
%% id: diag-erd
%% caption: Physical Database Entity Relationship Diagram (ERD)
erDiagram
    PROFILES ||--o| FAMILY_MEMBERS : "joined via user_id"
    FAMILY_GROUPS ||--o{ FAMILY_MEMBERS : "contains members"
    FAMILY_GROUPS ||--o{ FAMILY_REQUESTS : "receives join requests"
    PROFILES ||--o{ FAMILY_REQUESTS : "sends join requests"
    FAMILY_GROUPS ||--o{ FAMILY_INVITATIONS : "issues invitations"
    PROFILES ||--o{ FAMILY_INVITATIONS : "receives invitations"
    
    PROFILES ||--o{ TRANSACTIONS : "records"
    FAMILY_GROUPS ||--o{ TRANSACTIONS : "aggregates"
    
    PROFILES ||--o{ LOANS : "owes / lends"
    FAMILY_GROUPS ||--o{ LOANS : "tracks"
    
    PROFILES ||--o{ SAVINGS_ASSETS : "accumulates"
    FAMILY_GROUPS ||--o{ SAVINGS_ASSETS : "displays"

    PROFILES ||--o{ MY_PROOFS : "owns documents"
    
    PROFILES ||--o{ NOTIFICATIONS : "receives alerts"
    PROFILES ||--o{ FCM_TOKENS : "registers push tokens"
    PROFILES ||--o| USER_LOCATIONS : "shares location"
    PROFILES ||--o| USER_PREFERENCES : "customizes"
```

## 2. Integrity & Performance Design

### Normalization (3NF)
The schema uses 3NF to avoid data duplication. Junction tables (such as `family_members`) decouple user profiles from family structures.

### Performance Indexing
B-tree indexes are configured for columns that are queried frequently:
* `idx_transactions_member_id` on `transactions(member_id)`
* `idx_family_members_user_id` on `family_members(user_id)`
* `idx_my_proofs_user_id` on `my_proofs(user_id)`
"""

# -----------------------------------------------------------------------------
# CHAPTER 12: DATABASE PHYSICAL SCHEMA
# -----------------------------------------------------------------------------
chapters['12_database_schema.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 12</div>
    <h1>Database Physical Schema</h1>
    <div class="chapter-subtitle">PostgreSQL Table Structures, Data Types, Constraints, and Columns</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Technical details for all tables, fields, nullability, constraints, and column descriptions.
    </div>
</div>

## 1. Table: `profiles`
Stores user profile information.

<!-- table: Profiles Database Schema -->
| Field | Type | Nullable | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **No** | `PRIMARY KEY` | Links to Supabase `auth.users(id)`. |
| `name` | `TEXT` | Yes | - | Display name of the user. |
| `username` | `TEXT` | Yes | `UNIQUE` | Unique user handle. |
| `avatar` | `TEXT` | Yes | - | URL of the profile avatar image. |
| `bio` | `TEXT` | Yes | `DEFAULT ''` | Short bio or custom description. |
| `role` | `TEXT` | **No** | `CHECK (role IN ('admin', 'member'))` | Administrative level within group scope. |
| `family_id` | `UUID` | Yes | `REFERENCES family_groups(id)` | Currently active family group ID. |
| `updated_at` | `TIMESTAMPTZ`| Yes | `DEFAULT now()` | Last update timestamp. |

---

## 2. Table: `family_groups`
Defines family household containers.

<!-- table: Family Groups Database Schema -->
| Field | Type | Nullable | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **No** | `PRIMARY KEY` | Unique ID of the family group. |
| `family_code` | `TEXT` | **No** | `UNIQUE` | Human-readable ID (e.g. MSF-A7D8E2). |
| `name` | `TEXT` | **No** | - | Display name of the family unit. |
| `description` | `TEXT` | Yes | `DEFAULT ''` | Summary description of the household. |
| `avatar_url` | `TEXT` | Yes | - | URL to family group avatar image. |
| `created_by` | `UUID` | Yes | `REFERENCES profiles(id)` | Creator profile link. |
| `invite_token`| `TEXT` | **No** | `UNIQUE` | Secure UUID string for joins. |
| `created_at` | `TIMESTAMPTZ`| **No** | `DEFAULT now()` | Date of group initialization. |

---

## 3. Table: `transactions`
Contains financial entries (incomes, expenses, and savings allocations).

<!-- table: Transactions Database Schema -->
| Field | Type | Nullable | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **No** | `PRIMARY KEY` | Transaction ID. |
| `amount` | `NUMERIC` | **No** | `CHECK (amount > 0)` | Monetary value. |
| `category` | `TEXT` | **No** | - | Grouping tag (e.g. Food, Bills). |
| `type` | `TEXT` | **No** | `CHECK (type IN ('income', 'expense', 'savings', 'loan'))` | Ledger type. |
| `date` | `DATE` | **No** | - | Transaction date. |
| `notes` | `TEXT` | Yes | - | Free-text notes or transaction memo. |
| `member_id` | `UUID` | **No** | `REFERENCES profiles(id)` | Owner profile ID. |
| `proof_url` | `TEXT` | Yes | - | Link to receipt file in Storage. |
| `source` | `TEXT` | **No** | `DEFAULT 'manual'` | Source of entry (manual or SMS). |
| `bank_name` | `TEXT` | Yes | - | Detected financial institution. |
| `merchant_name`| `TEXT` | Yes | - | Merchant matching string. |
| `sms_confidence`| `NUMERIC`| Yes | - | Probability score of SMS parse engine. |
| `sms_reference`| `TEXT` | Yes | `UNIQUE` | Deduplication tracking key. |
| `created_at` | `TIMESTAMPTZ`| **No** | `DEFAULT now()` | Server insert timestamp. |
"""

# -----------------------------------------------------------------------------
# CHAPTER 13: CORE USER FLOWS
# -----------------------------------------------------------------------------
chapters['13_user_flows.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 13</div>
    <h1>Core User Flows</h1>
    <div class="chapter-subtitle">Onboarding, Document OCR, and Location Sharing Flows</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Displays state transitions and process workflows for onboarding and document vault ingestion.
    </div>
</div>

## 1. Onboarding &amp; Profile Creation Flow
Shows the steps required for a new user to register and join a family group.

```mermaid
%% id: flow-onboard
%% caption: User Registration and Onboarding Flow
stateDiagram-v2
    [*] --> NewUser : Launches App
    NewUser --> AuthRedirect : Clicks Register
    AuthRedirect --> InputDetails : Fills Name & Username
    InputDetails --> ValidateUsername : Checks uniqueness in DB
    ValidateUsername --> CreateProfile : Validates unique username
    CreateProfile --> CheckFamilyChoice : Profile created in Postgres
    CheckFamilyChoice --> CreateFamily : Selects 'Create New Family'
    CheckFamilyChoice --> JoinFamily : Selects 'Join Existing Family'
    CreateFamily --> InitLedger : Family code generated
    JoinFamily --> SubmitRequest : Inputs code & sends request
    SubmitRequest --> PendingApproval : Request stored in family_requests
    PendingApproval --> InitLedger : Admin approves member join
    InitLedger --> Dashboard : Launches home interface
```

---

## 2. Document OCR Ingestion Flow
Shows how a receipt or invoice is uploaded and processed using Gemini.

```mermaid
%% id: flow-ocr
%% caption: Secure Document Upload and OCR Extraction Flow
stateDiagram-v2
    [*] --> VaultTab : Navigates to MyProofs
    VaultTab --> TriggerUpload : Clicks "Upload Document"
    TriggerUpload --> CaptureFile : Selects file or opens camera
    CaptureFile --> StorageBucket : Uploads raw image to 'proofs' bucket
    StorageBucket --> GetPublicUrl : Obtains secure public URL
    GetPublicUrl --> GeminiAPI : Sends image bytes + extraction prompt
    GeminiAPI --> SuccessExtract : Returns parsed JSON
    GeminiAPI --> FailExtract : Request fails / Key error
    SuccessExtract --> PopulateForm : Populates UI fields automatically
    FailExtract --> ManualForm : Requests manual form entry
    PopulateForm --> DBWrite : User approves and clicks save
    ManualForm --> DBWrite : User fills fields and clicks save
    DBWrite --> [*] : Document displayed in list
```
"""

# -----------------------------------------------------------------------------
# CHAPTER 14: APPLICATION LIFECYCLE FLOW
# -----------------------------------------------------------------------------
chapters['14_application_flow.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 14</div>
    <h1>Application Lifecycle Flow</h1>
    <div class="chapter-subtitle">Application Lifecycle, State Transitions, and Background Execution</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the application lifecycle, from startup checks through to background execution.
    </div>
</div>

## 1. Application Runtime States
Shows the initialization steps, biometric checks, and active synchronization processes.

```mermaid
%% id: diag-lifecycle
%% caption: Application Runtime State Transitions
flowchart TD
    Start([1. Application Startup]) --> CheckPlatform{2. Device Platform?}
    
    CheckPlatform -->|Capacitor Native| InitAndroid[3. Initialize Native Plugins]
    CheckPlatform -->|Standard Web| InitWeb[4. Web Initialization]
    
    InitAndroid --> RequestPermissions[5. Request GPS, SMS, Notif Permissions]
    RequestPermissions --> LoadTheme[6. Read Theme & Settings]
    InitWeb --> LoadTheme
    
    LoadTheme --> AuthCheck{7. Valid Session Token?}
    
    AuthCheck -->|No Session| ShowLogin[8. Render Login/Register Form]
    AuthCheck -->|Active Session| CheckLock{9. App Lock Enabled?}
    
    CheckLock -->|Yes| TriggerBiometrics[10. Execute Biometric Auth / PIN]
    CheckLock -->|No| FetchLedger[11. Initialize Data Sync]
    
    TriggerBiometrics -->|Success| FetchLedger
    TriggerBiometrics -->|Fail| LockScreen[12. Prompt PIN Fallback / Close]
    
    FetchLedger --> LoadCache[13. Load Room DB Local Transactions]
    LoadCache --> RequestSupabase[14. Fetch Delta from Supabase API]
    RequestSupabase --> MainUI[15. Display Interactive Dashboard]
    
    MainUI --> AppRunning{16. Operating Mode?}
    
    AppRunning -->|Foreground Active| UserInput[17. Process Events / Update Charts]
    AppRunning -->|Background Transition| SyncState[18. Run syncBackgroundState]
    
    SyncState --> Terminated([19. Save Session state & Exit])
```

<div class="callout callout-info">
    <div class="callout-icon"><!-- ICON_INFO --></div>
    <div class="callout-content">
        <div class="callout-title">Platform Lifecycle Event</div>
        <div>In mobile applications, the `appStateChange` event triggers data synchronization automatically when the app is minimized.</div>
    </div>
</div>
"""

# -----------------------------------------------------------------------------
# CHAPTER 15: AUTHENTICATION & LOCK SEQUENCE
# -----------------------------------------------------------------------------
chapters['15_auth_flow.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 15</div>
    <h1>Authentication &amp; Lock Sequence</h1>
    <div class="chapter-subtitle">JWT Validations, Session Checks, and Biometric Lock Integrations</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> UML sequence showing the steps for user authentication and biometric access validation.
    </div>
</div>

## 1. Authentication Security Sequence
Describes how the client app interacts with native biometrics and remote databases.

```mermaid
%% id: seq-auth
%% caption: Authentication & Biometric Lock Sequence
sequenceDiagram
    autonumber
    actor User as Family Member
    participant UI as Frontend App (React)
    participant Auth as AuthContext.tsx
    participant Bio as BiometricAuthPlugin (Native)
    participant Svc as Supabase Auth Engine
    participant DB as Postgres profiles Table

    User->>UI: Launches application
    UI->>Auth: Checks stored login session
    Auth->>Svc: Validates JWT token expiration
    Svc-->>Auth: JWT Validated (claims returned)
    
    rect rgb(240, 243, 255)
        note right of UI: Application Lock Sequence
        Auth->>UI: Check app_lock setting in localStorage
        alt Settings shows App Lock is active
            UI->>Bio: invoke verifyAppLock()
            Bio->>User: Request Fingerprint / Face ID
            User-->>Bio: Provides biometric validation
            alt Biometrics Validated
                Bio-->>UI: return { success: true }
            else Biometrics Failed
                Bio-->>UI: return { success: false, fallback: pin }
                UI->>User: Displays PIN prompt
                User-->>UI: Inputs correct PIN
            end
        end
    end

    UI->>DB: Fetch profile metadata matching JWT UID
    DB-->>UI: Returns profile details (role, name, family_id)
    UI->>User: Renders Dashboard workspace
```
"""

# -----------------------------------------------------------------------------
# CHAPTER 16: EXPENSE & OCR INGESTION SEQUENCE
# -----------------------------------------------------------------------------
chapters['16_expense_flow.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 16</div>
    <h1>Expense &amp; OCR Ingestion Sequence</h1>
    <div class="chapter-subtitle">Manual entry, Storage uploads, Gemini parsing, and Local Caching</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the receipt processing pipeline, showing interactions between the client, Storage, and the Gemini API.
    </div>
</div>

## 1. Ingestion Sequence
Steps for uploading and parsing receipt images.

```mermaid
%% id: seq-expense
%% caption: Expense Ingestion and Gemini OCR Sequence
sequenceDiagram
    autonumber
    actor User as Family Member
    participant UI as AddTransaction.tsx Page
    participant Store as Supabase storage.from('proofs')
    participant Gem as Gemini API Bridge Client
    participant API as Supabase Database API
    participant Cache as TransactionCachePlugin (Room SQLite)

    User->>UI: Inputs transaction details or uploads receipt
    alt Receipt uploaded
        UI->>Store: upload(file_path, file_bytes)
        Store-->>UI: Returns { path: "proofs/receipt_502.jpg" }
        UI->>Gem: analyzeReceipt(image_bytes)
        note over Gem: Gemini executes OCR & Category mapping
        Gem-->>UI: Returns JSON (amount: 1450, category: "Groceries", merchant: "Walmart")
        UI->>UI: Pre-fills input fields with returned values
    end
    User->>UI: Clicks "Save Transaction"
    UI->>API: insert(transaction_payload)
    
    alt Network available
        API-->>UI: Returns { success: true, record: tx_row }
        UI->>Cache: cacheTransactions([tx_row])
    else Offline state
        UI->>Cache: savePendingTransaction(transaction_payload)
        note over Cache: Saved to Room SQLite. Scheduled for sync.
    end
    
    UI-->>User: Renders confirmation toast & updates dashboard charts
```
"""

# -----------------------------------------------------------------------------
# CHAPTER 17: BILL SCHEDULER & ALERT SEQUENCE
# -----------------------------------------------------------------------------
chapters['17_bill_reminder_flow.md'] = """<div class="chapter-header">
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
"""

# -----------------------------------------------------------------------------
# CHAPTER 18: AI ASSISTANT REASONING SEQUENCE
# -----------------------------------------------------------------------------
chapters['18_ai_assistant_flow.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 18</div>
    <h1>AI Assistant Reasoning Sequence</h1>
    <div class="chapter-subtitle">Language processing, Context builds, Gemini APIs, and Output translation</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the query parsing and context generation steps used by the AI assistant.
    </div>
</div>

## 1. Inquiry Pipeline
Shows the processing steps for incoming user questions.

```mermaid
%% id: flow-ai
%% caption: AI Assistant Query Processing Pipeline
flowchart TD
    Query[1. User inputs query] --> DetectLang{2. Detect language?}
    
    DetectLang -->|Non-English| Translate[3. Translate context to English]
    DetectLang -->|English| LoadContext[4. Fetch active ledger data]
    
    Translate --> LoadContext
    
    LoadContext --> FetchLimits[5. Query active user budget limits]
    FetchLimits --> BuildPrompt[6. Execute prompt builder templates]
    BuildPrompt --> GeminiAPI[7. Call Gemini 2.5 Flash API]
    
    GeminiAPI --> ValidateJson{8. Validate JSON schema?}
    
    ValidateJson -->|Invalid| Fallback[9. Execute parser recovery template]
    ValidateJson -->|Valid| FormatResponse[10. Render formatted Markdown output]
    
    Fallback --> FormatResponse
    FormatResponse --> TranslateBack{11. Original query non-English?}
    
    TranslateBack -->|Yes| TranslateOutput[12. Convert output to user language]
    TranslateBack -->|No| Output[13. Display response in chat UI]
    
    TranslateOutput --> Output
```
"""

# -----------------------------------------------------------------------------
# CHAPTER 19: SECURE DOCUMENT INGESTION SEQUENCE
# -----------------------------------------------------------------------------
chapters['19_document_vault_flow.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 19</div>
    <h1>Secure Document Ingestion Sequence</h1>
    <div class="chapter-subtitle">File Compression, Supabase Storage, and Metadata Extraction</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Outlines the document ingestion process, detailing the storage path and search indexing.
    </div>
</div>

## 1. Document Vault Flow
Shows the steps to upload and index document receipts.

```mermaid
%% id: flow-vault
%% caption: Secure Document Vault Processing Flow
flowchart TD
    Upload[1. User uploads document image] --> Storage[2. Upload to Supabase storage]
    Storage --> DBInsert[3. Create record in my_proofs table]
    DBInsert --> TriggerGemini{4. Network active & API key available?}
    
    TriggerGemini -->|Yes| GeminiOCR[5. Send file payload to Gemini]
    TriggerGemini -->|No| FallbackLocal[6. Run native ML Kit OCR]
    
    GeminiOCR --> ExtractMetadata[7. Extract text, amount, and doc number]
    ExtractMetadata --> GenerateSummary[8. Generate brief summary]
    
    FallbackLocal --> ExtractMetadataLocal[9. Extract plaintext metadata]
    
    GenerateSummary --> DBUpdate[10. Save metadata & summary to my_proofs record]
    ExtractMetadataLocal --> DBUpdate
    
    DBUpdate --> SearchIndex[11. Index document for search]
    SearchIndex --> Complete([12. Document displayed in Vault])
```
"""

# -----------------------------------------------------------------------------
# CHAPTER 20: VEHICLE SERVICE & ALERT SEQUENCE
# -----------------------------------------------------------------------------
chapters['20_vehicle_flow.md'] = """<div class="chapter-header">
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
"""

# -----------------------------------------------------------------------------
# CHAPTER 21: MEDICATION REMINDER SEQUENCE
# -----------------------------------------------------------------------------
chapters['21_medicine_reminder_flow.md'] = """<div class="chapter-header">
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
"""

# -----------------------------------------------------------------------------
# CHAPTER 22: REST API SPECIFICATIONS
# -----------------------------------------------------------------------------
chapters['22_api_documentation.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 22</div>
    <h1>REST API Specifications</h1>
    <div class="chapter-subtitle">Request Headers, Request Bodies, Responses, and Error Schemes</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Complete endpoint definitions for authentication, family groups, and transaction ledgers.
    </div>
</div>

## 1. Authentication Endpoints

### POST `/auth/v1/signup`
Registers a new user profile.

* **Request Headers:**
  ```http
  Content-Type: application/json
  apikey: SUPABASE_ANON_KEY
  ```
* **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123",
    "data": {
      "name": "ArulPrakash",
      "username": "arul_p"
    }
  }
  ```
* **Response (Status 200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {
      "id": "e3b0c442-98fc-11eb-a8b3-0242ac130003",
      "email": "user@example.com"
    }
  }
  ```

---

## 2. Transactions Endpoints

### GET `/rest/v1/transactions`
Retrieves transactions for the active family group.

* **Request Headers:**
  ```http
  Authorization: Bearer USER_JWT_TOKEN
  Range: 0-9
  ```
* **Query Parameters:**
  * `member_id`: Filter by owner profile ID (e.g. `eq.e3b0c442-98fc-11eb-a8b3-0242ac130003`)
* **Response (Status 200 OK):**
  ```json
  [
    {
      "id": "1d8b9f42-4b2a-4a8e-bc5d-6c12e9cf41d2",
      "amount": 2500.00,
      "category": "Utilities",
      "type": "expense",
      "date": "2026-07-05",
      "notes": "Electric Bill",
      "member_id": "e3b0c442-98fc-11eb-a8b3-0242ac130003"
    }
  ]
  ```
"""

# -----------------------------------------------------------------------------
# CHAPTER 23: SECURITY & THREAT ARCHITECTURE
# -----------------------------------------------------------------------------
chapters['23_security_architecture.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 23</div>
    <h1>Security &amp; Threat Architecture</h1>
    <div class="chapter-subtitle">STRIDE Threat Modeling, RLS Rules, and OWASP Mitigations</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Outlines the security architecture, data-at-rest encryption, and threat mitigations.
    </div>
</div>

## 1. STRIDE Threat Model

<!-- table: STRIDE Threat Model Mitigations -->
| Threat Category | Potential System Risk | Mitigation Strategy |
| :--- | :--- | :--- |
| **Spoofing** | Unauthorized user accesses another family's ledger. | Mandatory JWT validation on every query. Supabase RLS verification. |
| **Tampering** | Intercepting data in transit to modify balances. | Enforcement of TLS 1.3. Rejecting non-HTTPS client API requests. |
| **Repudiation** | User denies performing a transaction or deleting a file. | Audit trail tables logging all deletions and administrative updates. |
| **Information Disclosure** | Location leakage or exposing document contents. | Storage access verification based on owner ID folders. |
| **Denial of Service** | Flooding backend APIs or Edge functions. | Cloudflare rate-limiting rules. Max query limit checks in Postgres. |
| **Elevation of Privilege** | Normal family member tries to view Admin Activity logs. | Role checks (`role = 'admin'`) enforced in database policies. |

---

## 2. Row-Level Security (RLS) Policies
Row-level access controls are implemented directly at the database layer:

<div class="code-container">
    <div class="code-header">
        <span>supabase/migrations/001_user_locations.sql</span>
        <span class="code-lang-badge">sql</span>
    </div>
```sql
-- Allow reads only for family members within the same group
CREATE POLICY "Allow family members to view shared transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = (
        SELECT family_id FROM public.profiles 
        WHERE profiles.id = auth.uid()
      )
      AND family_members.user_id = transactions.member_id
    )
  );
```
</div>
"""

# -----------------------------------------------------------------------------
# CHAPTER 24: FRONTEND CORE ARCHITECTURE
# -----------------------------------------------------------------------------
chapters['24_frontend_architecture.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 24</div>
    <h1>Frontend Core Architecture</h1>
    <div class="chapter-subtitle">Directory Structures, Component Model, Routing, and Lazy Chunks</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the react component design, state providers, and code directory structure.
    </div>
</div>

## 1. Component Module Layout
The source directory structure decouples logic into contexts, custom hooks, and pages.

```mermaid
%% id: diag-fe-structure
%% caption: Frontend Source Directory Organization
graph TD
    src[src/] --> pages[pages/]
    src --> components[components/]
    src --> context[context/]
    src --> hooks[hooks/]
    src --> utils[utils/]
    src --> types[types/]

    pages --> Dashboard[Dashboard.tsx]
    pages --> AddTx[AddTransaction.tsx]
    pages --> Proofs[MyProofs.tsx]
    
    components --> ui[ui/ shadcn primitives]
    components --> family[family/ search/invite cards]
    
    context --> FinanceCtx[FinanceContext.tsx]
    context --> AuthCtx[AuthContext.tsx]
```

## 2. Core Frontend Patterns
* **Code Splitting:** Vite compiles views (such as `Analytics.tsx` and `Loans.tsx`) into separate chunks to optimize initial page loading.
* **Radix UI Primitives:** Dropdowns and modals are built on Radix primitives to support accessibility requirements.
"""

# -----------------------------------------------------------------------------
# CHAPTER 25: BACKEND CORE ARCHITECTURE
# -----------------------------------------------------------------------------
chapters['25_backend_architecture.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 25</div>
    <h1>Backend Core Architecture</h1>
    <div class="chapter-subtitle">PostgREST gateways, S3 Storages, Realtime brokers, and Edge functions</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the backend components and serverless Edge Function architectures.
    </div>
</div>

## 1. Serverless Execution Pipelines
Deno runtime components execute serverless tasks.

```mermaid
%% id: diag-be-arch
%% caption: Serverless Flow Architecture
graph TD
    Client[React App / Native Client]
    
    subgraph Supabase Serverless Architecture
        EdgeFuncs[Edge Functions / Deno Environment]
        Storage[Storage Server / S3 API]
        PostgREST[PostgREST / Auto Database REST]
        Realtime[Realtime Broadcast WebSocket Server]
    end
    
    Database[(Postgres Database)]
    
    Client -->|Upload file| Storage
    Client -->|REST queries| PostgREST
    Client <-->|VOIP Signaling| Realtime
    Client -->|Trigger Cron / Notifications| EdgeFuncs
    
    Storage --> Database
    PostgREST --> Database
    EdgeFuncs --> Database
    Realtime --> Database
```

## 2. Edge Function Triggers
* **`send-notification`**: Fired by database webhooks on transaction updates, dispatching push messages via Firebase.
* **`daily-rates-push`**: PG_Cron executes this function daily to update current currency exchange and physical asset rates.
"""

# -----------------------------------------------------------------------------
# CHAPTER 26: STATE MANAGEMENT & PERSISTENCE
# -----------------------------------------------------------------------------
chapters['26_state_management.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 26</div>
    <h1>State Management &amp; Persistence</h1>
    <div class="chapter-subtitle">React Contexts, Local Storage, Room Cache, and Synchronization Queue</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the synchronization queue, offline storage logic, and local states.
    </div>
</div>

## 1. Client-to-Cloud State Sync
Tracks data state sync between local storage and remote PostgreSQL.

```mermaid
%% id: diag-state
%% caption: Application State Management Topology
graph TD
    subgraph Client Memory
        ReactState[Component Local States]
        ContextState[React Context Providers: Auth, Finance, Calling]
    end

    subgraph Local Storage Devices
        LocalStorage[Preferences, Budget Limit, Cache Timestamps]
        SQLite[(Room SQLite Database)]
    end

    subgraph Remote Source of Truth
        Supabase[(Supabase Cloud Database)]
    end

    ReactState <-->|State Updates| ContextState
    ContextState <-->|Sync Preferences| LocalStorage
    ContextState <-->|Read / Write Cached Delta| SQLite
    ContextState <-->|Query API / WebSockets| Supabase
```

## 2. SQLite Cache Deduplication
Incoming transaction records are assigned a unique SMS reference ID. A SQLite constraints checker drops duplicate entries if a collision occurs.
"""

# -----------------------------------------------------------------------------
# CHAPTER 27: DEVOPS & CI/CD PIPELINE
# -----------------------------------------------------------------------------
chapters['27_devops_cicd.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 27</div>
    <h1>DevOps &amp; CI/CD Pipeline</h1>
    <div class="chapter-subtitle">Git workflows, Linting, Testing, and Production deployment</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Outlines the automated integration workflows and build checks used to deploy updates.
    </div>
</div>

## 1. Automated Integration Workflows
Details the actions triggered by code commits.

```mermaid
%% id: diag-cicd
%% caption: DevOps & CI/CD Flow
graph TD
    Commit[Developer commits code to GitHub] --> PullRequest[Pull Request Created]
    
    subgraph GitHub Actions Pipeline
        Lint[1. Execute ESLint check]
        Types[2. Validate TypeScript compilation]
        Build[3. Package production bundle]
        Test[4. Execute Unit & API Tests]
    end
    
    PullRequest --> Lint
    Lint --> Types
    Types --> Build
    Build --> Test
    
    Test -->|Pass| Merge[Merge to main branch]
    Merge --> DeployVercel[Deploy build to Vercel]
    Merge --> DeployAndroid[Package Android APK build]
    
    DeployVercel --> Prod[Production SPA Live]
    DeployAndroid --> Release[Update App Distribution]
```

## 2. GitHub Actions Configuration
Validates code compiles successfully before merging:

<div class="code-container">
    <div class="code-header">
        <span>.github/workflows/validate.yml</span>
        <span class="code-lang-badge">yaml</span>
    </div>
```yaml
name: Build and Validate
on:
  push:
    branches: [main]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Run Build
        run: npm ci && npm run build
```
</div>
"""

# -----------------------------------------------------------------------------
# CHAPTER 28: DEPLOYMENT ARCHITECTURE BLUEPRINT
# -----------------------------------------------------------------------------
chapters['28_deployment_architecture.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 28</div>
    <h1>Deployment Architecture Blueprint</h1>
    <div class="chapter-subtitle">Edge Servers, Postgres Nodes, Object Storage, and FCM Gateways</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Architecture layout mapping production servers, static CDNs, and database nodes.
    </div>
</div>

## 1. Production Infrastructure Deployment
Shows how client requests route to static and serverless nodes.

```mermaid
%% id: diag-deploy
%% caption: Production Infrastructure Deployment Layout
graph TD
    Client[User Browser / Android Client]
    VercelEdge[Vercel Edge Network / Global CDN]
    SupabasePostgres[(Supabase Dedicated Postgres Instance)]
    S3Buckets[Supabase Storage Buckets]
    GeminiEdge[Google Gemini Inference Nodes]
    FirebaseService[Firebase FCM Cloud Gateway]

    Client -->|HTTP / Fetch Web Assets| VercelEdge
    Client -->|REST Query / SQL| SupabasePostgres
    Client -->|Object Upload / Read| S3Buckets
    Client -->|Prompt execution| GeminiEdge
    SupabasePostgres -->|HTTP Trigger| FirebaseService
    FirebaseService -->|Push Alert| Client
```

## 2. Operational Specifications
* **Vercel Global Edge CDN:** Serves static bundle assets, reducing latency.
* **Database Mirroring:** Database read replicas are configured to support heavy analytic aggregations.
"""

# -----------------------------------------------------------------------------
# CHAPTER 29: HORIZONTAL & VERTICAL SCALABILITY
# -----------------------------------------------------------------------------
chapters['29_scalability.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 29</div>
    <h1>Horizontal &amp; Vertical Scalability</h1>
    <div class="chapter-subtitle">Scale-up, Scale-out, Replication, and Partitioning Strategy</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Outlines scaling strategies for the database, cache, and API gateways.
    </div>
</div>

## 1. System Scaling Strategy
Outlines the vertical, horizontal, and database scaling strategies.

```mermaid
%% id: diag-scalability
%% caption: Multi-Dimensional Scalability Model
graph TD
    ScaleDir[Scalability Pathways] --> Vertical[Vertical Scaling: Upgrade instance resources]
    ScaleDir --> Horizontal[Horizontal Scaling: Scale client & edge nodes]
    ScaleDir --> DbScale[Database Scaling: Partitioning & Read Replicas]
    
    Vertical --> UpgradeCPU[Add CPU & RAM to Database]
    
    Horizontal --> CDN[Deploy to Edge CDNs]
    Horizontal --> Serverless[Deno Serverless Auto-Scaling]
    
    DbScale --> ReadReplicas[Add Read Replicas for Analytics]
    DbScale --> Partitions[Partition Ledger tables by family_id]
```

## 2. Scaling Implementation

### Horizontal API Scaling
Supabase Edge Functions execute in isolated Deno isolates, scaling horizontally to meet demand.

### Database Partitioning
Large tables like `transactions` can be partitioned logically by `family_id` to distribute the read/write load.
"""

# -----------------------------------------------------------------------------
# CHAPTER 30: PERFORMANCE TUNING & OPTIMIZATION
# -----------------------------------------------------------------------------
chapters['30_performance_optimization.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 30</div>
    <h1>Performance Tuning &amp; Optimization</h1>
    <div class="chapter-subtitle">Code Splitting, Image Compression, and Query Indexes</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the caching policies, index strategies, and code optimizations.
    </div>
</div>

## 1. Code Splitting
Dynamic imports are used to compile views (such as `Analytics` and `Loans`) into separate chunks:

<div class="code-container">
    <div class="code-header">
        <span>src/App.tsx</span>
        <span class="code-lang-badge">typescript</span>
    </div>
```typescript
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Loans = React.lazy(() => import('./pages/Loans'));
```
</div>

## 2. Query Index Tuning
Indexes are placed on columns that are queried frequently:

<div class="code-container">
    <div class="code-header">
        <span>supabase/migrations/002_user_preferences.sql</span>
        <span class="code-lang-badge">sql</span>
    </div>
```sql
CREATE INDEX IF NOT EXISTS idx_transactions_member_date 
  ON public.transactions(member_id, date DESC);
```
</div>
"""

# -----------------------------------------------------------------------------
# CHAPTER 31: OBSERVABILITY & MONITORING
# -----------------------------------------------------------------------------
chapters['31_monitoring.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 31</div>
    <h1>Observability &amp; Monitoring</h1>
    <div class="chapter-subtitle">Error tracking, Edge function logs, and Query performance metrics</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the logging and diagnostic systems used to monitor application health.
    </div>
</div>

## 1. Monitoring Topology
Shows the flow of error logs from client to storage.

```mermaid
%% id: diag-monitoring
%% caption: System Monitoring & Observability Topology
graph TD
    App[Application Frontend] -->|Error events| Sentry[Sentry Error Tracking]
    EdgeFunc[Supabase Edge Functions] -->|Function logs| SupaLogs[Supabase Logging Platform]
    Database[(Postgres Instance)] -->|Query stats| DBMonitor[Postgres PG_STAT_STATEMENTS]
    
    Sentry --> Alert[Alert Manager / PagerDuty]
    SupaLogs --> Alert
    DBMonitor --> Alert
```
"""

# -----------------------------------------------------------------------------
# CHAPTER 32: VERIFICATION & TESTING STRATEGY
# -----------------------------------------------------------------------------
chapters['32_testing_strategy.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 32</div>
    <h1>Verification &amp; Testing Strategy</h1>
    <div class="chapter-subtitle">Unit testing, Integration testing, and E2E browser flows</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Outlines the testing frameworks and test coverage targets.
    </div>
</div>

## 1. Testing Framework Structure
Shows the test types and associated frameworks.

```mermaid
%% id: diag-tests
%% caption: Testing Lifecycle Pyramid
graph TD
    E2E[E2E Tests: Playwright / Capacitor Test Suite] --> Integration[Integration Tests: Jest / Supertest]
    Integration --> Unit[Unit Tests: Vitest / Room DB Unit Tests]
```

## 2. Test Execution

### Running Frontend Tests
```bash
# Execute unit and component tests with Vitest
npm run test:unit
```

### Running Native Android Tests
```bash
# Execute unit tests in the Android project
./gradlew testDebugUnitTest
```
"""

# -----------------------------------------------------------------------------
# CHAPTER 33: CODEBASE DIRECTORY TREE
# -----------------------------------------------------------------------------
chapters['33_folder_structure.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 33</div>
    <h1>Codebase Directory Tree</h1>
    <div class="chapter-subtitle">Codebase Structure, Module Locations, and Build Configs</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Maps the folder tree, codebase files, and configuration directories.
    </div>
</div>

```text
MS_Family_Workspace/
│
├── android/                        # Android Studio Native project files
│   └── app/src/main/java/com/msfamily/app/
│       ├── BackgroundLocationWorker.kt   # Geolocation sync worker
│       ├── BiometricAuthPlugin.java      # Native biometric app lock
│       ├── SmsBackgroundReceiver.java    # Intercepts incoming SMS
│       ├── SmsParserEngine.kt            # Regular expression parser
│       ├── SmsSyncWorker.kt              # Local-to-cloud SMS sync worker
│       ├── TransactionCachePlugin.kt     # SQLite database interface
│       └── TransactionDatabase.kt        # Room database initializer
│
├── supabase/                       # Supabase configuration & migrations
│   ├── functions/                  # Deno Edge Functions
│   │   ├── send-notification/
│   │   └── daily-rates-push/
│   └── migrations/                 # DB migrations and triggers
│
├── src/                            # React Frontend Source files
│   ├── components/                 # Reusable UI elements
│   │   ├── ui/                     # shadcn UI components
│   │   └── Layout.tsx              # Main navigation shell
│   ├── context/                    # React Context providers
│   │   ├── AuthContext.tsx         # User session manager
│   │   ├── FinanceContext.tsx      # Ledger state manager
│   │   ├── FamilyContext.tsx       # Group settings broker
│   │   └── CallContext.tsx         # WebRTC voice coordinator
│   ├── pages/                      # Page components
│   │   ├── Dashboard.tsx           # Primary home dashboard
│   │   ├── Transactions.tsx        # Ledger list interface
│   │   ├── MyProofs.tsx            # Secure document vault
│   │   ├── Loans.tsx               # Loan & EMI tracking interface
│   │   └── LiveTracking.tsx        # Geolocation sharing map
│   └── utils/                      # Helper libraries & services
│
├── package.json                    # Dependencies configuration
├── tailwind.config.js              # CSS design configuration
└── vite.config.ts                  # Vite build parameters
```
"""

# -----------------------------------------------------------------------------
# CHAPTER 34: CONFIGURATION & ENVIRONMENTS
# -----------------------------------------------------------------------------
chapters['34_environment_variables.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 34</div>
    <h1>Configuration &amp; Environments</h1>
    <div class="chapter-subtitle">Environment Variables, Deployment Modes, and Key Security</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the environment variables, settings, and key configurations.
    </div>
</div>

## Environment Variables Configuration

<!-- table: Environment Variables Registry -->
| Variable Name | Example Value | Description | Security Recommendation |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://x.supabase.co` | API URL for the Supabase instance. | Publicly visible in client bundle. |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Anonymous public API key. | Encrypted but visible in client bundle. |
| `VITE_GEMINI_API_KEY` | `AIzaSy...` | Developer API key for Google Gemini. | Should be routed through an Edge Function. |
| `FCM_SERVER_KEY` | `AAAA...` | Firebase Cloud Messaging server key. | **Keep Secret.** Store only in Edge Functions. |
| `CLERK_PUBLISHABLE_KEY` | `pk_live...` | Clerk authentication keys. | Publicly visible in client bundle. |
"""

# -----------------------------------------------------------------------------
# CHAPTER 35: DESIGN SYSTEM & TOKENS
# -----------------------------------------------------------------------------
chapters['35_design_system.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 35</div>
    <h1>Design System &amp; Tokens</h1>
    <div class="chapter-subtitle">Typography scales, Palette hexes, Spacing, and Button Tokens</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Design specifications, custom colors, and typography layouts.
    </div>
</div>

## 1. Color Palette

* **Primary (Deep Navy):** `#0b1530`
* **Secondary (Indigo):** `#4f46e5`
* **Accent (Emerald):** `#10b981`
* **Support (Slate Gray):** `#64748b`

---

## 2. Typography

* **Document Title:** `32pt` Bold, Line Height `1.15`
* **Heading 1:** `24pt` Bold, Line Height `1.2`
* **Heading 2:** `15pt` Semi-Bold, Line Height `1.3`
* **Body Text:** `10pt` Regular, Line Height `1.625`
* **Monospace / Code:** `8.5pt` Fira Code, Line Height `1.5`
"""

# -----------------------------------------------------------------------------
# CHAPTER 36: UML CORE BLUEPRINTS
# -----------------------------------------------------------------------------
chapters['36_uml_diagrams.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 36</div>
    <h1>UML Core Blueprints</h1>
    <div class="chapter-subtitle">UML Use Case, Class, Sequence, and Deployment Diagrams</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> System architecture blueprints illustrating user actions, component layouts, and deployment topologies.
    </div>
</div>

## 1. Use Case Diagram
Outlines how users interact with various modules.

```mermaid
%% id: uml-usecase
%% caption: UML Use Case Blueprint
flowchart LR
    Member[Family Member] --> UC1[Manage Transactions]
    Member --> UC2[Upload Proof Documents]
    Member --> UC3[Share Live Location]
    Member --> UC4[Initiate WebRTC Voice Call]
    Member --> UC5[Register SMS Sync]
    
    Admin[Family Admin] --> Member
    Admin --> UC6[Manage Family Members]
    Admin --> UC7[View Administrative Logs]
```

---

## 2. System Deployment Diagram
Shows the physical distribution of system components.

```mermaid
%% id: uml-deploy
%% caption: UML Deployment Blueprint
flowchart TD
    subgraph Client Node
        Browser[User Web Browser]
        AndroidOS[Android Native Device]
    end

    subgraph CDN Layer
        Vercel[Vercel Assets CDN]
    end

    subgraph Service Cloud Nodes
        SupaEdge[Supabase Edge Functions Deno]
        Gemini[Gemini AI Inference Nodes]
        FCM[Firebase Message Gateway]
    end

    subgraph Database Node
        SupaDB[(Supabase Postgres Database)]
    end

    Browser -->|HTTP| Vercel
    AndroidOS -->|HTTP| Vercel
    
    Browser <-->|REST / TLS| SupaDB
    AndroidOS <-->|REST / TLS| SupaDB
    
    AndroidOS -->|GPS Updates| SupaEdge
    AndroidOS -->|OCR Request| Gemini
    
    SupaEdge -->|Push Notifications| FCM
    FCM -->|Push Alerts| AndroidOS
    SupaEdge <-->|Read / Write| SupaDB
```
"""

# -----------------------------------------------------------------------------
# CHAPTER 37: ARCHITECTURE DECISION RECORDS (ADRS)
# -----------------------------------------------------------------------------
chapters['37_adr.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 37</div>
    <h1>Architecture Decision Records (ADRs)</h1>
    <div class="chapter-subtitle">Technology selections, framework justifications, and architecture records</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the ADR records for framework and database selections.
    </div>
</div>

## ADR-001: Selection of React + Vite for Frontend Development

### Status
**Approved**

### Context
We needed a fast, component-based frontend framework to support a responsive web dashboard and hybrid mobile application compiled via Capacitor.

### Decision
React 18 was chosen for its component model and state management contexts. Vite was selected as the build tool to replace Webpack, providing faster development builds and optimized production assets.

### Consequences
* **Positives:** Faster builds, clean module imports, and a component architecture that supports state management.
* **Negatives:** Relies on client-side rendering, which requires caching strategies to optimize initial load times.

---

## ADR-002: Selection of Supabase (PostgreSQL) for Database & Auth

### Status
**Approved**

### Context
We needed a database that supports relational queries, user authentication, storage, and real-time data sync without requiring a custom API server.

### Decision
Supabase was selected. It provides a managed PostgreSQL database with Row-Level Security (RLS), authentication, storage, and real-time subscription engines.

### Consequences
* **Positives:** Built-in RLS policies simplify security, database changes sync automatically, and storage is integrated out of the box.
* **Negatives:** Increases dependency on a single service provider. Complex logic must be handled using PL/pgSQL database functions or Edge Functions.
"""

# -----------------------------------------------------------------------------
# CHAPTER 38: AI & LLM ENGINEERING PATTERN
# -----------------------------------------------------------------------------
chapters['38_ai_architecture.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 38</div>
    <h1>AI &amp; LLM Engineering Pattern</h1>
    <div class="chapter-subtitle">Prompt configurations, JSON schema validations, and fallback parser structures</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the prompt configurations, schemas, and fallback parser structures.
    </div>
</div>

## 1. Gemini Ingestion Prompt Structure
When processing receipts in `MyProofs`, the system sends the image payload to Gemini with a structured prompt:

<div class="code-container">
    <div class="code-header">
        <span>prompt_templates/receipt_extraction.txt</span>
        <span class="code-lang-badge">text</span>
    </div>
```text
Return ONLY a valid JSON object matching the schema below. Do not include markdown formatting or markdown wrappers like ```json.
SCHEMA:
{
  "amount": number,
  "category": "Food" | "Utilities" | "Health" | "Travel" | "Other",
  "merchantName": string,
  "documentNumber": string or null,
  "date": "YYYY-MM-DD" or null,
  "summary": "1-sentence summary of the document contents"
}
```
</div>

## 2. Parsing &amp; Recovery Flow
The frontend validates the JSON format of the response from Gemini. If the response contains markdown code fences, they are removed. If parsing fails, the system falls back to basic regex extraction before prompting the user for manual entry:

<div class="code-container">
    <div class="code-header">
        <span>src/pages/MyProofs.tsx</span>
        <span class="code-lang-badge">javascript</span>
    </div>
```javascript
// Example recovery parsing helper in MyProofs.tsx
function parseGeminiJson(text: string): any {
  let cleanText = text.trim();
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(cleanText);
}
```
</div>
"""

# -----------------------------------------------------------------------------
# CHAPTER 39: PRODUCT EVOLUTION ROADMAP
# -----------------------------------------------------------------------------
chapters['39_future_roadmap.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 39</div>
    <h1>Product Evolution Roadmap</h1>
    <div class="chapter-subtitle">Phased development plans, forecasts, and integrations</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Future feature plans, forecasting integrations, and IoT linkages.
    </div>
</div>

## 1. Roadmap Timeline
Shows the roadmap for future releases.

```mermaid
%% id: diag-roadmap
%% caption: Future Product Roadmap Timeline
gantt
    title MS Family Future Feature Roadmap
    dateFormat  YYYY-MM
    section Phase 1: Smart Finance
    Smart Budget Forecasting   :2026-08, 30d
    Subscription Advisor       :2026-09, 30d
    section Phase 2: Family Connect
    Family Group Chat          :2026-10, 45d
    Voice Assistant (Voice Control) :2026-11, 60d
    section Phase 3: Smart Home
    IoT Smart Appliance Link   :2026-12, 90d
    Carbon Footprint Tracking  :2027-02, 60d
```

## 2. Future Module Definitions
* **Smart Budget Forecasting:** Uses historical transaction data to predict future household expenses.
* **IoT Smart Appliance Link:** Integrates with smart utility meters to track home energy usage on the dashboard.
"""

# -----------------------------------------------------------------------------
# CHAPTER 40: APPENDIX & BIBLIOGRAPHY
# -----------------------------------------------------------------------------
chapters['40_appendix.md'] = """<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 40</div>
    <h1>Appendix &amp; Bibliography</h1>
    <div class="chapter-subtitle">Glossary terms, version references, risks, and changes</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Technical definitions, references, and project histories.
    </div>
</div>

## 1. Glossary &amp; Technical Definitions
* **Row-Level Security (RLS):** Database-layer security policy that isolates table rows based on user claims.
* **Capacitor:** Cross-platform hybrid runtime bridge linking JS SPAs with native mobile wrappers.
* **WebRTC:** Peer-to-peer real-time communication protocols for audio, video, and data channels.
* **FCM (Firebase Cloud Messaging):** Push notification routing service.

## 2. Bibliography &amp; References
1. *PostgreSQL Row Level Security Documentation*, https://www.postgresql.org/docs/current/ddl-rowsecurity.html
2. *Capacitor Android Plugin Guide*, https://capacitorjs.com/docs/plugins/android
3. *WebRTC Architectures and Protocol Specifications*, RFC 7478.
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

print("\nAll Markdown chapters generated successfully in documentation/src/!")
