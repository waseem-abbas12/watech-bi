import { repository } from '@/lib/db/repository';
import type {
  PipelineExecutionResult,
  PipelineExecuteInput,
  StageResult,
} from '@/lib/server/pipeline/pipelineRunner';
import type {
  Business,
  WebsiteAudit,
  Contact,
  EmailDiscoveryRecord,
  Opportunity,
  LeadScore,
  FollowUpSchedule,
  CrmActivity,
  ResearchProject,
} from '@/types';

export interface BatchProgressUpdate {
  completed: number;
  total: number;
  currentBatch: number;
  totalBatches: number;
  message: string;
}

export interface RunPipelineOptions extends PipelineExecuteInput {
  onStageUpdate?: (stageName: string, status: string) => void;
  onBatchProgress?: (progress: BatchProgressUpdate) => void;
  batchSize?: number;
}

const DEFAULT_BATCH_SIZE = 15;

export class ClientPipelineOrchestrator {
  /**
   * Calls the server pipeline executor in manageable batches to prevent serverless timeouts
   * and persists progressive results into Dexie IndexedDB.
   */
  async runAndPersist(options: RunPipelineOptions): Promise<{
    result: PipelineExecutionResult;
    persistedCounts: {
      businesses: number;
      audits: number;
      contacts: number;
      emails: number;
      opportunities: number;
      scores: number;
      schedules: number;
      crmActivities: number;
    };
  }> {
    const batchSize = Math.max(5, Math.min(options.batchSize || DEFAULT_BATCH_SIZE, 20));

    // Mode B: Existing businesses processing in batches
    if (options.mode === 'existing_businesses' && Array.isArray(options.existingBusinesses)) {
      return this.processExistingInBatches(options, batchSize);
    }

    // Mode A: Discovery Mode
    return this.processDiscoveryInBatches(options, batchSize);
  }

