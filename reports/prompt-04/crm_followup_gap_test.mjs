async function runGapVerification() {
  console.log('===============================================================');
  console.log('CRM & FOLLOW-UP ACCEPTANCE GAP VERIFICATION (ISOLATED FIXTURES)');
  console.log('===============================================================\n');

  const projectId = 'proj-synthetic-gap-test-' + Date.now();

  // Fixture A: Legitimate Qualifying Fixture (Designed to score >= 35 due to verified defects & contacts)
  const qualifyingFixture = {
    id: 'biz-synthetic-qualifying-test',
    projectId,
    officialName: 'Synthetic Qualifying HVAC Corp [TEST ONLY]',
    brandName: 'Qualifying HVAC',
    domain: 'example.com',
    websiteUrl: 'https://example.com',
    hasWebsite: true,
    phone: '(330) 555-0191',
    email: 'service@synthetic-qualifying-hvac.test',
    city: 'Canton',
    state: 'OH',
    country: 'USA',
    serviceArea: 'Canton, OH',
    businessModel: 'commercial',
    ownerVerificationStatus: 'unverified',
    reviewRating: 3.8,
    reviewCount: 8,
    isDemo: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Fixture B: Legitimate Non-Qualifying Fixture (Has no website, no contact, will score low)
  const nonQualifyingFixture = {
    id: 'biz-synthetic-non-qualifying-test',
    projectId,
    officialName: 'Synthetic Dormant HVAC Ltd [TEST ONLY]',
    brandName: 'Dormant HVAC',
    domain: '',
    websiteUrl: '',
    hasWebsite: false,
    city: 'Canton',
    state: 'OH',
    country: 'USA',
    serviceArea: 'Canton, OH',
    businessModel: 'residential',
    ownerVerificationStatus: 'unverified',
    isDemo: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  console.log('--- EXECUTION 1: First Run ---');
  const res1 = await fetch('http://localhost:3000/api/pipeline/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'existing_businesses',
      existingBusinesses: [qualifyingFixture, nonQualifyingFixture],
      minimumScore: 35, // threshold for qualification
      projectId,
      excludeDemo: true,
    }),
  });

  const run1 = await res1.json();

  console.log('Success:', run1.success);
  console.log('Summary:', JSON.stringify(run1.summary, null, 2));

  const qualBiz1 = run1.data.businesses.find((b) => b.id === qualifyingFixture.id);
  const nonQualBiz1 = run1.data.businesses.find((b) => b.id === nonQualifyingFixture.id);
  const scoreQual1 = run1.data.leadScores.find((s) => s.businessId === qualifyingFixture.id);
  const scoreNonQual1 = run1.data.leadScores.find((s) => s.businessId === nonQualifyingFixture.id);

  console.log('\n[Fixture 1 - Qualifying]:');
  console.log('  Score:', scoreQual1?.totalScore, '/ 100 (Threshold: 35)');
  console.log('  Status:', qualBiz1?.status, '(Expected: qualified)');
  console.log('  QueueStatus:', qualBiz1?.queueStatus, '(Expected: prepare_outreach)');

  const qualActivities = run1.data.crmActivities.filter((a) => a.businessId === qualifyingFixture.id);
  console.log('  CRM Activities Count:', qualActivities.length, '(Expected: >= 2, qual + schedule)');
  qualActivities.forEach((a) => console.log('    Activity:', a.id, a.type, '-', a.title));

  const qualSchedule = run1.data.followUpSchedules.find((s) => s.businessId === qualifyingFixture.id);
  console.log('  Follow-Up Schedule:', qualSchedule ? 'CREATED' : 'MISSING');
  if (qualSchedule) {
    console.log('    Schedule ID:', qualSchedule.id);
    console.log('    First Outreach:', qualSchedule.firstOutreachDate);
    console.log('    Next Follow-Up Date:', qualSchedule.nextFollowUpDate);
    console.log('    Interval Days:', qualSchedule.followUpIntervalDays);
    console.log('    Status:', qualSchedule.status);
  }

  console.log('\n[Fixture 2 - Non-Qualifying]:');
  console.log('  Score:', scoreNonQual1?.totalScore, '/ 100');
  console.log('  Status:', nonQualBiz1?.status, '(Expected: discovered)');
  const nonQualActivities = run1.data.crmActivities.filter((a) => a.businessId === nonQualifyingFixture.id);
  console.log('  CRM Activities Count:', nonQualActivities.length, '(Expected: 0)');
  const nonQualSchedule = run1.data.followUpSchedules.find((s) => s.businessId === nonQualifyingFixture.id);
  console.log('  Follow-Up Schedule:', nonQualSchedule ? 'UNEXPECTED' : 'NONE (CORRECT)');

  // EXECUTION 2: Idempotence Repeat Test
  console.log('\n--- EXECUTION 2: Second Run (Idempotence Test) ---');
  const res2 = await fetch('http://localhost:3000/api/pipeline/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'existing_businesses',
      existingBusinesses: [qualifyingFixture, nonQualifyingFixture],
      minimumScore: 35,
      projectId,
      excludeDemo: true,
    }),
  });

  const run2 = await res2.json();

  const qualActivitiesRun2 = run2.data.crmActivities.filter((a) => a.businessId === qualifyingFixture.id);
  const qualScheduleRun2 = run2.data.followUpSchedules.filter((s) => s.businessId === qualifyingFixture.id);

  console.log('  Run 2 Qualifying CRM Activities Count:', qualActivitiesRun2.length, '(Expected: same as Run 1)');
  console.log('  Run 2 Follow-Up Schedules Count:', qualScheduleRun2.length, '(Expected: 1, no duplicate)');

  const isActivityIdStable = qualActivitiesRun2[0]?.id === qualActivities[0]?.id;
  const isScheduleIdStable = qualScheduleRun2[0]?.id === qualSchedule?.id;

  console.log('  Activity ID Stable:', isActivityIdStable, `(${qualActivities[0]?.id})`);
  console.log('  Schedule ID Stable:', isScheduleIdStable, `(${qualSchedule?.id})`);

  const passed =
    qualBiz1?.status === 'qualified' &&
    nonQualBiz1?.status !== 'qualified' &&
    qualActivities.length >= 2 &&
    nonQualActivities.length === 0 &&
    Boolean(qualSchedule) &&
    !nonQualSchedule &&
    isActivityIdStable &&
    isScheduleIdStable;

  console.log('\n===============================================================');
  console.log('GAP TEST RESULT:', passed ? 'VERIFIED & PASSED' : 'FAILED');
  console.log('===============================================================');

  if (!passed) process.exit(1);
}

runGapVerification().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
