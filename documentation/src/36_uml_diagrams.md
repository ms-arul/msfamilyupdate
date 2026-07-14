<div class="chapter-header">
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
