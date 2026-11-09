import { signToken } from '../../src/lib/server/auth.ts';

const testToken = signToken({
  userId: 'usr-p05-tester',
  email: 'test@watech.agency',
  fullName: 'Prompt 05 Tester',
  tenantId: 'tenant-watech-hq',
  role: 'owner',
  isPlatformSuperAdmin: true,
});

async function runConcurrencyLockTests() {
  console.log('====================================================');
  console.log('TEST SUITE 2: IN-FLIGHT PIPELINE CONCURRENCY & LOCKING');
  console.log('====================================================\n');

  const testProject = 'proj-concurrency-test-01';
  const testBusinesses = [
    {
      id: 'biz-conc-01',
      projectId: testProject,
      officialName: 'Concurrent Test HVAC 1',
      domain: 'conc-test-1.com',
      websiteUrl: 'https://elsassheat.com',
      hasWebsite: true,
      phone: '(330) 111-2222',
      isDemo: false,
    },
    {
      id: 'biz-conc-02',
      projectId: testProject,
      officialName: 'Concurrent Test HVAC 2',
      domain: 'conc-test-2.com',
      websiteUrl: 'https://elsassheat.com',
      hasWebsite: true,
      phone: '(330) 111-3333',
      isDemo: false,
    },
  ];

  console.log('Triggering two simultaneous pipeline executions for the same project...');
  const startTime = Date.now();

  const reqBody = JSON.stringify({
    mode: 'existing_businesses',
    existingBusinesses: testBusinesses,
    projectId: testProject,
    minimumScore: 40,
  });

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${testToken}`,
  };

  // Launch both requests concurrently in parallel
  const [res1, res2] = await Promise.all([
    fetch('http://localhost:3000/api/pipeline/execute', {
      method: 'POST',
      headers: authHeaders,
      body: reqBody,
    }),
    fetch('http://localhost:3000/api/pipeline/execute', {
      method: 'POST',
      headers: authHeaders,
      body: reqBody,
    }),
  ]);

  const data1 = await res1.json();
  const data2 = await res2.json();

  console.log(`Execution 1 Response: Status ${res1.status}, Success: ${data1.success}, RunId: ${data1.runId}`);
  console.log(`Execution 2 Response: Status ${res2.status}, Success: ${data2.success}, ErrorCode: ${data2.errorCode}`);

  const lockTriggered =
    (res1.status === 409 && data1.errorCode === 'CONCURRENT_EXECUTION_LOCKED' && res2.status === 200) ||
    (res2.status === 409 && data2.errorCode === 'CONCURRENT_EXECUTION_LOCKED' && res1.status === 200);
  console.log(`\nMutex Lock Guard Active: ${lockTriggered ? 'PASS (Status 409 Conflict Blocked Duplicate Run)' : 'FAIL'}`);

  // Test Sequential Re-execution after lock is released
  console.log('\nTesting sequential execution after lock release...');
  const res3 = await fetch('http://localhost:3000/api/pipeline/execute', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      mode: 'existing_businesses',
      existingBusinesses: testBusinesses,
      projectId: testProject,
      minimumScore: 40,
    }),
  });
  const data3 = await res3.json();
  const sequentialPassed = res3.status === 200 && data3.success === true;
  console.log(`Sequential Run Status: ${res3.status}, Success: ${data3.success}, Lock Released: ${sequentialPassed ? 'YES' : 'NO'}`);

  const testPassed = lockTriggered && sequentialPassed;
  console.log(`\nConcurrency & Locking Verdict: ${testPassed ? 'PASS' : 'FAIL'}`);

  return { suite: 'Concurrency & Locking', passed: testPassed, lockTriggered, sequentialPassed };
}

runConcurrencyLockTests()
  .then(res => {
    if (!res.passed) process.exit(1);
  })
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  });
