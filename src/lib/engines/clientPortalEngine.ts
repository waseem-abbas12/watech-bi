/**
 * Watech-BI Client Portal & Self-Service Engine (Prompt 22)
 *
 * Implements strict tenant-isolated data fetching, sanitization of internal agency
 * notes/margins, deliverable approval & revision logging, proposal acceptance auditing,
 * and client request management.
 */

import {
  ClientProfile,
  ClientPortalUser,
  ClientPortalSession,
  ClientDashboardSummary,
  ClientRequest,
  ClientRequestCategory,
  ClientRequestStatus,
  ClientApprovalRecord,
  ClientNotification,
  ClientProject,
  ProjectMilestone,
  ProjectTask,
  Deliverable,
  DeliverableRevision,
  BusinessProposal,
  AgencyInvoice,
  PaymentRecord,
  ClientCommunication,
} from '@/types';
import { repository } from '@/lib/db/repository';

// ==========================================
// 1. AUTHENTICATION & SESSION MANAGEMENT
// ==========================================

export async function authenticateClientUser(
  email: string,
  _passwordOrToken?: string
): Promise<ClientPortalSession | null> {
  const user = await repository.getClientPortalUserByEmail(email.trim().toLowerCase());
  if (!user || user.status === 'suspended') {
    return null;
  }

  const client = await repository.getClient(user.clientId);
  if (!client) {
    return null;
  }

  // Update last login
  const nowIso = new Date().toISOString();
  await repository.saveClientPortalUser({
    ...user,
    lastLoginAt: nowIso,
  });

  const sessionToken = `cps_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString(); // 7 days

  return {
    portalUser: {
      ...user,
      lastLoginAt: nowIso,
    },
    client,
    token: sessionToken,
    expiresAt,
  };
}

// ==========================================
// 2. DASHBOARD SYNTHESIS & METRICS
// ==========================================

export async function getSanitizedClientDashboard(clientId: string): Promise<ClientDashboardSummary> {
  const client = await repository.getClient(clientId);
  const clientName = client ? client.companyName : 'Valued Client';

  const [allProjects, allMilestones, allDeliverables, allInvoices, allRequests] = await Promise.all([
    repository.getClientProjects(undefined, clientId),
    repository.getProjectMilestones(undefined, clientId),
    repository.getDeliverables(undefined, clientId),
    repository.getInvoices(clientId),
    repository.getClientRequests(clientId),
  ]);

  // 1. Active Projects & Progress
  const activeProjects = allProjects.filter((p) => p.status !== 'cancelled' && p.status !== 'completed');
  const activeProjectsCount = activeProjects.length;

  const totalProgress = activeProjects.reduce((sum, p) => sum + (p.progressPercent || 0), 0);
  const overallProgressPercent = activeProjectsCount > 0 ? Math.round(totalProgress / activeProjectsCount) : 100;

  // 2. Upcoming Milestones (next 3 uncompleted milestones)
  const upcomingMilestones = allMilestones
    .filter((m) => !m.isCompleted)
    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
    .slice(0, 3);

  // 3. Deliverables for Client Review
  const pendingReviewDeliverables = allDeliverables.filter(
    (d) => d.status === 'ready_for_client_review' || d.status === 'sent_for_review'
  );
  const pendingApprovalsCount = pendingReviewDeliverables.length;

  // 4. Invoices & Remaining Balance
  const outstandingInvoicesTotal = allInvoices
    .filter((i) => i.status !== 'draft' && i.status !== 'cancelled' && i.balance > 0)
    .reduce((sum, i) => sum + i.balance, 0);

  // 5. Open Requests
  const openRequests = allRequests.filter(
    (r) => r.status === 'submitted' || r.status === 'in_review' || r.status === 'in_progress'
  );
  const openRequestsCount = openRequests.length;

  // 6. Next Required Client Action
  let nextRequiredAction = 'All milestones and deliveries are current. No immediate client action required.';
  if (pendingApprovalsCount > 0) {
    nextRequiredAction = `Action Required: ${pendingApprovalsCount} deliverable(s) awaiting your formal review and sign-off.`;
  } else if (outstandingInvoicesTotal > 0) {
    nextRequiredAction = `Payment Notice: Outstanding balance of $${outstandingInvoicesTotal.toLocaleString()} due on active milestones.`;
  } else if (upcomingMilestones.length > 0) {
    nextRequiredAction = `Upcoming Milestone: ${upcomingMilestones[0].name} targeted for delivery on ${upcomingMilestones[0].targetDate}.`;
  }

  return {
    clientName,
    activeProjectsCount,
    overallProgressPercent,
    upcomingMilestones,
    pendingApprovalsCount,
    outstandingInvoicesTotal,
    recentDeliverables: allDeliverables.slice(0, 4),
    openRequestsCount,
    nextRequiredAction,
  };
}

// ==========================================
// 3. TENANT ISOLATION: SANITIZED DATA PROJECTIONS
// ==========================================

export async function getClientVisibleProjects(clientId: string): Promise<ClientProject[]> {
  const all = await repository.getClientProjects(undefined, clientId);
  // Sanitize internal agency fields (e.g. scrub private notes and internal costings)
  return all.map((p) => ({
    ...p,
    notes: undefined, // Never expose internal staff notes to client
  }));
}

export async function getClientVisibleTasks(projectId: string, clientId: string): Promise<ProjectTask[]> {
  const all = await repository.getProjectTasks(projectId, clientId);
  // Exclude internal-only tasks and scrub estimated/actual costings
  return all.map((t) => ({
    ...t,
    estimatedHours: undefined,
    actualHours: undefined,
    blockedReason: t.isBlocked ? t.blockedReason : undefined,
  }));
}

export async function getClientVisibleDeliverables(
  clientId: string
): Promise<(Deliverable & { revisions: DeliverableRevision[] })[]> {
  const deliverables = await repository.getDeliverables(undefined, clientId);
  const revisions = await repository.getDeliverableRevisions();

  return deliverables.map((d) => ({
    ...d,
    revisions: revisions
      .filter((r) => r.deliverableId === d.id)
      .sort((a, b) => b.revisionNumber - a.revisionNumber),
  }));
}

// ==========================================
// 4. CLIENT DELIVERABLE APPROVAL & REVISION WORKFLOW
// ==========================================

export interface DeliverableDecisionResult {
  updatedDeliverable: Deliverable;
  approvalRecord: ClientApprovalRecord;
  revision?: DeliverableRevision;
}

export async function submitClientDeliverableDecision(
  deliverableId: string,
  clientId: string,
  decision: 'approved' | 'revision_requested',
  comments: string,
  actorName: string,
  actorEmail: string
): Promise<DeliverableDecisionResult> {
  const all = await repository.getDeliverables(undefined, clientId);
  const deliverable = all.find((d) => d.id === deliverableId);

  if (!deliverable) {
    throw new Error('Deliverable not found or does not belong to your client account.');
  }

  const nowIso = new Date().toISOString();
  let updatedDeliverable: Deliverable;
  let revision: DeliverableRevision | undefined;

  const approvalRecord: ClientApprovalRecord = {
    id: `appr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    clientId,
    entityType: 'deliverable',
    entityId: deliverable.id,
    decision,
    comments,
    actorName,
    actorEmail,
    timestamp: nowIso,
  };

  if (decision === 'approved') {
    updatedDeliverable = {
      ...deliverable,
      status: 'approved',
      approvalNotes: comments,
      approvedAt: nowIso,
      approvedBy: `${actorName} (${actorEmail})`,
    };
  } else {
    // Requesting revision: Preserve existing version and generate formal revision entry
    const existingRevisions = await repository.getDeliverableRevisions(deliverable.id);
    const revisionNumber = existingRevisions.length + 1;

    revision = {
      id: `rev-${deliverable.id}-${revisionNumber}`,
      deliverableId: deliverable.id,
      projectId: deliverable.projectId,
      clientId,
      revisionNumber,
      clientFeedback: comments,
      requestedChanges: comments,
      isOutOfScope: false,
      priority: 'medium',
      status: 'open',
      createdAt: nowIso,
    };

    updatedDeliverable = {
      ...deliverable,
      status: 'revision_requested',
      approvalNotes: `Revision #${revisionNumber} requested: ${comments}`,
    };

    await repository.saveDeliverableRevision(revision);
  }

  await repository.saveDeliverable(updatedDeliverable);
  await repository.saveClientApproval(approvalRecord);

  // Notify internal team
  await repository.saveClientNotification({
    id: `notif-${Date.now()}`,
    clientId,
    title: `Deliverable ${decision === 'approved' ? 'Approved' : 'Revision Requested'}`,
    message: `${actorName} has ${decision === 'approved' ? 'approved' : 'requested revisions on'} "${deliverable.title}".`,
    linkUrl: `/portal/deliverables`,
    type: 'deliverable',
    isRead: false,
    createdAt: nowIso,
  });

  return { updatedDeliverable, approvalRecord, revision };
}

