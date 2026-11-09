# WATECH-BI — PROMPT 11: INCIDENT RECOVERY RUNBOOK
**Project:** `E:\watech-bi`  
**Target:** Production On-Call & Site Reliability Engineers  

---

## 1. INCIDENT SEVERITY MATRIX

- **SEV-1 (CRITICAL):** Complete platform outage, database corruption, or cross-tenant data leak.
- **SEV-2 (HIGH):** Background job queue backlog > 100 jobs, payment webhook failures, or email dispatch disruption.
- **SEV-3 (MEDIUM):** Single vendor integration failure, degradation in search latency, or rate limit false positives.

---

## 2. STANDARD OPERATING PROCEDURES (SOP)

### SOP-01: Database Outage / Corruption Recovery
1. **Detect:** `/api/health` reports `database: disconnected`.
2. **Contain:** Transition frontend to maintenance mode or activate local ledger fallback.
3. **Restore:** Retrieve latest verified backup from `.watech/backups/`. Execute `BackupService.verifyRestore(backupId)`.
4. **Verify:** Confirm SHA-256 checksum match and verify record count against baseline.

### SOP-02: Worker Queue Backlog / Crash Recovery
1. **Detect:** `/api/metrics` reports `jobs.retrying > 10` or `jobs.deadLetter > 5`.
2. **Action:** Trigger stale worker recovery via `JobQueue.recoverStaleJobs()`.
3. **Scale:** Trigger manual queue drain cycle via `PUT /api/jobs`.
4. **Inspect:** Examine dead-letter explanations in `/jobs` to isolate bad payloads.

### SOP-03: Rollback of Defective Deployment
1. **Detect:** High error rate or failed smoke test after new release.
2. **Action:** Revert Git commit on production branch or redeploy previous Vercel deployment ID.
3. **Database Safety:** Ensure no destructive migrations were executed; run reverse migration if necessary.
