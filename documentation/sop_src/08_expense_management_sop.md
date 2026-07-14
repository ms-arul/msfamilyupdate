<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 08</div>
    <h1>Expense &amp; Ledger Ingestion SOP</h1>
    <div class="chapter-subtitle">Manual Posting, SMS Interceptions, and Monthly Close Workflows</div>
</div>

## SOP-FIN-01: Ledger Category Maintenance

### 1. Purpose
Maintains consistency in financial reporting by managing the categorization rules for household expenses.

### 2. Step-by-Step Procedure
1. **Deduplication Check:** When transactions are written from the Android SMS Receiver, ensure the system runs a deduplication query:
   ```sql
   SELECT id FROM public.transactions WHERE sms_reference = 'SMS_UNIQUE_REF_HASH';
   ```
2. **Postgres Ingestion Check:** Execute audit sweep queries once a day to check for category mismatches:
   ```sql
   SELECT id, category FROM public.transactions 
   WHERE category NOT IN ('Food', 'Utilities', 'Health', 'Travel', 'Loans', 'Other');
   ```
3. **Manual Adjustments:** Correct mismatched entries by running a targeted update through the Supabase console, logging the change in the audit database.

<div class="callout callout-security">
    <div class="callout-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></div>
    <div class="callout-content">
        <div class="callout-title">Audit Trail Enforcement</div>
        <div>Direct database edits are restricted to emergency scenarios and must be logged in the system audit trail.</div>
    </div>
</div>
