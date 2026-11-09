# WATECH-BI — PRODUCTION BACKUP & DISASTER RECOVERY RUNBOOK
**Document Version:** 1.0.0  
**Target Environment:** Local-First Dexie + PostgreSQL (Prisma) SaaS Deployment

---

## 1. Overview & Data Protection Architecture

Watech-BI operates with a dual-layer data tier:
1. **Local-First Tier (Dexie.js / IndexedDB):** Provides instantaneous offline-first responsiveness, local business caches, and historical agency datasets.
2. **Cloud SaaS Tier (PostgreSQL + RLS):** Provides cross-tenant row-level isolation, multi-user concurrency, authoritative billing entitlements, and serverless background execution.

Both tiers require automated and manual backup routines to guarantee zero accidental data loss.

---

## 2. Backup Schedules & Retention Policy

| Tier | Backup Type | Frequency | Retention | Storage Location |
| :--- | :--- | :--- | :--- | :--- |
| **Local / Browser** | Full JSON Store Snapshot | On-Demand & Pre-Migration | Unlimited (User local archive) | User Downloads / Local Disk |
| **PostgreSQL Database** | Automated PITR (Point-in-Time) | Continuous WAL streaming | 30 Days | Managed Cloud DB (e.g. Supabase, RDS, Neon) |
| **PostgreSQL Database** | Daily Logical Dump (`pg_dump`) | Every 24 hours at 02:00 UTC | 90 Days | Encrypted S3 / Cloud Storage Bucket |
| **Tenant Files & Artifacts** | Object Storage Versioning | On every write / upload | 365 Days | Private S3 / Vercel Blob Bucket |

---

## 3. Step-by-Step Recovery Procedures

### A. Local Dexie.js Restore Procedure
1. Log in to the Watech-BI agency portal.
2. Navigate to **Platform Administration** or **Settings > Database Backup**.
3. Under **Database Snapshot**, click **Export Backup (JSON)** to create a pre-recovery safety snapshot.
4. Click **Import Backup**, choose the verified JSON backup archive file.
5. The application parses the version header, verifies schema integrity, populates all 68+ tables atomically, and updates local indices.

### B. PostgreSQL Production Restore Procedure
To restore PostgreSQL from a daily logical dump:
```bash
# 1. Download verified dump from secure backup storage
aws s3 cp s3://watech-backups/prod-db-snapshot-20261106.dump ./prod.dump

# 2. Terminate active application connections
psql -d $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'watech_bi' AND pid <> pg_backend_pid();"

# 3. Restore schema and data using pg_restore
pg_restore -v --clean --no-acl --no-owner -h <db_host> -U <db_user> -d watech_bi ./prod.dump

# 4. Verify RLS policies are enabled on all tables
psql -d $DATABASE_URL -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
```

### C. Dexie-to-PostgreSQL Hydration & Reconciliation
If migrating historical data from local browser into the cloud database:
1. Run `repository.exportDatabase()` in the browser to extract the complete JSON export.
2. Execute the server migration utility:
   ```typescript
   import { migrateDexieToPostgreSql } from '@/lib/server/dexieToPostgresMigration';
   const result = await migrateDexieToPostgreSql(jsonContent, { dryRun: true });
   console.log('Reconciliation summary:', result);
   ```
3. Verify row counts and check for rejected rows before rerunning with `{ dryRun: false }`.