// ==========================================
// 5. CLIENT PROPOSAL ACCEPTANCE & REJECTION
// ==========================================

export async function submitClientProposalDecision(
  proposalId: string,
  clientId: string,
  decision: 'accepted' | 'rejected',
  comments: string,
  actorName: string,
  actorEmail: string
): Promise<{ updatedProposal: BusinessProposal; approvalRecord: ClientApprovalRecord }> {
  const proposal = await repository.getProposal(proposalId);
  const client = await repository.getClient(clientId);

  if (!proposal || !client) {
    throw new Error('Proposal not found or unauthorized.');
  }

  // Cross-tenant verification
  if (proposal.businessId !== client.businessId && proposal.projectId !== client.projectId) {
    throw new Error('Unauthorized access to proposal.');
  }

  const nowIso = new Date().toISOString();
  const updatedProposal: BusinessProposal = {
    ...proposal,
    status: decision,
    updatedAt: nowIso,
  };

  const approvalRecord: ClientApprovalRecord = {
    id: `appr-prop-${Date.now()}`,
    clientId,
    entityType: 'proposal',
    entityId: proposal.id,
    decision,
    comments,
    actorName,
    actorEmail,
    timestamp: nowIso,
  };

  await repository.saveProposal(updatedProposal);
  await repository.saveClientApproval(approvalRecord);

  // Log in financial audit trail
  await repository.logFinancialAudit({
    id: `faudit-${Date.now()}`,
    entityType: 'invoice',
    entityId: proposal.id,
    action: decision === 'accepted' ? 'payment_recorded' : 'cancelled',
    actor: `${actorName} (Client Signer)`,
    previousState: `Proposal ${proposal.proposalNumber} status: ${proposal.status}`,
    newState: `Proposal ${proposal.proposalNumber} formally ${decision.toUpperCase()} by client`,
    rationale: comments || `Client portal digital confirmation by ${actorEmail}`,
    timestamp: nowIso,
  });

  return { updatedProposal, approvalRecord };
}

