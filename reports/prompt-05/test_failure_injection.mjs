import { signToken } from '../../src/lib/server/auth.ts';

const testToken = signToken({
  userId: 'usr-p05-tester',
  email: 'test@watech.agency',
  fullName: 'Prompt 05 Tester',
  tenantId: 'tenant-watech-hq',
  role: 'owner',
  isPlatformSuperAdmin: true,
});

async function runFailureInjectionTests() {
  console.log('====================================================');
  console.log('TEST SUITE 3: FAILURE INJECTION & PARTIAL ISOLATION');
  console.log('====================================================\n');

  const testProject = 'proj-failure-injection-test';
  const injectedBusinesses = [
    {
      id: 'biz-healthy-1',
      projectId: testProject,
      officialName: 'Healthy HVAC One',
      domain: 'elsassheat.com',
      websiteUrl: 'https://elsassheat.com',
      hasWebsite: true,
      phone: '(330) 454-3713',
      isDemo: false,
    },
    {
      id: 'biz-dns-fail',
      projectId: testProject,
      officialName: 'DNS Failure HVAC',
      domain: 'unresolvable-domain-failure-999.invalid',
      websiteUrl: 'https://unresolvable-domain-failure-999.invalid',
      hasWebsite: true,
      phone: '(330) 999-0001',
      isDemo: false,
    },
    {
      id: 'biz-ssrf-blocked',
      projectId: testProject,
      officialName: 'SSRF Malicious Target',
      domain: '127.0.0.1',
      websiteUrl: 'http://127.0.0.1:3000',
      hasWebsite: true,
      phone: '(330) 999-0002',
      isDemo: false,
    },
    {
      id: 'biz-healthy-2',
      projectId: testProject,
      officialName: 'Healthy HVAC Two',
      domain: 'fostersheatingair.com',
      websiteUrl: 'https://fostersheatingair.com',
      hasWebsite: true,
      phone: '(330) 418-0673',
      isDemo: false,
    },
    {
      id: 'biz-no-website',
      projectId: testProject,
      officialName: 'No Website Local Dispatch',
      domain: '',
      websiteUrl: '',
      hasWebsite: false,
      phone: '(330) 555-4321',
      isDemo: false,
    },
  ];

  console.log(`Executing pipeline with ${injectedBusinesses.length} mixed healthy and failure-injected targets...`);
  const startTime = Date.now();

  const res = await fetch('http://localhost:3000/api/pipeline/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testToken}`,
    },
    body: JSON.stringify({
      mode: 'existing_businesses',
      existingBusinesses: injectedBusinesses,
      projectId: testProject,
      minimumScore: 35,
    }),
  });

  const durationMs = Date.now() - startTime;
  const result = await res.json();

  console.log(`\nAPI Response Status: ${res.status}`);
  console.log(`Pipeline Overall Status: ${result.status}`);
  console.log(`Run ID: ${result.runId}`);
  console.log(`Total Execution Time: ${durationMs} ms`);

  const summary = result.summary;
  console.log('\nExecution Summary:');
  console.log(`  - Total Businesses: ${summary.totalDiscovered}`);
  console.log(`  - Audits Succeeded: ${summary.audited}`);
  console.log(`  - Audits Failed:    ${summary.auditFailed}`);
  console.log(`  - Audits Skipped:   ${summary.auditSkipped}`);
  console.log(`  - Contacts Found:   ${summary.contactsFound}`);
  console.log(`  - Scored Leads:     ${summary.leadsScored}`);
  console.log(`  - Retries Triggered:${summary.totalRetries}`);

  // Assertions
  const assertions = {
    apiSucceeded: res.status === 200 && result.success === true,
    statusIsPartial: result.status === 'partial', // Non-negotiable: failed records must keep batch partial
    healthyAudited: summary.audited === 2,
    failuresIsolated: summary.auditFailed === 2, // DNS fail + SSRF blocked
    skippedHandled: summary.auditSkipped === 1, // No website
    scoringNotHalted: summary.leadsScored === 5, // All 5 must receive deterministic score
    noCrashOnDnsFail: true,
  };

  console.log('\nFailure Isolation Assertions:');
  for (const [key, val] of Object.entries(assertions)) {
    console.log(`  [${val ? 'PASS' : 'FAIL'}] ${key}`);
  }

  const allPassed = Object.values(assertions).every(Boolean);
  console.log(`\nFailure Injection & Recovery Verdict: ${allPassed ? 'PASS' : 'FAIL'}`);

  return { suite: 'Failure Injection & Isolation', passed: allPassed, assertions, summary };
}

runFailureInjectionTests()
  .then(res => {
    if (!res.passed) process.exit(1);
  })
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  });
