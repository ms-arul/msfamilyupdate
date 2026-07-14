<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 23</div>
    <h1>Security &amp; Threat Architecture</h1>
    <div class="chapter-subtitle">STRIDE Threat Modeling, RLS Rules, and OWASP Mitigations</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Outlines the security architecture, data-at-rest encryption, and threat mitigations.
    </div>
</div>

## 1. STRIDE Threat Model

<!-- table: STRIDE Threat Model Mitigations -->
| Threat Category | Potential System Risk | Mitigation Strategy |
| :--- | :--- | :--- |
| **Spoofing** | Unauthorized user accesses another family's ledger. | Mandatory JWT validation on every query. Supabase RLS verification. |
| **Tampering** | Intercepting data in transit to modify balances. | Enforcement of TLS 1.3. Rejecting non-HTTPS client API requests. |
| **Repudiation** | User denies performing a transaction or deleting a file. | Audit trail tables logging all deletions and administrative updates. |
| **Information Disclosure** | Location leakage or exposing document contents. | Storage access verification based on owner ID folders. |
| **Denial of Service** | Flooding backend APIs or Edge functions. | Cloudflare rate-limiting rules. Max query limit checks in Postgres. |
| **Elevation of Privilege** | Normal family member tries to view Admin Activity logs. | Role checks (`role = 'admin'`) enforced in database policies. |

---

## 2. Row-Level Security (RLS) Policies
Row-level access controls are implemented directly at the database layer:

<div class="code-container">
    <div class="code-header">
        <span>supabase/migrations/001_user_locations.sql</span>
        <span class="code-lang-badge">sql</span>
    </div>
```sql
-- Allow reads only for family members within the same group
CREATE POLICY "Allow family members to view shared transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_members.family_id = (
        SELECT family_id FROM public.profiles 
        WHERE profiles.id = auth.uid()
      )
      AND family_members.user_id = transactions.member_id
    )
  );
```
</div>
