# WATECH-BI — PRODUCTION DEPLOYMENT RUNBOOK
**Document Version:** 1.0.0  
**Project:** Watech-BI Multi-Tenant SaaS Platform  
**Target Platform:** Vercel (Edge Network & Serverless Compute)

---

## 1. Quick Reference & Core URLs
- **Live Deployment URL:** `https://watech-bi.vercel.app`
- **Immutable Build Deployment URL:** `https://watech-as7w93ws2-asad1218.vercel.app`
- **Vercel Project Dashboard:** `https://vercel.com/asad1218/watech-bi`
- **Health Check Probe:** `https://watech-bi.vercel.app/api/health`

---

## 2. Standard Deployment Workflow

### Step 1 — Local Verification & Build
Before deploying to production, run:
```bash
# Generate Prisma types
npx prisma generate

# Execute production Next.js build
npm run build
```
Verify exit code is 0 and all 33 routes generate without TypeScript or Lint errors.

### Step 2 — Deploying a Preview
From the application root (`E:\watech-bi` or `watech-bi` directory):
```bash
vercel
```
This uploads the files, executes the remote build in Washington D.C. (`iad1`), runs `npx prisma generate && next build`, and issues an ephemeral preview URL.

### Step 3 — Promoting to Production
When ready to promote preview to production:
```bash
vercel --prod
```
Vercel updates the production alias `https://watech-bi.vercel.app`.

---

## 3. Database Migration Release Process

When a cloud PostgreSQL instance (`DATABASE_URL`) is connected:
1. Review generated migration files in `prisma/migrations/`.
2. Apply Prisma schema migration:
   ```bash
   npx prisma migrate deploy
   ```
3. Apply Row-Level Security policies:
   ```bash
   psql -d $DATABASE_URL -f prisma/migrations/0_init_rls/migration.sql
   ```
4. Verify RLS is active:
   ```bash
   psql -d $DATABASE_URL -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
   ```

---

## 4. Rollback Procedure
If a production issue occurs:
1. Open the Vercel dashboard: `https://vercel.com/asad1218/watech-bi`.
2. Go to **Deployments**.
3. Locate the previous healthy deployment (e.g., `dpl_Ebd2X5KkzXHnJivMnMbZfn5JbMZm`).
4. Click **Instant Rollback**.
5. Within 5 seconds, all global CDN traffic is routed to the previous working deployment.