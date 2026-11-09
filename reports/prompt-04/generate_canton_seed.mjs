import fs from 'node:fs';

const rawData = JSON.parse(fs.readFileSync('E:\\watech-bi\\reports\\prompt-04\\pipeline_full_output.json', 'utf8'));

// Clean businesses to conform strictly to Business interface
const cleanedBusinesses = rawData.data.businesses.map(b => {
  const { sourceUrl, verificationTimestamp, ...rest } = b;
  return {
    ...rest,
    marketingChannels: rest.marketingChannels || ['organic_search', 'local_listings'],
    status: rest.status || 'audited',
  };
});

const tsCode = `import { repository } from '@/lib/db/repository';
import type {
  ResearchProject,
  Business,
  WebsiteAudit,
  Contact,
  Opportunity,
  LeadScore,
  FollowUpSchedule,
  CrmActivity,
} from '@/types';

export const CANTON_REAL_PROJECT: ResearchProject = {
  id: 'proj-canton-hvac-real',
  name: 'Canton, OH Commercial & Residential HVAC Intelligence',
  country: 'United States',
  stateRegion: 'Ohio',
  cityArea: 'Canton',
  industryNiche: 'HVAC',
  businessModel: 'commercial',
  targetBusinessSize: '5-50 technicians',
  targetServices: 'Heating, Cooling, HVAC Installation, Maintenance, Emergency Repair',
  targetCustomerSegment: 'Commercial buildings, residential homeowners',
  competitorNames: 'Elsass, Quality Heating, Zoned Comfort, CKP Heating',
  watechServicesToEvaluate: [
    'website_development',
    'local_seo',
    'conversion_optimization',
    'lead_generation',
  ],
  researchDepth: 'deep',
  isDemo: false,
  createdAt: '2026-11-09T02:35:00Z',
  updatedAt: '2026-11-09T02:44:00Z',
};

export const CANTON_REAL_BUSINESSES: Business[] = ${JSON.stringify(cleanedBusinesses, null, 2)};

export const CANTON_REAL_AUDITS: WebsiteAudit[] = ${JSON.stringify(rawData.data.audits, null, 2)};

export const CANTON_REAL_CONTACTS: Contact[] = ${JSON.stringify(rawData.data.contacts, null, 2)};

export const CANTON_REAL_OPPORTUNITIES: Opportunity[] = ${JSON.stringify(rawData.data.opportunities, null, 2)};

export const CANTON_REAL_SCORES: LeadScore[] = ${JSON.stringify(rawData.data.leadScores, null, 2)};

export const CANTON_REAL_SCHEDULES: FollowUpSchedule[] = ${JSON.stringify(rawData.data.followUpSchedules, null, 2)};

export const CANTON_REAL_ACTIVITIES: CrmActivity[] = ${JSON.stringify(rawData.data.crmActivities, null, 2)};

export const CANTON_PIPELINE_RESULT = ${JSON.stringify(rawData, null, 2)};

export async function seedCantonRealData(): Promise<void> {
  const existing = await repository.getProject(CANTON_REAL_PROJECT.id);
  if (existing) {
    return;
  }

  await repository.saveProject(CANTON_REAL_PROJECT);
  await repository.saveBusinesses(CANTON_REAL_BUSINESSES);
  for (const audit of CANTON_REAL_AUDITS) {
    await repository.saveAudit(audit);
  }
  await repository.saveContacts(CANTON_REAL_CONTACTS);
  await repository.saveOpportunities(CANTON_REAL_OPPORTUNITIES);
  for (const score of CANTON_REAL_SCORES) {
    await repository.saveScore(score);
  }
  for (const schedule of CANTON_REAL_SCHEDULES) {
    await repository.saveFollowUpSchedule(schedule);
  }
  for (const activity of CANTON_REAL_ACTIVITIES) {
    await repository.saveCrmActivity(activity);
  }
}
`;

fs.writeFileSync('E:\\watech-bi\\src\\lib\\db\\cantonHvacRealSeed.ts', tsCode, 'utf8');
console.log('Successfully regenerated E:\\watech-bi\\src\\lib\\db\\cantonHvacRealSeed.ts');
