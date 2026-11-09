import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const reportsDir = path.resolve('reports/prompt-06');

const suites = [
  {
    name: 'Suite 1: Multi-Tenant Isolation & Cross-Tenant Defense',
    file: 'test_tenant_isolation.mjs',
    runner: 'tsx',
    description: 'Proves Organization A and Organization B isolation. Verifies cross-tenant execution blocking with HTTP 403, parameter tampering rejection, and cryptographic token verification.',
  },
  {
    name: 'Suite 2: Authentication, Sessions & RBAC Roles',
    file: 'test_auth_rbac.mjs',
    runner: 'tsx',
    description: 'Validates bcrypt password hashing, JWT signing, session expiration, RBAC permissions across Owner, Admin, Manager, Member, and live registration endpoint.',
  },
  {
    name: 'Suite 3: Dexie to Centralized Database Migration',
    file: 'test_dexie_migration.mjs',
    runner: 'tsx',
    description: 'Validates non-destructive migration engine with dry-run preflight, schema validation across all 10 pipeline entities, and rejection of malformed rows.',
  },
  {
    name: 'Suite 4: Distributed Multi-Tenant Pipeline Locking',
    file: 'test_distributed_locking.mjs',
    runner: 'tsx',
    description: 'Verifies database-backed distributed locking, multi-tenant lock isolation (same project name across different tenants), and atomic release.',
  },
];

console.log('================================================================');
console.log('WATECH-BI PROMPT 06: MASTER MULTI-TENANT SAAS TEST RUNNER');
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
console.log('MASTER PROMPT 06 TEST SUMMARY');
console.log('================================================================');
suiteResults.forEach((res, idx) => {
  console.log(`${idx + 1}. [${res.status}] ${res.name} (${res.durationMs}ms)`);
});
console.log('================================================================');
console.log(`FINAL RESULT: ${allPassed ? 'ALL MULTI-TENANT TEST SUITES PASSED (VERDICT: PASS)' : 'SOME TESTS FAILED (VERDICT: FAIL)'}`);
console.log('================================================================\n');

const summaryArtifact = {
  executedAt: new Date().toISOString(),
  verdict: allPassed ? 'PASS' : 'FAIL',
  suitesCount: suites.length,
  passedCount: suiteResults.filter((r) => r.status === 'PASSED').length,
  failedCount: suiteResults.filter((r) => r.status === 'FAILED').length,
  suites: suiteResults,
};

fs.writeFileSync(
  path.join(reportsDir, 'master_prompt06_summary.json'),
  JSON.stringify(summaryArtifact, null, 2)
);

if (!allPassed) {
  process.exit(1);
}
