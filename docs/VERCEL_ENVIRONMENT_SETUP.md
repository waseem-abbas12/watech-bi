# WATECH-BI — VERCEL ENVIRONMENT CONFIGURATION GUIDE
**Document Version:** 1.0.0  
**Target Platform:** Vercel (Edge & Node.js Serverless Functions)

This guide documents every environment variable required for deploying Watech-BI to Vercel Preview and Production environments.

---

## 1. Environment Variables Inventory

| Variable Name | Purpose | Required / Optional | Scope | Target Environments | Where to Obtain | Fallback Behavior if Missing |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | Canonical app root for callbacks & links | **Required** | Public (Client + Server) | Preview, Production | Vercel Project URL or Custom Domain | Falls back to `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL connection string (pooled) | **Required for Cloud SaaS** | Server-Only | Preview, Production | Supabase, Neon, AWS RDS, or GCP Cloud SQL | Application operates in client-side Dexie.js mode |
| `JWT_SECRET` | Secret key used to sign & verify JWT session tokens | **Required in Production** | Server-Only | Preview, Production | Generate 32+ byte random string: `openssl rand -hex 32` | Dev fallback key used; rejected in strict prod |
| `STORAGE_SIGNING_SECRET` | HMAC secret for generating expiring signed download URLs | **Required for Files** | Server-Only | Preview, Production | Generate 32+ byte random string: `openssl rand -hex 32` | Falls back to `JWT_SECRET` |
| `CRON_SECRET` | Bearer authorization token for Vercel Cron routes | **Required for Cron** | Server-Only | Production | Configured in Vercel project settings or random string | Cron endpoints return 401 Unauthorized in production |
| `RESEND_API_KEY` | Transactional email delivery service | Optional | Server-Only | Preview, Production | Resend.com dashboard (API Keys) | System logs emails to server console (Mock Simulator) |
| `EMAIL_FROM` | Default sender email for invitations and resets | Optional | Server-Only | Preview, Production | Verified domain address in Resend / Mailgun | Defaults to `no-reply@watech.agency` |
| `STRIPE_SECRET_KEY` | Stripe billing integration secret key | Optional | Server-Only | Production | Stripe Dashboard > Developers > API Keys | Billing operates in manual administrator mode |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret for event verification | Optional | Server-Only | Production | Stripe Dashboard > Webhooks endpoint | Webhooks rejected or acknowledged in test mode |
| `OPENAI_API_KEY` | Server-side AI model queries | Optional | Server-Only | Preview, Production | OpenAI Platform | Deterministic rule-based engine algorithms used |
| `ANTHROPIC_API_KEY` | Alternative Claude model queries | Optional | Server-Only | Preview, Production | Anthropic Console | Deterministic rule-based engine algorithms used |

---

## 2. Setting Variables in Vercel

### Method A — Via Vercel Web Dashboard:
1. Go to your project on [vercel.com](https://vercel.com).
2. Navigate to **Settings > Environment Variables**.
3. Add the key and value.
4. Select the target environments: **Production**, **Preview**, and **Development**.
5. Click **Save**.

### Method B — Via Vercel CLI:
```bash
# Add a production variable
vercel env add DATABASE_URL production

# Add a preview variable
vercel env add DATABASE_URL preview
```

---

## 3. Database Connection Pooling Notes for Serverless
When connecting Prisma to PostgreSQL on Vercel:
- Ensure your `DATABASE_URL` uses a connection pooler (e.g. Supabase connection pooler on port 6543, Neon pooled connection, or PgBouncer).
- Append `?pgbouncer=true&connection_limit=1` to prevent exhausting database connection limits during concurrent serverless invocations.