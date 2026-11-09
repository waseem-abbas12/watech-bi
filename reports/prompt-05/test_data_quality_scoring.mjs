import { calculateLeadScore } from '../../src/lib/engines/scoring.ts';
import { generateOpportunities } from '../../src/lib/engines/opportunities.ts';
import { classifyDecisionMakerRole } from '../../src/lib/engines/decisionMakerEngine.ts';

async function runDataQualityScoringTests() {
  console.log('====================================================');
  console.log('TEST SUITE 5: DATA QUALITY & DETERMINISTIC SCORING');
  console.log('====================================================\n');

  const testCases = [
    {
      name: 'Case A: Prime Target with Severe Website Defects + Verified Decision Maker',
      business: { id: 'biz-case-a', officialName: 'Case A HVAC', domain: 'case-a.com', websiteUrl: 'https://case-a.com', hasWebsite: true, phone: '(330) 555-0101', email: 'owner@case-a.com', businessModel: 'commercial' },
      audit: {
        id: 'aud-a', businessId: 'biz-case-a', totalScore: 42, grade: 'C',
        categories: [
          { category: 'technical_seo', score: 35 },
          { category: 'local_seo', score: 40 },
          { category: 'conversion_focus', score: 30 },
          { category: 'lead_capture', score: 35 },
        ],
        dimensions: { performance: 35, seoReadiness: 40, technicalHealth: 45, conversionReadiness: 30, userExperience: 40, trustAndCredibility: 50 },
        findings: [
          { id: 'f1', category: 'mobile_responsiveness', observation: 'No viewport', evidenceUrlOrSnippet: 'Missing viewport', severity: 'high' },
          { id: 'f2', category: 'performance_and_speed', observation: 'Slow TTFB 3200ms', evidenceUrlOrSnippet: 'Latency 3200ms', severity: 'medium' },
        ]
      },
      contacts: [
        { id: 'c1', businessId: 'biz-case-a', fullName: 'Bob Masterson', roleOrTitle: 'President & Founder', isDecisionMaker: true, decisionMakerTier: 'tier1_executive', contactSourceLabel: 'official_company_source' },
      ],
      expectedQualified: true, // Should score >= 40
    },
    {
      name: 'Case B: Modern Perfect Website (Low Gap) + Verified Decision Maker',
      business: { id: 'biz-case-b', officialName: 'Case B HVAC', domain: 'case-b.com', websiteUrl: 'https://case-b.com', hasWebsite: true, phone: '(330) 555-0102', email: 'info@case-b.com', businessModel: 'commercial' },
      audit: {
        id: 'aud-b', businessId: 'biz-case-b', totalScore: 92, grade: 'A',
        categories: [
          { category: 'technical_seo', score: 90 },
          { category: 'local_seo', score: 95 },
          { category: 'conversion_focus', score: 90 },
          { category: 'lead_capture', score: 92 },
        ],
        dimensions: { performance: 95, seoReadiness: 90, technicalHealth: 95, conversionReadiness: 90, userExperience: 90, trustAndCredibility: 90 },
        findings: []
      },
      contacts: [
        { id: 'c2', businessId: 'biz-case-b', fullName: 'Alice Cooper', roleOrTitle: 'Owner', isDecisionMaker: true, decisionMakerTier: 'tier1_executive', contactSourceLabel: 'official_company_source' },
      ],
      expectedQualified: false, // Should score low (no need/gap)
    },
    {
      name: 'Case C: Missing Website (No Audit) + Reception Contact Only',
      business: { id: 'biz-case-c', officialName: 'Case C HVAC', domain: '', websiteUrl: '', hasWebsite: false, phone: '(330) 555-0103', businessModel: 'commercial' },
      audit: undefined,
      contacts: [
        { id: 'c3', businessId: 'biz-case-c', fullName: 'Dispatch Office', roleOrTitle: 'Dispatch', isDecisionMaker: false, decisionMakerTier: 'general_staff', contactSourceLabel: 'directory_listing' },
      ],
      expectedQualified: false, // Low data, should be held
    },
    {
      name: 'Case D: Severe Defects but Zero Decision Makers (Staff Only)',
      business: { id: 'biz-case-d', officialName: 'Case D HVAC', domain: 'case-d.com', websiteUrl: 'https://case-d.com', hasWebsite: true, phone: '(330) 555-0104', businessModel: 'commercial' },
      audit: {
        id: 'aud-d', businessId: 'biz-case-d', totalScore: 35, grade: 'Hold',
        categories: [
          { category: 'technical_seo', score: 20 },
          { category: 'local_seo', score: 25 },
          { category: 'conversion_focus', score: 30 },
          { category: 'lead_capture', score: 25 },
        ],
        dimensions: { performance: 30, seoReadiness: 35, technicalHealth: 30, conversionReadiness: 25, userExperience: 35, trustAndCredibility: 40 },
        findings: [{ id: 'f3', category: 'technical_seo', observation: 'No meta tags', evidenceUrlOrSnippet: 'Empty head', severity: 'high' }]
      },
      contacts: [
        { id: 'c4', businessId: 'biz-case-d', fullName: 'Reception Staff', roleOrTitle: 'Front Desk', isDecisionMaker: false, decisionMakerTier: 'general_staff', contactSourceLabel: 'official_company_source' },
      ],
      expectedQualified: true, // Has 52 points of commercial service gaps (>= 40 threshold)
    },
  ];

  let allChecksPassed = true;

  for (const tc of testCases) {
    console.log(`Evaluating: ${tc.name}`);
    const score = calculateLeadScore(tc.business, tc.audit, tc.contacts, []);
    const opps = generateOpportunities(tc.business, tc.audit, []);

    const isQualified = score.totalScore >= 40;
    const breakdownKeys = Object.keys(score.breakdown || {});
    const hasExplainableBreakdown = Boolean(breakdownKeys.length > 0 && typeof score.totalScore === 'number');
    const matchesExpectation = isQualified === tc.expectedQualified;

    console.log(`  - Calculated Score: ${score.totalScore}/100 (Band: ${score.band})`);
    console.log(`  - Qualified: ${isQualified} (Expected: ${tc.expectedQualified})`);
    console.log(`  - Explainable Categories: ${breakdownKeys.length} distinct scoring dimensions`);
    console.log(`  - Opportunities Generated: ${opps.length}`);

    // Verify opportunity evidence
    if (opps.length > 0) {
      const allHaveEvidence = opps.every(o => o.evidence || o.description);
      console.log(`  - Opportunities Reference Concrete Evidence: ${allHaveEvidence ? 'YES' : 'NO'}`);
      if (!allHaveEvidence) allChecksPassed = false;
    }

    if (!hasExplainableBreakdown || !matchesExpectation) {
      allChecksPassed = false;
    }
    console.log('');
  }

  // Test Decision Maker Role Classification
  console.log('Testing Non-Manufacture of Decision Makers:');
  const roleTests = [
    { title: 'Chief Executive Officer', expectedDM: true, expectedTier: 'tier1_executive' },
    { title: 'Owner & Operator', expectedDM: true, expectedTier: 'tier1_executive' },
    { title: 'Director of HVAC Operations', expectedDM: true, expectedTier: 'tier2_director' },
    { title: 'Service Manager', expectedDM: false, expectedTier: 'tier3_management' },
    { title: 'Office Receptionist', expectedDM: false, expectedTier: 'general_staff' },
    { title: 'Customer Support Rep', expectedDM: false, expectedTier: 'general_staff' },
    { title: 'Dispatch Agent', expectedDM: false, expectedTier: 'general_staff' },
  ];

  let dmClassificationPassed = true;
  for (const rt of roleTests) {
    const classification = classifyDecisionMakerRole(rt.title, '10-25');
    const passed = classification.isDecisionMaker === rt.expectedDM && classification.tier === rt.expectedTier;
    console.log(`  [${passed ? 'PASS' : 'FAIL'}] "${rt.title}" -> isDM:${classification.isDecisionMaker}, tier:${classification.tier}`);
    if (!passed) dmClassificationPassed = false;
  }

  const finalVerdict = allChecksPassed && dmClassificationPassed;
  console.log(`\nData Quality & Scoring Reliability Verdict: ${finalVerdict ? 'PASS' : 'FAIL'}`);

  return { suite: 'Data Quality & Scoring', passed: finalVerdict };
}

runDataQualityScoringTests()
  .then(res => {
    if (!res.passed) process.exit(1);
  })
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  });
