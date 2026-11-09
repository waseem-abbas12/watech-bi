# WATECH-BI — PRODUCTION BLOCKERS & EXTERNAL DEPENDENCIES REGISTER
**Last Updated:** 2026-11-07  
**Status:** Live Preview & Production Vercel Deployed (`https://watech-bi.vercel.app`)

This register records all external dependencies, credentials, and repository authorization requirements needed to unlock full external cloud capabilities.

---

## 1. Active External Dependencies & Action Items

| Item | Component | Severity | Description & Required Owner Action | Current Application Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **BLK-01** | **GitHub Push Authorization** | **Medium** | The remote repository `https://github.com/asad1218-coder/hvac-concept.git` returned HTTP 403 (`Permission denied to waseem-abbas12`). To push commits directly to GitHub: Owner must add `waseem-abbas12` as a collaborator with write access, or supply SSH keys/PAT for `asad1218-coder`. | Code committed cleanly to local git branch `main` (`commit e903de01538f7d680e04febcf33460c921bd82cf`). |
| **BLK-02** | **Cloud PostgreSQL Database** | **Low (Optional)** | Cloud PostgreSQL connection string (`DATABASE_URL`) is not yet entered in Vercel project environment variables. Once supplied (from Supabase, Neon, AWS RDS), run `npx prisma migrate deploy`. | Application operates flawlessly in local-first Dexie.js mode. Health probe reports `operational_local_mode`. |
| **BLK-03** | **Stripe Secret Key & Webhook** | **Low (Optional)** | `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are not set. Required only when automated recurring card processing is desired. | Platform administrators can manually configure plans and grant entitlements with full audit trails. |
| **BLK-04** | **Resend Email API Key** | **Low (Optional)** | `RESEND_API_KEY` is not set. Required for live external transactional email delivery. | System uses built-in development mock logger, recording full template contents to server logs. |
| **BLK-05** | **Custom Domain DNS** | **Low (Optional)** | The application is currently served on `https://watech-bi.vercel.app`. Connecting a custom domain (e.g., `app.watech.agency`) requires adding CNAME `cname.vercel-dns.com` in DNS. | Active and accessible on official Vercel domain `https://watech-bi.vercel.app`. |