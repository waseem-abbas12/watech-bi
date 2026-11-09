import fs from 'node:fs';

async function exportFullRun() {
  const csvContent = fs.readFileSync('E:\\watech-bi\\reports\\prompt-04\\canton_hvac_real_dataset.csv', 'utf8');
  const lines = csvContent.trim().split('\n').slice(1);

  const realBusinesses = lines.map((line, idx) => {
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
      isDemo: false,
      sourceUrl: cleanFields[16],
      verificationTimestamp: cleanFields[17],
      createdAt: '2026-11-09T02:35:00Z',
      updatedAt: '2026-11-09T02:44:00Z',
    };
  });

  console.log('Running pipeline execution to capture full output...');
  const res = await fetch('http://localhost:3000/api/pipeline/execute', {
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

  const result = await res.json();
  fs.writeFileSync('E:\\watech-bi\\reports\\prompt-04\\pipeline_full_output.json', JSON.stringify(result, null, 2), 'utf8');
  console.log('Saved full pipeline output to pipeline_full_output.json');
}

exportFullRun().catch(err => {
  console.error(err);
  process.exit(1);
});
