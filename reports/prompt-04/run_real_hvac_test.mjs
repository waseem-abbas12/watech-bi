import fs from 'node:fs';

async function runRealHvacPipelineTest() {
  console.log('===============================================================');
  console.log('MISSION 04: REAL-WORLD CANTON, OH HVAC PIPELINE VALIDATION');
  console.log('===============================================================\n');

  const csvContent = fs.readFileSync('E:\\watech-bi\\reports\\prompt-04\\canton_hvac_real_dataset.csv', 'utf8');
  const lines = csvContent.trim().split('\n').slice(1);

  const realBusinesses = lines.map((line, idx) => {
    // Parse CSV line
    const match = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
    const cleanFields = match.map(f => f.replace(/^,?"?/, '').replace(/"?$/, '').replace(/""/g, '"'));

    return {
      id: `biz-canton-real-${idx + 1}`,
      projectId: 'proj-canton-hvac-real',
      officialName: cleanFields[0],
      brandName: cleanFields[1],
      domain: cleanFields[2],
      websiteUrl: cleanFields[3],
      hasWebsite: Boolean(cleanFields[3] && cleanFields[3].length > 5),
      phone: cleanFields[4] || undefined,
      email: cleanFields[5] || undefined,
      fullAddress: cleanFields[6],
      city: cleanFields[7],
      state: cleanFields[8],
      country: cleanFields[9] || 'USA',
      serviceArea: cleanFields[10],
      businessModel: cleanFields[11] || 'commercial',
      ownerVerificationStatus: cleanFields[12] || 'unverified',
      reviewRating: parseFloat(cleanFields[13]) || undefined,
      reviewCount: parseInt(cleanFields[14], 10) || undefined,
      isDemo: cleanFields[15] === 'true',
      sourceUrl: cleanFields[16],
      verificationTimestamp: cleanFields[17],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  console.log(`Loaded ${realBusinesses.length} verified real HVAC businesses for Canton, OH:`);
  realBusinesses.forEach((b, i) => {
    console.log(`  ${i + 1}. ${b.officialName} (${b.websiteUrl || 'No Website'}) - ${b.phone || 'No Phone'}`);
  });

  console.log('\n--- FIRST PASS: Executing 10-Stage Pipeline ---');
  const startTime = Date.now();
  const res1 = await fetch('http://localhost:3000/api/pipeline/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'existing_businesses',
      existingBusinesses: realBusinesses,
      minimumScore: 40,
      projectId: 'proj-canton-hvac-real',
      projectName: 'Canton HVAC Real World Validation',
      excludeDemo: true,
    }),
  });

  const durationMs = Date.now() - startTime;
  const result1 = await res1.json();

  console.log('\nAPI Response Status:', res1.status);
  console.log('Pipeline Success:', result1.success);
  console.log('Overall Status:', result1.status);
  console.log('Total Execution Duration:', durationMs, 'ms');
  console.log('\nSummary Metrics:');
  console.log(JSON.stringify(result1.summary, null, 2));

  console.log('\nStage-by-Stage Results:');
  result1.stages.forEach(st => {
    console.log(`  [${st.stage}]: status=${st.status}, processed=${st.recordsProcessed}, succeeded=${st.recordsSucceeded}, skipped=${st.recordsSkipped}, failed=${st.recordsFailed}, duration=${st.durationMs}ms`);
  });

  console.log('\nBusiness-Level Results:');
  result1.data.businesses.forEach((biz, i) => {
    const audit = result1.data.audits.find(a => a.businessId === biz.id);
    const score = result1.data.leadScores.find(s => s.businessId === biz.id);
    const contacts = result1.data.contacts.filter(c => c.businessId === biz.id);
    const opps = result1.data.opportunities.filter(o => o.businessId === biz.id);
    const sched = result1.data.followUpSchedules.find(s => s.businessId === biz.id);

    console.log(`\n--- Business ${i + 1}: ${biz.officialName} ---`);
    console.log(`  Website: ${biz.websiteUrl || 'N/A'} (Audited: ${audit ? audit.totalScore + '/100' : 'SKIPPED/FAILED'})`);
    if (audit) {
      console.log(`    Response Latency: ${audit.responseTimeMs}ms, HTTP: ${audit.httpStatus}, SSL: ${audit.hasSsl}`);
      console.log(`    Findings Count: ${audit.findings.length}`);
    }
    console.log(`  Contacts Extracted: ${contacts.length}`);
    contacts.forEach(c => console.log(`    - ${c.fullName} (${c.roleOrTitle}) | Email: ${c.email || 'None'} | Phone: ${c.phone || 'None'} | Tier: ${c.decisionMakerTier}`));
    console.log(`  Opportunities Generated: ${opps.length}`);
    console.log(`  Lead Score: ${score?.totalScore ?? 'N/A'}/100 (Band: ${score?.band || 'Hold'})`);
    console.log(`  Pipeline Qualification Status: ${biz.status}`);
    console.log(`  Follow-Up Scheduled: ${sched ? 'YES (Date: ' + sched.nextFollowUpDate + ', Channel: ' + sched.preferredChannel + ')' : 'NO'}`);
  });

  // SECOND PASS: Idempotence & Duplicate Prevention Test
  console.log('\n\n--- SECOND PASS: Duplicate & Idempotence Execution ---');
  const res2 = await fetch('http://localhost:3000/api/pipeline/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'existing_businesses',
      existingBusinesses: realBusinesses,
      minimumScore: 40,
      projectId: 'proj-canton-hvac-real',
      projectName: 'Canton HVAC Real World Validation',
      excludeDemo: true,
    }),
  });

  const result2 = await res2.json();

  console.log('Second Pass API Status:', res2.status);
  console.log('Second Pass Businesses Count:', result2.data.businesses.length, '(Expected: 10)');
  console.log('Second Pass Audits Count:', result2.data.audits.length, `(Expected: ${result1.data.audits.length})`);
  console.log('Second Pass Contacts Count:', result2.data.contacts.length, `(Expected: ${result1.data.contacts.length})`);
  console.log('Second Pass CRM Activities Count:', result2.data.crmActivities.length, `(Expected: ${result1.data.crmActivities.length})`);
  console.log('Second Pass Follow-Up Schedules Count:', result2.data.followUpSchedules.length, `(Expected: ${result1.data.followUpSchedules.length})`);

  // Verify ID Stability
  let allIdsStable = true;
  result1.data.businesses.forEach((biz1, idx) => {
    const biz2 = result2.data.businesses[idx];
    if (biz1.id !== biz2.id) allIdsStable = false;
  });
  console.log('All Entity Primary Keys Stable Across Runs:', allIdsStable);

  // Write full execution trace to file
  const fullTrace = {
    testTimestamp: new Date().toISOString(),
    datasetCount: realBusinesses.length,
    run1: {
      durationMs,
      summary: result1.summary,
      stages: result1.stages,
      businesses: result1.data.businesses.map(b => ({
        id: b.id,
        name: b.officialName,
        website: b.websiteUrl,
        status: b.status,
        score: result1.data.leadScores.find(s => s.businessId === b.id)?.totalScore,
        auditScore: result1.data.audits.find(a => a.businessId === b.id)?.totalScore,
        contactsCount: result1.data.contacts.filter(c => c.businessId === b.id).length,
        followUpScheduled: Boolean(result1.data.followUpSchedules.find(s => s.businessId === b.id)),
      })),
    },
    run2: {
      summary: result2.summary,
      idempotenceVerified: allIdsStable && result1.data.businesses.length === result2.data.businesses.length,
    },
  };

  fs.writeFileSync('E:\\watech-bi\\reports\\prompt-04\\real_world_execution_results.json', JSON.stringify(fullTrace, null, 2), 'utf8');
  console.log('\nSaved complete execution trace to E:\\watech-bi\\reports\\prompt-04\\real_world_execution_results.json');
}

runRealHvacPipelineTest().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
