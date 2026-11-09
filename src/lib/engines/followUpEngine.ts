import type {
  Business,
  BusinessStatus,
  FollowUpSchedule,
  FollowUpStatus,
  FollowUpStopCondition,
  CrmMetricsSummary,
  OutreachDraft,
  GmailDraftRecord,
} from '@/types';

export const DEFAULT_SEQUENCE_INTERVALS = [
  { step: 1, label: 'Initial Outreach', dayOffset: 0 },
  { step: 2, label: 'First Follow-Up (Gentle Nudge)', dayOffset: 3 },
  { step: 3, label: 'Second Follow-Up (Value Add)', dayOffset: 7 },
  { step: 4, label: 'Final Follow-Up (Polite Close)', dayOffset: 14 },
];

/**
 * Calculates due date string (YYYY-MM-DD) by adding interval days to an ISO date
 */
export function calculateDueDate(fromDateIso: string, daysToAdd: number): string {
  const date = new Date(fromDateIso);
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().split('T')[0];
}

/**
 * Evaluates the current status of a follow-up schedule relative to local date
 */
export function evaluateFollowUpStatus(schedule: FollowUpSchedule): FollowUpStatus {
  if (schedule.status === 'completed' || schedule.status === 'stopped' || schedule.status === 'paused') {
    return schedule.status;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const dueStr = schedule.nextFollowUpDate;

  if (dueStr < todayStr) {
    return 'overdue';
  } else if (dueStr === todayStr) {
    return 'due_today';
  } else {
    return 'scheduled';
  }
}

/**
 * Evaluates whether a lead's new pipeline status should trigger an automatic follow-up stop condition
 */
export function checkAutomaticStopCondition(
  newStatus: BusinessStatus,
  isSuppressed: boolean
): { shouldStop: boolean; reason?: FollowUpStopCondition } {
  if (isSuppressed || newStatus === 'suppressed') {
    return { shouldStop: true, reason: 'suppressed' };
  }
  if (newStatus === 'replied') {
    return { shouldStop: true, reason: 'recipient_replied' };
  }
  if (newStatus === 'not_interested') {
    return { shouldStop: true, reason: 'marked_not_interested' };
  }
  if (newStatus === 'lost') {
    return { shouldStop: true, reason: 'manual_stop' };
  }
  return { shouldStop: false };
}

/**
 * Calculates aggregated CRM Pipeline Metrics from real database records
 */
export function calculateCrmMetrics(
  businesses: Business[],
  drafts: OutreachDraft[],
  gmailDrafts: GmailDraftRecord[],
  schedules: FollowUpSchedule[]
): CrmMetricsSummary {
  const totalLeads = businesses.length;
  const qualifiedLeads = businesses.filter(b => b.status === 'qualified' || b.status === 'outreach_ready' || b.status === 'contact_ready').length;
  const contactReady = businesses.filter(b => b.status === 'contact_ready' || b.status === 'outreach_ready').length;
  const contacted = businesses.filter(b => b.status === 'contacted' || b.status === 'in_discussion' || b.status === 'proposal_sent' || b.status === 'won').length;
  const repliesReceived = businesses.filter(b => b.status === 'replied' || b.status === 'in_discussion' || b.status === 'meeting_booked' || b.status === 'won').length;
  const positiveReplies = businesses.filter(b => b.status === 'in_discussion' || b.status === 'meeting_booked' || b.status === 'proposal_sent' || b.status === 'won').length;
  const meetingsBooked = businesses.filter(b => b.status === 'meeting_booked' || b.status === 'proposal_sent' || b.status === 'won').length;
  const proposalsSent = businesses.filter(b => b.status === 'proposal_sent' || b.status === 'negotiation' || b.status === 'won').length;
  const dealsWon = businesses.filter(b => b.status === 'won').length;
  const dealsLost = businesses.filter(b => b.status === 'lost').length;
  const suppressedCount = businesses.filter(b => b.status === 'suppressed').length;

  let followUpsDueCount = 0;
  let followUpsOverdueCount = 0;

  for (const s of schedules) {
    const current = evaluateFollowUpStatus(s);
    if (current === 'due_today') followUpsDueCount++;
    if (current === 'overdue') followUpsOverdueCount++;
  }

  return {
    totalLeads,
    qualifiedLeads,
    contactReady,
    draftsCreated: drafts.length,
    gmailDrafts: gmailDrafts.length,
    contacted,
    repliesReceived,
    positiveReplies,
    meetingsBooked,
    proposalsSent,
    dealsWon,
    dealsLost,
    suppressedCount,
    followUpsDueCount,
    followUpsOverdueCount,
  };
}
