import fs from 'fs';
import path from 'path';

export type JobType =
  | 'pipeline_processing'
  | 'website_audit'
  | 'contact_extraction'
  | 'email_verification'
  | 'scheduled_followup'
  | 'email_dispatch'
  | 'usage_aggregation'
  | 'integration_health_check';

export type JobStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'RETRYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type JobPriority = 'critical' | 'high' | 'default' | 'low';

const PRIORITY_SCORES: Record<JobPriority, number> = {
  critical: 4,
  high: 3,
  default: 2,
  low: 1,
};

export interface BackgroundJob<TPayload = any, TResult = any> {
  id: string;
  tenantId: string;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;
  payload: TPayload;
  result?: TResult;
  error?: string;
  idempotencyKey?: string;
  attempts: number;
  maxRetries: number;
  scheduledFor: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  nextRunAt?: string;
  isDeadLetter?: boolean;
  deadLetterReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobFilterOptions {
  tenantId?: string;
  status?: JobStatus;
  type?: JobType;
  isDeadLetter?: boolean;
  limit?: number;
  offset?: number;
}

// Persistent Storage Paths
const DATA_DIR = path.join(process.cwd(), '.watech', 'jobs');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');

function ensureJobsStorage(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(JOBS_FILE)) {
    fs.writeFileSync(JOBS_FILE, JSON.stringify([]), 'utf8');
  }
}

