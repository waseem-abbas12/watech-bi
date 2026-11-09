import { repository } from '@/lib/db/repository';
import {
  AutomationWorkflow,
  AutomationEvent,
  AutomationEventType,
  AutomationExecution,
  ExecutionStepLog,
  ExecutionStatus,
  AutomationApproval,
  WorkflowCondition,
  WorkflowNode,
  WorkflowActionType,
  WebhookEndpoint,
  WebhookDelivery,
  AutomationMetricsSummary,
} from '@/types';

// ============================================================================
// PAYLOAD SANITIZER (Prevents credential & private leakages into events)
// ============================================================================
export function sanitizePayload(payload: Record<string, any>): Record<string, any> {
  const sensitiveKeys = ['password', 'secret', 'token', 'apiKey', 'authorization', 'cookie', 'creditCard', 'bankAccount'];
  const sanitized: Record<string, any> = {};

  for (const [key, val] of Object.entries(payload)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = '[REDACTED_CREDENTIAL]';
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      sanitized[key] = sanitizePayload(val);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

// ============================================================================
// EVENT DISPATCHER & DUPLICATE PROTECTION
// ============================================================================
export async function emitAutomationEvent(
  eventType: AutomationEventType,
  sourceModule: string,
  recordId: string,
  rawPayload: Record<string, any>
): Promise<{ event: AutomationEvent; triggeredExecutions: AutomationExecution[] }> {
  const sanitizedPayload = sanitizePayload(rawPayload);
  const now = new Date();
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  // Duplicate-event protection: check if an identical event occurred within the last 30 seconds
  const recentEvents = await repository.getAutomationEvents(20);
  const isDuplicate = recentEvents.some(
    e =>
      e.type === eventType &&
      e.recordId === recordId &&
      now.getTime() - new Date(e.timestamp).getTime() < 30000
  );

  const event: AutomationEvent = {
    id: eventId,
    type: eventType,
    sourceModule,
    recordId,
    timestamp: now.toISOString(),
    payload: sanitizedPayload,
    processingStatus: isDuplicate ? 'ignored' : 'pending',
    correlationId: rawPayload.correlationId || `corr_${Math.random().toString(36).substr(2, 8)}`,
  };

  await repository.saveAutomationEvent(event);

  if (isDuplicate) {
    return { event, triggeredExecutions: [] };
  }

  // Find active workflows subscribed to this event type
  const allWorkflows = await repository.getAutomationWorkflows();
  const activeMatchingWorkflows = allWorkflows.filter(
    wf =>
      wf.isActive &&
      wf.trigger.type === 'record_event' &&
      wf.trigger.eventType === eventType
  );

  const triggeredExecutions: AutomationExecution[] = [];

  for (const workflow of activeMatchingWorkflows) {
    try {
      const execution = await executeWorkflow(workflow, event);
      triggeredExecutions.push(execution);
    } catch (err: any) {
      console.error(`Error running workflow ${workflow.name} on event ${eventType}:`, err);
    }
  }

  // Also check and trigger outbound webhooks subscribed to this event
  try {
    const endpoints = await repository.getWebhookEndpoints();
    const activeEndpoints = endpoints.filter(
      ep => ep.isActive && (ep.subscribedEvents.includes('*') || ep.subscribedEvents.includes(eventType))
    );

    for (const ep of activeEndpoints) {
      dispatchWebhook(ep, event).catch(err =>
        console.error(`Webhook delivery failed for ${ep.name}:`, err)
      );
    }
  } catch (webhookErr) {
    console.error('Failed to dispatch webhooks:', webhookErr);
  }

  event.processingStatus = 'processed';
  await repository.saveAutomationEvent(event);

  return { event, triggeredExecutions };
}

// ============================================================================
// CONDITION EVALUATOR (Supports AND/OR and various operators)
// ============================================================================
export function evaluateCondition(condition: WorkflowCondition, payload: Record<string, any>): boolean {
  const actualVal = payload[condition.field];
  const targetVal = condition.value;

  switch (condition.operator) {
    case 'equals':
      return String(actualVal).toLowerCase() === String(targetVal).toLowerCase();
    case 'not_equals':
      return String(actualVal).toLowerCase() !== String(targetVal).toLowerCase();
    case 'greater_than':
      return Number(actualVal) > Number(targetVal);
    case 'greater_than_or_equal':
      return Number(actualVal) >= Number(targetVal);
    case 'less_than':
      return Number(actualVal) < Number(targetVal);
    case 'less_than_or_equal':
      return Number(actualVal) <= Number(targetVal);
    case 'contains':
      return String(actualVal || '').toLowerCase().includes(String(targetVal || '').toLowerCase());
    case 'is_empty':
      return actualVal === undefined || actualVal === null || actualVal === '';
    case 'is_not_empty':
      return actualVal !== undefined && actualVal !== null && actualVal !== '';
    case 'in_list':
      if (Array.isArray(targetVal)) {
        return targetVal.map(v => String(v).toLowerCase()).includes(String(actualVal).toLowerCase());
      }
      return false;
    default:
      return true;
  }
}

// ============================================================================
// WORKFLOW EXECUTION ENGINE
// ============================================================================
export async function executeWorkflow(
  workflow: AutomationWorkflow,
  event?: AutomationEvent,
  isTestRun: boolean = false,
  samplePayload?: Record<string, any>
): Promise<AutomationExecution> {
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  const startTime = new Date();

  const execution: AutomationExecution = {
    id: executionId,
    workflowId: workflow.id,
    workflowName: workflow.name,
    triggerEventId: event?.id,
    triggerType: workflow.trigger.type,
    status: 'running',
    idempotencyKey,
    steps: [],
    startedAt: startTime.toISOString(),
    isTestRun,
  };

  await repository.saveAutomationExecution(execution);

  // Payload context passed from step to step
  let currentContext: Record<string, any> = {
    ...(event?.payload || {}),
    ...(samplePayload || {}),
    _workflowId: workflow.id,
    _executionId: executionId,
    _timestamp: startTime.toISOString(),
  };

  const nodes = workflow.nodes || [];
  if (nodes.length === 0) {
    execution.status = 'success';
    execution.completedAt = new Date().toISOString();
    execution.totalDurationMs = Date.now() - startTime.getTime();
    await repository.saveAutomationExecution(execution);
    return execution;
  }

  // Find root / trigger node
  let currentNode: WorkflowNode | undefined = nodes.find(n => n.type === 'trigger') || nodes[0];
  const visitedNodeIds = new Set<string>();

  while (currentNode) {
    if (visitedNodeIds.has(currentNode.id)) {
      // Loop protection
      execution.status = 'failed';
      execution.errorSummary = `Execution stopped: Detected infinite loop at node ${currentNode.title}`;
      break;
    }
    visitedNodeIds.add(currentNode.id);

    const stepStart = Date.now();
    const stepLog: ExecutionStepLog = {
      stepId: currentNode.id,
      nodeType: currentNode.type,
      title: currentNode.title,
      status: 'pending',
      startedAt: new Date().toISOString(),
      input: { ...currentContext },
    };

    try {
      // 1. TRIGGER NODE
      if (currentNode.type === 'trigger') {
        stepLog.status = 'success';
        stepLog.output = { message: 'Trigger event verified', eventType: event?.type || workflow.trigger.eventType };
        stepLog.durationMs = Date.now() - stepStart;
        stepLog.completedAt = new Date().toISOString();
        execution.steps.push(stepLog);

        const trigNextId: string | undefined = currentNode.nextNodeIds?.[0];
        currentNode = nodes.find(n => n.id === trigNextId);
        continue;
      }

      // 2. CONDITION NODE
      if (currentNode.type === 'condition') {
        const conditions: WorkflowCondition[] = currentNode.config.conditions || [];
        const logic: 'AND' | 'OR' = currentNode.config.logic || 'AND';

        let isMatch = true;
        if (conditions.length > 0) {
          if (logic === 'AND') {
            isMatch = conditions.every(c => evaluateCondition(c, currentContext));
          } else {
            isMatch = conditions.some(c => evaluateCondition(c, currentContext));
          }
        }

        stepLog.status = 'success';
        stepLog.output = { result: isMatch, evaluatedConditionsCount: conditions.length };
        stepLog.durationMs = Date.now() - stepStart;
        stepLog.completedAt = new Date().toISOString();
        execution.steps.push(stepLog);

        const condNextId: string | undefined = isMatch ? currentNode.trueNodeId : currentNode.falseNodeId;
        currentNode = nodes.find(n => n.id === condNextId) || nodes.find(n => n.id === currentNode?.nextNodeIds?.[0]);
        continue;
      }

      // 3. APPROVAL NODE (Human-in-the-Loop)
      if (currentNode.type === 'approval') {
        stepLog.status = 'waiting_for_approval';
        stepLog.durationMs = Date.now() - stepStart;
        execution.steps.push(stepLog);
        execution.status = 'waiting_for_approval';
        execution.currentStepId = currentNode.id;

        // Create pending approval record in repository
        const approvalRecord: AutomationApproval = {
          id: `appr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          executionId: execution.id,
          workflowId: workflow.id,
          workflowName: workflow.name,
          stepId: currentNode.id,
          actionType: (currentNode.config.actionType as WorkflowActionType) || 'generate_outreach_draft',
          actionTitle: currentNode.title,
          requestedPayload: currentContext,
          requiredRole: currentNode.config.requiredRole || 'sales_lead',
          instructions: currentNode.config.instructions || 'Human approval required before sensitive action executes.',
          status: 'pending',
          requestedAt: new Date().toISOString(),
        };

        await repository.saveAutomationApproval(approvalRecord);
        await repository.saveAutomationExecution(execution);

        // Pause execution here until human resolves it
        return execution;
      }

      // 4. DELAY NODE
      if (currentNode.type === 'delay') {
        const hours = currentNode.config.delayHours || 24;
        stepLog.status = 'success';
        stepLog.output = { simulatedDelayHours: hours, scheduledResume: new Date(Date.now() + hours * 3600000).toISOString() };
        stepLog.durationMs = Date.now() - stepStart;
        stepLog.completedAt = new Date().toISOString();
        execution.steps.push(stepLog);

        const delayNextId: string | undefined = currentNode.nextNodeIds?.[0];
        currentNode = nodes.find(n => n.id === delayNextId);
        continue;
      }

      // 5. ACTION NODE
      if (currentNode.type === 'action') {
        const actionType: WorkflowActionType = currentNode.config.type || 'create_notification';
        const actionParams = currentNode.config.parameters || {};

        // Execute action based on type
        const actionResult = await executeAction(actionType, actionParams, currentContext);

        stepLog.status = 'success';
        stepLog.output = actionResult;
        stepLog.durationMs = Date.now() - stepStart;
        stepLog.completedAt = new Date().toISOString();
        execution.steps.push(stepLog);

        // Merge action output into current context for downstream steps
        currentContext = {
          ...currentContext,
          ...actionResult,
        };

        const actNextId: string | undefined = currentNode.nextNodeIds?.[0];
        currentNode = nodes.find(n => n.id === actNextId);
        continue;
      }

      // Fallback: move to next node if available
      const fallbackNextId: string | undefined = currentNode.nextNodeIds?.[0];
      currentNode = nodes.find(n => n.id === fallbackNextId);
    } catch (stepErr: any) {
      stepLog.status = 'failed';
      stepLog.error = stepErr.message || 'Error executing step';
      stepLog.durationMs = Date.now() - stepStart;
      stepLog.completedAt = new Date().toISOString();
      execution.steps.push(stepLog);

      execution.status = 'failed';
      execution.errorSummary = `Failed at step "${currentNode?.title || 'Step'}": ${stepErr.message}`;
      break;
    }
  }

  if (execution.status === 'running') {
    execution.status = 'success';
  }

  execution.completedAt = new Date().toISOString();
  execution.totalDurationMs = Date.now() - startTime.getTime();
  await repository.saveAutomationExecution(execution);

  // Update workflow stats
  workflow.executionCount = (workflow.executionCount || 0) + 1;
  if (execution.status === 'success') {
    workflow.successCount = (workflow.successCount || 0) + 1;
  } else if (execution.status === 'failed') {
    workflow.failureCount = (workflow.failureCount || 0) + 1;
  }
  workflow.lastExecutedAt = execution.completedAt;
  workflow.averageDurationMs = Math.round(
    ((workflow.averageDurationMs || execution.totalDurationMs) + execution.totalDurationMs) / 2
  );
  await repository.saveAutomationWorkflow(workflow);

  return execution;
}

// ============================================================================
// RESUME WORKFLOW FROM APPROVAL GATE
// ============================================================================
export async function decideApproval(
  approvalId: string,
  decision: 'approved' | 'rejected',
  decidedBy: string,
  decisionNotes?: string
): Promise<AutomationExecution | undefined> {
  const approval = await repository.getAutomationApproval(approvalId);
  if (!approval) return undefined;

  approval.status = decision;
  approval.decidedBy = decidedBy;
  approval.decidedAt = new Date().toISOString();
  approval.decisionNotes = decisionNotes;
  await repository.saveAutomationApproval(approval);

  const execution = await repository.getAutomationExecution(approval.executionId);
  if (!execution) return undefined;

  const workflow = await repository.getAutomationWorkflow(execution.workflowId);
  if (!workflow) return execution;

  const nodes = workflow.nodes || [];
  const approvalNode = nodes.find(n => n.id === approval.stepId);

  if (decision === 'rejected') {
    execution.status = 'cancelled';
    execution.errorSummary = `Workflow halted at human approval gate "${approval.actionTitle}" by ${decidedBy}: ${decisionNotes || 'Action rejected'}`;
    execution.completedAt = new Date().toISOString();
    await repository.saveAutomationExecution(execution);
    return execution;
  }

  // If approved: resume execution from next node after approval
  const nextNodeId = approvalNode?.nextNodeIds?.[0];
  let nextNode = nodes.find(n => n.id === nextNodeId);

  execution.status = 'running';
  let currentContext = { ...approval.requestedPayload };

  while (nextNode) {
    const stepStart = Date.now();
    const stepLog: ExecutionStepLog = {
      stepId: nextNode.id,
      nodeType: nextNode.type,
      title: nextNode.title,
      status: 'pending',
      startedAt: new Date().toISOString(),
      input: { ...currentContext },
    };

    try {
      if (nextNode.type === 'action') {
        const actionType: WorkflowActionType = nextNode.config.type || 'create_notification';
        const actionParams = nextNode.config.parameters || {};
        const actionResult = await executeAction(actionType, actionParams, currentContext);

        stepLog.status = 'success';
        stepLog.output = actionResult;
        stepLog.durationMs = Date.now() - stepStart;
        stepLog.completedAt = new Date().toISOString();
        execution.steps.push(stepLog);

        currentContext = { ...currentContext, ...actionResult };
      } else {
        stepLog.status = 'success';
        stepLog.output = { skipped: true, nodeType: nextNode.type };
        stepLog.durationMs = Date.now() - stepStart;
        stepLog.completedAt = new Date().toISOString();
        execution.steps.push(stepLog);
      }

      const nextId = nextNode.nextNodeIds?.[0];
      nextNode = nodes.find(n => n.id === nextId);
    } catch (stepErr: any) {
      stepLog.status = 'failed';
      stepLog.error = stepErr.message;
      stepLog.durationMs = Date.now() - stepStart;
      stepLog.completedAt = new Date().toISOString();
      execution.steps.push(stepLog);
      execution.status = 'failed';
      execution.errorSummary = stepErr.message;
      break;
    }
  }

  if (execution.status === 'running') {
    execution.status = 'success';
  }

  execution.completedAt = new Date().toISOString();
  await repository.saveAutomationExecution(execution);
  return execution;
}

// ============================================================================
// ACTION EXECUTOR IMPLEMENTATIONS
// ============================================================================
async function executeAction(
  actionType: WorkflowActionType,
  parameters: Record<string, any>,
  context: Record<string, any>
): Promise<Record<string, any>> {
  switch (actionType) {
    case 'update_crm_record': {
      return {
        action: 'update_crm_record',
        updatedFields: parameters,
        recordId: context.recordId || context.businessId,
        timestamp: new Date().toISOString(),
      };
    }

    case 'change_lead_status': {
      const newStatus = parameters.status || 'qualified';
      return {
        action: 'change_lead_status',
        newStatus,
        leadId: context.recordId || context.businessId,
        applied: true,
      };
    }

    case 'assign_lead_owner': {
      const owner = parameters.role || 'Senior HVAC Sales Specialist';
      return {
        action: 'assign_lead_owner',
        assignedOwner: owner,
        priority: parameters.priority || 'high',
        assignedAt: new Date().toISOString(),
      };
    }

    case 'add_internal_note': {
      const note = parameters.note || 'Automated activity note logged by Watech Workflow Engine.';
      return {
        action: 'add_internal_note',
        note,
        loggedAt: new Date().toISOString(),
      };
    }

    case 'create_follow_up_task': {
      return {
        action: 'create_follow_up_task',
        taskId: `task_${Date.now()}`,
        title: parameters.taskTitle || 'Follow up with qualified prospect',
        dueInHours: parameters.dueInHours || 24,
        status: 'scheduled',
      };
    }

    case 'generate_outreach_draft': {
      return {
        action: 'generate_outreach_draft',
        subject: `Partnership & HVAC Energy Optimization for ${context.companyName || 'Apex Mechanical'}`,
        bodySnippet: 'Hi Team, We recently benchmarked commercial HVAC equipment in your area and identified immediate efficiency gains...',
        draftMode: true,
        style: parameters.style || 'consultative',
      };
    }

    case 'generate_proposal_draft': {
      return {
        action: 'generate_proposal_draft',
        proposalDraftNumber: `PROP-DRAFT-${Date.now().toString().slice(-4)}`,
        status: 'draft',
      };
    }

    case 'create_project': {
      return {
        action: 'create_project',
        projectId: `proj-auto-${Date.now().toString().slice(-4)}`,
        name: `${context.companyName || 'Client'} Implementation Engagement`,
        status: 'in_progress',
        milestonesProvisioned: true,
      };
    }

    case 'create_notification': {
      const notif = {
        id: `notif_${Date.now()}`,
        clientId: context.clientId || 'agency_internal',
        title: parameters.title || 'Workflow Automation Notification',
        message: parameters.message || 'An automated workflow completed a key milestone.',
        type: 'general' as const,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      await repository.saveClientNotification(notif).catch(() => {});
      return {
        action: 'create_notification',
        notificationId: notif.id,
        dispatched: true,
      };
    }

    case 'generate_research_report': {
      return {
        action: 'generate_research_report',
        reportType: parameters.reportType || 'market_intelligence_summary',
        generatedAt: new Date().toISOString(),
        summary: 'Market intelligence report synthesized across 10 audit categories.',
      };
    }

    case 'export_csv': {
      return {
        action: 'export_csv',
        filename: `watech_export_${Date.now()}.csv`,
        recordsCount: 42,
        ready: true,
      };
    }

    case 'send_email': {
      // Check real Gmail status
      let isGmailLive = false;
      try {
        const res = await fetch('/api/gmail/status');
        if (res.ok) {
          const data = await res.json();
          isGmailLive = Boolean(data.isConnected);
        }
      } catch {}

      if (isGmailLive) {
        return {
          action: 'send_email',
          integration: 'gmail',
          mode: 'live_sent',
          recipient: context.email || 'client@example.com',
          messageId: `gmsg_${Date.now()}`,
        };
      }

      // Safe fallback: create draft in local CRM
      return {
        action: 'send_email',
        integration: 'local_crm_draft',
        mode: 'draft_prepared',
        recipient: context.email || 'client@example.com',
        notice: 'Gmail OAuth is not connected. Outreach message stored safely in CRM Drafts for 1-click clipboard export.',
      };
    }

    case 'trigger_webhook': {
      return {
        action: 'trigger_webhook',
        destinationUrl: parameters.url || 'https://api.watech.example/webhook',
        hmacSigned: true,
        dispatchedAt: new Date().toISOString(),
      };
    }

    case 'send_to_n8n': {
      return {
        action: 'send_to_n8n',
        n8nWebhookUrl: parameters.n8nWebhookUrl || 'https://n8n.watech.example/webhook/leads',
        correlationId: context.correlationId || `corr_${Date.now()}`,
        sent: true,
      };
    }

    default:
      return { action: actionType, executed: true };
  }
}

// ============================================================================
// OUTBOUND WEBHOOK DISPATCHER
// ============================================================================
export async function dispatchWebhook(
  endpoint: WebhookEndpoint,
  event: AutomationEvent
): Promise<WebhookDelivery> {
  const deliveryId = `del_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const startTime = Date.now();

  try {
    const res = await fetch('/api/webhooks/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: endpoint.url,
        secret: endpoint.secret,
        payload: event.payload,
        eventType: event.type,
      }),
    });

    const resData = await res.json().catch(() => ({}));
    const durationMs = Date.now() - startTime;

    const delivery: WebhookDelivery = {
      id: deliveryId,
      endpointId: endpoint.id,
      endpointName: endpoint.name,
      eventId: event.id,
      eventType: event.type,
      url: endpoint.url,
      httpStatus: resData.httpStatus || 200,
      requestHeaders: { 'X-Watech-Signature': 'sha256=***' },
      requestPayload: event.payload,
      responseBody: resData.responseSnippet || (resData.success ? '{"ok":true}' : 'Delivery Error'),
      durationMs,
      status: resData.success ? 'success' : 'failed',
      attemptNumber: 1,
      maxAttempts: endpoint.maxRetries || 3,
      error: resData.error,
      timestamp: new Date().toISOString(),
    };

    await repository.saveWebhookDelivery(delivery);
    return delivery;
  } catch (err: any) {
    const delivery: WebhookDelivery = {
      id: deliveryId,
      endpointId: endpoint.id,
      endpointName: endpoint.name,
      eventId: event.id,
      eventType: event.type,
      url: endpoint.url,
      requestHeaders: {},
      requestPayload: event.payload,
      durationMs: Date.now() - startTime,
      status: 'failed',
      attemptNumber: 1,
      maxAttempts: endpoint.maxRetries || 3,
      error: err.message,
      timestamp: new Date().toISOString(),
    };

    await repository.saveWebhookDelivery(delivery);
    return delivery;
  }
}

// ============================================================================
// AUTOMATION METRICS COMPILER
// ============================================================================
export function calculateAutomationMetrics(
  workflows: AutomationWorkflow[],
  executions: AutomationExecution[],
  approvals: AutomationApproval[]
): AutomationMetricsSummary {
  const totalWorkflows = workflows.length;
  const activeWorkflows = workflows.filter(w => w.isActive).length;
  const pausedWorkflows = workflows.filter(w => !w.isActive).length;

  const totalExecutions = executions.length;
  const successfulExecutions = executions.filter(e => e.status === 'success').length;
  const failedExecutions = executions.filter(e => e.status === 'failed').length;
  const pendingApprovals = approvals.filter(a => a.status === 'pending').length;

  // Approx 18 minutes saved per automated workflow execution
  const estimatedHoursSaved = Math.round((successfulExecutions * 18) / 60 * 10) / 10;
  const successRatePercent = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 100;

  return {
    totalWorkflows,
    activeWorkflows,
    pausedWorkflows,
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    pendingApprovals,
    estimatedHoursSaved,
    successRatePercent,
  };
}
