import Papa from 'papaparse';
import type { Business } from '@/types';
import { extractDomain } from '@/lib/utils';

export interface ColumnMapping {
  officialName: string;
  websiteUrl: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  businessModel?: string;
}

export interface CsvImportOptions {
  projectId: string;
  tenantId?: string;
  mapping?: Partial<ColumnMapping>;
  existingBusinesses?: Business[];
  cityFallback?: string;
  stateFallback?: string;
  countryFallback?: string;
  dryRun?: boolean;
}

export interface InvalidRowReport {
  line: number;
  rawRow: Record<string, any>;
  errors: string[];
}

export interface DuplicateRowReport {
  line: number;
  name: string;
  domain: string;
  matchedField: 'domain' | 'name' | 'phone';
}

export interface CsvImportResult {
  totalRows: number;
  validCount: number;
  importedCount: number;
  duplicateCount: number;
  invalidCount: number;
  importedBusinesses: Business[];
  duplicates: DuplicateRowReport[];
  invalidRows: InvalidRowReport[];
  detectedColumns: string[];
  suggestedMapping: ColumnMapping;
  previewRows: Record<string, any>[];
}

/**
 * Automatically inspects CSV headers and infers the best column mappings.
 */
export function inferColumnMapping(headers: string[]): ColumnMapping {
  const findMatch = (candidates: string[]): string => {
    const found = headers.find((h) => candidates.some((c) => h.toLowerCase().trim() === c.toLowerCase().trim()));
    if (found) return found;
    const partial = headers.find((h) => candidates.some((c) => h.toLowerCase().includes(c.toLowerCase())));
    return partial || '';
  };

  return {
    officialName: findMatch(['officialName', 'company', 'business name', 'company name', 'name', 'title']),
    websiteUrl: findMatch(['websiteUrl', 'website', 'url', 'web', 'domain', 'homepage']),
    phone: findMatch(['phone', 'telephone', 'phone number', 'tel', 'cell']),
    email: findMatch(['email', 'email address', 'contact email', 'mail']),
    address: findMatch(['address', 'street', 'street address', 'location']),
    city: findMatch(['city', 'town', 'area']),
    state: findMatch(['state', 'province', 'region']),
    businessModel: findMatch(['businessModel', 'type', 'category', 'model']),
  };
}

/**
 * High-precision CSV parsing, validation, duplicate prevention, and normalization engine.
 */
export function processCsvData(csvContent: string, options: CsvImportOptions): CsvImportResult {
  const parsed = Papa.parse(csvContent.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
  });

  const headers = parsed.meta.fields || [];
  const detectedMapping = inferColumnMapping(headers);
  const mapping: ColumnMapping = {
    ...detectedMapping,
    ...options.mapping,
  };

  const rawRows = (parsed.data as Record<string, any>[]) || [];
  const previewRows = rawRows.slice(0, 5);

  const existing = options.existingBusinesses || [];
  const existingDomains = new Set(
    existing.map((b) => (b.domain || '').toLowerCase().trim()).filter(Boolean)
  );
  const existingNames = new Set(
    existing.map((b) => (b.officialName || '').toLowerCase().trim()).filter(Boolean)
  );

  const seenInBatchDomains = new Set<string>();
  const seenInBatchNames = new Set<string>();

  const importedBusinesses: Business[] = [];
  const duplicates: DuplicateRowReport[] = [];
  const invalidRows: InvalidRowReport[] = [];

  rawRows.forEach((row, index) => {
    const line = index + 2; // +1 for 0-index, +1 for header row
    const rowErrors: string[] = [];

    // 1. Resolve & validate Official Name
    const rawName = (mapping.officialName ? row[mapping.officialName] : row.officialName || row.name || row.Company || row['Business Name']) || '';
    const name = String(rawName).trim();
    if (!name || name.length < 2) {
      rowErrors.push('Missing or invalid business name (minimum 2 characters required)');
    }

    // 2. Resolve & normalize Website URL / Domain
    const rawWeb = (mapping.websiteUrl ? row[mapping.websiteUrl] : row.websiteUrl || row.website || row.url || row.Website || row.Domain) || '';
    let websiteUrl = String(rawWeb).trim();
    let domain = '';

    if (websiteUrl) {
      if (!/^https?:\/\//i.test(websiteUrl)) {
        websiteUrl = `https://${websiteUrl}`;
      }
      try {
        domain = extractDomain(websiteUrl);
      } catch {
        domain = '';
      }
      if (!domain || !domain.includes('.') || domain.length < 4 || /[^a-z0-9.-]/i.test(domain)) {
        domain = '';
        rowErrors.push('Invalid or unextractable website domain');
      }
    } else {
      rowErrors.push('Missing website URL or domain');
    }

    // Check duplicate against existing repository and batch
    const normDomain = domain.toLowerCase().trim();
    const normName = name.toLowerCase().trim();

    if (normDomain && (existingDomains.has(normDomain) || seenInBatchDomains.has(normDomain))) {
      duplicates.push({
        line,
        name,
        domain: normDomain,
        matchedField: 'domain',
      });
      return;
    }

    if (normName && (existingNames.has(normName) || seenInBatchNames.has(normName))) {
      duplicates.push({
        line,
        name,
        domain: normDomain,
        matchedField: 'name',
      });
      return;
    }

    // If row has validation errors, record in invalid rows report (NEVER silently drop)
    if (rowErrors.length > 0) {
      invalidRows.push({
        line,
        rawRow: row,
        errors: rowErrors,
      });
      return;
    }

    // Register into batch deduplication sets
    if (normDomain) seenInBatchDomains.add(normDomain);
    if (normName) seenInBatchNames.add(normName);

    const now = new Date().toISOString();
    const biz: Business = {
      id: `biz-csv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId: options.tenantId || 'tenant-watech-hq',
      projectId: options.projectId,
      officialName: name,
      brandName: row.brandName || undefined,
      domain: domain || '',
      websiteUrl: websiteUrl || (domain ? `https://${domain}` : ''),
      hasWebsite: Boolean(websiteUrl && websiteUrl.length > 5),
      phone: row[mapping.phone || 'phone'] || row.phone || undefined,
      email: row[mapping.email || 'email'] || row.email || undefined,
      city: row[mapping.city || 'city'] || row.city || options.cityFallback || 'Canton',
      state: row[mapping.state || 'state'] || row.state || options.stateFallback || 'OH',
      country: options.countryFallback || 'USA',
      serviceArea: row.serviceArea || undefined,
      businessModel: (row.businessModel as any) || 'commercial',
      status: 'discovered',
      ownerVerificationStatus: 'unverified',
      marketingChannels: [],
      opportunityScore: 0,
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };

    importedBusinesses.push(biz);
  });

  return {
    totalRows: rawRows.length,
    validCount: importedBusinesses.length,
    importedCount: options.dryRun ? 0 : importedBusinesses.length,
    duplicateCount: duplicates.length,
    invalidCount: invalidRows.length,
    importedBusinesses,
    duplicates,
    invalidRows,
    detectedColumns: headers,
    suggestedMapping: detectedMapping,
    previewRows,
  };
}
