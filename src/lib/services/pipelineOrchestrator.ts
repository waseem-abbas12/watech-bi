import { repository } from '@/lib/db/repository';
import type { PipelineExecutionResult, PipelineExecuteInput } from '@/lib/server/pipeline/pipelineRunner';

export interface RunPipelineOptions extends PipelineExecuteInput {
  onStageUpdate?: (stageName: string, status: string) => void;
}

export class ClientPipelineOrchestrator {
  /**
   * Calls the server pipeline executor and persists results into Dexie IndexedDB
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
    const response = await fetch('/api/pipeline/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: options.mode,
        industry: options.industry,
        location: options.location,
        count: options.count,
        minimumScore: options.minimumScore,
        projectId: options.projectId,
        projectName: options.projectName,
        existingBusinesses: options.existingBusinesses,
        excludeDemo: options.excludeDemo,
      }),
    });

    const result: PipelineExecutionResult = await response.json();

    let persistedCounts = {
      businesses: 0,
      audits: 0,
      contacts: 0,
      emails: 0,
      opportunities: 0,
      scores: 0,
      schedules: 0,
      crmActivities: 0,
    };

    if (!result.success || !result.data) {
      return { result, persistedCounts };
    }

    try {
      persistedCounts = await repository.savePipelineBatch(result.data);
    } catch (err) {
      console.error('Failed atomic persistence of pipeline batch:', err);
    }

    return { result, persistedCounts };
  }
}

export const clientPipelineOrchestrator = new ClientPipelineOrchestrator();
