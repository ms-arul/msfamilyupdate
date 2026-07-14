<div class="chapter-header">
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
