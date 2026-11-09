import { AutomationWorkflow } from '@/types';

export interface WorkflowTemplateDefinition extends Omit<AutomationWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'successCount' | 'failureCount'> {
  templateId: string;
  tags: string[];
  recommendedIntegrations?: string[];
}

export const AUTOMATION_TEMPLATES: WorkflowTemplateDefinition[] = [
  // 1. New Lead Qualification
  {
    templateId: 'tpl-new-lead-qualification',
    name: 'New Lead Qualification',
    description: 'Automatically evaluate new discovered leads, apply 100-point scoring, and categorize sales readiness band.',
    category: 'lead_generation',
    isActive: false,
    version: 1,
    tags: ['Leads', 'Scoring', 'CRM'],
    recommendedIntegrations: ['csv'],
    trigger: {
      type: 'record_event',
      eventType: 'lead.created',
      entityType: 'business',
    },
    nodes: [
      {
        id: 'node-trig-1',
        type: 'trigger',
        title: 'Lead Created in Discovery Engine',
        description: 'Fires when a new business record is discovered or imported',
        config: { eventType: 'lead.created' },
        nextNodeIds: ['node-act-1'],
        position: { x: 100, y: 100 },
      },
      {
        id: 'node-act-1',
        type: 'action',
        title: 'Calculate 100-Point Lead Score',
        description: 'Runs audit rules, local SEO presence, and digital maturity scoring',
        config: {
          type: 'generate_research_report',
          parameters: { targetEntity: 'lead_score' },
        },
        nextNodeIds: ['node-act-2'],
        position: { x: 100, y: 220 },
      },
      {
        id: 'node-act-2',
        type: 'action',
        title: 'Update CRM Record Status',
        description: 'Sets initial pipeline stage to "Qualified" if scoring threshold met',
        config: {
          type: 'update_crm_record',
          parameters: { status: 'qualified', addTag: 'auto-qualified' },
        },
        position: { x: 100, y: 340 },
      },
    ],
  },

  // 2. High-Score Lead Alert
  {
    templateId: 'tpl-high-score-lead-alert',
    name: 'High-Score Lead Priority Alert',
    description: 'Detects hot prospects scoring 80+ points, flags high buying intent, and notifies sales leadership immediately.',
    category: 'sales_pipeline',
    isActive: false,
    version: 1,
    tags: ['Hot Lead', 'Alerts', 'Sales'],
    recommendedIntegrations: ['gmail', 'webhooks'],
    trigger: {
      type: 'record_event',
      eventType: 'lead.score_updated',
      entityType: 'lead_score',
      conditions: [
        { id: 'c1', field: 'totalScore', operator: 'greater_than_or_equal', value: 80 },
      ],
    },
    nodes: [
      {
        id: 'node-trig-2',
        type: 'trigger',
        title: 'Lead Score Updated >= 80',
        description: 'Fires when a prospect reaches tier-1 priority score',
        config: { eventType: 'lead.score_updated' },
        nextNodeIds: ['node-cond-2'],
        position: { x: 100, y: 100 },
      },
      {
        id: 'node-cond-2',
        type: 'condition',
        title: 'Score >= 80 & Not Contacted',
        description: 'Verify lead is uncontacted and high priority',
        config: {
          logic: 'AND',
          conditions: [
            { id: 'c1', field: 'totalScore', operator: 'greater_than_or_equal', value: 80 },
          ],
        },
        trueNodeId: 'node-act-assign',
        falseNodeId: 'node-act-pass',
        position: { x: 100, y: 220 },
      },
      {
        id: 'node-act-assign',
        type: 'action',
        title: 'Assign Senior Account Exec',
        description: 'Assigns highest-priority lead owner in CRM',
        config: {
          type: 'assign_lead_owner',
          parameters: { role: 'senior_account_exec', priority: 'high' },
        },
        nextNodeIds: ['node-act-notify'],
        position: { x: 50, y: 350 },
      },
      {
        id: 'node-act-notify',
        type: 'action',
        title: 'Dispatch High-Priority Notification',
        description: 'Broadcasts urgent in-app alert and webhook',
        config: {
          type: 'create_notification',
          parameters: { title: '🔥 High-Score Lead Alert', priority: 'urgent' },
        },
        position: { x: 50, y: 470 },
      },
      {
        id: 'node-act-pass',
        type: 'action',
        title: 'Log Telemetry Record',
        description: 'Standard score logged with no priority escalation',
        config: {
          type: 'add_internal_note',
          parameters: { note: 'Score logged below tier-1 threshold' },
        },
        position: { x: 260, y: 350 },
      },
    ],
  },

  // 3. Verified Contact Follow-up Draft
  {
    templateId: 'tpl-verified-contact-draft',
    name: 'Verified Contact Follow-up Draft',
    description: 'When a decision-maker email is verified, generate a personalized research-backed outreach draft ready for human approval.',
    category: 'lead_generation',
    isActive: false,
    version: 1,
    tags: ['Outreach', 'Email', 'Human-in-the-Loop'],
    recommendedIntegrations: ['gmail'],
    trigger: {
      type: 'record_event',
      eventType: 'email.verified',
      entityType: 'email',
      conditions: [
        { id: 'c1', field: 'verificationStatus', operator: 'equals', value: 'verified' },
      ],
    },
    nodes: [
      {
        id: 'node-trig-3',
        type: 'trigger',
        title: 'Decision-Maker Email Verified',
        description: 'Fires when MX & SMTP checks confirm valid inbox',
        config: { eventType: 'email.verified' },
        nextNodeIds: ['node-act-draft'],
        position: { x: 100, y: 100 },
      },
      {
        id: 'node-act-draft',
        type: 'action',
        title: 'Synthesize Outreach Draft',
        description: 'Applies strongest audit angle and personalized ROI hook',
        config: {
          type: 'generate_outreach_draft',
          parameters: { style: 'consultative', includeEvidence: true },
        },
        nextNodeIds: ['node-appr-draft'],
        position: { x: 100, y: 220 },
      },
      {
        id: 'node-appr-draft',
        type: 'approval',
        title: 'Outreach Review & Approval Gate',
        description: 'Mandatory human sign-off before any email dispatch',
        config: {
          requiredRole: 'sales_rep',
          instructions: 'Review generated copy, tone, and evidence claims before dispatch.',
        },
        nextNodeIds: ['node-act-ready'],
        position: { x: 100, y: 350 },
      },
      {
        id: 'node-act-ready',
        type: 'action',
        title: 'Queue Draft in Gmail / Local CRM',
        description: 'Creates Gmail draft or marks CRM ready for send',
        config: {
          type: 'send_email',
          parameters: { draftOnly: true },
        },
        position: { x: 100, y: 480 },
      },
    ],
  },

  // 4. Lead Assignment & CRM Routing
  {
    templateId: 'tpl-lead-assignment-routing',
    name: 'Lead Assignment & CRM Routing',
    description: 'Routes qualified prospects to the appropriate service specialist and schedules a first-touch activity.',
    category: 'sales_pipeline',
    isActive: false,
    version: 1,
    tags: ['Routing', 'SLA', 'Sales'],
    trigger: {
      type: 'record_event',
      eventType: 'lead.qualified',
      entityType: 'business',
    },
    nodes: [
      {
        id: 'node-trig-4',
        type: 'trigger',
        title: 'Lead Qualified',
        description: 'Fires when qualification criteria are satisfied',
        config: { eventType: 'lead.qualified' },
        nextNodeIds: ['node-act-route'],
        position: { x: 100, y: 100 },
      },
      {
        id: 'node-act-route',
        type: 'action',
        title: 'Assign Sector Specialist',
        description: 'Matches HVAC, Plumbing, or Commercial specialist',
        config: {
          type: 'assign_lead_owner',
          parameters: { autoMatchByIndustry: true },
        },
        nextNodeIds: ['node-act-task'],
        position: { x: 100, y: 220 },
      },
      {
        id: 'node-act-task',
        type: 'action',
        title: 'Create 24-Hour Outreach Task',
        description: 'Schedules mandatory initial outreach SLA in CRM',
        config: {
          type: 'create_follow_up_task',
          parameters: { dueInHours: 24, priority: 'high' },
        },
        position: { x: 100, y: 340 },
      },
    ],
  },

  // 5. Proposal Follow-up Reminder
  {
    templateId: 'tpl-proposal-followup-reminder',
    name: 'Proposal Follow-up Reminder',
    description: 'When a formal proposal is submitted, schedules automatic follow-up tasks at 3 and 7 days if unaccepted.',
    category: 'sales_pipeline',
    isActive: false,
    version: 1,
    tags: ['Proposals', 'Reminders', 'Pipeline'],
    trigger: {
      type: 'record_event',
      eventType: 'proposal.created',
      entityType: 'proposal',
    },
    nodes: [
      {
        id: 'node-trig-5',
        type: 'trigger',
        title: 'Proposal Issued to Prospect',
        description: 'Fires when proposal is sent to client',
        config: { eventType: 'proposal.created' },
        nextNodeIds: ['node-delay-3d'],
        position: { x: 100, y: 100 },
      },
      {
        id: 'node-delay-3d',
        type: 'delay',
        title: 'Wait 3 Business Days',
        description: 'Give prospect time for internal review',
        config: { delayHours: 72 },
        nextNodeIds: ['node-act-check-prop'],
        position: { x: 100, y: 220 },
      },
      {
        id: 'node-act-check-prop',
        type: 'action',
        title: 'Schedule Follow-up Call Task',
        description: 'Reminds account executive to check in on proposal feedback',
        config: {
          type: 'create_follow_up_task',
          parameters: { taskTitle: 'Proposal Status Review & Check-in' },
        },
        position: { x: 100, y: 340 },
      },
    ],
  },

  // 6. Accepted Proposal → Project Creation
  {
    templateId: 'tpl-proposal-to-project-creation',
    name: 'Accepted Proposal → Project Creation',
    description: 'When a client signs a proposal, auto-creates the client profile, provisions the project workspace, and configures onboarding milestones.',
    category: 'client_operations',
    isActive: false,
    version: 1,
    tags: ['Onboarding', 'Projects', 'Handoff'],
    trigger: {
      type: 'record_event',
      eventType: 'proposal.accepted',
      entityType: 'proposal',
    },
    nodes: [
      {
        id: 'node-trig-6',
        type: 'trigger',
        title: 'Proposal Accepted / Signed',
        description: 'Fires when digital sign-off is recorded',
        config: { eventType: 'proposal.accepted' },
        nextNodeIds: ['node-act-create-proj'],
        position: { x: 100, y: 100 },
      },
      {
        id: 'node-act-create-proj',
        type: 'action',
        title: 'Provision Client Project & Milestones',
        description: 'Copies accepted services into milestones and tasks',
        config: {
          type: 'create_project',
          parameters: { autoProvisionMilestones: true },
        },
        nextNodeIds: ['node-act-portal-notify'],
        position: { x: 100, y: 220 },
      },
      {
        id: 'node-act-portal-notify',
        type: 'action',
        title: 'Issue Client Portal Invitation',
        description: 'Generates secure onboarding token for client admin',
        config: {
          type: 'create_notification',
          parameters: { sendClientWelcome: true },
        },
        position: { x: 100, y: 340 },
      },
    ],
  },

  // 7. Invoice Due Reminder
  {
    templateId: 'tpl-invoice-due-reminder',
    name: 'Invoice Due Reminder',
    description: 'Tracks issued client invoices and prepares polite courtesy notifications 3 days prior to due date.',
    category: 'finance_billing',
    isActive: false,
    version: 1,
    tags: ['Finance', 'Invoices', 'Reminders'],
    trigger: {
      type: 'record_event',
      eventType: 'invoice.created',
      entityType: 'invoice',
    },
    nodes: [
      {
        id: 'node-trig-7',
        type: 'trigger',
        title: 'Invoice Issued',
        description: 'Fires when an invoice moves to issued status',
        config: { eventType: 'invoice.created' },
        nextNodeIds: ['node-act-sched-remind'],
        position: { x: 100, y: 100 },
      },
      {
        id: 'node-act-sched-remind',
        type: 'action',
        title: 'Schedule Courtesy Reminder',
        description: 'Schedules reminder notification in client portal',
        config: {
          type: 'create_notification',
          parameters: { daysBeforeDue: 3, reminderType: 'courtesy' },
        },
        position: { x: 100, y: 220 },
      },
    ],
  },

  // 8. Overdue Invoice Alert & Collection Gate
  {
    templateId: 'tpl-overdue-invoice-alert',
    name: 'Overdue Invoice Alert & Collection Gate',
    description: 'Detects unpaid invoices past due date, alerts accounting, and requires human approval before dispatching formal collection notices.',
    category: 'finance_billing',
    isActive: false,
    version: 1,
    tags: ['Finance', 'A/R', 'Collections', 'Approval'],
    trigger: {
      type: 'record_event',
      eventType: 'invoice.overdue',
      entityType: 'invoice',
    },
    nodes: [
      {
        id: 'node-trig-8',
        type: 'trigger',
        title: 'Invoice Marked Overdue',
        description: 'Fires when invoice passes due date with outstanding balance',
        config: { eventType: 'invoice.overdue' },
        nextNodeIds: ['node-act-alert-fin'],
        position: { x: 100, y: 100 },
      },
      {
        id: 'node-act-alert-fin',
        type: 'action',
        title: 'Internal Finance & PM Alert',
        description: 'Flags overdue invoice in Agency Performance ledger',
        config: {
          type: 'create_notification',
          parameters: { targetRole: 'finance_lead', priority: 'urgent' },
        },
        nextNodeIds: ['node-appr-collect'],
        position: { x: 100, y: 220 },
      },
      {
        id: 'node-appr-collect',
        type: 'approval',
        title: 'Collection Notice Approval Gate',
        description: 'Account Director must approve dispatching formal payment demand',
        config: {
          requiredRole: 'account_director',
          instructions: 'Verify if payment is in transit before sending formal notice.',
        },
        nextNodeIds: ['node-act-dispatch-notice'],
        position: { x: 100, y: 350 },
      },
      {
        id: 'node-act-dispatch-notice',
        type: 'action',
        title: 'Dispatch Formal Overdue Notice',
        description: 'Sends formal notice to client portal and primary contact',
        config: {
          type: 'send_email',
          parameters: { template: 'formal_overdue_notice' },
        },
        position: { x: 100, y: 480 },
      },
    ],
  },

  // 9. Project Milestone Notification
  {
    templateId: 'tpl-project-milestone-notification',
    name: 'Project Milestone Completion Notification',
    description: 'When all tasks in a project milestone are completed, logs milestone accomplishment and publishes progress update to Client Portal.',
    category: 'client_operations',
    isActive: false,
    version: 1,
    tags: ['Projects', 'Milestones', 'Portal'],
    trigger: {
      type: 'record_event',
      eventType: 'project.milestone_completed',
      entityType: 'milestone',
    },
    nodes: [
      {
        id: 'node-trig-9',
        type: 'trigger',
        title: 'Project Milestone Completed',
        description: 'Fires when final task in milestone is marked done',
        config: { eventType: 'project.milestone_completed' },
        nextNodeIds: ['node-act-post-milestone'],
        position: { x: 100, y: 100 },
      },
      {
        id: 'node-act-post-milestone',
        type: 'action',
        title: 'Publish Progress Update to Client Portal',
        description: 'Updates executive progress bar and sends portal alert',
        config: {
          type: 'create_notification',
          parameters: { target: 'client_portal', title: 'Milestone Completed 🎉' },
        },
        position: { x: 100, y: 220 },
      },
    ],
  },

  // 10. Deliverable Approval Notification
  {
    templateId: 'tpl-deliverable-approval-notification',
    name: 'Deliverable Approval Notification & Handover',
    description: 'When a client signs off on a deliverable in the portal, updates project status, marks tasks complete, and triggers final handover.',
    category: 'client_operations',
    isActive: false,
    version: 1,
    tags: ['Deliverables', 'Approvals', 'Handover'],
    trigger: {
      type: 'record_event',
      eventType: 'deliverable.approved',
      entityType: 'deliverable',
    },
    nodes: [
      {
        id: 'node-trig-10',
        type: 'trigger',
        title: 'Client Approved Deliverable',
        description: 'Fires when digital signature is recorded in client portal',
        config: { eventType: 'deliverable.approved' },
        nextNodeIds: ['node-act-advance-proj'],
        position: { x: 100, y: 100 },
      },
      {
        id: 'node-act-advance-proj',
        type: 'action',
        title: 'Mark Associated Tasks Complete',
        description: 'Closes operational review items in PM board',
        config: {
          type: 'update_crm_record',
          parameters: { targetEntity: 'project_task', status: 'completed' },
        },
        nextNodeIds: ['node-act-notify-team'],
        position: { x: 100, y: 220 },
      },
      {
        id: 'node-act-notify-team',
        type: 'action',
        title: 'Broadcast Handover Confirmation',
        description: 'Notifies agency project team that deliverable is officially approved',
        config: {
          type: 'create_notification',
          parameters: { title: 'Deliverable Sign-Off Received' },
        },
        position: { x: 100, y: 340 },
      },
    ],
  },

  // 11. Client Request Assignment & SLA Tracker
  {
    templateId: 'tpl-client-request-assignment',
    name: 'Client Request Assignment & SLA Tracker',
    description: 'When a client files a support or revision request, categorizes priority, assigns technician, and sends auto-acknowledgment.',
    category: 'client_operations',
    isActive: false,
    version: 1,
    tags: ['Support', 'SLA', 'Client Portal'],
    trigger: {
      type: 'record_event',
      eventType: 'client.request_created',
      entityType: 'client_request',
    },
    nodes: [
      {
        id: 'node-trig-11',
        type: 'trigger',
        title: 'Client Request Submitted',
        description: 'Fires when client logs ticket in portal request center',
        config: { eventType: 'client.request_created' },
        nextNodeIds: ['node-act-assign-pm'],
        position: { x: 100, y: 100 },
      },
      {
        id: 'node-act-assign-pm',
        type: 'action',
        title: 'Route to Dedicated Project Manager',
        description: 'Assigns request owner based on client account',
        config: {
          type: 'assign_lead_owner',
          parameters: { targetEntity: 'client_request' },
        },
        nextNodeIds: ['node-act-ack-portal'],
        position: { x: 100, y: 220 },
      },
      {
        id: 'node-act-ack-portal',
        type: 'action',
        title: 'Dispatch SLA Acknowledgment',
        description: 'Confirms ticket received with SLA guarantee (12h - 48h)',
        config: {
          type: 'create_notification',
          parameters: { title: 'Request Received & In Review' },
        },
        position: { x: 100, y: 340 },
      },
    ],
  },

  // 12. Weekly Business Intelligence Report
  {
    templateId: 'tpl-weekly-bi-report',
    name: 'Weekly Business Intelligence Summary',
    description: 'Compiles market discovery progress, competitor changes, proposal win rates, and financial metrics into an executive dossier.',
    category: 'intelligence_reports',
    isActive: false,
    version: 1,
    tags: ['Reports', 'BI', 'Analytics', 'Exports'],
    recommendedIntegrations: ['google_sheets', 'csv'],
    trigger: {
      type: 'manual',
      scheduleHumanLabel: 'Weekly every Monday at 09:00 AM',
    },
    nodes: [
      {
        id: 'node-trig-12',
        type: 'trigger',
        title: 'Weekly Cadence or Manual Trigger',
        description: 'Executes report compilation job',
        config: { type: 'manual' },
        nextNodeIds: ['node-act-compile-dossier'],
        position: { x: 100, y: 100 },
      },
      {
        id: 'node-act-compile-dossier',
        type: 'action',
        title: 'Synthesize Cross-Module Intelligence',
        description: 'Aggregates leads, deals, revenue, and competitor alerts',
        config: {
          type: 'generate_research_report',
          parameters: { reportType: 'executive_weekly_digest' },
        },
        nextNodeIds: ['node-act-export-csv'],
        position: { x: 100, y: 220 },
      },
      {
        id: 'node-act-export-csv',
        type: 'action',
        title: 'Generate CSV Export & Ledger Snapshot',
        description: 'Produces downloadable snapshot for agency archives',
        config: {
          type: 'export_csv',
          parameters: { includeFinancials: true, includeLeads: true },
        },
        position: { x: 100, y: 340 },
      },
    ],
  },
];
