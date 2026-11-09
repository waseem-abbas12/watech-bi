import { signToken, verifyToken, hashPassword, verifyPassword } from '../../src/lib/server/auth.ts';
import { ROLE_PERMISSIONS } from '../../src/lib/engines/rbacEngine.ts';

async function runAuthRbacTests() {
  console.log('====================================================');
  console.log('TEST SUITE 2: AUTHENTICATION, SESSIONS & RBAC ROLES');
  console.log('====================================================\n');

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

  // 1. Password Hashing & Verification
  console.log('Test 1: Bcrypt password hashing & salt verification...');
  const password = 'SuperSecureP@ssword123!';
  const hashed = await hashPassword(password);
  assert(hashed.startsWith('$2a$') || hashed.startsWith('$2b$'), 'Bcrypt hash correctly formatted');
  const isMatch = await verifyPassword(password, hashed);
  assert(isMatch === true, 'Correct password verifies successfully against hash');
  const isMismatch = await verifyPassword('WrongPassword!', hashed);
  assert(isMismatch === false, 'Incorrect password rejected');

  // 2. JWT Signing & Claims Extraction
  console.log('\nTest 2: Cryptographic JWT token signing & claims verification...');
  const testPayload = {
    userId: 'usr-test-123',
    email: 'architect@watech.agency',
    fullName: 'Chief SaaS Architect',
    tenantId: 'tenant-watech-corp',
    role: 'owner',
    isPlatformSuperAdmin: false,
  };

  const token = signToken(testPayload, '2h');
  const verified = verifyToken(token);
  assert(verified !== null, 'Token verified successfully');
  assert(verified.userId === testPayload.userId, 'User ID preserved in claims');
  assert(verified.tenantId === testPayload.tenantId, 'Tenant ID preserved in claims');
  assert(verified.role === 'owner', 'Owner role preserved in claims');

  // 3. Session Expiration
  console.log('\nTest 3: Session expiration test...');
  const expiredToken = signToken(testPayload, -1); // Expired 1 second ago
  const expiredVerification = verifyToken(expiredToken);
  assert(expiredVerification === null, 'Expired JWT token rejected by verifyToken');

  // 4. Role Hierarchy & Permissions Verification
  console.log('\nTest 4: RBAC Role & Permission Matrix Verification...');
  const roles = ['owner', 'admin', 'manager', 'employee', 'viewer'];

  // Owner permissions
  const ownerPerms = ROLE_PERMISSIONS['owner'];
  assert(ownerPerms.includes('manage_billing'), 'Owner has manage_billing permission');
  assert(ownerPerms.includes('manage_users'), 'Owner has manage_users permission');
  assert(ownerPerms.includes('manage_projects'), 'Owner has manage_projects permission');

  // Admin permissions
  const adminPerms = ROLE_PERMISSIONS['admin'];
  assert(!adminPerms.includes('manage_billing'), 'Admin does NOT have manage_billing permission');
  assert(adminPerms.includes('manage_users'), 'Admin has manage_users permission');
  assert(adminPerms.includes('manage_projects'), 'Admin has manage_projects permission');

  // Manager permissions
  const managerPerms = ROLE_PERMISSIONS['manager'];
  assert(!managerPerms.includes('manage_users'), 'Manager does NOT have manage_users permission');
  assert(managerPerms.includes('manage_projects'), 'Manager has manage_projects permission');
  assert(managerPerms.includes('manage_crm'), 'Manager has manage_crm permission');

  // Member (employee) permissions
  const employeePerms = ROLE_PERMISSIONS['employee'];
  assert(!employeePerms.includes('manage_projects'), 'Employee does NOT have manage_projects permission');
  assert(employeePerms.includes('manage_crm'), 'Employee has manage_crm permission');
  assert(employeePerms.includes('run_audits'), 'Employee has run_audits permission');

  // 5. Test Live /api/auth/register Endpoint
  console.log('\nTest 5: Register API endpoint testing...');
  const regEmail = `tenant-test-${Date.now()}@agency.test`;
  const regRes = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: regEmail,
      password: 'StrongPassword123!',
      fullName: 'Test Agency Owner',
      organizationName: `Apex HVAC Growth Agency ${Date.now()}`,
    }),
  });

  const regData = await regRes.json();
  assert(regRes.status === 200 && regData.user?.role === 'owner', `Organization registration succeeded (Role: ${regData.user?.role})`);

  console.log(`\nAuth & RBAC Test Results: ${testsPassed} Passed, ${testsFailed} Failed`);
  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAuthRbacTests().catch((err) => {
  console.error('Fatal error running auth RBAC tests:', err);
  process.exit(1);
});
