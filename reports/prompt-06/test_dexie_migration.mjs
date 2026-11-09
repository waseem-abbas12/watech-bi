import { migrateDexieToPostgreSql } from '../../src/lib/server/dexieToPostgresMigration.ts';

async function runDexieMigrationTests() {
  console.log('====================================================');
  console.log('TEST SUITE 3: DEXIE TO CENTRALIZED DATABASE MIGRATION');
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

  // Realistic synthetic Dexie export fixture
  const sampleDexieExport = {
    tenants: [
      { id: 'tenant-canton-hvac', slug: 'canton-hvac', name: 'Canton HVAC Growth', planId: 'plan-growth', contactEmail: 'admin@cantonhvac.com' },
    ],
    projects: [
      { id: 'proj-mig-01', tenantId: 'tenant-canton-hvac', name: 'Canton Commercial HVAC Market', industryNiche: 'HVAC', cityArea: 'Canton, OH' },
    ],
    businesses: [
      { id: 'biz-mig-01', tenantId: 'tenant-canton-hvac', projectId: 'proj-mig-01', officialName: 'Canton Heating Specialists', domain: 'cantonheat.com', websiteUrl: 'https://cantonheat.com', phone: '(330) 555-1212', opportunityScore: 54 },
      { id: 'biz-mig-02', tenantId: 'tenant-canton-hvac', projectId: 'proj-mig-01', officialName: 'Buckeye Air Solutions', domain: 'buckeyeair.com', websiteUrl: 'https://buckeyeair.com', phone: '(330) 555-3434', opportunityScore: 62 },
      // Invalid business (missing name) to test rejection reporting
      { id: 'biz-invalid-03', projectId: 'proj-mig-01' },
    ],
    audits: [
      { id: 'aud-mig-01', tenantId: 'tenant-canton-hvac', businessId: 'biz-mig-01', projectId: 'proj-mig-01', targetUrl: 'https://cantonheat.com', totalScore: 48, grade: 'C' },
    ],
    auditFindings: [
      { id: 'fnd-mig-01', tenantId: 'tenant-canton-hvac', auditId: 'aud-mig-01', category: 'mobile_responsiveness', severity: 'high', observation: 'No responsive viewport tag detected' },
    ],
    contacts: [
      { id: 'cnt-mig-01', tenantId: 'tenant-canton-hvac', businessId: 'biz-mig-01', projectId: 'proj-mig-01', fullName: 'Dan Miller', roleOrTitle: 'Owner & President', isDecisionMaker: true, decisionMakerTier: 'tier1_executive', email: 'dan@cantonheat.com' },
    ],
    opportunities: [
      { id: 'opp-mig-01', tenantId: 'tenant-canton-hvac', businessId: 'biz-mig-01', projectId: 'proj-mig-01', category: 'mobile_responsiveness', title: 'Mobile Viewport Optimization', severity: 'high', impact: 'critical' },
    ],
    leadScores: [
      { id: 'score-mig-01', tenantId: 'tenant-canton-hvac', businessId: 'biz-mig-01', projectId: 'proj-mig-01', score: 54, scoreBand: 'C', isQualified: true },
    ],
    crmActivities: [
      { id: 'crm-mig-01', tenantId: 'tenant-canton-hvac', businessId: 'biz-mig-01', projectId: 'proj-mig-01', type: 'lead_discovered', stage: 'lead', title: 'Lead Discovered in Canton OH' },
    ],
    followUpSchedules: [
      { id: 'sch-mig-01', tenantId: 'tenant-canton-hvac', businessId: 'biz-mig-01', projectId: 'proj-mig-01', scheduledFor: new Date().toISOString(), cadenceStep: 1, channel: 'email' },
    ],
  };

  console.log('Test 1: Executing Dry-Run preflight validation on Dexie export...');
  const dryRunSummary = await migrateDexieToPostgreSql(JSON.stringify(sampleDexieExport), {
    dryRun: true,
    defaultTenantId: 'tenant-canton-hvac',
  });

  assert(dryRunSummary.dryRun === true, 'Migration executed in dry-run mode');
  assert(dryRunSummary.tenantsImported === 1, `Tenants validated: ${dryRunSummary.tenantsImported} (Expected: 1)`);
  assert(dryRunSummary.projectsImported === 1, `Projects validated: ${dryRunSummary.projectsImported} (Expected: 1)`);
  assert(dryRunSummary.businessesImported === 2, `Valid businesses validated: ${dryRunSummary.businessesImported} (Expected: 2)`);
  assert(dryRunSummary.rejectedRows.length === 1, `Invalid row rejected: ${dryRunSummary.rejectedRows.length} (Expected: 1)`);
  assert(dryRunSummary.auditsImported === 1, `Audits validated: ${dryRunSummary.auditsImported} (Expected: 1)`);
  assert(dryRunSummary.contactsImported === 1, `Contacts validated: ${dryRunSummary.contactsImported} (Expected: 1)`);
  assert(dryRunSummary.opportunitiesImported === 1, `Opportunities validated: ${dryRunSummary.opportunitiesImported} (Expected: 1)`);
  assert(dryRunSummary.leadScoresImported === 1, `Lead scores validated: ${dryRunSummary.leadScoresImported} (Expected: 1)`);
  assert(dryRunSummary.crmActivitiesImported === 1, `CRM activities validated: ${dryRunSummary.crmActivitiesImported} (Expected: 1)`);
  assert(dryRunSummary.followUpSchedulesImported === 1, `Follow-up schedules validated: ${dryRunSummary.followUpSchedulesImported} (Expected: 1)`);

  console.log('Test 2: Testing malformed JSON recovery...');
  const invalidJsonSummary = await migrateDexieToPostgreSql('{ malformed: true, ', { dryRun: true });
  assert(invalidJsonSummary.errors.length > 0, 'Malformed JSON gracefully caught and reported without crashing');

  console.log(`\nDexie Migration Test Results: ${testsPassed} Passed, ${testsFailed} Failed`);
  if (testsFailed > 0) {
    process.exit(1);
  }
}

runDexieMigrationTests().catch((err) => {
  console.error('Fatal error running migration tests:', err);
  process.exit(1);
});
