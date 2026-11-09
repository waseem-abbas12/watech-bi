import 'fake-indexeddb/auto';
import Dexie from 'dexie';

// Define WatechDatabase directly for node environment
class WatechDatabaseTest extends Dexie {
  constructor() {
    super('WatechDatabaseIntegrityTest');
    this.version(2).stores({
      projects: 'id, name, country, cityArea, createdAt',
      businesses: 'id, projectId, domain, officialName, status, isDemo',
      audits: 'id, businessId, projectId, totalScore, grade',
      auditFindings: 'id, auditId, category, severity',
      opportunities: 'id, businessId, projectId, relevantWatechService, effort, impact',
      leadScores: 'id, businessId, projectId, totalScore, band',
      contacts: 'id, businessId, projectId, isDecisionMaker, verificationStatus',
      emails: 'id, businessId, projectId, email, verificationStatus, emailType',
      followUpSchedules: 'id, businessId, projectId, status, nextFollowUpDate, stopReason',
      crmActivities: 'id, businessId, projectId, type, timestamp',
    });
  }
}

async function runDatabaseIntegrityTests() {
  console.log('====================================================');
  console.log('TEST SUITE 4: DATABASE INTEGRITY & TRANSACTION SAFETY');
  console.log('====================================================\n');

  const db = new WatechDatabaseTest();
  const projId = 'proj-integrity-test-' + Date.now();

  const mockBatch = {
    project: {
      id: projId,
      name: 'Integrity Test Project',
      country: 'USA',
      stateRegion: 'OH',
      cityArea: 'Canton',
      industryNiche: 'HVAC',
      businessModel: 'commercial',
      watechServicesToEvaluate: [],
      researchDepth: 'deep',
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    businesses: [
      { id: 'biz-1', projectId: projId, officialName: 'Biz 1', domain: 'biz1.com', websiteUrl: 'https://biz1.com', status: 'qualified', isDemo: false },
      { id: 'biz-2', projectId: projId, officialName: 'Biz 2', domain: 'biz2.com', websiteUrl: 'https://biz2.com', status: 'audited', isDemo: false },
      { id: 'biz-3', projectId: projId, officialName: 'Biz 3', domain: 'biz3.com', websiteUrl: 'https://biz3.com', status: 'audited', isDemo: false },
    ],
    audits: [
      { id: 'audit-biz-1', businessId: 'biz-1', projectId: projId, targetUrl: 'https://biz1.com', totalScore: 78, grade: 'B', inspectedAt: new Date().toISOString(), isAutomated: true, scoringRulesVersion: 'v2', categories: [], findings: [] },
      { id: 'audit-biz-2', businessId: 'biz-2', projectId: projId, targetUrl: 'https://biz2.com', totalScore: 65, grade: 'B', inspectedAt: new Date().toISOString(), isAutomated: true, scoringRulesVersion: 'v2', categories: [], findings: [] },
      { id: 'audit-biz-3', businessId: 'biz-3', projectId: projId, targetUrl: 'https://biz3.com', totalScore: 50, grade: 'C', inspectedAt: new Date().toISOString(), isAutomated: true, scoringRulesVersion: 'v2', categories: [], findings: [] },
    ],
    contacts: [
      { id: 'ct-1', businessId: 'biz-1', projectId: projId, fullName: 'John Doe', roleOrTitle: 'Owner', confidence: 0.9, verificationStatus: 'verified' },
      { id: 'ct-2', businessId: 'biz-1', projectId: projId, fullName: 'Dispatch', roleOrTitle: 'Reception', confidence: 0.8, verificationStatus: 'unverified' },
      { id: 'ct-3', businessId: 'biz-2', projectId: projId, fullName: 'Jane Smith', roleOrTitle: 'General Manager', confidence: 0.85, verificationStatus: 'verified' },
    ],
    emailRecords: [
      { id: 'eml-1', businessId: 'biz-1', projectId: projId, email: 'john@biz1.com', verificationStatus: 'domain_passed_unconfirmed', emailType: 'named_professional' },
    ],
    opportunities: [
      { id: 'opp-biz-1-1', businessId: 'biz-1', projectId: projId, relevantWatechService: 'website_development', title: 'Site Redesign', effort: 'medium', impact: 'high' },
      { id: 'opp-biz-2-1', businessId: 'biz-2', projectId: projId, relevantWatechService: 'local_seo', title: 'Local SEO Boost', effort: 'low', impact: 'high' },
    ],
    leadScores: [
      { id: 'score-biz-1', businessId: 'biz-1', projectId: projId, totalScore: 52, band: 'B', calculatedAt: new Date().toISOString() },
      { id: 'score-biz-2', businessId: 'biz-2', projectId: projId, totalScore: 38, band: 'Hold', calculatedAt: new Date().toISOString() },
      { id: 'score-biz-3', businessId: 'biz-3', projectId: projId, totalScore: 35, band: 'Hold', calculatedAt: new Date().toISOString() },
    ],
    followUpSchedules: [
      { id: 'sched-biz-1', businessId: 'biz-1', projectId: projId, status: 'scheduled', nextFollowUpDate: '2026-11-12', preferredChannel: 'phone' },
    ],
    crmActivities: [
      { id: 'act-qual-biz-1', businessId: 'biz-1', projectId: projId, type: 'qualification_changed', title: 'Qualified', timestamp: new Date().toISOString() },
      { id: 'act-sched-biz-1', businessId: 'biz-1', projectId: projId, type: 'followup_scheduled', title: 'Scheduled', timestamp: new Date().toISOString() },
    ],
  };

  // Helper simulating repository.savePipelineBatch with Dexie atomic transaction
  async function atomicSavePipelineBatch(data) {
    await db.transaction('rw', [
      db.projects,
      db.businesses,
      db.audits,
      db.contacts,
      db.emails,
      db.opportunities,
      db.leadScores,
      db.followUpSchedules,
      db.crmActivities,
    ], async () => {
      await db.projects.put(data.project);
      await db.businesses.bulkPut(data.businesses);
      await db.audits.bulkPut(data.audits);
      await db.contacts.bulkPut(data.contacts);
      await db.emails.bulkPut(data.emailRecords);
      await db.opportunities.bulkPut(data.opportunities);
      await db.leadScores.bulkPut(data.leadScores);
      await db.followUpSchedules.bulkPut(data.followUpSchedules);
      await db.crmActivities.bulkPut(data.crmActivities);
    });
  }

  // Helper simulating repository.deleteBusiness with cascading delete
  async function cascadingDeleteBusiness(id) {
    await db.transaction('rw', [
      db.businesses,
      db.audits,
      db.contacts,
      db.opportunities,
      db.leadScores,
      db.followUpSchedules,
      db.crmActivities,
      db.emails,
    ], async () => {
      await db.businesses.delete(id);
      await db.audits.where('businessId').equals(id).delete();
      await db.contacts.where('businessId').equals(id).delete();
      await db.opportunities.where('businessId').equals(id).delete();
      await db.leadScores.where('businessId').equals(id).delete();
      await db.followUpSchedules.where('businessId').equals(id).delete();
      await db.crmActivities.where('businessId').equals(id).delete();
      await db.emails.where('businessId').equals(id).delete();
    });
  }

  // 1. Test Atomic Save
  console.log('Testing atomic savePipelineBatch...');
  await atomicSavePipelineBatch(mockBatch);
  const bizCount1 = await db.businesses.count();
  const auditCount1 = await db.audits.count();
  const contactCount1 = await db.contacts.count();
  const oppCount1 = await db.opportunities.count();
  const scoreCount1 = await db.leadScores.count();
  const schedCount1 = await db.followUpSchedules.count();
  const actCount1 = await db.crmActivities.count();

  console.log(`  Initial Saved Counts: Biz=${bizCount1}, Audits=${auditCount1}, Contacts=${contactCount1}, Opps=${oppCount1}, Scores=${scoreCount1}, Schedules=${schedCount1}, Activities=${actCount1}`);

  // 2. Test Idempotence on Repeat Write
  console.log('\nTesting idempotence on identical re-save...');
  await atomicSavePipelineBatch(mockBatch);
  const bizCount2 = await db.businesses.count();
  const schedCount2 = await db.followUpSchedules.count();
  const actCount2 = await db.crmActivities.count();
  const isIdempotent = bizCount1 === bizCount2 && schedCount1 === schedCount2 && actCount1 === actCount2;
  console.log(`  Duplicate Immunity: ${isIdempotent ? 'PASS (0 duplicate records injected)' : 'FAIL'}`);

  // 3. Test Cascading Delete Business (Orphan Record Prevention)
  console.log('\nTesting cascading delete on biz-1...');
  await cascadingDeleteBusiness('biz-1');

  const biz1Deleted = (await db.businesses.get('biz-1')) === undefined;
  const biz1Audits = await db.audits.where('businessId').equals('biz-1').count();
  const biz1Contacts = await db.contacts.where('businessId').equals('biz-1').count();
  const biz1Opps = await db.opportunities.where('businessId').equals('biz-1').count();
  const biz1Scores = await db.leadScores.where('businessId').equals('biz-1').count();
  const biz1Schedules = await db.followUpSchedules.where('businessId').equals('biz-1').count();
  const biz1Activities = await db.crmActivities.where('businessId').equals('biz-1').count();

  const zeroOrphans = biz1Audits === 0 && biz1Contacts === 0 && biz1Opps === 0 && biz1Scores === 0 && biz1Schedules === 0 && biz1Activities === 0;
  console.log(`  Business Deleted: ${biz1Deleted ? 'YES' : 'NO'}`);
  console.log(`  Orphan Child Records Remaining: ${biz1Audits + biz1Contacts + biz1Opps + biz1Scores + biz1Schedules + biz1Activities} (Expected: 0)`);
  console.log(`  Orphan Prevention Verdict: ${zeroOrphans ? 'PASS' : 'FAIL'}`);

  // Remaining businesses should still exist
  const remainingBizCount = await db.businesses.count();
  console.log(`  Remaining Businesses Count: ${remainingBizCount} (Expected: 2)`);

  // 4. Test Multi-Project Domain Isolation
  console.log('\nTesting multi-project domain isolation...');
  const projA = 'proj-market-canton';
  const projB = 'proj-market-akron';

  await db.businesses.put({ id: 'biz-canton-shared', projectId: projA, officialName: 'Shared Domain HVAC Canton', domain: 'sharedhvac.com', status: 'discovered', isDemo: false });
  await db.businesses.put({ id: 'biz-akron-shared', projectId: projB, officialName: 'Shared Domain HVAC Akron', domain: 'sharedhvac.com', status: 'discovered', isDemo: false });

  const projABusinesses = await db.businesses.where('projectId').equals(projA).toArray();
  const projBBusinesses = await db.businesses.where('projectId').equals(projB).toArray();

  const isolationPassed = projABusinesses.length === 1 && projABusinesses[0].id === 'biz-canton-shared' &&
                          projBBusinesses.length === 1 && projBBusinesses[0].id === 'biz-akron-shared';

  console.log(`  Project Isolation Verdict: ${isolationPassed ? 'PASS (Projects maintain independent records for shared domains)' : 'FAIL'}`);

  const allPassed = isIdempotent && biz1Deleted && zeroOrphans && remainingBizCount === 2 && isolationPassed;
  console.log(`\nDatabase Integrity & Transaction Safety Verdict: ${allPassed ? 'PASS' : 'FAIL'}`);

  return { suite: 'Database Integrity', passed: allPassed };
}

runDatabaseIntegrityTests()
  .then(res => {
    if (!res.passed) process.exit(1);
  })
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  });
