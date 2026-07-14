<div class="chapter-header">
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
