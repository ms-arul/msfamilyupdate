<div class="chapter-header">
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
    <div class="callout-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div>
    <div class="callout-content">
        <div class="callout-title">ADR Reference: Decoupled Gateways</div>
        <div>Using Supabase's direct PostgREST API reduces network hops, routing read/write actions directly to PostgreSQL through RLS policies. Detailed decisions are documented in <a href="#37_adr">ADR-002</a>.</div>
    </div>
</div>
