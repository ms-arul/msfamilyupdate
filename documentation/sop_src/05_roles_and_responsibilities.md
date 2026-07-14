<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 05</div>
    <h1>Roles &amp; Responsibilities RACI</h1>
    <div class="chapter-subtitle">Operations Staff, RACI Matrix, and System Boundaries</div>
</div>

## 1. RACI Matrix

<!-- table: Operational Responsibility Matrix (RACI) -->
| Operational Task | SysAdmin | DevOps | Developer | DBA | SecAdmin | Support | Family Admin |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **System Startup & Health** | **A** | **R** | **C** | **C** | **I** | **I** | **I** |
| **User Provisioning** | **R** | **I** | **I** | **I** | **A** | **C** | **R** |
| **Database Vacuum & Index** | **C** | **C** | **I** | **R** | **I** | **I** | **I** |
| **Security Auditing** | **A** | **C** | **I** | **C** | **R** | **I** | **I** |
| **Application Deployment** | **A** | **R** | **R** | **C** | **C** | **I** | **I** |
| **Backup Verification** | **A** | **R** | **I** | **R** | **I** | **I** | **I** |
| **Disaster Recovery** | **A** | **R** | **C** | **R** | **R** | **C** | **I** |

* **R (Responsible):** The role that executes the task.
* **A (Accountable):** The role with approval authority and final ownership.
* **C (Consulted):** Roles that provide input.
* **I (Informed):** Roles notified of outcomes.

<div class="callout callout-best-practice">
    <div class="callout-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg></div>
    <div class="callout-content">
        <div class="callout-title">Operational Constraint</div>
        <div>No single developer may hold both Accountable (A) and Responsible (R) privileges for production deployment workflows.</div>
    </div>
</div>
