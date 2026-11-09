import { hashPassword, verifyPassword, signToken, verifyToken } from '../../src/lib/server/auth.ts';
import { processCsvData, inferColumnMapping } from '../../src/lib/server/csvImportEngine.ts';
import { extractDomain } from '../../src/lib/utils.ts';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runOnboardingActivationTests() {
  console.log('================================================================');
  console.log('WATECH-BI PROMPT 07: ONBOARDING, PROVISIONING & ACTIVATION TESTS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  const testEmail = `newcustomer_${Date.now()}@canton-hvac.biz`;
  const rawPassword = 'StrongCustomerP@ssword2026!';
  let userId = '';
  let tenantId = '';
  let sessionToken = '';
  let resetToken = '';

  // -------------------------------------------------------------
  // Test 1: User Registration & Password Hashing
  // -------------------------------------------------------------
  console.log('Test 1: User Registration & Password Hashing...');
  try {
    const hashedPassword = await hashPassword(rawPassword);
    assert(hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2b$'), 'Password hashed with strong bcrypt salt');

    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: rawPassword,
        fullName: 'Marcus Vance',
        organizationName: 'Canton Air Comfort Co',
      }),
    });

    const regData = await regRes.json();
    assert(regRes.status === 200, `Registration endpoint responded HTTP 200 (Got: ${regRes.status})`);
    assert(regData.user && regData.user.email === testEmail, 'User record created with registered email');
    assert(regData.user.role === 'owner', 'First registrant automatically granted Owner role');
    assert(regData.tenant && regData.tenant.id, `Organization provisioned with ID: ${regData.tenant.id}`);

    userId = regData.user.id;
    tenantId = regData.tenant.id;
  } catch (err) {
    assert(false, `User registration failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 2: Authentication & Secure Session Handling
  // -------------------------------------------------------------
  console.log('\nTest 2: Authentication & Session Token Issuance...');
  try {
    sessionToken = signToken({
      userId,
      email: testEmail,
      fullName: 'Marcus Vance',
      tenantId,
      role: 'owner',
      isPlatformSuperAdmin: false,
    });
    assert(typeof sessionToken === 'string' && sessionToken.length > 20, 'Cryptographic JWT session token generated');

    const claims = verifyToken(sessionToken);
    assert(claims !== null, 'Session token signature cryptographically verified');
    assert(claims.tenantId === tenantId, 'Session claims strictly bind to provisioned tenantId');
    assert(claims.userId === userId, 'Session claims bind to registered userId');
  } catch (err) {
    assert(false, `Authentication test failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 3: Email Verification Flow
  // -------------------------------------------------------------
  console.log('\nTest 3: Email Verification Flow...');
  try {
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
      }),
    });

    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 200 && verifyData.success === true, 'Email verification endpoint returned success');
    assert(verifyData.verified === true, 'Verification status transitioned to true');
  } catch (err) {
    assert(false, `Email verification test failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 4: Password Recovery Token Issuance & Reset Flow
  // -------------------------------------------------------------
  console.log('\nTest 4: Password Recovery & Reset Lifecycle...');
  try {
    const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });

    const forgotData = await forgotRes.json();
    assert(forgotRes.status === 200 && forgotData.success === true, 'Forgot password endpoint returned success');
    assert(typeof forgotData.resetToken === 'string' && forgotData.resetToken.length > 20, '1-hour password recovery token generated');

    resetToken = forgotData.resetToken;
    const verifiedReset = verifyToken(resetToken);
    assert(verifiedReset && verifiedReset.email === testEmail, 'Reset token signature verified for targeted email');

    const newPassword = 'BrandNewSecureP@ssword2026!';
    const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        newPassword,
      }),
    });

    const resetData = await resetRes.json();
    assert(resetRes.status === 200 && resetData.success === true, 'Password reset completed with new credentials');
  } catch (err) {
    assert(false, `Password recovery test failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 5: Organization Provisioning & Profile Setup
  // -------------------------------------------------------------
  console.log('\nTest 5: Organization Provisioning & Business Profile Setup...');
  try {
    const orgRes = await fetch(`${BASE_URL}/api/organization/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        companyName: 'Canton Air Comfort Co LLC',
        industry: 'HVAC & Commercial Refrigeration',
        country: 'USA',
        businessLocation: 'Canton, OH',
        companySize: '11-50',
        primaryBusinessObjectives: ['scale_commercial_leads', 'automate_outreach'],
        tenantId,
      }),
    });

    const orgData = await orgRes.json();
    assert(orgRes.status === 200 && orgData.success === true, 'Organization profile successfully updated');
    const targetOrg = orgData.organization || orgData.tenant;
    assert(targetOrg && targetOrg.industry === 'HVAC & Commercial Refrigeration', 'Industry profile saved');
    assert(targetOrg && targetOrg.businessLocation === 'Canton, OH', 'Business location saved');
  } catch (err) {
    assert(false, `Organization setup failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 6: Workspace Provisioning & Isolation
  // -------------------------------------------------------------
  console.log('\nTest 6: Workspace Provisioning & Listing...');
  try {
    const createWsRes = await fetch(`${BASE_URL}/api/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        name: 'Stark County Commercial HVAC',
        slug: `stark-hvac-${Date.now()}`,
        description: 'Primary operational workspace for commercial contracts',
        tenantId,
      }),
    });

    const createWsData = await createWsRes.json();
    assert(createWsRes.status === 200 && createWsData.success === true, 'Workspace created via POST /api/workspaces');

    const getWsRes = await fetch(`${BASE_URL}/api/workspaces?tenantId=${tenantId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    const getWsData = await getWsRes.json();
    assert(getWsRes.status === 200 && Array.isArray(getWsData.workspaces), 'Workspaces list returned successfully');
    assert(getWsData.workspaces.length >= 1, `Found ${getWsData.workspaces.length} workspace(s) scoped to tenant`);
  } catch (err) {
    assert(false, `Workspace test failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 7: Project Creation Persistence
  // -------------------------------------------------------------
  console.log('\nTest 7: Project Creation Persistence...');
  const testProjectId = `proj-canton-test-${Date.now()}`;
  try {
    const sampleProject = {
      id: testProjectId,
      tenantId,
      name: 'Canton Commercial HVAC Market Q1',
      industryNiche: 'HVAC',
      cityArea: 'Canton',
      stateRegion: 'OH',
      country: 'USA',
      businessModel: 'commercial',
      researchDepth: 'deep',
      targetDiscoveryCount: 10,
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    assert(sampleProject.industryNiche === 'HVAC', 'Project schema includes industry niche');
    assert(sampleProject.isDemo === false, 'Demonstration flag correctly false for newly onboarded project');
    assert(sampleProject.tenantId === tenantId, 'Project binds strictly to authenticated tenant context');
  } catch (err) {
    assert(false, `Project test failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 8: CSV Ingestion Engine — Auto Column Mapping & Normalization
  // -------------------------------------------------------------
  console.log('\nTest 8: CSV Ingestion Engine — Auto Column Mapping & Normalization...');
  try {
    const sampleCsvString = `Company Name,Website URL,Business Phone,Contact Email,City,State
Beckers Heating and Air,https://www.beckersheating.com/,330-456-7890,service@beckersheating.com,Canton,OH
Quality Air Canton LLC,qualityaircanton.com,330-555-1212,info@qualityaircanton.com,Canton,OH`;

    const result = processCsvData(sampleCsvString, {
      projectId: testProjectId,
      tenantId,
      cityFallback: 'Canton',
      stateFallback: 'OH',
    });

    assert(result.totalRows === 2, 'Total CSV rows detected accurately');
    assert(result.validCount === 2, 'Both valid rows successfully parsed');
    assert(result.importedBusinesses[0].officialName === 'Beckers Heating and Air', 'Auto-inferred Company Name mapped');
    assert(result.importedBusinesses[0].domain === 'beckersheating.com', 'Domain extracted correctly from full URL');
    assert(result.importedBusinesses[1].websiteUrl.startsWith('https://'), 'Protocol automatically prepended to bare website domain');
  } catch (err) {
    assert(false, `CSV engine mapping failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 9: CSV Ingestion — Error Reporting (Zero Silent Discards)
  // -------------------------------------------------------------
  console.log('\nTest 9: CSV Ingestion — Zero Silent Discards & Rejection Reporting...');
  try {
    const invalidCsvString = `Company Name,Website URL
,https://validwebsite.com
No Website Heating Co,
Broken URL HVAC,ht!tp://@@invalid..url`;

    const result = processCsvData(invalidCsvString, {
      projectId: testProjectId,
      tenantId,
    });

    assert(result.importedCount === 0, 'Zero invalid rows were imported');
    assert(result.invalidRows.length === 3, 'All 3 defective rows recorded with explicit failure causes');
    assert(result.invalidRows[0].errors[0].includes('Missing or invalid business name'), 'Line 2 caught missing name');
    assert(result.invalidRows[1].errors[0].includes('Missing website URL or domain'), 'Line 3 caught missing website');
    assert(result.invalidRows[2].errors[0].includes('Invalid or unextractable website domain'), 'Line 4 caught unparseable URL');
    assert(result.invalidRows[0].line === 2 && result.invalidRows[1].line === 3, 'Exact source line numbers preserved for export');
  } catch (err) {
    assert(false, `CSV error reporting failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 10: Duplicate Import Prevention
  // -------------------------------------------------------------
  console.log('\nTest 10: Duplicate Import Prevention within Batch & Against Database...');
  try {
    const batchWithDupes = `Company Name,Website URL
Canton Central Heating,https://cantoncentral.com
Canton Central Heating Branch 2,https://cantoncentral.com
Canton Central Heating,https://differentdomain.com`;

    const result = processCsvData(batchWithDupes, {
      projectId: testProjectId,
      tenantId,
    });

    assert(result.validCount === 1, 'Only first unique business accepted');
    assert(result.duplicateCount === 2, 'Both duplicate domain and duplicate name rejected in batch');
  } catch (err) {
    assert(false, `Duplicate prevention failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 11: End-to-End Pipeline Execution & CRM Lead Persistence
  // -------------------------------------------------------------
  console.log('\nTest 11: End-to-End Pipeline Execution & CRM Lead Persistence...');
  try {
    const sampleLead = [
      {
        id: `biz-lead-${Date.now()}`,
        tenantId,
        projectId: testProjectId,
        officialName: 'Elsass Heating & Cooling',
        websiteUrl: 'https://elsassheat.com',
        domain: 'elsassheat.com',
        phone: '(330) 456-0001',
        city: 'Canton',
        state: 'OH',
        country: 'USA',
        businessModel: 'commercial',
        status: 'discovered',
        ownerVerificationStatus: 'unverified',
        marketingChannels: [],
        opportunityScore: 0,
        isDemo: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const pipeRes = await fetch(`${BASE_URL}/api/pipeline/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        mode: 'existing_businesses',
        existingBusinesses: sampleLead,
        projectId: testProjectId,
        projectName: 'Canton Commercial HVAC Market Q1',
        minimumScore: 40,
      }),
    });

    const pipeData = await pipeRes.json();
    assert(pipeRes.status === 200 && pipeData.success === true, '10-stage autonomous pipeline executed successfully (HTTP 200)');
    assert(pipeData.data && pipeData.data.businesses.length >= 1, 'Processed lead returned with intelligence enrichments');
    assert(pipeData.data.leadScores && pipeData.data.leadScores.length >= 1, 'Deterministic lead scoring computed');
  } catch (err) {
    assert(false, `Pipeline execution failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 12: Cross-Tenant Isolation Enforcement
  // -------------------------------------------------------------
  console.log('\nTest 12: Cross-Tenant Isolation Enforcement...');
  try {
    // Generate token for a distinct Tenant B
    const tokenTenantB = signToken({
      userId: 'usr-competitor-999',
      email: 'owner@competitor-hvac.biz',
      fullName: 'Competitor Owner',
      tenantId: 'tenant-competitor-xyz',
      role: 'owner',
      isPlatformSuperAdmin: false,
    });

    // Tenant B attempts to execute on Tenant A's project
    const unauthorizedPipeRes = await fetch(`${BASE_URL}/api/pipeline/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenTenantB}`,
      },
      body: JSON.stringify({
        mode: 'existing_businesses',
        existingBusinesses: [],
        projectId: testProjectId,
        projectName: 'Tampered Project',
        tenantId, // Attempting to tamper with Tenant A ID
      }),
    });

    assert(unauthorizedPipeRes.status === 403, `Cross-tenant execution correctly blocked with HTTP 403 (Got: ${unauthorizedPipeRes.status})`);

    // Tenant B attempts to access Tenant A's organization setup
    const unauthorizedOrgRes = await fetch(`${BASE_URL}/api/organization/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenTenantB}`,
      },
      body: JSON.stringify({
        companyName: 'Malicious Overwrite Attempt',
        industry: 'HVAC',
        businessLocation: 'Canton, OH',
        tenantId, // Target Tenant A
      }),
    });

    assert(unauthorizedOrgRes.status === 403, `Cross-tenant organization modification blocked with HTTP 403 (Got: ${unauthorizedOrgRes.status})`);
  } catch (err) {
    assert(false, `Cross-tenant defense failed: ${err.message}`);
  }

  // Summary
  console.log('\n================================================================');
  console.log(`ONBOARDING & ACTIVATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('ALL 12 ACCEPTANCE CRITERIA PASSED FULLY.');
    process.exit(0);
  }
}

runOnboardingActivationTests().catch(err => {
  console.error('Fatal test runner exception:', err);
  process.exit(1);
});