  private async processDiscoveryInBatches(
    options: RunPipelineOptions,
    batchSize: number
  ): Promise<{
    result: PipelineExecutionResult;
    persistedCounts: {
      businesses: number;
      audits: number;
      contacts: number;
      emails: number;
      opportunities: number;
      scores: number;
      schedules: number;
      crmActivities: number;
    };
  }> {
    const requestedCount = Math.max(1, Math.min(options.count || 10, 100));

    // Phase 1: Discover & Deduplicate Businesses
    options.onBatchProgress?.({
      completed: 0,
      total: requestedCount,
      currentBatch: 0,
      totalBatches: 1,
      message: `Searching for up to ${requestedCount} verified businesses...`,
    });

    const discoverRes = await fetch('/api/pipeline/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'discovery',
        industry: options.industry,
        location: options.location,
        country: options.country,
        state: options.state,
        city: options.city,
        count: requestedCount,
        minimumScore: options.minimumScore,
        projectId: options.projectId,
        projectName: options.projectName,
        excludeDemo: options.excludeDemo,
        discoverOnly: true,
      }),
    });

    const discoverResult: PipelineExecutionResult = await discoverRes.json();

    if (!discoverResult.success || !discoverResult.data?.businesses) {
      return {
        result: discoverResult,
        persistedCounts: {
          businesses: 0,
          audits: 0,
          contacts: 0,
          emails: 0,
          opportunities: 0,
          scores: 0,
          schedules: 0,
          crmActivities: 0,
        },
      };
    }

    const discoveredBusinesses = discoverResult.data.businesses;
    const project = discoverResult.data.project;

    if (discoveredBusinesses.length === 0) {
      return {
        result: discoverResult,
        persistedCounts: {
          businesses: 0,
          audits: 0,
          contacts: 0,
          emails: 0,
          opportunities: 0,
          scores: 0,
          schedules: 0,
          crmActivities: 0,
        },
      };
    }

    // Save project in Dexie if it doesn't exist
    if (project) {
      try {
        await repository.saveProject(project);
      } catch (err) {
        console.warn('Could not pre-save project:', err);
      }
    }

    // Phase 2: Process businesses in chunks
    const totalCount = discoveredBusinesses.length;
    const totalBatches = Math.ceil(totalCount / batchSize);

    const aggregated = {
      project,
      businesses: [] as Business[],
      audits: [] as WebsiteAudit[],
      contacts: [] as Contact[],
      emailRecords: [] as EmailDiscoveryRecord[],
      opportunities: [] as Opportunity[],
      leadScores: [] as LeadScore[],
      followUpSchedules: [] as FollowUpSchedule[],
      crmActivities: [] as CrmActivity[],
    };

    let totalPersisted = {
      businesses: 0,
      audits: 0,
      contacts: 0,
      emails: 0,
      opportunities: 0,
      scores: 0,
      schedules: 0,
      crmActivities: 0,
    };

    const combinedStages: StageResult[] = [...discoverResult.stages];
    let completedCount = 0;

    for (let b = 0; b < totalBatches; b++) {
      const batchChunk = discoveredBusinesses.slice(b * batchSize, (b + 1) * batchSize);
      const batchNum = b + 1;

      options.onBatchProgress?.({
        completed: completedCount,
        total: totalCount,
        currentBatch: batchNum,
        totalBatches,
        message: `Processing batch ${batchNum} of ${totalBatches} (${batchChunk.length} businesses)...`,
      });

      let batchResponse: PipelineExecutionResult | null = null;
      let attempts = 0;

      while (attempts < 2 && !batchResponse) {
        attempts++;
        try {
          const res = await fetch('/api/pipeline/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: 'existing_businesses',
              existingBusinesses: batchChunk,
              minimumScore: options.minimumScore,
              projectId: project.id,
              projectName: project.name,
              excludeDemo: options.excludeDemo,
            }),
          });

          if (res.ok) {
            batchResponse = await res.json();
          } else {
            console.warn(`Batch ${batchNum} attempt ${attempts} failed with status ${res.status}`);
          }
        } catch (fetchErr) {
          console.warn(`Batch ${batchNum} attempt ${attempts} network error:`, fetchErr);
        }
      }

      if (batchResponse?.success && batchResponse.data) {
        // Immediately persist this batch to IndexedDB so completed work is never lost!
        try {
          const counts = await repository.savePipelineBatch(batchResponse.data);
          totalPersisted.businesses += counts.businesses;
          totalPersisted.audits += counts.audits;
          totalPersisted.contacts += counts.contacts;
          totalPersisted.emails += counts.emails;
          totalPersisted.opportunities += counts.opportunities;
          totalPersisted.scores += counts.scores;
          totalPersisted.schedules += counts.schedules;
          totalPersisted.crmActivities += counts.crmActivities;
        } catch (err) {
          console.error(`Failed to persist batch ${batchNum} to IndexedDB:`, err);
        }

        // Aggregate records for return payload
        aggregated.businesses.push(...(batchResponse.data.businesses || []));
        aggregated.audits.push(...(batchResponse.data.audits || []));
        aggregated.contacts.push(...(batchResponse.data.contacts || []));
        aggregated.emailRecords.push(...(batchResponse.data.emailRecords || []));
        aggregated.opportunities.push(...(batchResponse.data.opportunities || []));
        aggregated.leadScores.push(...(batchResponse.data.leadScores || []));
        aggregated.followUpSchedules.push(...(batchResponse.data.followUpSchedules || []));
        aggregated.crmActivities.push(...(batchResponse.data.crmActivities || []));
      } else {
        console.error(`Batch ${batchNum} permanently failed. Preserving existing progress.`);
      }

      completedCount += batchChunk.length;

      options.onBatchProgress?.({
        completed: completedCount,
        total: totalCount,
        currentBatch: batchNum,
        totalBatches,
        message: `Completed batch ${batchNum} of ${totalBatches}. (${completedCount}/${totalCount} processed)`,
      });
    }

    const consolidatedResult: PipelineExecutionResult = {
      runId: discoverResult.runId,
      success: aggregated.businesses.length > 0,
      status: aggregated.businesses.length === totalCount ? 'completed' : 'partial',
      mode: 'discovery',
      industry: options.industry || '',
      location: options.location || '',
      requestedCount,
      minimumScore: options.minimumScore || 50,
      totalDurationMs: discoverResult.totalDurationMs,
      startedAt: discoverResult.startedAt,
      completedAt: new Date().toISOString(),
      stages: combinedStages,
      summary: {
        totalDiscovered: totalCount,
        deduplicated: discoverResult.summary.deduplicated,
        audited: aggregated.audits.length,
        auditFailed: 0,
        auditSkipped: Math.max(0, totalCount - aggregated.audits.length),
        contactsFound: aggregated.contacts.length,
        emailsVerified: aggregated.contacts.filter((c) => c.email).length,
        opportunitiesGenerated: aggregated.opportunities.length,
        leadsScored: aggregated.leadScores.length,
        leadsQualified: aggregated.businesses.filter((b) => b.status === 'qualified').length,
        totalRetries: 0,
      },
      data: aggregated,
    };

    return { result: consolidatedResult, persistedCounts: totalPersisted };
  }

  private async processExistingInBatches(
    options: RunPipelineOptions,
    batchSize: number
  ): Promise<{
    result: PipelineExecutionResult;
    persistedCounts: {
      businesses: number;
      audits: number;
      contacts: number;
      emails: number;
      opportunities: number;
      scores: number;
      schedules: number;
      crmActivities: number;
    };
  }> {
    const list = options.existingBusinesses || [];
    const totalCount = list.length;
    const totalBatches = Math.ceil(totalCount / batchSize);

    const aggregated = {
      project: {
        id: options.projectId || 'proj-existing',
        name: options.projectName || 'Processed Existing Businesses',
        country: 'USA',
        stateRegion: '',
        cityArea: '',
        industryNiche: options.industry || 'Local Trade',
        businessModel: 'commercial' as const,
        watechServicesToEvaluate: [],
        researchDepth: 'deep' as const,
        isDemo: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      businesses: [] as Business[],
      audits: [] as WebsiteAudit[],
      contacts: [] as Contact[],
      emailRecords: [] as EmailDiscoveryRecord[],
      opportunities: [] as Opportunity[],
      leadScores: [] as LeadScore[],
      followUpSchedules: [] as FollowUpSchedule[],
      crmActivities: [] as CrmActivity[],
    };

    let totalPersisted = {
      businesses: 0,
      audits: 0,
      contacts: 0,
      emails: 0,
      opportunities: 0,
      scores: 0,
      schedules: 0,
      crmActivities: 0,
    };

    let completedCount = 0;

    for (let b = 0; b < totalBatches; b++) {
      const batchChunk = list.slice(b * batchSize, (b + 1) * batchSize);
      const batchNum = b + 1;

      options.onBatchProgress?.({
        completed: completedCount,
        total: totalCount,
        currentBatch: batchNum,
        totalBatches,
        message: `Processing batch ${batchNum} of ${totalBatches} (${batchChunk.length} businesses)...`,
      });

      let batchResponse: PipelineExecutionResult | null = null;
      let attempts = 0;

      while (attempts < 2 && !batchResponse) {
        attempts++;
        try {
          const res = await fetch('/api/pipeline/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: 'existing_businesses',
              existingBusinesses: batchChunk,
              minimumScore: options.minimumScore,
              projectId: options.projectId,
              projectName: options.projectName,
              excludeDemo: options.excludeDemo,
            }),
          });

          if (res.ok) {
            batchResponse = await res.json();
          }
        } catch (err) {
          console.warn(`Mode B batch ${batchNum} retry ${attempts}:`, err);
        }
      }

      if (batchResponse?.success && batchResponse.data) {
        try {
          const counts = await repository.savePipelineBatch(batchResponse.data);
          totalPersisted.businesses += counts.businesses;
          totalPersisted.audits += counts.audits;
          totalPersisted.contacts += counts.contacts;
          totalPersisted.emails += counts.emails;
          totalPersisted.opportunities += counts.opportunities;
          totalPersisted.scores += counts.scores;
          totalPersisted.schedules += counts.schedules;
          totalPersisted.crmActivities += counts.crmActivities;
        } catch (err) {
          console.error(`Failed to persist Mode B batch ${batchNum}:`, err);
        }

        aggregated.businesses.push(...(batchResponse.data.businesses || []));
        aggregated.audits.push(...(batchResponse.data.audits || []));
        aggregated.contacts.push(...(batchResponse.data.contacts || []));
        aggregated.emailRecords.push(...(batchResponse.data.emailRecords || []));
        aggregated.opportunities.push(...(batchResponse.data.opportunities || []));
        aggregated.leadScores.push(...(batchResponse.data.leadScores || []));
        aggregated.followUpSchedules.push(...(batchResponse.data.followUpSchedules || []));
        aggregated.crmActivities.push(...(batchResponse.data.crmActivities || []));
      }

      completedCount += batchChunk.length;
    }

    const consolidatedResult: PipelineExecutionResult = {
      runId: `run-${Date.now()}`,
      success: aggregated.businesses.length > 0,
      status: aggregated.businesses.length === totalCount ? 'completed' : 'partial',
      mode: 'existing_businesses',
      industry: options.industry || '',
      location: options.location || '',
      requestedCount: totalCount,
      minimumScore: options.minimumScore || 50,
      totalDurationMs: 0,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      stages: [],
      summary: {
        totalDiscovered: totalCount,
        deduplicated: 0,
        audited: aggregated.audits.length,
        auditFailed: 0,
        auditSkipped: Math.max(0, totalCount - aggregated.audits.length),
        contactsFound: aggregated.contacts.length,
        emailsVerified: aggregated.contacts.filter((c) => c.email).length,
        opportunitiesGenerated: aggregated.opportunities.length,
        leadsScored: aggregated.leadScores.length,
        leadsQualified: aggregated.businesses.filter((b) => b.status === 'qualified').length,
        totalRetries: 0,
      },
      data: aggregated,
    };

    return { result: consolidatedResult, persistedCounts: totalPersisted };
  }
}

export const clientPipelineOrchestrator = new ClientPipelineOrchestrator();