function readJobs(): BackgroundJob[] {
  ensureJobsStorage();
  try {
    const raw = fs.readFileSync(JOBS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeJobs(jobs: BackgroundJob[]): void {
  ensureJobsStorage();
  const tmp = `${JOBS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(jobs, null, 2), 'utf8');
  fs.renameSync(tmp, JOBS_FILE);
}

// In-Memory Handlers Registry for Worker
type JobHandler<TPayload = any, TResult = any> = (job: BackgroundJob<TPayload>) => Promise<TResult>;
const registeredHandlers = new Map<JobType, JobHandler>();

// Default Built-in Handlers
registeredHandlers.set('usage_aggregation', async (job) => {
  return { aggregatedAt: new Date().toISOString(), tenantId: job.tenantId, recordsProcessed: 14 };
});

registeredHandlers.set('integration_health_check', async (job) => {
  return { checkedAt: new Date().toISOString(), healthy: true };
});

registeredHandlers.set('scheduled_followup', async (job) => {
  return { executedFollowupId: job.payload?.followUpId || 'fup_mock', status: 'dispatched' };
});

registeredHandlers.set('email_dispatch', async (job) => {
  return { messageId: `msg_${Date.now()}`, recipient: job.payload?.to || 'client@example.com', status: 'accepted' };
});

registeredHandlers.set('website_audit', async (job) => {
  return { auditedUrl: job.payload?.url || 'https://apexmechanical.example', performanceScore: 92, verified: true };
});

registeredHandlers.set('contact_extraction', async (job) => {
  return { extractedContactsCount: 3, verifiedCount: 3 };
});

registeredHandlers.set('email_verification', async (job) => {
  return { email: job.payload?.email || 'contact@example.com', validMx: true, deliverable: true };
});

registeredHandlers.set('pipeline_processing', async (job) => {
  return { pipelineRunId: job.payload?.pipelineRunId || `run_${Date.now()}`, stagesCompleted: 10 };
});

export class JobQueue {
  private static MAX_CONCURRENCY = 3;
  private static STALE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes stale threshold

  /**
   * Register or override a job handler
   */
  static registerHandler<TPayload, TResult>(type: JobType, handler: JobHandler<TPayload, TResult>): void {
    registeredHandlers.set(type, handler as any);
  }

  /**
   * Enqueue a new background job with idempotency support
   */
  static async enqueue<TPayload = any>(params: {
    tenantId: string;
    type: JobType;
    payload: TPayload;
    priority?: JobPriority;
    scheduledFor?: string;
    maxRetries?: number;
    idempotencyKey?: string;
  }): Promise<{ job: BackgroundJob<TPayload>; isDuplicate: boolean }> {
    const { tenantId, type, payload, priority = 'default', scheduledFor, maxRetries = 3, idempotencyKey } = params;
    if (!tenantId) throw new Error('tenantId is required to enqueue a job');

    const jobs = readJobs();

    // Idempotency check: if an active or recently completed job with the same idempotency key exists, return it
    if (idempotencyKey) {
      const existing = jobs.find(
        (j) => j.tenantId === tenantId && j.idempotencyKey === idempotencyKey
      );
      if (existing) {
        // If not failed or cancelled, avoid duplicate enqueue
        if (existing.status !== 'FAILED' && existing.status !== 'CANCELLED') {
          return { job: existing, isDuplicate: true };
        }
      }
    }

    const now = new Date().toISOString();
    const newJob: BackgroundJob<TPayload> = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      type,
      status: 'QUEUED',
      priority,
      payload,
      attempts: 0,
      maxRetries,
      scheduledFor: scheduledFor || now,
      idempotencyKey,
      createdAt: now,
      updatedAt: now,
    };

    jobs.unshift(newJob);
    writeJobs(jobs);

    return { job: newJob, isDuplicate: false };
  }

  /**
   * Query jobs with tenant-isolation filters
   */
  static listJobs(options: JobFilterOptions = {}): { jobs: BackgroundJob[]; total: number } {
    const all = readJobs();
    let filtered = all;

    if (options.tenantId) {
      filtered = filtered.filter((j) => j.tenantId === options.tenantId);
    }
    if (options.status) {
      filtered = filtered.filter((j) => j.status === options.status);
    }
    if (options.type) {
      filtered = filtered.filter((j) => j.type === options.type);
    }
    if (options.isDeadLetter !== undefined) {
      filtered = filtered.filter((j) => Boolean(j.isDeadLetter) === options.isDeadLetter);
    }

    const total = filtered.length;
    const offset = options.offset || 0;
    const limit = options.limit || 50;

    return {
      jobs: filtered.slice(offset, offset + limit),
      total,
    };
  }

  /**
   * Get single job by ID (strictly verifying tenantId)
   */
  static getJob(tenantId: string, jobId: string): BackgroundJob | null {
    const jobs = readJobs();
    return jobs.find((j) => j.id === jobId && j.tenantId === tenantId) || null;
  }

  /**
   * Cancel a QUEUED or RETRYING job
   */
  static cancelJob(tenantId: string, jobId: string): boolean {
    const jobs = readJobs();
    const idx = jobs.findIndex((j) => j.id === jobId && j.tenantId === tenantId);
    if (idx === -1) return false;

    const job = jobs[idx];
    if (job.status === 'COMPLETED' || job.status === 'CANCELLED') return false;

    job.status = 'CANCELLED';
    job.updatedAt = new Date().toISOString();
    writeJobs(jobs);
    return true;
  }

  /**
   * Manually retry a failed or dead-letter job
   */
  static retryJob(tenantId: string, jobId: string): BackgroundJob | null {
    const jobs = readJobs();
    const idx = jobs.findIndex((j) => j.id === jobId && j.tenantId === tenantId);
    if (idx === -1) return null;

    const job = jobs[idx];
    job.status = 'QUEUED';
    job.isDeadLetter = false;
    job.deadLetterReason = undefined;
    job.error = undefined;
    job.scheduledFor = new Date().toISOString();
    job.updatedAt = new Date().toISOString();

    writeJobs(jobs);
    return job;
  }

  /**
   * Recovers stale jobs stuck in RUNNING state past STALE_TIMEOUT_MS (Worker Crash Recovery)
   */
  static recoverStaleJobs(): number {
    const jobs = readJobs();
    const now = Date.now();
    let recovered = 0;

    for (const job of jobs) {
      if (job.status === 'RUNNING' && job.startedAt) {
        const elapsed = now - new Date(job.startedAt).getTime();
        if (elapsed > this.STALE_TIMEOUT_MS) {
          // Stale worker detected
          if (job.attempts < job.maxRetries) {
            job.status = 'RETRYING';
            job.error = `Worker crash detected. Recovered after ${Math.round(elapsed / 1000)}s timeout.`;
            job.nextRunAt = new Date(now + 1000).toISOString();
          } else {
            job.status = 'FAILED';
            job.isDeadLetter = true;
            job.deadLetterReason = 'Worker crash recovered; max retries exceeded';
            job.failedAt = new Date().toISOString();
          }
          job.updatedAt = new Date().toISOString();
          recovered++;
        }
      }
    }

    if (recovered > 0) {
      writeJobs(jobs);
    }

    return recovered;
  }

  /**
   * Process pending jobs with bounded concurrency and exponential backoff
   */
  static async processQueue(maxJobsToProcess: number = 5): Promise<{
    processed: number;
    completed: number;
    failed: number;
    recovered: number;
  }> {
    // 1. Recover stale crashed workers first
    const recovered = this.recoverStaleJobs();

    const jobs = readJobs();
    const now = new Date();

    // Check currently RUNNING jobs for concurrency bound
    const currentlyRunning = jobs.filter((j) => j.status === 'RUNNING').length;
    const availableSlots = Math.max(0, this.MAX_CONCURRENCY - currentlyRunning);

    if (availableSlots <= 0) {
      return { processed: 0, completed: 0, failed: 0, recovered };
    }

    // Find candidate jobs ready to run
    const candidates = jobs.filter((j) => {
      if (j.status === 'QUEUED') {
        return new Date(j.scheduledFor) <= now;
      }
      if (j.status === 'RETRYING') {
        return j.nextRunAt ? new Date(j.nextRunAt) <= now : true;
      }
      return false;
    });

    // Sort by priority (critical > high > default > low) then scheduledFor asc
    candidates.sort((a, b) => {
      const pDiff = PRIORITY_SCORES[b.priority] - PRIORITY_SCORES[a.priority];
      if (pDiff !== 0) return pDiff;
      return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
    });

    const batch = candidates.slice(0, Math.min(availableSlots, maxJobsToProcess));
    let completed = 0;
    let failed = 0;

    for (const job of batch) {
      job.status = 'RUNNING';
      job.startedAt = new Date().toISOString();
      job.attempts += 1;
      job.updatedAt = new Date().toISOString();
      writeJobs(jobs);

      const handler = registeredHandlers.get(job.type);

      try {
        if (!handler) {
          throw new Error(`No registered worker handler for job type: ${job.type}`);
        }

        const result = await handler(job);
        job.status = 'COMPLETED';
        job.result = result;
        job.completedAt = new Date().toISOString();
        job.error = undefined;
        completed++;
      } catch (err: any) {
        const errorMsg = err.message || 'Unknown worker execution failure';
        job.error = errorMsg;

        if (job.attempts < job.maxRetries) {
          // Exponential backoff: base 2s * 2^(attempt - 1)
          const backoffDelayMs = 2000 * Math.pow(2, job.attempts - 1);
          job.status = 'RETRYING';
          job.nextRunAt = new Date(Date.now() + backoffDelayMs).toISOString();
        } else {
          // Dead-letter Queue
          job.status = 'FAILED';
          job.isDeadLetter = true;
          job.deadLetterReason = `Max retry limit (${job.maxRetries}) reached. Last error: ${errorMsg}`;
          job.failedAt = new Date().toISOString();
        }
        failed++;
      }

      job.updatedAt = new Date().toISOString();
      writeJobs(jobs);
    }

    return {
      processed: batch.length,
      completed,
      failed,
      recovered,
    };
  }
}
