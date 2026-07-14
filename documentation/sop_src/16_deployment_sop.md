<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 16</div>
    <h1>CI/CD Release &amp; Rollback SOP</h1>
    <div class="chapter-subtitle">Promotion Pathways, Production Releases, and Rollback Procedures</div>
</div>

## SOP-DEP-01: Production Code Deployment

### 1. Purpose
Defines the process for releasing software updates to production.

### 2. Prerequisites
1. All linting and TypeScript checks must pass in GitHub Actions.
2. QA lead must sign off on the release build.

### 3. Step-by-Step Procedure
1. **Staging Deploy:** Push the release branch to `staging`. Trigger integration tests.
2. **Production Deploy:** Merge staging branch into `main`. GitHub Actions builds and pushes the static assets to Vercel production:
   ```bash
   vercel --prod --token=VERCEL_PROD_DEPLOYMENT_TOKEN
   ```
3. **Smoke Tests:** Execute post-deploy smoke tests.

### 4. Rollback Procedure
If smoke tests fail post-deployment:
1. Locate the last successful deployment commit in GitHub.
2. Revert the production deployment via Vercel:
   ```bash
   vercel rollback DEPLOYMENT_ID --token=VERCEL_PROD_DEPLOYMENT_TOKEN
   ```
