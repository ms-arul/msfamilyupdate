<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 30</div>
    <h1>Performance Tuning &amp; Optimization</h1>
    <div class="chapter-subtitle">Code Splitting, Image Compression, and Query Indexes</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the caching policies, index strategies, and code optimizations.
    </div>
</div>

## 1. Code Splitting
Dynamic imports are used to compile views (such as `Analytics` and `Loans`) into separate chunks:

<div class="code-container">
    <div class="code-header">
        <span>src/App.tsx</span>
        <span class="code-lang-badge">typescript</span>
    </div>
```typescript
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Loans = React.lazy(() => import('./pages/Loans'));
```
</div>

## 2. Query Index Tuning
Indexes are placed on columns that are queried frequently:

<div class="code-container">
    <div class="code-header">
        <span>supabase/migrations/002_user_preferences.sql</span>
        <span class="code-lang-badge">sql</span>
    </div>
```sql
CREATE INDEX IF NOT EXISTS idx_transactions_member_date 
  ON public.transactions(member_id, date DESC);
```
</div>
