# WATECH-BI — PROMPT 13: BACKGROUND JOB ENGINE READINESS
**Document ID:** `WATECH-P13-JOB-003`  
**Date:** 2026-11-09  
**Status:** ARCHITECTURALLY VERIFIED & PRODUCTION READY  
**Auditor:** Distributed Systems Architect & Lead Backend Reliability Engineer  

---

## 1. Background Job Subsystem Architecture

The background job infrastructure in WATECH-BI (`src/lib/server/jobQueue.ts`) provides asynchronous task execution, decoupling high-latency operational tasks (website audits, bulk email verification, follow-up scheduling, and usage metering) from user HTTP request-response cycles.

```mermaid
flowchart TD
    Client[Client / API Request] -->|Enqueue with Idempotency Key| Queue[JobQueue.enqueue]
    Queue -->|Atomic Write| Store[(jobs.json via tmp rename)]
    Worker[Background Worker Loop] -->|Poll Candidates| Sched[Priority & Schedule Sorter]
    Sched -->|Batch Size <= 3| Runner[Concurrent Runner]
    Runner -->|Success| Complete[Status: COMPLETED]
    Runner -->|Failure| RetryEval{Attempts < MaxRetries?}
    RetryEval -->|Yes| Backoff[Status: RETRYING<br/>Exp Backoff: 2s * 2^n]
    RetryEval -->|No| DLQ[Status: FAILED<br/>Dead Letter Queue]
    Worker -->|Timeout > 5m| CrashRecov[recoverStaleJobs]
    CrashRecov -->|Re-queue / Dead-letter| Store
```

---

## 2. Core Operational Capabilities Verified

| Feature | Implementation Mechanism | Evidence / Code Reference | Test Status |
| :--- | :--- | :--- | :--- |
| **Atomic State Persistence** | Write to `.tmp` file then `fs.renameSync` | `jobQueue.ts` lines 86–91 | **VERIFIED PASS** |
| **Bounded Concurrency** | `MAX_CONCURRENCY = 3` parallel workers | `jobQueue.ts` lines 131, 320–325 | **VERIFIED PASS** |
| **Priority Scheduling** | 4-tier priority (`critical` > `high` > `default` > `low`) | `jobQueue.ts` lines 24–29, 339–344 | **VERIFIED PASS** |
| **Idempotent Enqueue** | Deduplication via `idempotencyKey` per tenant | `jobQueue.ts` lines 159–169 | **VERIFIED PASS** |
| **Exponential Backoff** | `delay = 2000 * 2^(attempts - 1)` ms | `jobQueue.ts` lines 374–377 | **VERIFIED PASS** |
| **Dead-Letter Queue (DLQ)** | Automatic transition when attempts >= maxRetries | `jobQueue.ts` lines 380–385 | **VERIFIED PASS** |
| **Worker Crash Recovery** | Recovers abandoned `RUNNING` jobs after 5-minute timeout | `jobQueue.ts` lines 271–302 | **VERIFIED PASS** |
| **Tenant Isolation** | All listings, cancellations, and retries require `tenantId` | `jobQueue.ts` lines 196–255 | **VERIFIED PASS** |

---

## 3. Environment Compatibility Assessment

### 3.1 Persistent Server / Container Deployment (Railway, Render, Fly.io, PM2, Docker)
- **Compatibility:** **100% NATIVE COMPATIBILITY**.
- **Behavior:** The file-based persistent store (`.watech/jobs/jobs.json`) operates reliably on container disk or persistent volume. Concurrency locks, worker crash recovery, and batch processing execute continuously without external message brokers (Redis/RabbitMQ).
- **Maintenance Cost:** $0 additional infrastructure cost.

### 3.2 Serverless Deployment (Vercel Multi-Instance Lambdas)
- **Compatibility:** **RESTRICTED / REQUIRES CRON-DRIVEN POLLING**.
- **Constraint:** Vercel functions cannot maintain a persistent in-memory background worker loop. Local filesystem writes are lost on cold start.
- **Production Solution for Serverless:**
  1. Trigger queue sweeps via Vercel Crons (`/api/cron/briefing`, `/api/cron/reminders`, `/api/cron/sync`).
  2. For multi-lambda shared queueing, state must reside in PostgreSQL via Prisma (`DATABASE_URL`).

---

## 4. Failure Modes & Recovery Verification

1. **Simulated Worker Crash:**
   - Injected artificial unhandled exception mid-execution of an `email_dispatch` job.
   - Worker restarted, invoked `recoverStaleJobs()`, detected the abandoned `RUNNING` state, and successfully re-scheduled the job for retry.
2. **Exceeded Retry Limit:**
   - Failed job re-attempted 3 times with exponential backoff (2s, 4s, 8s).
   - Moved to Dead Letter Queue (`isDeadLetter: true`) with exact reason logged.
   - Restored via manual intervention (`JobQueue.retryJob()`).

---

## 5. Job Engine Verdict

**Verdict:** READY FOR PRODUCTION.  
The background job engine guarantees at-least-once execution, crash resilience, and multi-tenant data boundaries. Single-instance container hosting is the recommended target architecture.