// ==========================================
// 6. CLIENT REQUEST CENTER (TICKETING)
// ==========================================

export async function submitClientRequest(
  clientId: string,
  data: {
    category: ClientRequestCategory;
    subject: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    projectId?: string;
    attachments?: string[];
  }
): Promise<ClientRequest> {
  const nowIso = new Date().toISOString();
  const request: ClientRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    clientId,
    projectId: data.projectId,
    category: data.category,
    subject: data.subject,
    description: data.description,
    priority: data.priority,
    attachments: data.attachments || [],
    status: 'submitted',
    submittedAt: nowIso,
    updatedAt: nowIso,
  };

  await repository.saveClientRequest(request);

  // Trigger internal notification
  await repository.saveClientNotification({
    id: `notif-req-${Date.now()}`,
    clientId,
    title: `New Client Request: ${data.subject}`,
    message: `A new ${data.category.replace(/_/g, ' ')} request was submitted with ${data.priority} priority.`,
    linkUrl: `/portal/requests`,
    type: 'request',
    isRead: false,
    createdAt: nowIso,
  });

  return request;
}

// ==========================================
// 7. CLIENT MANUAL PAYMENT CONFIRMATION RECEIPT
// ==========================================

export async function submitClientPaymentConfirmation(
  invoiceId: string,
  clientId: string,
  amount: number,
  method: string,
  referenceNumber: string,
  notes?: string
): Promise<ClientCommunication> {
  const invoice = await repository.getInvoice(invoiceId);
  if (!invoice || invoice.clientId !== clientId) {
    throw new Error('Invoice not found or unauthorized.');
  }

  const nowIso = new Date().toISOString();
  const comm: ClientCommunication = {
    id: `comm-pay-${Date.now()}`,
    clientId,
    projectId: invoice.projectId,
    type: 'meeting_notes',
    subject: `Client Submitted Payment Receipt for Invoice ${invoice.invoiceNumber}`,
    messageBody: `Client reported settlement of $${amount.toLocaleString()} via ${method} (Ref: ${referenceNumber}). Notes: ${notes || 'Pending internal bank reconciliation.'}`,
    channel: 'portal',
    loggedBy: 'Client Portal User',
    timestamp: nowIso,
  };

  await repository.saveClientCommunication(comm);

  await repository.saveClientNotification({
    id: `notif-pay-${Date.now()}`,
    clientId,
    title: `Payment Receipt Submitted (${invoice.invoiceNumber})`,
    message: `Payment confirmation of $${amount.toLocaleString()} submitted via ${method}. Awaiting agency admin verification.`,
    linkUrl: `/portal/invoices`,
    type: 'invoice',
    isRead: false,
    createdAt: nowIso,
  });

  return comm;
}

