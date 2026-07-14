<div class="chapter-header">
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
