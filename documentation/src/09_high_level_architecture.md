<div class="chapter-header">
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
