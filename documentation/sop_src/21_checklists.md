<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 21</div>
    <h1>Maintenance &amp; Release Checklists</h1>
    <div class="chapter-subtitle">Operational checklists for System Maintenance and Code Releases</div>
</div>

## 1. Daily Operations Checklist
- `[ ]` Confirm daily pg_dump backups completed successfully at 01:00 UTC.
- `[ ]` Verify Supabase database connection pool utilization is $< 80\%$.
- `[ ]` Review Sentry dashboard for new critical errors or exceptions.
- `[ ]` Check Gemini API rate limit warnings and usage costs in Google Cloud Console.

---

## 2. Production Code Release Checklist
- `[ ]` Verify TypeScript compile and build tests pass in GitHub Actions.
- `[ ]` Run schema migrations on staging database and verify compatibility.
- `[ ]` Execute unit test coverage checks (coverage target $\ge 80\%$).
- `[ ]` Confirm Vercel production preview builds look correct.
- `[ ]` Obtain release authorization from the Operations Lead.
- `[ ]` Execute deploy and run post-deploy smoke tests.
