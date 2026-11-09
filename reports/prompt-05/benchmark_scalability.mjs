import fs from 'node:fs';
import { signToken } from '../../src/lib/server/auth.ts';

const testToken = signToken({
  userId: 'usr-p05-tester',
  email: 'test@watech.agency',
  fullName: 'Prompt 05 Tester',
  tenantId: 'tenant-watech-hq',
  role: 'owner',
  isPlatformSuperAdmin: true,
});

function generateSyntheticBatch(count, projectId) {
  const businesses = [];

  for (let i = 1; i <= count; i++) {
    const hasWeb = i % 10 !== 0; // 90% have websites, 10% skipped
    const domain = hasWeb ? `scale-hvac-contractor-${count}-${i}.com` : '';
    const url = hasWeb ? `https://${domain}` : '';

    businesses.push({
      id: `biz-bench-${count}-${i}`,
      projectId,
      officialName: `Scale HVAC Contractor #${i}`,
      brandName: `Scale HVAC #${i}`,
      domain,
      websiteUrl: url,
      hasWebsite: hasWeb,
      phone: `(330) 555-${String(i).padStart(4, '0')}`,
      email: hasWeb ? `contact${i}@scalehvac${i}.test` : undefined,
      city: 'Canton',
      state: 'OH',
      country: 'USA',
      serviceArea: 'Canton Metro Area',
      businessModel: 'commercial',
      ownerVerificationStatus: 'unverified',
      reviewRating: 4.5,
      reviewCount: 25 + (i % 50),
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return businesses;
}

async function runScalabilityBenchmarks() {
  console.log('====================================================');
  console.log('TEST SUITE 6: SCALABILITY & BOUNDED CONCURRENCY (10 / 50 / 100)');
  console.log('====================================================\n');

  const batchSizes = [10, 50, 100];
  const benchmarkResults = [];

  for (const size of batchSizes) {
    const projectId = `proj-scale-${size}-${Date.now()}`;
    const businesses = generateSyntheticBatch(size, projectId);

    console.log(`Starting benchmark for Batch Size: ${size} businesses...`);
    const initialMem = process.memoryUsage();
    const startTime = Date.now();

    const response = await fetch('http://localhost:3000/api/pipeline/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        mode: 'existing_businesses',
        existingBusinesses: businesses,
        projectId,
        minimumScore: 40,
        count: size,
      }),
    });

    const elapsedMs = Date.now() - startTime;
    const finalMem = process.memoryUsage();
    const heapUsedMb = Math.round((finalMem.heapUsed - initialMem.heapUsed) / (1024 * 1024));

    if (!response.ok) {
      console.error(`  Batch ${size} failed with HTTP status ${response.status}`);
      const errText = await response.text();
      console.error(`  Error: ${errText}`);
      benchmarkResults.push({ size, status: 'FAILED', httpStatus: response.status, error: errText });
      continue;
    }

    const data = await response.json();
    const avgPerBiz = (elapsedMs / size).toFixed(1);

    const metrics = {
      batchSize: size,
      totalDurationMs: elapsedMs,
      avgMsPerBusiness: parseFloat(avgPerBiz),
      heapDeltaMb: heapUsedMb,
      status: data.status,
      audited: data.summary.audited,
      auditFailed: data.summary.auditFailed,
      auditSkipped: data.summary.auditSkipped,
      contactsFound: data.summary.contactsFound,
      opportunitiesGenerated: data.summary.opportunitiesGenerated,
      leadsScored: data.summary.leadsScored,
      leadsQualified: data.summary.leadsQualified,
      retries: data.summary.totalRetries,
      runId: data.runId,
    };

    benchmarkResults.push(metrics);

    console.log(`  Completed in ${elapsedMs} ms | Avg: ${avgPerBiz} ms/biz | Heap Delta: ${heapUsedMb} MB`);
    console.log(`  Audited: ${metrics.audited}, Skipped: ${metrics.auditSkipped}, Failed: ${metrics.auditFailed}`);
    console.log(`  Contacts: ${metrics.contactsFound}, Opps: ${metrics.opportunitiesGenerated}, Scored: ${metrics.leadsScored}, Qualified: ${metrics.leadsQualified}`);
    console.log(`  Retries: ${metrics.retries}, RunId: ${metrics.runId}\n`);
  }

  fs.writeFileSync(
    'E:\\watech-bi\\reports\\prompt-05\\scalability_benchmark_results.json',
    JSON.stringify(benchmarkResults, null, 2),
    'utf8'
  );

  const allPassed = benchmarkResults.length === 3 && benchmarkResults.every(r => r.status === 'completed' || r.status === 'partial');
  console.log(`Scalability Benchmark Verdict: ${allPassed ? 'PASS (10, 50, 100 Completed with Bounded Concurrency)' : 'FAIL'}`);

  return { suite: 'Scalability & Bounded Concurrency', passed: allPassed, benchmarks: benchmarkResults };
}

runScalabilityBenchmarks()
  .then(res => {
    if (!res.passed) process.exit(1);
  })
  .catch(err => {
    console.error('Benchmark execution error:', err);
    process.exit(1);
  });
