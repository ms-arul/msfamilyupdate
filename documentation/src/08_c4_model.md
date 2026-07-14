<div class="chapter-header">
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