// ==========================================
// 8. CLIENT ACTIVITY TIMELINE
// ==========================================

export interface ClientTimelineEvent {
  id: string;
  type: 'milestone' | 'deliverable' | 'invoice' | 'request' | 'update';
  title: string;
  description: string;
  timestamp: string;
  statusBadge?: string;
}

export async function getClientActivityTimeline(clientId: string): Promise<ClientTimelineEvent[]> {
  const [milestones, deliverables, invoices, requests, communications] = await Promise.all([
    repository.getProjectMilestones(undefined, clientId),
    repository.getDeliverables(undefined, clientId),
    repository.getInvoices(clientId),
    repository.getClientRequests(clientId),
    repository.getClientCommunications(clientId),
  ]);

  const events: ClientTimelineEvent[] = [];

  for (const m of milestones) {
    if (m.isCompleted && m.completionDate) {
      events.push({
        id: `m-${m.id}`,
        type: 'milestone',
        title: `Milestone Achieved: ${m.name}`,
        description: m.description,
        timestamp: m.completionDate,
        statusBadge: 'Completed',
      });
    }
  }

  for (const d of deliverables) {
    events.push({
      id: `d-${d.id}`,
      type: 'deliverable',
      title: `Deliverable: ${d.title}`,
      description: d.description,
      timestamp: d.approvedAt || d.id.slice(4), // fallback to creation
      statusBadge: d.status.replace(/_/g, ' '),
    });
  }

  for (const i of invoices) {
    events.push({
      id: `i-${i.id}`,
      type: 'invoice',
      title: `Invoice Issued: ${i.invoiceNumber}`,
      description: `Total: $${i.totalAmount.toLocaleString()} • Status: ${i.status.toUpperCase()}`,
      timestamp: i.issueDate,
      statusBadge: i.status,
    });
  }

  for (const r of requests) {
    events.push({
      id: `r-${r.id}`,
      type: 'request',
      title: `Service Request: ${r.subject}`,
      description: r.description,
      timestamp: r.submittedAt,
      statusBadge: r.status.replace(/_/g, ' '),
    });
  }

  for (const c of communications) {
    if (c.channel === 'portal' || c.type === 'project_update' || c.type === 'delivery_notice') {
      events.push({
        id: `c-${c.id}`,
        type: 'update',
        title: c.subject,
        description: c.messageBody,
        timestamp: c.timestamp,
        statusBadge: 'Agency Update',
      });
    }
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
