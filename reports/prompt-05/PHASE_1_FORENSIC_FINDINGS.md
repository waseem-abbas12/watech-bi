# WATECH-BI — PHASE 1 FORENSIC ARCHITECTURAL & RELIABILITY AUDIT
**Mission:** Prompt 05 — Production Reliability, Data Integrity & Pipeline Hardening  
**Target Codebase:** `E:\watech-bi`  
**Lead Auditor:** Principal SaaS Reliability Architect, Security & Distributed Systems Lead  
**Audit Date:** November 9, 2026  
**Status:** Completed (Pre-Implementation Baseline)

---

## 1. Executive Summary

This forensic review evaluates the stability, concurrency safety, data integrity, and security boundaries of the WATECH-BI application following the successful real-world HVAC test in Prompt 04.

While Prompt 04 demonstrated deterministic execution of the 10-stage pipeline on verified real businesses, the architectural review reveals 10 critical reliability and security areas that must be hardened before multi-tenant SaaS scaling.

---

## 2. Prioritized Forensic Findings

| Priority | Category | File / Subsystem | Issue Identified | Risk Level |
|---|---|---|---|---|
| **P0** | **Security (SSRF)** | `ssrfGuard.ts`, `audit/inspect`, `contact/extract`, `pipelineRunner.ts` | **SSRF & DNS Rebinding Vulnerability:** Only superficial string prefix checks; no IP resolution check; redirects follow to internal/cloud metadata IPs automatically; no body byte limit (DoS risk). | **CRITICAL** |
| **P0** | **Concurrency** | `pipelineRunner.ts`, `/api/pipeline/execute` | **Race Conditions & Execution Collisions:** Simultaneous requests for the same project/batch execute concurrently without mutex locks, causing duplicate operations and data races. | **CRITICAL** |
| **P0** | **Database Integrity** | `clientPipelineOrchestrator.ts`, `repository.ts` | **Incomplete Transactions:** Persistence across 9 entities executes via individual un-transactioned calls. Interruption leaves orphan contacts, un-scored leads, or missing activities. | **HIGH** |
| **P1** | **Orphan Records** | `repository.ts` (`deleteBusiness`, `deleteProject`) | **Missing Referential Cleanup:** Deleting a business leaves orphan records in `audits`, `contacts`, `opportunities`, `leadScores`, `crmActivities`, and `followUpSchedules`. | **HIGH** |
| **P1** | **Performance & Bounded Concurrency** | `pipelineRunner.ts` | **Unbounded Sequential Processing:** Iterating 50-100 businesses sequentially leads to multi-minute timeouts. Uncontrolled `Promise.all` would exhaust sockets and trip rate limits. | **HIGH** |
| **P1** | **Execution State Tracking** | `pipelineRunner.ts` | **Missing Traceable Run ID & Stage Timestamps:** No unique `runId` generated; stage metrics lack `startedAt`, `completedAt`, and `retryCount`. | **MEDIUM** |
| **P2** | **Error Isolation & Backoff** | `pipelineRunner.ts` (`inspectWebsiteInternal`, `verifyEmailInternal`) | **Lack of Per-Business Retry with Backoff:** Transient network/DNS drops immediately fail without bounded retries; unhandled DNS errors risk halting execution. | **MEDIUM** |
| **P2** | **Memory Consumption** | `pipelineRunner.ts` (`htmlCache`) | **Unbounded Memory Retention:** `htmlCache` stores full raw HTML bodies for entire batches in memory indefinitely during execution. | **MEDIUM** |
| **P2** | **Database Schema Constraints** | `db.ts` (Dexie Schema) | **Missing Compound Indexes:** Missing indexes for `[projectId+domain]`, `[businessId+email]`, and `[projectId+status]` to enforce tenant/project isolation and query efficiency. | **MEDIUM** |
| **P3** | **Input Sanitization & Redaction** | `route.ts`, `logger.ts` | **Sensitive Data Redaction:** Potential leak of internal stack traces, API keys, or raw provider errors to client JSON responses. | **LOW** |

---

## 3. Detailed Forensic Analysis Across 10 Technical Areas

### 3.1 Architectural Bottlenecks
In `src/lib/server/pipeline/pipelineRunner.ts`, website audits and DNS verifications are executed via serial `for...of` loops:
```typescript
for (const biz of businesses) {
  const auditResult = await inspectWebsiteInternal(biz.websiteUrl, biz.id, projectId);
  // ...
}
```
For a batch of 50 businesses with a 12-second HTTP timeout, a worst-case serial run takes up to 600 seconds (10 minutes), exceeding Vercel serverless limits (10-60s) and Node.js request timeouts.  
*Remediation:* Implement a bounded worker pool (concurrency limit: 4) with per-worker timeouts (5s) and abort controllers.

### 3.2 Duplicate Logic
Domain extraction, phone sanitization, and URL normalization are implemented separately in 4 locations:
1. `pipelineRunner.ts` (lines 233-238)
2. `repository.ts` (`findDuplicates`, lines 592-595)
3. `discoveryManager.ts`
4. `/api/audit/inspect/route.ts`  
*Remediation:* Unify into a canonical server-side utility `src/lib/server/urlNormalization.ts`.

### 3.3 Missing Database Constraints & Indexes
In `src/lib/db/db.ts`:
- `businesses`: `id, projectId, domain, officialName, status, isDemo`. Lacks compound index `[projectId+domain]`.
- `contacts`: `id, businessId, projectId, isDecisionMaker, verificationStatus`. Lacks compound index `[businessId+email]`.
- `followUpSchedules`: `id, businessId, projectId, status, nextFollowUpDate, stopReason`. Lacks compound index `[projectId+status]`.
- Dexie in-memory/IndexedDB does not enforce strict foreign key constraints at the database engine level; orphan checks must be handled in the repository transaction layer.

