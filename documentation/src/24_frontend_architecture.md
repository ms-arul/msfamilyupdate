<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 24</div>
    <h1>Frontend Core Architecture</h1>
    <div class="chapter-subtitle">Directory Structures, Component Model, Routing, and Lazy Chunks</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the react component design, state providers, and code directory structure.
    </div>
</div>

## 1. Component Module Layout
The source directory structure decouples logic into contexts, custom hooks, and pages.

```mermaid
%% id: diag-fe-structure
%% caption: Frontend Source Directory Organization
graph TD
    src[src/] --> pages[pages/]
    src --> components[components/]
    src --> context[context/]
    src --> hooks[hooks/]
    src --> utils[utils/]
    src --> types[types/]

    pages --> Dashboard[Dashboard.tsx]
    pages --> AddTx[AddTransaction.tsx]
    pages --> Proofs[MyProofs.tsx]
    
    components --> ui[ui/ shadcn primitives]
    components --> family[family/ search/invite cards]
    
    context --> FinanceCtx[FinanceContext.tsx]
    context --> AuthCtx[AuthContext.tsx]
```

## 2. Core Frontend Patterns
* **Code Splitting:** Vite compiles views (such as `Analytics.tsx` and `Loans.tsx`) into separate chunks to optimize initial page loading.
* **Radix UI Primitives:** Dropdowns and modals are built on Radix primitives to support accessibility requirements.
