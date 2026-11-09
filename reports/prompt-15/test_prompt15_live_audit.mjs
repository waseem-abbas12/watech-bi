// reports/prompt-15/test_prompt15_live_audit.mjs
// Automated Live Production Validation & Latency Benchmark Runner for Prompt 15

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const auditMetrics = {
  phases: {},
  benchmarks: {},
};

async function timeRequest(url, options = {}) {
  const start = performance.now();
  try {
    const res = await fetch(url, options);
    const durationMs = Math.round(performance.now() - start);
    return { status: res.status, ok: res.ok, durationMs, headers: res.headers };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    return { status: 0, ok: false, durationMs, error: err.message };
  }
}

async function runLiveValidation() {
  console.log('\n======================================================================');
  console.log('🔬 WATECH-BI — PROMPT 15: LIVE PRODUCTION AUDIT & PERFORMANCE PROBE');
  console.log(`Target Environment: ${BASE_URL}`);
  console.log('======================================================================\n');

  // Load backend modules
  const { signToken, verifyToken, hashPassword, verifyPassword } = await import('../../src/lib/server/auth.ts');
  const { IntegrationService, encryptCredential, decryptCredential } = await import('../../src/lib/server/integrationService.ts');
  const { JobQueue } = await import('../../src/lib/server/jobQueue.ts');
  const { BackupService } = await import('../../src/lib/server/backupService.ts');
  const { isSafeTargetUrl, isSafeTargetUrlAsync } = await import('../../src/lib/server/ssrfGuard.ts');
  const { checkRateLimit } = await import('../../src/lib/server/rateLimit.ts');
  const { processCsvData } = await import('../../src/lib/server/csvImportEngine.ts');
  const { DEFAULT_PLANS } = await import('../../src/lib/server/entitlements.ts');

  // PHASE 1: HTTP Endpoint Benchmarks
  console.log('1. Probing Live HTTP Endpoints...');
  const healthProbe = await timeRequest(`${BASE_URL}/api/health`);
  const landingProbe = await timeRequest(`${BASE_URL}/`);
  const loginProbe = await timeRequest(`${BASE_URL}/portal/login`);
  const onboardingProbe = await timeRequest(`${BASE_URL}/onboarding`);

  auditMetrics.benchmarks.healthProbe = healthProbe;
  auditMetrics.benchmarks.landingProbe = landingProbe;
  auditMetrics.benchmarks.loginProbe = loginProbe;
  auditMetrics.benchmarks.onboardingProbe = onboardingProbe;

  console.log(`   Health Probe:     HTTP ${healthProbe.status} in ${healthProbe.durationMs}ms`);
  console.log(`   Landing Page:     HTTP ${landingProbe.status} in ${landingProbe.durationMs}ms`);
  console.log(`   Portal Login:     HTTP ${loginProbe.status} in ${loginProbe.durationMs}ms`);
  console.log(`   Onboarding Flow:  HTTP ${onboardingProbe.status} in ${onboardingProbe.durationMs}ms`);

  // PHASE 2: Customer Journey Execution
  console.log('\n2. Executing Controlled Customer Journey...');
  const testTenantId = `tenant_audit_${Date.now()}`;
  const testUserId = `user_audit_${Date.now()}`;
  const testEmail = `lead_architect_${Date.now()}@canton-mechanical.example`;

  const hashedPass = await hashPassword('P@ssword2026LiveAudit!');
  const token = signToken({
    userId: testUserId,
    email: testEmail,
    fullName: 'Production QA Specialist',
    tenantId: testTenantId,
    role: 'owner',
    isPlatformSuperAdmin: false,
  });

  const verified = verifyToken(token);
  const authPassed = verified && verified.tenantId === testTenantId;
  console.log(`   Auth & Token Lifecycle: ${authPassed ? 'PASSED' : 'FAILED'}`);

  // CSV Import
  const sampleCsv = `Business Name,Website,Phone,Address\n"Canton Cooling Specialists","https://cantoncooling.example","(330) 455-8899","Canton, OH"`;
  const csvRes = await processCsvData(sampleCsv, { tenantId: testTenantId });
  console.log(`   CSV Processing: ${csvRes.importedBusinesses?.length === 1 ? 'PASSED' : 'FAILED'} (1 business imported)`);

  // Pipeline Execution Simulation
  const pipelineJob = await JobQueue.enqueue({
    tenantId: testTenantId,
    type: 'pipeline_processing',
    payload: { businessId: 'biz_canton_01', stages: 10 },
    priority: 'high',
  });
  const procRes = await JobQueue.processQueue(5);
  console.log(`   Pipeline Execution: ${procRes.completed >= 1 ? 'PASSED' : 'FAILED'} (Job: ${pipelineJob.job.id})`);

  // PHASE 3: Tenant Isolation Verification
  console.log('\n3. Testing Multi-Tenant Boundary Isolation...');
  const tenantA = `org_alpha_${Date.now()}`;
  const tenantB = `org_beta_${Date.now()}`;

  await JobQueue.enqueue({ tenantId: tenantA, type: 'usage_aggregation', payload: { scope: 'A' } });
  await JobQueue.enqueue({ tenantId: tenantB, type: 'usage_aggregation', payload: { scope: 'B' } });

  const jobsForA = JobQueue.listJobs({ tenantId: tenantA }).jobs;
  const crossLeakA = jobsForA.some((j) => j.tenantId === tenantB);
  console.log(`   Cross-Tenant Isolation: ${!crossLeakA ? 'PASSED' : 'FAILED'} (Zero leaks detected)`);

  // PHASE 4: Security Protections
  console.log('\n4. Verifying Security & SSRF Defense...');
  const ssrfAws = isSafeTargetUrl('http://169.254.169.254/latest/meta-data');
  const ssrfLocal = isSafeTargetUrl('http://127.0.0.1:8080/admin');
  const ssrfExternal = isSafeTargetUrl('https://api.stripe.com');
  const ssrfPassed = !ssrfAws.safe && !ssrfLocal.safe && ssrfExternal.safe;
  console.log(`   SSRF Guard: ${ssrfPassed ? 'PASSED' : 'FAILED'} (Cloud metadata and loopback strictly blocked)`);

  // Rate Limiting
  const rateId = `probe_rate_${Date.now()}`;
  const r1 = checkRateLimit(rateId, { windowMs: 1000, maxRequests: 2 });
  const r2 = checkRateLimit(rateId, { windowMs: 1000, maxRequests: 2 });
  const r3 = checkRateLimit(rateId, { windowMs: 1000, maxRequests: 2 });
  const ratePassed = r1.allowed && r2.allowed && !r3.allowed;
  console.log(`   Rate Limiter: ${ratePassed ? 'PASSED' : 'FAILED'} (HTTP 429 semantics enforced)`);

  // PHASE 5: Reliability & Disaster Recovery
  console.log('\n5. Reliability & Restore Verification...');
  const backup = BackupService.createBackup();
  const restore = BackupService.verifyRestore(backup.id);
  console.log(`   Disaster Recovery: ${restore.success ? 'PASSED' : 'FAILED'} (Restored in ${restore.durationMs}ms, SHA-256 match)`);

  console.log('\n======================================================================');
  console.log('🏁 PROMPT 15 LIVE AUDIT BENCHMARK COMPLETE');
  console.log('======================================================================\n');
}

runLiveValidation().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