### 3.4 Race Conditions & Simultaneous Duplicate Execution
In `/api/pipeline/execute/route.ts`:
There is no lock or mutex preventing two concurrent client calls from processing the exact same business batch or project ID. If two users or two background tasks trigger execution concurrently, both run in parallel, potentially initiating dual outbound HTTP requests and conflicting write operations.  
*Remediation:* Implement an in-memory execution lock / deduplicator keyed by `projectId` or batch hash.

### 3.5 Incomplete Transactions & Atomicity
In `src/lib/services/pipelineOrchestrator.ts`:
```typescript
await repository.saveProject(project);
await repository.saveBusinesses(businesses);
for (const audit of audits) await repository.saveAudit(audit);
await repository.saveContacts(contacts);
await repository.saveOpportunities(opportunities);
for (const score of leadScores) await repository.saveScore(score);
// ...
```
Writes to 9 distinct collections occur sequentially without an atomic Dexie transaction (`database.transaction('rw', [...], async () => { ... })`). If the user navigates away or the browser is closed at step 5, the database is left in a corrupted, half-persisted state.  
*Remediation:* Introduce atomic `repository.savePipelineBatch()` wrapped in an explicit Dexie read-write transaction.

### 3.6 Inconsistent Entity Relationships & Orphan Records
In `src/lib/db/repository.ts`:
```typescript
async deleteBusiness(id: string): Promise<void> {
  await this.database.businesses.delete(id);
}
```
Calling `deleteBusiness(id)` deletes the business record, but leaves behind its `audits`, `auditFindings`, `contacts`, `opportunities`, `leadScores`, `crmActivities`, and `followUpSchedules`.  
*Remediation:* Update `deleteBusiness` to execute a cascading delete transaction across all associated tables.

### 3.7 Unhandled Exceptions & Error Boundaries
In `pipelineRunner.ts`:
- `dns.resolveMx` can reject with errors like `ENOTFOUND`, `NODATA`, `ESERVFAIL`, `ETIMEOUT`. While wrapped in a `try/catch` in helper functions, unhandled edge cases in DNS resolution could leak uncaught rejections.
- In `inspectWebsiteInternal`, reading `await res.text()` without a `Content-Length` or byte stream cap can cause an out-of-memory crash if a targeted server responds with an enormous payload.  
*Remediation:* Enforce a strict 2MB response body limit via `ReadableStream` chunk counting.

### 3.8 Unbounded Operations & Missing Limits
- Mode B currently sliced input at 10 businesses, but does not provide controlled batch chunking for larger batches (50, 100).
- Incoming POST payloads in `/api/pipeline/execute` lack schema-level payload size limits.  
*Remediation:* Enforce explicit request payload validation and chunk larger runs into bounded sub-batches.

### 3.9 Memory & Performance Issues
- The `htmlCache` map in `pipelineRunner.ts` holds full HTML strings in memory for the duration of the pipeline run. For 100 businesses, this retains tens of megabytes of DOM strings simultaneously.  
*Remediation:* Stream HTML parsing and discard raw HTML after extracting audit metrics and contacts.

### 3.10 Security Hardening (SSRF, DNS Rebinding & Redirection)
In `src/lib/server/ssrfGuard.ts`:
- Only checks basic string patterns (`localhost`, `127.0.0.1`, `10.`, `192.168.`).
- Does **NOT** resolve DNS to verify the resolved IPv4/IPv6 address against RFC1918 / RFC4193 / CGNAT ranges.
- Does **NOT** protect against DNS Rebinding attacks.
- Standard `fetch()` automatically follows HTTP redirects (`301`/`302`/`307`), allowing an external server to redirect `fetch` into internal cloud metadata (`http://169.254.169.254/`).
- `/api/audit/inspect`, `/api/contact/extract`, and `/api/competitor/snapshot` do not invoke `isSafeTargetUrl` at all.  
*Remediation:*
1. Create a robust, DNS-resolving `safeFetch` wrapper with `redirect: 'manual'` that inspects every redirect destination against SSRF rules.
2. Filter IPv4 private, loopback, link-local, multicast, and IPv6 unique local/loopback addresses.
3. Apply `safeFetch` across all external inspection endpoints.

---

## 4. Phase Implementation Roadmap

- **Phase 2:** Pipeline Execution Reliability (Run IDs, Stage Timings, Bounded Concurrency, Retries with Backoff, In-Flight Run Locking).
- **Phase 3:** Database Integrity (Atomic Dexie Transactions, Cascading Deletions, Referential Constraints).
- **Phase 4:** Duplicate & Concurrency Protection (Idempotent Deduplication, Multi-Project Domain Independence).
- **Phase 5:** Scalability & Performance (Controlled 10 / 50 / 100 Synthetic Benchmark Harness).
- **Phase 6:** Data Quality & Deterministic Scoring (Preserve explainable lead scores & provenance).
- **Phase 7:** Security Hardening (`safeFetch`, DNS Rebinding Prevention, Redirect Protection, SSRF Guard).
- **Phase 8:** Recovery & Failure Injection (Test 403, 404, 500, timeouts, DB crashes, corrupted inputs).
- **Phase 9:** Automated Regression Suite & Compilation Verification (`npx tsc --noEmit`, `npm run build`).
- **Phase 10:** Final Forensic Evidence & Production Reliability Report.
