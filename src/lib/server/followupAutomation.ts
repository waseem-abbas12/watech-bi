import { repository } from '@/lib/db/repository';
import { isEmailSuppressed } from './emailService';
import { JobQueue } from './jobQueue';
import type { FollowUpSchedule, Contact } from '@/types';

export interface FollowUpExecutionReport {
  scannedCount: number;
  dueCount: number;
  executedCount: number;
  skippedOptOutCount: number;
  failedCount: number;
  details: Array<{
    scheduleId: string;
    businessName: string;
    status: 'dispatched' | 'skipped_optout' | 'failed' | 'not_due';
    reason?: string;
  }>;
}

export class FollowUpAutomationEngine {
  /**
   * Scans all scheduled follow-ups, checks for due status, enforces opt-out/suppression,
   * and dispatches approved outreach.
   */
  static async processDueFollowups(tenantId: string): Promise<FollowUpExecutionReport> {
    const schedules = await repository.getFollowUpSchedules();
    const contacts = await repository.getContacts();
    const businesses = await repository.getBusinesses();

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const report: FollowUpExecutionReport = {
      scannedCount: schedules.length,
      dueCount: 0,
      executedCount: 0,
      skippedOptOutCount: 0,
      failedCount: 0,
      details: [],
    };

    for (const schedule of schedules) {
      const business = businesses.find((b) => b.id === schedule.businessId);
      const bizName = business?.officialName || business?.brandName || 'Unknown Business';

      // Ignore already stopped, paused, or completed schedules
      if (schedule.status === 'stopped' || schedule.status === 'paused') {
        continue;
      }

      // Check if due
      const isDue = schedule.status === 'due_today' || schedule.status === 'overdue' || (schedule.nextFollowUpDate && schedule.nextFollowUpDate <= todayStr);
      if (!isDue) {
        continue;
      }

      report.dueCount++;

      // 1. Opt-out & Suppression Enforcement
      // Find associated contact email
      const bizContacts = contacts.filter((c) => c.businessId === schedule.businessId);
      const targetContact = bizContacts[0];
      const targetEmail = targetContact?.email;

      let isOptedOut = false;
      let optOutReason = '';

      if (targetContact && (targetContact as any).isUnsubscribed) {
        isOptedOut = true;
        optOutReason = 'Contact is unsubscribed in CRM records';
      } else if (targetEmail) {
        const suppression = isEmailSuppressed(targetEmail, tenantId);
        if (suppression.suppressed) {
          isOptedOut = true;
          optOutReason = suppression.reason || 'Address is present in suppression list';
        }
      }

      if (isOptedOut) {
        // Enforce stop on this follow-up schedule
        schedule.status = 'stopped';
        schedule.notes = `Automation cancelled: ${optOutReason}`;
        await repository.saveFollowUpSchedule(schedule);

        report.skippedOptOutCount++;
        report.details.push({
          scheduleId: schedule.id,
          businessName: bizName,
          status: 'skipped_optout',
          reason: optOutReason,
        });
        continue;
      }

      // 2. Dispatch Follow-Up through Background Job Queue
      try {
        await JobQueue.enqueue({
          tenantId: tenantId || 'agency_internal',
          type: 'scheduled_followup',
          priority: 'high',
          payload: {
            scheduleId: schedule.id,
            businessId: schedule.businessId,
            contactId: targetContact?.id,
            contactEmail: targetEmail,
            attemptNumber: (schedule.attemptNumber || 0) + 1,
            preferredChannel: schedule.preferredChannel,
          },
        });

        // Update schedule
        schedule.attemptNumber = (schedule.attemptNumber || 0) + 1;
        schedule.status = 'scheduled';
        // Set next attempt to 3 days out
        const nextDate = new Date(now.getTime() + 3 * 24 * 3600 * 1000);
        schedule.nextFollowUpDate = nextDate.toISOString().split('T')[0];
        await repository.saveFollowUpSchedule(schedule);

        report.executedCount++;
        report.details.push({
          scheduleId: schedule.id,
          businessName: bizName,
          status: 'dispatched',
        });
      } catch (err: any) {
        report.failedCount++;
        report.details.push({
          scheduleId: schedule.id,
          businessName: bizName,
          status: 'failed',
          reason: err.message,
        });
      }
    }

    return report;
  }
}
