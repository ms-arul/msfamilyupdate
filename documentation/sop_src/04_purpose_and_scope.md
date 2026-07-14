<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 04</div>
    <h1>Purpose, Scope &amp; Governance</h1>
    <div class="chapter-subtitle">Operational Bounds, Compliance, and Business Governance Standards</div>
</div>

## 1. Objectives of the Manual
This Standard Operating Procedures (SOP) Manual defines the procedures for running, monitoring, maintaining, and recovering the **MS Family** platform. It ensures operational consistency and reduces service interruptions.

## 2. Operational Scope
This document covers the following environments:

```mermaid
%% id: diag-scope
%% caption: SOP Scope Matrix and Lifecycle Operations
graph TD
    Scope[MS Family SOP Scope] --> Infrastructure[Infrastructure Operations]
    Scope --> Data[Data & Database Administration]
    Scope --> Security[Security & Access Management]
    Scope --> Deploy[Release Management]

    Infrastructure -->|Includes| EdgeFuncs[Supabase Edge Functions]
    Infrastructure -->|Includes| StaticAsset[Vercel Static CDNs]
    
    Data -->|Includes| RoomCache[Local Room SQLite Cache]
    Data -->|Includes| CloudDB[PostgreSQL RLS Instances]
    
    Security -->|Includes| KeyRotation[Vault Key Rotations]
    Security -->|Includes| JWTChecks[Session Token Invalidation]
    
    Deploy -->|Includes| CICD[GitHub Actions CI/CD]
    Deploy -->|Includes| Rollback[Automated Deployment Rollbacks]
```

<div class="callout callout-info">
    <div class="callout-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
    <div class="callout-content">
        <div class="callout-title">Excluded Scope Items</div>
        <div>Hardware failures at Google Cloud (Gemini) or Supabase (PostgreSQL hosting) are managed under their respective SLAs and are excluded from this manual.</div>
    </div>
</div>
