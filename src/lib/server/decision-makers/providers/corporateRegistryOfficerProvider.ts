import type { DecisionMakerProvider, DecisionMakerCandidate } from '../types';
import {
  normalizePersonName,
  classifySeniorityTier,
} from '../normalization';
import { calculateDecisionMakerConfidenceScore } from '../scoring';

export class CorporateRegistryOfficerProvider implements DecisionMakerProvider {
  readonly name = 'corporate_registry_officers';
  readonly displayName = 'Official Corporate Registry Officers';

  isConfigured(): boolean {
    return true; // Uses public registry APIs (OpenCorporates public tier / Companies House if key configured)
  }

  async discover(params: {
    businessId: string;
    projectId: string;
    businessName: string;
    country?: string;
    companyNumber?: string;
    jurisdictionCode?: string;
    domain?: string;
  }): Promise<DecisionMakerCandidate[]> {
    const candidates: DecisionMakerCandidate[] = [];
    const isUk = (params.country || '').toLowerCase().includes('uk') || (params.country || '').toLowerCase().includes('united kingdom');

    // 1. UK Companies House Officers Query
    if (isUk && params.companyNumber && process.env.COMPANIES_HOUSE_API_KEY) {
      const chOfficers = await this.queryCompaniesHouseOfficers(params);
      candidates.push(...chOfficers);
    }

    // 2. OpenCorporates Company Officers Query
    if (params.companyNumber && params.jurisdictionCode) {
      const ocOfficers = await this.queryOpenCorporatesOfficers(params);
      candidates.push(...ocOfficers);
    }

    return candidates;
  }

  private async queryCompaniesHouseOfficers(params: {
    businessId: string;
    projectId: string;
    businessName: string;
    companyNumber?: string;
    domain?: string;
  }): Promise<DecisionMakerCandidate[]> {
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY!.trim();
    const cleanNumber = params.companyNumber?.replace(/[^a-zA-Z0-9]/g, '');
    if (!cleanNumber) return [];

    try {
      const url = `https://api.company-information.service.gov.uk/company/${cleanNumber}/officers`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) return [];

      const data = await response.json();
      const items: any[] = data.items || [];
      const results: DecisionMakerCandidate[] = [];

      for (const officer of items) {
        // Skip resigned officers
        if (officer.resigned_on) continue;

        const rawName = officer.name; // usually formatted as "LASTNAME, Firstname"
        let normName = '';
        if (rawName && rawName.includes(',')) {
          const [last, first] = rawName.split(',').map((s: string) => s.trim());
          normName = normalizePersonName(`${first} ${last}`);
        } else {
          normName = normalizePersonName(rawName);
        }

        if (!normName || normName.split(' ').length < 2) continue;

        const role = officer.officer_role || 'Director';
        const classification = classifySeniorityTier(role);
        const sourceUrl = `https://find-and-update.company-information.service.gov.uk/company/${cleanNumber}/officers`;

        const scoreOutput = calculateDecisionMakerConfidenceScore({
          fullName: normName,
          roleOrTitle: role,
          sourceType: 'corporate_registry',
          companyDomain: params.domain,
          hasAppointmentDate: Boolean(officer.appointed_on),
          isCurrentOfficer: true,
          corroboratingSourcesCount: 1,
        });

        results.push({
          id: `dm-ch-${params.businessId}-${officer.officer_role || 'dir'}-${normName.toLowerCase().replace(/[^a-z]/g, '')}`,
          businessId: params.businessId,
          projectId: params.projectId,
          fullName: normName,
          roleOrTitle: role,
          normalizedTitle: classification.normalizedTitle,
          decisionMakerTier: classification.tier,
          isDecisionMaker: classification.isDecisionMaker,
          company: params.businessName,
          emailClassification: 'NOT_FOUND',
          sourceName: 'UK Companies House Registry',
          sourceUrl,
          corroboratingSources: ['UK Companies House Registry'],
          discoveryTimestamp: new Date().toISOString(),
          verificationStatus: scoreOutput.verificationStatus,
          confidence: scoreOutput.confidence,
          confidenceBreakdown: scoreOutput.breakdown,
          matchedEntityNumber: cleanNumber,
          appointmentDate: officer.appointed_on,
          isCurrent: true,
          notes: `Legally appointed corporate officer (Appointed: ${officer.appointed_on || 'Registered'})`,
        });

        if (results.length >= 4) break;
      }

      return results;
    } catch {
      return [];
    }
  }

  private async queryOpenCorporatesOfficers(params: {
    businessId: string;
    projectId: string;
    businessName: string;
    companyNumber?: string;
    jurisdictionCode?: string;
    domain?: string;
  }): Promise<DecisionMakerCandidate[]> {
    const { companyNumber, jurisdictionCode } = params;
    if (!companyNumber || !jurisdictionCode) return [];

    try {
      const url = new URL(`https://api.opencorporates.com/v1/companies/${jurisdictionCode}/${companyNumber}`);
      if (process.env.OPENCORPORATES_API_KEY) {
        url.searchParams.set('api_token', process.env.OPENCORPORATES_API_KEY.trim());
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'WATECH-BI-Intelligence/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) return [];

      const data = await response.json();
      const officers: any[] = data.results?.company?.officers || [];
      const results: DecisionMakerCandidate[] = [];

      for (const item of officers) {
        const officer = item.officer;
        if (!officer || !officer.name) continue;

        // Skip inactive or resigned officers
        const inactive = officer.inactive || officer.end_date;
        if (inactive) continue;

        const normName = normalizePersonName(officer.name);
        if (!normName || normName.split(' ').length < 2) continue;

        const role = officer.position || 'Director';
        const classification = classifySeniorityTier(role);
        const sourceUrl = officer.opencorporates_url || `https://opencorporates.com/companies/${jurisdictionCode}/${companyNumber}`;

        const scoreOutput = calculateDecisionMakerConfidenceScore({
          fullName: normName,
          roleOrTitle: role,
          sourceType: 'corporate_registry',
          companyDomain: params.domain,
          hasAppointmentDate: Boolean(officer.start_date),
          isCurrentOfficer: true,
          corroboratingSourcesCount: 1,
        });

        results.push({
          id: `dm-oc-${params.businessId}-${normName.toLowerCase().replace(/[^a-z]/g, '')}`,
          businessId: params.businessId,
          projectId: params.projectId,
          fullName: normName,
          roleOrTitle: role,
          normalizedTitle: classification.normalizedTitle,
          decisionMakerTier: classification.tier,
          isDecisionMaker: classification.isDecisionMaker,
          company: params.businessName,
          emailClassification: 'NOT_FOUND',
          sourceName: 'OpenCorporates Global Registry',
          sourceUrl,
          corroboratingSources: ['OpenCorporates Global Registry'],
          discoveryTimestamp: new Date().toISOString(),
          verificationStatus: scoreOutput.verificationStatus,
          confidence: scoreOutput.confidence,
          confidenceBreakdown: scoreOutput.breakdown,
          matchedEntityNumber: companyNumber,
          appointmentDate: officer.start_date,
          isCurrent: true,
          notes: `Registered officer in ${jurisdictionCode.toUpperCase()} corporate registry`,
        });

        if (results.length >= 4) break;
      }

      return results;
    } catch {
      return [];
    }
  }
}

export const corporateRegistryOfficerProvider = new CorporateRegistryOfficerProvider();
