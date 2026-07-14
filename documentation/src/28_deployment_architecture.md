<div class="chapter-header">
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
