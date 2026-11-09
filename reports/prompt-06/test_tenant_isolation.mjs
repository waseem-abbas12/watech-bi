import { signToken } from '../../src/lib/server/auth.ts';

async function runTenantIsolationTests() {
  console.log('====================================================');
  console.log('TEST SUITE 1: MULTI-TENANT ISOLATION & ACCESS CONTROL');
  console.log('====================================================\n');

  // Organization A Fixture
  const orgA = {
    tenantId: 'tenant-org-alpha',
    name: 'Alpha HVAC Contractors LLC',
    user: {
      userId: 'user-alpha-owner',
      email: 'owner@alphahvac.com',
      fullName: 'Alice Alpha',
      role: 'owner',
      isPlatformSuperAdmin: false,
    },
    projectId: 'proj-alpha-001',
  };

  // Organization B Fixture
  const orgB = {
    tenantId: 'tenant-org-beta',
    name: 'Beta Climate Systems Inc',
    user: {
      userId: 'user-beta-owner',
      email: 'owner@betaclimate.com',
      fullName: 'Bob Beta',
      role: 'owner',
      isPlatformSuperAdmin: false,
    },
    projectId: 'proj-beta-001',
  };

  // Generate real cryptographic JWT tokens for each organization
  const tokenA = signToken({
    userId: orgA.user.userId,
    email: orgA.user.email,
    fullName: orgA.user.fullName,
    tenantId: orgA.tenantId,
    role: orgA.user.role,
    isPlatformSuperAdmin: orgA.user.isPlatformSuperAdmin,
  });

  const tokenB = signToken({
    userId: orgB.user.userId,
    email: orgB.user.email,
    fullName: orgB.user.fullName,
    tenantId: orgB.tenantId,
    role: orgB.user.role,
    isPlatformSuperAdmin: orgB.user.isPlatformSuperAdmin,
  });

  const sampleBusinessesA = [
    {
      id: 'biz-alpha-1',
      tenantId: orgA.tenantId,
      projectId: orgA.projectId,
      officialName: 'Alpha Canton Heating & Cooling',
      websiteUrl: 'https://elsassheat.com',
      hasWebsite: true,
      phone: '(330) 456-0001',
    },
  ];

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      testsPassed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      testsFailed++;
    }
  }

  // ---------------------------------------------------------------
  // TEST 1: User A executes pipeline on Org A's project (Authorized)
  // ---------------------------------------------------------------
  console.log('Test 1: User A (Org A) executes pipeline on Org A project...');
  const res1 = await fetch('http://localhost:3000/api/pipeline/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      mode: 'existing_businesses',
      existingBusinesses: sampleBusinessesA,
      projectId: orgA.projectId,
      minimumScore: 40,
    }),
  });

  const data1 = await res1.json();
  assert(res1.status === 200 && data1.success === true, `User A authorized execution succeeded (Status: ${res1.status})`);

  // ---------------------------------------------------------------
  // TEST 2: User B attempts cross-tenant execution supplying Org A's tenantId parameter
  // ---------------------------------------------------------------
  console.log('\nTest 2: User B (Org B) attempts cross-tenant parameter tampering targeting Org A...');
  const res2 = await fetch('http://localhost:3000/api/pipeline/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`, // User B token
    },
    body: JSON.stringify({
      mode: 'existing_businesses',
      existingBusinesses: sampleBusinessesA,
      projectId: orgA.projectId,
      tenantId: orgA.tenantId, // Intentionally malicious cross-tenant parameter
      minimumScore: 40,
    }),
  });

  const data2 = await res2.json();
  assert(
    res2.status === 403 && data2.errorCode === 'CROSS_TENANT_ACCESS_DENIED',
    `Cross-tenant execution blocked with 403 Forbidden (ErrorCode: ${data2.errorCode})`
  );

  // ---------------------------------------------------------------
  // TEST 3: User B executes pipeline on User B's own project (Authorized)
  // ---------------------------------------------------------------
  console.log('\nTest 3: User B (Org B) executes pipeline on Org B own project...');
  const sampleBusinessesB = [
    {
      id: 'biz-beta-1',
      tenantId: orgB.tenantId,
      projectId: orgB.projectId,
      officialName: 'Beta Climate Systems',
      websiteUrl: 'https://fostersheatingair.com',
      hasWebsite: true,
      phone: '(330) 456-0002',
    },
  ];

  const res3 = await fetch('http://localhost:3000/api/pipeline/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
    },
    body: JSON.stringify({
      mode: 'existing_businesses',
      existingBusinesses: sampleBusinessesB,
      projectId: orgB.projectId,
      minimumScore: 40,
    }),
  });

  const data3 = await res3.json();
  assert(res3.status === 200 && data3.success === true, `User B authorized execution on Org B succeeded (Status: ${res3.status})`);

  // ---------------------------------------------------------------
  // TEST 4: Multi-tenant token isolation & claim tampering
  // ---------------------------------------------------------------
  console.log('\nTest 4: Tampered JWT token with forged tenantId...');
  const forgedToken = tokenA.substring(0, tokenA.length - 10) + 'invalidabc';
  const res4 = await fetch('http://localhost:3000/api/auth/me', {
    headers: {
      Authorization: `Bearer ${forgedToken}`,
    },
  });

  const data4 = await res4.json();
  assert(data4.authenticated === false, 'Tampered JWT token rejected by server authentication');

  console.log(`\nTenant Isolation Test Results: ${testsPassed} Passed, ${testsFailed} Failed`);
  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTenantIsolationTests().catch((err) => {
  console.error('Fatal error running tenant isolation tests:', err);
  process.exit(1);
});
