import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const reportsDir = path.resolve('reports/prompt-05');

const suites = [
  {
    name: 'Suite 1: SSRF & Security Hardening',
    file: 'test_security_ssrf.mjs',
    description: 'Validates blocking of loopback, private RFC1918, CGNAT, link-local, cloud metadata (169.254.169.254), restricted ports (22, 25, 5432, 6379, 3000), internal hostnames, and redirect bounds.',
  },
  {
    name: 'Suite 2: Concurrency & In-Flight Locking',
    file: 'test_concurrency_locking.mjs',
    description: 'Verifies mutex lock preventing duplicate in-flight pipeline runs on the same project/batch (returns HTTP 409) and releases lock cleanly on completion.',
  },
  {
    name: 'Suite 3: Database Transactions & Integrity',
    file: 'test_database_integrity.mjs',
    description: 'Verifies Dexie atomic read-write batch transaction across 9 tables, idempotent re-writes, cascading delete with zero orphan records, and multi-tenant project isolation.',
  },
  {
    name: 'Suite 4: Data Quality & Scoring Reliability',
    file: 'test_data_quality_scoring.mjs',
    description: 'Verifies deterministic scoring on 4 edge-case profiles, role-based decision maker taxonomy, and non-manipulation of lead scores.',
  },
  {
    name: 'Suite 5: Partial Failure Isolation',
    file: 'test_failure_injection.mjs',
    description: 'Injects DNS failures, SSRF blocked URLs, and missing websites to verify partial isolation, continued pipeline execution, and robust stage degradation.',
  },
  {
    name: 'Suite 6: Scalability & Bounded Concurrency',
    file: 'benchmark_scalability.mjs',
    description: 'Measures latency, heap delta, and error rates across 10, 50, and 100 business batches with worker pool concurrency bounded to 4.',
  },
];

console.log('================================================================');
console.log('WATECH-BI PROMPT 05: MASTER RELIABILITY & INTEGRITY TEST RUNNER');
console.log('================================================================\n');

const suiteResults = [];
let allPassed = true;

for (const suite of suites) {
  const filePath = path.join(reportsDir, suite.file);
  console.log(`\n----------------------------------------------------------------`);
  console.log(`RUNNING: ${suite.name}`);
  console.log(`Script: ${suite.file}`);
  console.log(`----------------------------------------------------------------`);

  const startTime = Date.now();
  let status = 'PASSED';
  let errorMsg = null;

  try {
    const runnerCmd = `npx tsx "${filePath}"`;
    const output = execSync(runnerCmd, {
      cwd: process.cwd(),
      stdio: 'pipe',
      timeout: 120000,
    }).toString();

    console.log(output);
  } catch (err) {
    status = 'FAILED';
    allPassed = false;
    errorMsg = err.stdout?.toString() || err.stderr?.toString() || err.message;
    console.error(`FAILED: ${suite.name}`);
    console.error(errorMsg);
  }

  const durationMs = Date.now() - startTime;
  suiteResults.push({
    name: suite.name,
    file: suite.file,
    description: suite.description,
    status,
    durationMs,
    error: errorMsg,
  });
}

console.log('\n================================================================');
console.log('MASTER RELIABILITY TEST SUMMARY');
console.log('================================================================');
suiteResults.forEach((res, idx) => {
  console.log(`${idx + 1}. [${res.status}] ${res.name} (${res.durationMs}ms)`);
});
console.log('================================================================');
console.log(`FINAL RESULT: ${allPassed ? 'ALL TEST SUITES PASSED (VERDICT: PASS)' : 'SOME TESTS FAILED (VERDICT: FAIL)'}`);
console.log('================================================================\n');

// Write out JSON artifact
const summaryArtifact = {
  executedAt: new Date().toISOString(),
  verdict: allPassed ? 'PASS' : 'FAIL',
  suitesCount: suites.length,
  passedCount: suiteResults.filter((r) => r.status === 'PASSED').length,
  failedCount: suiteResults.filter((r) => r.status === 'FAILED').length,
  suites: suiteResults,
};

fs.writeFileSync(
  path.join(reportsDir, 'master_reliability_summary.json'),
  JSON.stringify(summaryArtifact, null, 2)
);

if (!allPassed) {
  process.exit(1);
}
