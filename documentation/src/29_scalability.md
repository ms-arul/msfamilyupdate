<div class="chapter-header">
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
