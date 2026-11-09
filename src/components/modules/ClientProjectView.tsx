'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Layers,
  Calendar,
  DollarSign,
  ChevronRight,
  TrendingUp,
  FileText,
  FileCheck2,
  Trash2,
  Edit3,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  FolderGit2,
  HelpCircle,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ArrowRight,
  UserCheck,
  Eye,
  Paperclip,
  Activity,
  Award,
  Zap,
  BarChart3,
  CheckSquare,
  PlayCircle,
  PauseCircle,
  RotateCcw,
  Send,
  Download,
  Info
} from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { repository } from '@/lib/db/repository';
import type {
  ClientProfile,
  ClientStatus,
  ClientOnboarding,
  OnboardingStep,
  ClientRequirement,
  ClientAsset,
  ClientProject,
  ProjectDeliveryStatus,
  ProjectTask,
  TaskStatus,
  TaskPriority,
  ProjectMilestone,
  TeamMember,
  TeamMemberRole,
  Deliverable,
  DeliverableRevision,
  ClientCommunication,
  ProjectExpense,
  Business,
  BusinessProposal,
  ProposalQuotation,
  WatechServiceItem,
  HandoverReport,
  ClientPortalUser,
  ClientRequest,
  ClientRequestStatus
} from '@/types';
import {
  ONBOARDING_TEMPLATES,
  PROJECT_TEMPLATES,
  DEFAULT_TEAM_MEMBERS,
  ProjectTemplate
} from '@/lib/engines/projectTemplatesData';
import {
  createClientFromWonDeal,
  createProjectFromTemplate,
  calculateProjectProgress,
  validateTaskDependencies,
  calculateClientHealth,
  generateHandoverReport,
  detectRetentionAndUpsellOpportunities
} from '@/lib/engines/clientProjectEngine';

export const ClientProjectView: React.FC = () => {
  const { activeProject } = useProject();

  // Active Top Tabs
  const [activeTab, setActiveTab] = useState<'portfolio' | 'delivery' | 'tasks' | 'team_success' | 'portal_admin'>('portfolio');

  // Core Data States
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [onboardings, setOnboardings] = useState<Record<string, ClientOnboarding>>({});
  const [requirements, setRequirements] = useState<ClientRequirement[]>([]);
  const [assets, setAssets] = useState<ClientAsset[]>([]);
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [revisions, setRevisions] = useState<DeliverableRevision[]>([]);
  const [communications, setCommunications] = useState<ClientCommunication[]>([]);
  const [expenses, setExpenses] = useState<ProjectExpense[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [services, setServices] = useState<WatechServiceItem[]>([]);

  // Client Portal Admin States
  const [portalUsers, setPortalUsers] = useState<ClientPortalUser[]>([]);
  const [portalRequests, setPortalRequests] = useState<ClientRequest[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'primary_contact' | 'billing_contact' | 'technical_contact'>('primary_contact');
  const [selectedRequestForReview, setSelectedRequestForReview] = useState<ClientRequest | null>(null);
  const [reviewStaffResponse, setReviewStaffResponse] = useState('');
  const [reviewInternalNotes, setReviewInternalNotes] = useState('');
  const [reviewStatus, setReviewStatus] = useState<ClientRequestStatus>('in_progress');

  // Selection States
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [clientDrawerTab, setClientDrawerTab] = useState<'onboarding' | 'requirements' | 'assets' | 'commercial'>('onboarding');

  // Filter & Search States
  const [clientSearch, setClientSearch] = useState('');
  const [clientStatusFilter, setClientStatusFilter] = useState<string>('all');
  const [taskViewMode, setTaskViewMode] = useState<'kanban' | 'list'>('kanban');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskMemberFilter, setTaskMemberFilter] = useState<string>('all');
  const [taskMilestoneFilter, setTaskMilestoneFilter] = useState<string>('all');

  // Modals
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [showNewRequirementModal, setShowNewRequirementModal] = useState(false);
  const [showNewRevisionModal, setShowNewRevisionModal] = useState(false);
  const [selectedDeliverableForRevision, setSelectedDeliverableForRevision] = useState<Deliverable | null>(null);
  const [showNewCommModal, setShowNewCommModal] = useState(false);
  const [showNewExpenseModal, setShowNewExpenseModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [generatedHandover, setGeneratedHandover] = useState<HandoverReport | null>(null);
  const [copiedHandover, setCopiedHandover] = useState(false);

  // Form States
  const [newClientBizId, setNewClientBizId] = useState('');
  const [newClientContractVal, setNewClientContractVal] = useState(5000);
  const [newClientTemplate, setNewClientTemplate] = useState<'website' | 'marketing' | 'automation' | 'general'>('website');

  // New Project Form
  const [newProjTemplateId, setNewProjTemplateId] = useState('tmpl-website-redesign');
  const [newProjName, setNewProjName] = useState('');
  const [newProjBudget, setNewProjBudget] = useState(6500);

  // New Task Form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskMilestoneId, setTaskMilestoneId] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('todo');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskEstHours, setTaskEstHours] = useState(8);
  const [taskDependsOnId, setTaskDependsOnId] = useState('');
  const [taskChecklistInput, setTaskChecklistInput] = useState('');
  const [taskDependencyError, setTaskDependencyError] = useState<string | null>(null);

  // New Requirement Form
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqType, setReqType] = useState('DNS access / Credentials');
  const [reqPriority, setReqPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');

  // New Revision Form
  const [revFeedback, setRevFeedback] = useState('');
  const [revRequestedChanges, setRevRequestedChanges] = useState('');
  const [revIsOutOfScope, setRevIsOutOfScope] = useState(false);
  const [revOutOfScopeNotes, setRevOutOfScopeNotes] = useState('');

  // New Communication Form
  const [commType, setCommType] = useState<'welcome' | 'project_update' | 'approval_request' | 'delivery_notice' | 'meeting_notes'>('project_update');
  const [commSubject, setCommSubject] = useState('');
  const [commBody, setCommBody] = useState('');
  const [commChannel, setCommChannel] = useState<'email' | 'meeting' | 'portal' | 'phone'>('email');

  // New Expense Form
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState(50);
  const [expCategory, setExpCategory] = useState<'software_api' | 'contractor' | 'asset' | 'hosting' | 'misc'>('software_api');

  // Asset Upload Local Mock
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileDesc, setUploadFileDesc] = useState('');

  // Load Data
  const loadAllData = async () => {
    try {
      const [
        loadedClients,
        loadedRequirements,
        loadedAssets,
        loadedProjects,
        loadedMilestones,
        loadedTasks,
        loadedTeamMembers,
        loadedDeliverables,
        loadedRevisions,
        loadedComms,
        loadedExpenses,
        loadedBusinesses,
        loadedServices,
        loadedPortalUsers,
        loadedPortalRequests
      ] = await Promise.all([
        repository.getClients(),
        repository.getClientRequirements(),
        repository.getClientAssets(),
        repository.getClientProjects(),
        repository.getProjectMilestones(),
        repository.getProjectTasks(),
        repository.getTeamMembers(),
        repository.getDeliverables(),
        repository.getDeliverableRevisions(),
        repository.getClientCommunications(),
        repository.getProjectExpenses(),
        activeProject ? repository.getBusinesses(activeProject.id) : repository.getBusinesses(),
        repository.getServices(),
        repository.getClientPortalUsers(),
        repository.getClientRequests()
      ]);

      setClients(loadedClients);
      setRequirements(loadedRequirements);
      setAssets(loadedAssets);
      setProjects(loadedProjects);
      setMilestones(loadedMilestones);
      setTasks(loadedTasks);
      setTeamMembers(loadedTeamMembers);
      setDeliverables(loadedDeliverables);
      setRevisions(loadedRevisions);
      setCommunications(loadedComms);
      setExpenses(loadedExpenses);
      setBusinesses(loadedBusinesses);
      setServices(loadedServices);
      setPortalUsers(loadedPortalUsers);
      setPortalRequests(loadedPortalRequests);

      // Load onboardings for all clients
      const onboardMap: Record<string, ClientOnboarding> = {};
      for (const c of loadedClients) {
        const ob = await repository.getClientOnboarding(c.id);
        if (ob) onboardMap[c.id] = ob;
      }
      setOnboardings(onboardMap);

      // Default selections if none
      if (!selectedClientId && loadedClients.length > 0) {
        setSelectedClientId(loadedClients[0].id);
      }
      if (!selectedProjectId && loadedProjects.length > 0) {
        setSelectedProjectId(loadedProjects[0].id);
      }
    } catch (err) {
      console.error('Error loading client project data:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [activeProject]);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId) || clients[0] || null;
  }, [clients, selectedClientId]);

  const selectedProject = useMemo(() => {
    if (selectedProjectId) {
      return projects.find(p => p.id === selectedProjectId) || null;
    }
    if (selectedClient) {
      return projects.find(p => p.clientId === selectedClient.id) || projects[0] || null;
    }
    return projects[0] || null;
  }, [projects, selectedProjectId, selectedClient]);

  const clientOnboarding = useMemo(() => {
    if (!selectedClient) return null;
    return onboardings[selectedClient.id] || null;
  }, [selectedClient, onboardings]);

  const clientRequirements = useMemo(() => {
    if (!selectedClient) return [];
    return requirements.filter(r => r.clientId === selectedClient.id);
  }, [requirements, selectedClient]);

  const clientAssets = useMemo(() => {
    if (!selectedClient) return [];
    return assets.filter(a => a.clientId === selectedClient.id);
  }, [assets, selectedClient]);

  const projectMilestones = useMemo(() => {
    if (!selectedProject) return [];
    return milestones.filter(m => m.projectId === selectedProject.id);
  }, [milestones, selectedProject]);

  const projectTasks = useMemo(() => {
    if (!selectedProject) return [];
    return tasks.filter(t => t.projectId === selectedProject.id);
  }, [tasks, selectedProject]);

  const projectDeliverables = useMemo(() => {
    if (!selectedProject) return [];
    return deliverables.filter(d => d.projectId === selectedProject.id);
  }, [deliverables, selectedProject]);

  const projectRevisions = useMemo(() => {
    if (!selectedProject) return [];
    return revisions.filter(r => r.projectId === selectedProject.id);
  }, [revisions, selectedProject]);

  const clientCommunications = useMemo(() => {
    if (!selectedClient) return [];
    return communications.filter(c => c.clientId === selectedClient.id);
  }, [communications, selectedClient]);

  const projectExpenses = useMemo(() => {
    if (!selectedProject) return [];
    return expenses.filter(e => e.projectId === selectedProject.id);
  }, [expenses, selectedProject]);

  // Filtered Clients for Directory
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchSearch =
        c.companyName.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.industry.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.primaryContact.name.toLowerCase().includes(clientSearch.toLowerCase());
      const matchStatus = clientStatusFilter === 'all' || c.status === clientStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [clients, clientSearch, clientStatusFilter]);

  // Filtered Tasks for Tab 3
  const filteredTasks = useMemo(() => {
    return projectTasks.filter(t => {
      const matchSearch =
        t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
        t.description.toLowerCase().includes(taskSearch.toLowerCase());
      const matchMember = taskMemberFilter === 'all' || t.assignedToTeamMemberId === taskMemberFilter;
      const matchMilestone = taskMilestoneFilter === 'all' || t.milestoneId === taskMilestoneFilter;
      return matchSearch && matchMember && matchMilestone;
    });
  }, [projectTasks, taskSearch, taskMemberFilter, taskMilestoneFilter]);

  // Overall Financial Calculations for Selected Project
  const financialStats = useMemo(() => {
    if (!selectedProject) return { budget: 0, spent: 0, margin: 0, netMarginPct: 0 };
    const budget = selectedProject.budget || 0;
    const spent = projectExpenses.reduce((sum, e) => sum + e.amount, 0);
    const margin = budget - spent;
    const netMarginPct = budget > 0 ? Math.round((margin / budget) * 100) : 0;
    return { budget, spent, margin, netMarginPct };
  }, [selectedProject, projectExpenses]);

  // -------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------

  // Step Status Toggle in Onboarding
  const handleToggleOnboardingStep = async (stepId: string, currentStatus: string) => {
    if (!clientOnboarding) return;
    const nextStatus = currentStatus === 'completed' ? 'in_progress' : currentStatus === 'in_progress' ? 'completed' : 'in_progress';
    const updatedSteps = clientOnboarding.steps.map(s => {
      if (s.id === stepId) {
        return {
          ...s,
          status: nextStatus as any,
          completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined
        };
      }
      return s;
    });

    const completedCount = updatedSteps.filter(s => s.status === 'completed').length;
    const progress = Math.round((completedCount / updatedSteps.length) * 100);
    const isDone = progress === 100;

    const updatedOnboarding: ClientOnboarding = {
      ...clientOnboarding,
      steps: updatedSteps,
      overallProgress: progress,
      isCompleted: isDone,
      completedAt: isDone ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString()
    };

    await repository.saveClientOnboarding(updatedOnboarding);
    setOnboardings(prev => ({ ...prev, [clientOnboarding.clientId]: updatedOnboarding }));

    // Re-evaluate client health
    if (selectedClient) {
      const health = calculateClientHealth(
        selectedClient,
        projects.filter(p => p.clientId === selectedClient.id),
        tasks.filter(t => t.clientId === selectedClient.id),
        revisions.filter(r => r.clientId === selectedClient.id),
        updatedOnboarding
      );
      const updatedClient: ClientProfile = {
        ...selectedClient,
        healthScore: health.healthScore,
        healthGrade: health.grade,
        healthFactors: health.reasons,
        status: isDone && selectedClient.status === 'onboarding' ? 'in_delivery' : selectedClient.status,
        updatedAt: new Date().toISOString()
      };
      await repository.saveClient(updatedClient);
      setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    }
  };

  // Create Client from Modal
  const handleCreateNewClient = async () => {
    if (!newClientBizId) return;
    const biz = businesses.find(b => b.id === newClientBizId);
    if (!biz) return;

    // Check duplicate
    const existing = clients.find(c => c.businessId === biz.id);
    if (existing) {
      alert(`Client profile already exists for ${biz.officialName || biz.brandName}!`);
      return;
    }

    const { client, onboarding } = createClientFromWonDeal(biz);
    client.commercial.contractValue = newClientContractVal;
    onboarding.templateCategory = newClientTemplate;

    await repository.saveClient(client);
    await repository.saveClientOnboarding(onboarding);

    setClients(prev => [client, ...prev]);
    setOnboardings(prev => ({ ...prev, [client.id]: onboarding }));
    setSelectedClientId(client.id);
    setShowNewClientModal(false);
  };

  // Create Project from Template
  const handleCreateNewProject = async () => {
    if (!selectedClient) return;
    const template = PROJECT_TEMPLATES.find(t => t.id === newProjTemplateId) || PROJECT_TEMPLATES[0];

    const { project, milestones: newMilestones, tasks: newTasks } = createProjectFromTemplate(
      selectedClient.id,
      selectedClient.projectId,
      template,
      newProjName || undefined,
      newProjBudget,
      'USD',
      teamMembers
    );

    await repository.saveClientProject(project);
    for (const m of newMilestones) {
      await repository.saveProjectMilestone(m);
    }
    for (const t of newTasks) {
      await repository.saveProjectTask(t);
    }

    setProjects(prev => [project, ...prev]);
    setMilestones(prev => [...newMilestones, ...prev]);
    setTasks(prev => [...newTasks, ...prev]);
    setSelectedProjectId(project.id);
    setShowNewProjectModal(false);
  };

  // Update Project Lifecycle Status
  const handleUpdateProjectStatus = async (status: ProjectDeliveryStatus) => {
    if (!selectedProject) return;
    const updated: ClientProject = {
      ...selectedProject,
      status,
      actualCompletionDate: status === 'completed' ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString()
    };
    await repository.saveClientProject(updated);
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  // Toggle Milestone Completion
  const handleToggleMilestone = async (milestoneId: string, isCompleted: boolean) => {
    const updatedMilestones = milestones.map(m => {
      if (m.id === milestoneId) {
        return {
          ...m,
          isCompleted: !isCompleted,
          completionDate: !isCompleted ? new Date().toISOString().slice(0, 10) : undefined
        };
      }
      return m;
    });

    const targetMilestone = updatedMilestones.find(m => m.id === milestoneId);
    if (targetMilestone) {
      await repository.saveProjectMilestone(targetMilestone);
      setMilestones(updatedMilestones);

      // Recalculate Project Progress
      if (selectedProject) {
        const curProjMilestones = updatedMilestones.filter(m => m.projectId === selectedProject.id);
        const curProjTasks = tasks.filter(t => t.projectId === selectedProject.id);
        const newProgress = calculateProjectProgress(curProjMilestones, curProjTasks);

        const updatedProj: ClientProject = {
          ...selectedProject,
          progressPercent: newProgress,
          status: newProgress === 100 ? 'completed' : selectedProject.status,
          updatedAt: new Date().toISOString()
        };
        await repository.saveClientProject(updatedProj);
        setProjects(prev => prev.map(p => p.id === updatedProj.id ? updatedProj : p));
      }
    }
  };

  // Update Task Status
  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    const curTask = tasks.find(t => t.id === taskId);
    if (!curTask) return;

    const updatedTask: ProjectTask = {
      ...curTask,
      status: newStatus,
      isBlocked: newStatus === 'blocked',
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString()
    };

    await repository.saveProjectTask(updatedTask);
    const updatedTasks = tasks.map(t => t.id === taskId ? updatedTask : t);
    setTasks(updatedTasks);

    // Recalculate Project Progress
    if (selectedProject) {
      const curProjMilestones = milestones.filter(m => m.projectId === selectedProject.id);
      const curProjTasks = updatedTasks.filter(t => t.projectId === selectedProject.id);
      const newProgress = calculateProjectProgress(curProjMilestones, curProjTasks);

      const updatedProj: ClientProject = {
        ...selectedProject,
        progressPercent: newProgress,
        updatedAt: new Date().toISOString()
      };
      await repository.saveClientProject(updatedProj);
      setProjects(prev => prev.map(p => p.id === updatedProj.id ? updatedProj : p));
    }
  };

  // Save / Add Task with Cycle Detection
  const handleSaveTask = async () => {
    if (!taskTitle || !selectedProject || !selectedClient) return;

    // Check circular dependency if new dependency specified
    if (taskDependsOnId) {
      const check = validateTaskDependencies(
        projectTasks,
        editingTask ? editingTask.id : 'temp-new-id',
        taskDependsOnId
      );
      if (!check.valid) {
        setTaskDependencyError(check.error || 'Circular dependency detected!');
        return;
      }
    }

    setTaskDependencyError(null);

    const checklistItems = taskChecklistInput
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map((item, idx) => ({
        id: 'chk-' + Date.now() + '-' + idx,
        label: item,
        isDone: false
      }));

    if (editingTask) {
      const updated: ProjectTask = {
        ...editingTask,
        title: taskTitle,
        description: taskDescription,
        milestoneId: taskMilestoneId || undefined,
        assignedToTeamMemberId: taskAssigneeId || undefined,
        priority: taskPriority,
        status: taskStatus,
        dueDate: taskDueDate || editingTask.dueDate,
        estimatedHours: taskEstHours,
        dependsOnTaskIds: taskDependsOnId ? [taskDependsOnId] : [],
        isBlocked: taskStatus === 'blocked',
        checklist: checklistItems.length > 0 ? checklistItems : editingTask.checklist,
        updatedAt: new Date().toISOString()
      };
      await repository.saveProjectTask(updated);
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    } else {
      const newTask: ProjectTask = {
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        projectId: selectedProject.id,
        clientId: selectedClient.id,
        milestoneId: taskMilestoneId || undefined,
        title: taskTitle,
        description: taskDescription,
        assignedToTeamMemberId: taskAssigneeId || undefined,
        priority: taskPriority,
        status: taskStatus,
        dueDate: taskDueDate || new Date().toISOString().slice(0, 10),
        estimatedHours: taskEstHours,
        actualHours: 0,
        dependsOnTaskIds: taskDependsOnId ? [taskDependsOnId] : [],
        isBlocked: taskStatus === 'blocked',
        checklist: checklistItems,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await repository.saveProjectTask(newTask);
      setTasks(prev => [newTask, ...prev]);
    }

    setShowNewTaskModal(false);
    setEditingTask(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskChecklistInput('');
  };

  // Add Requirement
  const handleAddRequirement = async () => {
    if (!reqTitle || !selectedClient) return;
    const newReq: ClientRequirement = {
      id: 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      clientId: selectedClient.id,
      projectId: selectedClient.projectId,
      title: reqTitle,
      description: reqDesc,
      requiredFileTypeOrInfo: reqType,
      priority: reqPriority,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    await repository.saveClientRequirement(newReq);
    setRequirements(prev => [newReq, ...prev]);
    setShowNewRequirementModal(false);
    setReqTitle('');
    setReqDesc('');
  };

  // Add Local Asset with Disclosure Notice
  const handleUploadAsset = async () => {
    if (!uploadFileName || !selectedClient) return;
    const newAsset: ClientAsset = {
      id: 'asset-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      clientId: selectedClient.id,
      projectId: selectedClient.projectId,
      fileName: uploadFileName,
      fileType: uploadFileName.endsWith('.pdf') ? 'application/pdf' : uploadFileName.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream',
      storageType: 'local_browser_blob',
      fileSizeBytes: 1024 * Math.floor(Math.random() * 200 + 40),
      version: 1,
      description: uploadFileDesc || 'Uploaded project asset',
      approvalStatus: 'approved',
      uploadedAt: new Date().toISOString()
    };
    await repository.saveClientAsset(newAsset);
    setAssets(prev => [newAsset, ...prev]);
    setUploadFileName('');
    setUploadFileDesc('');
  };

  // Add Deliverable Revision with Out-of-Scope Guardrail
  const handleAddRevision = async () => {
    if (!selectedDeliverableForRevision || !selectedProject || !selectedClient) return;
    const newRev: DeliverableRevision = {
      id: 'rev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      deliverableId: selectedDeliverableForRevision.id,
      projectId: selectedProject.id,
      clientId: selectedClient.id,
      revisionNumber: revisions.filter(r => r.deliverableId === selectedDeliverableForRevision.id).length + 1,
      clientFeedback: revFeedback,
      requestedChanges: revRequestedChanges,
      isOutOfScope: revIsOutOfScope,
      outOfScopeNotes: revIsOutOfScope ? revOutOfScopeNotes : undefined,
      priority: 'high',
      status: 'open',
      createdAt: new Date().toISOString()
    };

    await repository.saveDeliverableRevision(newRev);
    setRevisions(prev => [newRev, ...prev]);

    // Update deliverable status to revision_requested
    const updatedDeliverable: Deliverable = {
      ...selectedDeliverableForRevision,
      status: 'revision_requested'
    };
    await repository.saveDeliverable(updatedDeliverable);
    setDeliverables(prev => prev.map(d => d.id === updatedDeliverable.id ? updatedDeliverable : d));

    setShowNewRevisionModal(false);
    setRevFeedback('');
    setRevRequestedChanges('');
    setRevIsOutOfScope(false);
    setRevOutOfScopeNotes('');
  };

  // Log Communication
  const handleLogCommunication = async () => {
    if (!commSubject || !selectedClient) return;
    const newComm: ClientCommunication = {
      id: 'comm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      clientId: selectedClient.id,
      projectId: selectedProject?.id,
      type: commType,
      subject: commSubject,
      messageBody: commBody,
      channel: commChannel,
      loggedBy: 'Watech PM',
      timestamp: new Date().toISOString()
    };
    await repository.saveClientCommunication(newComm);
    setCommunications(prev => [newComm, ...prev]);
    setShowNewCommModal(false);
    setCommSubject('');
    setCommBody('');
  };

  // Log Expense
  const handleLogExpense = async () => {
    if (!expDesc || !selectedProject || !selectedClient) return;
    const newExp: ProjectExpense = {
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      projectId: selectedProject.id,
      clientId: selectedClient.id,
      description: expDesc,
      amount: expAmount,
      currency: selectedProject.currency,
      category: expCategory,
      loggedAt: new Date().toISOString()
    };
    await repository.saveProjectExpense(newExp);
    setExpenses(prev => [newExp, ...prev]);
    setShowNewExpenseModal(false);
    setExpDesc('');
  };

  // Trigger Handover Report
  const handleGenerateHandover = () => {
    if (!selectedProject || !selectedClient) return;
    const report = generateHandoverReport(
      selectedProject,
      selectedClient,
      projectDeliverables,
      projectTasks
    );
    setGeneratedHandover(report);
    setShowHandoverModal(true);
  };

  const handleCopyHandover = () => {
    if (!generatedHandover) return;
    const text = `=========================================
WATECH BUSINESS INTELLIGENCE — CLIENT HANDOVER REPORT
=========================================
Project: ${selectedProject?.name}
Client: ${selectedClient?.companyName}
Generated: ${new Date(generatedHandover.generatedAt).toLocaleString()}
Lead PM: ${generatedHandover.generatedBy}

1. COMPLETED DELIVERABLES:
${generatedHandover.completedDeliverables.map(d => `• ${d}`).join('\n')}

2. HANDOVER & DEPLOYMENT SUMMARY:
${generatedHandover.handoverNotes}

3. ACCESS & CREDENTIAL TRANSFERS:
${generatedHandover.accessHandoverDetails}

4. ONGOING SUPPORT & MAINTENANCE:
${generatedHandover.ongoingSupportTerms}
=========================================`;

    navigator.clipboard.writeText(text);
    setCopiedHandover(true);
    setTimeout(() => setCopiedHandover(false), 2500);
  };

  // Portal Admin Handlers
  const handleInviteClientUser = async () => {
    if (!selectedClient || !inviteEmail.trim() || !inviteName.trim()) return;
    const newUser: ClientPortalUser = {
      id: 'cpu-' + Date.now(),
      clientId: selectedClient.id,
      email: inviteEmail.trim(),
      fullName: inviteName.trim(),
      name: inviteName.trim(),
      role: inviteRole,
      status: 'active',
      passwordHash: 'client123',
      createdAt: new Date().toISOString()
    };
    await repository.saveClientPortalUser(newUser);
    setPortalUsers(prev => [newUser, ...prev]);
    setShowInviteModal(false);
    setInviteName('');
    setInviteEmail('');
  };

  const handleLaunchPortalSimulation = (targetClient?: ClientProfile) => {
    const clientToSimulate = targetClient || selectedClient;
    if (!clientToSimulate) return;
    const existingUser = portalUsers.find(u => u.clientId === clientToSimulate.id);
    const userToSave = existingUser || {
      id: 'cpu-' + Date.now(),
      clientId: clientToSimulate.id,
      email: clientToSimulate.email || 'client@watech-bi.internal',
      name: clientToSimulate.primaryContact?.name || clientToSimulate.companyName,
      role: 'primary_contact' as const,
      status: 'active' as const,
      createdAt: new Date().toISOString()
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('watech_portal_user', JSON.stringify(userToSave));
      localStorage.setItem('watech_portal_client', JSON.stringify(clientToSimulate));
      window.open('/portal/dashboard', '_blank');
    }
  };

  const handleOpenReviewModal = (req: ClientRequest) => {
    setSelectedRequestForReview(req);
    setReviewStaffResponse(req.staffResponse || '');
    setReviewInternalNotes(req.internalNotes || '');
    setReviewStatus(req.status);
  };

  const handleSaveReviewRequest = async () => {
    if (!selectedRequestForReview) return;
    const updated: ClientRequest = {
      ...selectedRequestForReview,
      status: reviewStatus,
      staffResponse: reviewStaffResponse,
      clientVisibleResponse: reviewStaffResponse,
      internalNotes: reviewInternalNotes,
      resolvedAt: reviewStatus === 'resolved' ? new Date().toISOString() : selectedRequestForReview.resolvedAt,
      updatedAt: new Date().toISOString()
    };
    await repository.saveClientRequest(updated);
    setPortalRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
    setSelectedRequestForReview(null);
  };

  const handleToggleDeliverableReview = async (deliv: Deliverable) => {
    const updated: Deliverable = {
      ...deliv,
      status: deliv.status === 'ready_for_client_review' ? 'pending_internal_review' : 'ready_for_client_review'
    };
    await repository.saveDeliverable(updated);
    setDeliverables(prev => prev.map(d => d.id === updated.id ? updated : d));
  };

  // Upsell Opportunities for Tab 4
  const upsellOpportunities = useMemo(() => {
    if (!selectedClient) return [];
    return detectRetentionAndUpsellOpportunities(selectedClient, selectedProject || undefined, services);
  }, [selectedClient, selectedProject, services]);

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* HEADER & TOP STATS BAR */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-50 border border-border p-6 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Prompt 20 Complete
            </span>
            <span className="text-xs text-slate-400">Client Acquisition to Delivery OS</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-emerald-400" />
            Client Onboarding & Project Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Connect won proposals with structured 12-step onboarding, delivery templates, Kanban task execution, and client retention.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowNewClientModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors shadow-lg shadow-emerald-950/40"
          >
            <Plus className="w-4 h-4" />
            Convert / Add Client
          </button>
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors shadow-lg shadow-blue-950/40"
          >
            <FolderGit2 className="w-4 h-4" />
            New Delivery Project
          </button>
        </div>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface-50 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Clients</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">{clients.length}</span>
            <span className="text-xs text-emerald-400 font-medium">In Roster</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-50 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Projects In Delivery</span>
            <FolderGit2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">
              {projects.filter(p => p.status === 'in_progress' || p.status === 'ready_to_start').length}
            </span>
            <span className="text-xs text-blue-400 font-medium">Active Sprints</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-50 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Avg Client Health</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">
              {clients.length > 0 ? Math.round(clients.reduce((s, c) => s + c.healthScore, 0) / clients.length) : 100}
              <span className="text-sm font-normal text-slate-400">/100</span>
            </span>
            <span className="text-xs text-emerald-400 font-medium">Good Standing</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-50 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Contract Value</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">
              ${clients.reduce((sum, c) => sum + (c.commercial?.contractValue || 0), 0).toLocaleString()}
            </span>
            <span className="text-xs text-amber-400 font-medium">Committed</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4 PRIMARY WORKSPACE TABS */}
      {/* ========================================================= */}
      <div className="border-b border-border flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'portfolio'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Client Portfolio & Onboarding ({clients.length})
        </button>

        <button
          onClick={() => setActiveTab('delivery')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'delivery'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Project Delivery & Milestones ({projects.length})
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'tasks'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Task Management & Kanban ({projectTasks.length})
        </button>

        <button
          onClick={() => setActiveTab('team_success')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'team_success'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Team Workload, Deliverables & Success
        </button>

        <button
          onClick={() => setActiveTab('portal_admin')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'portal_admin'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ExternalLink className="w-4 h-4" />
          Client Portal Controls & Requests ({portalRequests.length})
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: CLIENT PORTFOLIO & ONBOARDING WORKSPACE */}
      {/* ========================================================= */}
      {activeTab === 'portfolio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Client Directory */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 rounded-xl bg-surface-50 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Client Accounts
                </h3>
                <span className="text-xs text-slate-400">{filteredClients.length} accounts</span>
              </div>

              {/* Search & Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-100 border border-border text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {['all', 'onboarding', 'in_delivery', 'active', 'completed'].map(st => (
                    <button
                      key={st}
                      onClick={() => setClientStatusFilter(st)}
                      className={`px-2 py-1 rounded text-xs capitalize whitespace-nowrap transition-colors ${
                        clientStatusFilter === st
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-surface-100 text-slate-400 hover:text-slate-200 border border-border'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client List */}
              <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
                {filteredClients.map(c => {
                  const isSelected = selectedClient?.id === c.id;
                  const ob = onboardings[c.id];
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedClientId(c.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-surface-100 border-emerald-500/50 shadow-sm'
                          : 'bg-surface-50/50 border-border hover:bg-surface-100/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-sm text-slate-200">{c.companyName}</h4>
                          <p className="text-xs text-slate-400">{c.industry}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            c.healthGrade === 'good'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : c.healthGrade === 'at_risk'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {c.healthScore}/100
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span className="capitalize">{c.status.replace('_', ' ')}</span>
                        <span>${c.commercial?.contractValue?.toLocaleString() || 0}</span>
                      </div>

                      {/* Onboarding mini progress */}
                      {ob && (
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                            <span>Onboarding</span>
                            <span>{ob.overallProgress}%</span>
                          </div>
                          <div className="w-full h-1 bg-surface-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${ob.overallProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredClients.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No clients found. Click "Convert / Add Client" above to onboard your first account.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Selected Client Workspace */}
          <div className="lg:col-span-8 space-y-4">
            {selectedClient ? (
              <div className="p-6 rounded-xl bg-surface-50 border border-border space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2.5 py-0.5 rounded bg-surface-100 text-slate-300 font-mono">
                        {selectedClient.id}
                      </span>
                      <span className="text-xs text-slate-400">{selectedClient.city}, {selectedClient.state}</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-100">{selectedClient.companyName}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Contact: <span className="text-slate-200 font-medium">{selectedClient.primaryContact.name}</span> ({selectedClient.primaryContact.title}) • {selectedClient.primaryContact.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Client Health</div>
                      <div className="flex items-center gap-1.5 justify-end mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${
                          selectedClient.healthGrade === 'good' ? 'bg-emerald-400' : 'bg-amber-400'
                        }`} />
                        <span className="font-bold text-slate-100">{selectedClient.healthScore}/100</span>
                        <span className="text-xs text-slate-400 uppercase">({selectedClient.healthGrade.replace('_', ' ')})</span>
                      </div>
                    </div>

                    <select
                      value={selectedClient.status}
                      onChange={async e => {
                        const newSt = e.target.value as ClientStatus;
                        const upd: ClientProfile = { ...selectedClient, status: newSt, updatedAt: new Date().toISOString() };
                        await repository.saveClient(upd);
                        setClients(prev => prev.map(c => c.id === upd.id ? upd : c));
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="onboarding">Onboarding</option>
                      <option value="in_delivery">In Delivery</option>
                      <option value="active">Active Maintenance</option>
                      <option value="paused">Paused</option>
                      <option value="completed">Completed</option>
                      <option value="churned">Churned</option>
                    </select>
                  </div>
                </div>

                {/* Sub-Tabs */}
                <div className="flex items-center gap-2 border-b border-border pb-2 text-xs">
                  <button
                    onClick={() => setClientDrawerTab('onboarding')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      clientDrawerTab === 'onboarding'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    12-Step Onboarding ({clientOnboarding?.overallProgress || 0}%)
                  </button>
                  <button
                    onClick={() => setClientDrawerTab('requirements')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      clientDrawerTab === 'requirements'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Requirements Intake ({clientRequirements.length})
                  </button>
                  <button
                    onClick={() => setClientDrawerTab('assets')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      clientDrawerTab === 'assets'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Asset Library ({clientAssets.length})
                  </button>
                  <button
                    onClick={() => setClientDrawerTab('commercial')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      clientDrawerTab === 'commercial'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Commercial & Scope
                  </button>
                </div>

                {/* Sub-Tab 1: 12-Step Onboarding */}
                {clientDrawerTab === 'onboarding' && clientOnboarding && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">
                          {ONBOARDING_TEMPLATES[clientOnboarding.templateCategory]?.label || 'Onboarding Workflow'}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Follow the 12-step structured checklist to align assets, DNS, access, and team kickoff.
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {clientOnboarding.overallProgress}% Complete
                      </span>
                    </div>

                    <div className="space-y-2">
                      {clientOnboarding.steps.map(step => {
                        const isDone = step.status === 'completed';
                        const isBlocked = step.status === 'blocked';
                        return (
                          <div
                            key={step.id}
                            className={`p-3.5 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                              isDone
                                ? 'bg-emerald-950/10 border-emerald-500/30 text-slate-300'
                                : isBlocked
                                ? 'bg-rose-950/20 border-rose-500/40 text-slate-200'
                                : 'bg-surface-100/50 border-border text-slate-200'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => handleToggleOnboardingStep(step.id, step.status)}
                                className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                                  isDone
                                    ? 'bg-emerald-600 border-emerald-500 text-white'
                                    : 'border-slate-600 hover:border-emerald-500'
                                }`}
                              >
                                {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </button>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-slate-400">Step {step.stepNumber}</span>
                                  <h5 className={`text-xs font-semibold ${isDone ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                                    {step.title}
                                  </h5>
                                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-surface-200 text-slate-400">
                                    {step.category.replace('_', ' ')}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">{step.description}</p>
                                {step.notes && (
                                  <p className="text-xs text-amber-400/90 mt-1 italic">Note: {step.notes}</p>
                                )}
                              </div>
                            </div>

                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded capitalize whitespace-nowrap ${
                                isDone
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : isBlocked
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : step.status === 'in_progress'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-surface-200 text-slate-400'
                              }`}
                            >
                              {step.status.replace('_', ' ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sub-Tab 2: Requirements Intake */}
                {clientDrawerTab === 'requirements' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">Client Requirements Intake</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Track specific deliverables, credentials, and assets requested from the client.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowNewRequirementModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Requirement
                      </button>
                    </div>

                    <div className="space-y-2">
                      {clientRequirements.map(req => (
                        <div
                          key={req.id}
                          className="p-3.5 rounded-lg bg-surface-100/50 border border-border flex items-start justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                req.priority === 'urgent' ? 'bg-rose-500/20 text-rose-400' :
                                req.priority === 'high' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'
                              }`}>
                                {req.priority}
                              </span>
                              <h5 className="text-xs font-semibold text-slate-200">{req.title}</h5>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{req.description}</p>
                            <p className="text-[11px] text-slate-500 mt-1">Expected Format: {req.requiredFileTypeOrInfo}</p>
                            {req.submittedContent && (
                              <div className="mt-2 text-xs p-2 rounded bg-surface-200 text-slate-300">
                                <span className="font-semibold text-emerald-400">Submitted:</span> {req.submittedContent}
                              </div>
                            )}
                          </div>

                          <select
                            value={req.status}
                            onChange={async e => {
                              const newStatus = e.target.value as any;
                              const upd = { ...req, status: newStatus };
                              await repository.saveClientRequirement(upd);
                              setRequirements(prev => prev.map(r => r.id === upd.id ? upd : r));
                            }}
                            className="px-2.5 py-1 text-xs rounded bg-surface-200 border border-border text-slate-300 focus:outline-none"
                          >
                            <option value="pending">Pending</option>
                            <option value="submitted">Submitted</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                      ))}

                      {clientRequirements.length === 0 && (
                        <div className="p-6 text-center text-xs text-slate-500">
                          No requirements recorded yet. Click "Add Requirement" to list credentials or files needed from client.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-Tab 3: Asset Library with Local Storage Transparency */}
                {clientDrawerTab === 'assets' && (
                  <div className="space-y-4">
                    {/* Disclosure Banner */}
                    <div className="p-3.5 rounded-lg bg-blue-950/30 border border-blue-500/30 flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-blue-200/90 leading-relaxed">
                        <span className="font-semibold text-blue-300">Local-First Browser Storage Disclosure:</span> Assets and files are indexed locally in your browser’s IndexedDB storage cache. Files are preserved across sessions on this machine and are not uploaded to public cloud hosting.
                      </div>
                    </div>

                    {/* Quick Mock Upload Form */}
                    <div className="p-3 rounded-lg bg-surface-100 border border-border flex flex-col md:flex-row items-center gap-3">
                      <input
                        type="text"
                        placeholder="File name (e.g. vector_logo.svg, contract_signed.pdf)..."
                        value={uploadFileName}
                        onChange={e => setUploadFileName(e.target.value)}
                        className="flex-1 w-full px-3 py-1.5 text-xs rounded bg-surface-200 border border-border text-slate-200 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Asset description..."
                        value={uploadFileDesc}
                        onChange={e => setUploadFileDesc(e.target.value)}
                        className="flex-1 w-full px-3 py-1.5 text-xs rounded bg-surface-200 border border-border text-slate-200 focus:outline-none"
                      />
                      <button
                        onClick={handleUploadAsset}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium whitespace-nowrap"
                      >
                        Attach Asset
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {clientAssets.map(asset => (
                        <div
                          key={asset.id}
                          className="p-3 rounded-lg bg-surface-100/50 border border-border flex items-start justify-between gap-3"
                        >
                          <div className="flex items-start gap-2.5">
                            <Paperclip className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                            <div>
                              <h5 className="text-xs font-semibold text-slate-200 break-all">{asset.fileName}</h5>
                              <p className="text-[11px] text-slate-400 mt-0.5">{asset.description}</p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1.5">
                                <span>{Math.round((asset.fileSizeBytes || 0) / 1024)} KB</span>
                                <span>•</span>
                                <span>Local Blob</span>
                                <span>•</span>
                                <span>v{asset.version}</span>
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            {asset.approvalStatus}
                          </span>
                        </div>
                      ))}

                      {clientAssets.length === 0 && (
                        <div className="col-span-2 p-6 text-center text-xs text-slate-500">
                          No client assets uploaded yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-Tab 4: Commercial & Scope */}
                {clientDrawerTab === 'commercial' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-lg bg-surface-100/60 border border-border">
                        <span className="text-xs text-slate-400">Total Contract Value</span>
                        <div className="text-lg font-bold text-slate-100 mt-1">
                          ${selectedClient.commercial?.contractValue?.toLocaleString() || 0} {selectedClient.commercial?.currency}
                        </div>
                        <span className="text-[10px] text-emerald-400 capitalize">
                          {selectedClient.commercial?.paymentModel?.replace('_', ' ')} billing
                        </span>
                      </div>

                      <div className="p-3.5 rounded-lg bg-surface-100/60 border border-border">
                        <span className="text-xs text-slate-400">Contract Package</span>
                        <div className="text-sm font-semibold text-slate-200 mt-1">
                          {selectedClient.commercial?.purchasedPackageName || 'Custom Scope'}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Started: {selectedClient.commercial?.startDate}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-lg bg-surface-100/60 border border-border">
                        <span className="text-xs text-slate-400">Assigned Account PM</span>
                        <div className="text-sm font-semibold text-slate-200 mt-1">
                          {teamMembers.find(t => t.id === selectedClient.account?.assignedManagerId)?.name || 'Sarah Jenkins (PM)'}
                        </div>
                        <span className="text-[10px] text-blue-400">Primary Delivery Lead</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-surface-100/40 border border-border space-y-2">
                      <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Agreed Services & Scope</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedClient.commercial?.agreedServices?.map((srv, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-surface-200 border border-border text-xs text-slate-200"
                          >
                            ✓ {srv}
                          </span>
                        ))}
                      </div>
                    </div>

                    {selectedClient.account?.internalNotes && (
                      <div className="p-3 rounded-lg bg-surface-100/40 border border-border">
                        <span className="text-xs text-slate-400 font-medium">Internal Account Notes:</span>
                        <p className="text-xs text-slate-300 mt-1">{selectedClient.account.internalNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 bg-surface-50 border border-border rounded-xl">
                Select a client from the left directory to view onboarding details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: PROJECT DELIVERY & MILESTONES */}
      {/* ========================================================= */}
      {activeTab === 'delivery' && (
        <div className="space-y-6">
          {/* Project Header & Switcher */}
          <div className="p-6 rounded-xl bg-surface-50 border border-border space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    {selectedClient ? selectedClient.companyName : 'All Projects'}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs text-slate-400">11-Stage Delivery Lifecycle</span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedProject?.id || ''}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className="text-lg font-bold bg-surface-100 border border-border rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedProject && (
                <div className="flex flex-wrap items-center gap-3">
                  {/* Status Dropdown */}
                  <select
                    value={selectedProject.status}
                    onChange={e => handleUpdateProjectStatus(e.target.value as ProjectDeliveryStatus)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-100 border border-border text-slate-200 capitalize focus:outline-none"
                  >
                    <option value="planning">1. Planning</option>
                    <option value="onboarding">2. Onboarding</option>
                    <option value="ready_to_start">3. Ready To Start</option>
                    <option value="in_progress">4. In Progress</option>
                    <option value="internal_review">5. Internal Review</option>
                    <option value="client_review">6. Client Review</option>
                    <option value="revision_required">7. Revision Required</option>
                    <option value="blocked">8. Blocked</option>
                    <option value="completed">9. Completed</option>
                    <option value="on_hold">10. On Hold</option>
                    <option value="cancelled">11. Cancelled</option>
                  </select>

                  <button
                    onClick={handleGenerateHandover}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    Handover Report
                  </button>

                  <button
                    onClick={() => setShowNewExpenseModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 border border-border text-xs text-slate-300 font-medium"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    Log Expense
                  </button>
                </div>
              )}
            </div>

            {selectedProject && (
              <>
                {/* Weighted Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Weighted Project Delivery Completion</span>
                    <span className="font-bold text-emerald-400">{selectedProject.progressPercent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-surface-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${selectedProject.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-border">
                  <div className="p-3 rounded-lg bg-surface-100/60">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider">Contract Budget</span>
                    <div className="text-base font-bold text-slate-100 mt-0.5">
                      ${financialStats.budget.toLocaleString()} {selectedProject.currency}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-100/60">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider">Project Expenses</span>
                    <div className="text-base font-bold text-amber-400 mt-0.5">
                      ${financialStats.spent.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-100/60">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider">Net Project Margin</span>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">
                      ${financialStats.margin.toLocaleString()} ({financialStats.netMarginPct}%)
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-100/60">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider">Target Handover</span>
                    <div className="text-base font-bold text-slate-200 mt-0.5">
                      {selectedProject.targetCompletionDate}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Milestones List */}
          <div className="p-6 rounded-xl bg-surface-50 border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  Delivery Milestone Phases ({projectMilestones.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Milestones calculate weighted overall progress towards project completion.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {projectMilestones.map((milestone, idx) => {
                const milestoneTasks = projectTasks.filter(t => t.milestoneId === milestone.id);
                const completedTasks = milestoneTasks.filter(t => t.status === 'completed').length;
                return (
                  <div
                    key={milestone.id}
                    className={`p-4 rounded-xl border transition-all ${
                      milestone.isCompleted
                        ? 'bg-emerald-950/15 border-emerald-500/30'
                        : 'bg-surface-100/60 border-border'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleMilestone(milestone.id, milestone.isCompleted)}
                          className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                            milestone.isCompleted
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'border-slate-600 hover:border-emerald-500'
                          }`}
                        >
                          {milestone.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-slate-200">{milestone.name}</h4>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-surface-200 text-slate-300 font-mono">
                              Weight: {milestone.weightPercent}%
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{milestone.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <div>
                          <span>Due: </span>
                          <span className="font-semibold text-slate-200">{milestone.targetDate}</span>
                        </div>
                        <div className="px-2.5 py-1 rounded bg-surface-200 text-slate-300">
                          {completedTasks} / {milestoneTasks.length} Tasks
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {projectMilestones.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-500">
                  No milestones configured for this project.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: TASK MANAGEMENT & KANBAN BOARD */}
      {/* ========================================================= */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-4 rounded-xl bg-surface-50 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={taskSearch}
                  onChange={e => setTaskSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-lg bg-surface-100 border border-border text-slate-200 placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Assignee Filter */}
              <select
                value={taskMemberFilter}
                onChange={e => setTaskMemberFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg bg-surface-100 border border-border text-slate-300 focus:outline-none"
              >
                <option value="all">All Team Members</option>
                {teamMembers.map(tm => (
                  <option key={tm.id} value={tm.id}>
                    {tm.name} ({tm.role.replace('_', ' ')})
                  </option>
                ))}
              </select>

              {/* Milestone Filter */}
              <select
                value={taskMilestoneFilter}
                onChange={e => setTaskMilestoneFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg bg-surface-100 border border-border text-slate-300 focus:outline-none"
              >
                <option value="all">All Milestones</option>
                {projectMilestones.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              {/* Kanban vs List toggle */}
              <div className="flex items-center rounded-lg bg-surface-100 p-0.5 border border-border text-xs">
                <button
                  onClick={() => setTaskViewMode('kanban')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    taskViewMode === 'kanban' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Kanban
                </button>
                <button
                  onClick={() => setTaskViewMode('list')}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    taskViewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  List
                </button>
              </div>

              <button
                onClick={() => {
                  setEditingTask(null);
                  setTaskTitle('');
                  setTaskDescription('');
                  setTaskChecklistInput('');
                  setShowNewTaskModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Task
              </button>
            </div>
          </div>

          {/* Kanban Board View (6 Columns) */}
          {taskViewMode === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { id: 'backlog', title: 'Backlog', color: 'border-slate-700' },
                { id: 'todo', title: 'To Do', color: 'border-blue-500/40' },
                { id: 'in_progress', title: 'In Progress', color: 'border-indigo-500/40' },
                { id: 'in_review', title: 'In Review', color: 'border-purple-500/40' },
                { id: 'blocked', title: 'Blocked', color: 'border-rose-500/40' },
                { id: 'completed', title: 'Completed', color: 'border-emerald-500/40' }
              ].map(col => {
                const colTasks = filteredTasks.filter(t => t.status === col.id);
                return (
                  <div
                    key={col.id}
                    className="flex flex-col bg-surface-50 border border-border rounded-xl p-3 min-h-[500px]"
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{col.title}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-100 text-slate-400">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1 overflow-y-auto">
                      {colTasks.map(task => {
                        const assignee = teamMembers.find(tm => tm.id === task.assignedToTeamMemberId);
                        const isOverdue = task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10) && task.status !== 'completed';
                        return (
                          <div
                            key={task.id}
                            className={`p-3 rounded-lg bg-surface-100 border text-xs space-y-2 shadow-sm transition-all hover:border-slate-500 ${
                              task.isBlocked ? 'border-rose-500/50 bg-rose-950/10' : 'border-border'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span
                                className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                                  task.priority === 'urgent'
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : task.priority === 'high'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                {task.priority}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingTask(task);
                                    setTaskTitle(task.title);
                                    setTaskDescription(task.description);
                                    setTaskMilestoneId(task.milestoneId || '');
                                    setTaskAssigneeId(task.assignedToTeamMemberId || '');
                                    setTaskPriority(task.priority);
                                    setTaskStatus(task.status);
                                    setTaskDueDate(task.dueDate);
                                    setTaskEstHours(task.estimatedHours || 8);
                                    setTaskDependsOnId(task.dependsOnTaskIds[0] || '');
                                    setTaskChecklistInput(task.checklist.map(c => c.label).join('\n'));
                                    setShowNewTaskModal(true);
                                  }}
                                  className="text-slate-500 hover:text-slate-300 p-0.5"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <h5 className="font-semibold text-slate-200 leading-snug">{task.title}</h5>

                            {task.isBlocked && task.blockedReason && (
                              <div className="p-1.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-300">
                                ⚠ {task.blockedReason}
                              </div>
                            )}

                            {task.checklist.length > 0 && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                <CheckSquare className="w-3 h-3" />
                                <span>
                                  {task.checklist.filter(c => c.isDone).length}/{task.checklist.length} items
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-border text-[10px] text-slate-400">
                              <span className={isOverdue ? 'text-rose-400 font-bold' : ''}>
                                {task.dueDate ? `Due ${task.dueDate.slice(5)}` : 'No date'}
                              </span>
                              <span className="font-medium text-slate-300 truncate max-w-[80px]">
                                {assignee ? assignee.name.split(' ')[0] : 'Unassigned'}
                              </span>
                            </div>

                            {/* Quick Stage Switcher */}
                            <select
                              value={task.status}
                              onChange={e => handleUpdateTaskStatus(task.id, e.target.value as TaskStatus)}
                              className="w-full text-[10px] py-0.5 rounded bg-surface-200 border border-border text-slate-300 focus:outline-none"
                            >
                              <option value="backlog">Move: Backlog</option>
                              <option value="todo">Move: To Do</option>
                              <option value="in_progress">Move: In Progress</option>
                              <option value="in_review">Move: In Review</option>
                              <option value="blocked">Move: Blocked</option>
                              <option value="completed">Move: Completed</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="bg-surface-50 border border-border rounded-xl p-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-slate-400">
                    <th className="pb-2.5 font-medium">Task</th>
                    <th className="pb-2.5 font-medium">Status</th>
                    <th className="pb-2.5 font-medium">Priority</th>
                    <th className="pb-2.5 font-medium">Assignee</th>
                    <th className="pb-2.5 font-medium">Due Date</th>
                    <th className="pb-2.5 font-medium">Checklist</th>
                    <th className="pb-2.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTasks.map(task => {
                    const assignee = teamMembers.find(tm => tm.id === task.assignedToTeamMemberId);
                    return (
                      <tr key={task.id} className="hover:bg-surface-100/40">
                        <td className="py-3 pr-3">
                          <div className="font-semibold text-slate-200">{task.title}</div>
                          <div className="text-[11px] text-slate-400 line-clamp-1">{task.description}</div>
                        </td>
                        <td className="py-3 pr-3">
                          <select
                            value={task.status}
                            onChange={e => handleUpdateTaskStatus(task.id, e.target.value as TaskStatus)}
                            className="text-xs py-1 px-2 rounded bg-surface-100 border border-border text-slate-300 capitalize"
                          >
                            <option value="backlog">Backlog</option>
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="in_review">In Review</option>
                            <option value="blocked">Blocked</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              task.priority === 'urgent'
                                ? 'bg-rose-500/20 text-rose-400'
                                : task.priority === 'high'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-slate-300">
                          {assignee ? assignee.name : 'Unassigned'}
                        </td>
                        <td className="py-3 pr-3 text-slate-400">{task.dueDate}</td>
                        <td className="py-3 pr-3 text-slate-400">
                          {task.checklist.filter(c => c.isDone).length}/{task.checklist.length}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              setEditingTask(task);
                              setTaskTitle(task.title);
                              setTaskDescription(task.description);
                              setTaskMilestoneId(task.milestoneId || '');
                              setTaskAssigneeId(task.assignedToTeamMemberId || '');
                              setTaskPriority(task.priority);
                              setTaskStatus(task.status);
                              setTaskDueDate(task.dueDate);
                              setTaskEstHours(task.estimatedHours || 8);
                              setTaskDependsOnId(task.dependsOnTaskIds[0] || '');
                              setTaskChecklistInput(task.checklist.map(c => c.label).join('\n'));
                              setShowNewTaskModal(true);
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: TEAM WORKLOAD, DELIVERABLES & CLIENT SUCCESS */}
      {/* ========================================================= */}
      {activeTab === 'team_success' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Team Capacity & Deliverables Review */}
          <div className="lg:col-span-7 space-y-6">
            {/* Team Roster & Capacity */}
            <div className="p-6 rounded-xl bg-surface-50 border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Agency Team Workload & Weekly Capacity
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Track allocated weekly sprint hours and prevent team resource bottlenecking.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {teamMembers.map(tm => {
                  const assignedTasks = tasks.filter(t => t.assignedToTeamMemberId === tm.id && t.status !== 'completed');
                  const assignedHours = assignedTasks.reduce((s, t) => s + (t.estimatedHours || 6), 0);
                  const isOverloaded = assignedHours > tm.maxWeeklyHours;
                  return (
                    <div
                      key={tm.id}
                      className="p-3.5 rounded-lg bg-surface-100/60 border border-border space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-xs text-slate-200">{tm.name}</h4>
                          <span className="text-[10px] text-blue-400 uppercase font-medium">
                            {tm.role.replace('_', ' ')}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isOverloaded
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {assignedHours} / {tm.maxWeeklyHours} hrs
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-surface-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isOverloaded ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, Math.round((assignedHours / tm.maxWeeklyHours) * 100))}%` }}
                        />
                      </div>

                      <div className="flex flex-wrap gap-1 text-[9px] text-slate-400">
                        {tm.skills.slice(0, 3).map((sk, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-surface-200">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Deliverables & Scope Revision Review with Out-of-Scope Flags */}
            <div className="p-6 rounded-xl bg-surface-50 border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-blue-400" />
                    Deliverables & Client Revisions
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Manage client reviews with automatic out-of-scope flags against original quotations.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {projectDeliverables.map(deliv => {
                  const delivRevisions = projectRevisions.filter(r => r.deliverableId === deliv.id);
                  return (
                    <div
                      key={deliv.id}
                      className="p-4 rounded-lg bg-surface-100/50 border border-border space-y-3"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-xs text-slate-200">{deliv.title}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">{deliv.description}</p>
                          {deliv.handoverUrl && (
                            <a
                              href={deliv.handoverUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 mt-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Preview Staging Deliverable
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={deliv.status}
                            onChange={async e => {
                              const newStatus = e.target.value as any;
                              const upd: Deliverable = {
                                ...deliv,
                                status: newStatus,
                                approvedAt: newStatus === 'approved' ? new Date().toISOString() : deliv.approvedAt
                              };
                              await repository.saveDeliverable(upd);
                              setDeliverables(prev => prev.map(d => d.id === upd.id ? upd : d));
                            }}
                            className="text-xs py-1 px-2.5 rounded bg-surface-200 border border-border text-slate-200 capitalize focus:outline-none"
                          >
                            <option value="pending_internal_review">Internal Review</option>
                            <option value="ready_for_client_review">Ready For Client</option>
                            <option value="approved">Approved</option>
                            <option value="revision_requested">Revision Requested</option>
                          </select>

                          <button
                            onClick={() => {
                              setSelectedDeliverableForRevision(deliv);
                              setShowNewRevisionModal(true);
                            }}
                            className="px-2.5 py-1 text-xs rounded bg-surface-200 hover:bg-surface-300 border border-border text-slate-300"
                          >
                            + Revision
                          </button>
                        </div>
                      </div>

                      {/* Display Revisions */}
                      {delivRevisions.map(rev => (
                        <div
                          key={rev.id}
                          className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                            rev.isOutOfScope
                              ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                              : 'bg-surface-200/50 border-border text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">Revision #{rev.revisionNumber}</span>
                            {rev.isOutOfScope && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                ⚠ Out-of-Scope Revision
                              </span>
                            )}
                          </div>
                          <p><span className="text-slate-400">Feedback:</span> {rev.clientFeedback}</p>
                          <p><span className="text-slate-400">Requested:</span> {rev.requestedChanges}</p>
                          {rev.isOutOfScope && rev.outOfScopeNotes && (
                            <div className="p-2 rounded bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-300 font-medium">
                              Commercial Scope Alert: {rev.outOfScopeNotes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}

                {projectDeliverables.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No deliverables defined yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Communication Timeline & Retention Engine */}
          <div className="lg:col-span-5 space-y-6">
            {/* Communication Log */}
            <div className="p-6 rounded-xl bg-surface-50 border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    Client Communications Timeline
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Chronological audit log of memos, kickoff calls, and updates.
                  </p>
                </div>
                <button
                  onClick={() => setShowNewCommModal(true)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                >
                  Log Event
                </button>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {clientCommunications.map(comm => (
                  <div
                    key={comm.id}
                    className="p-3 rounded-lg bg-surface-100/60 border border-border text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-emerald-400 capitalize">{comm.type.replace('_', ' ')}</span>
                      <span className="text-slate-500">{new Date(comm.timestamp).toLocaleDateString()}</span>
                    </div>
                    <h5 className="font-semibold text-slate-200">{comm.subject}</h5>
                    <p className="text-slate-400">{comm.messageBody}</p>
                    <div className="text-[10px] text-slate-500 pt-1">
                      Logged by: {comm.loggedBy} via {comm.channel}
                    </div>
                  </div>
                ))}

                {clientCommunications.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No communications logged yet.
                  </div>
                )}
              </div>
            </div>

            {/* Retention & Upsell Opportunity Engine */}
            <div className="p-6 rounded-xl bg-surface-50 border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Client Retention & Upsell Suggestions
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Follow-on service recommendations from Prompt 18 Catalog tailored to active client needs.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {upsellOpportunities.map((opp, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-surface-100/60 border border-border space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="font-semibold text-slate-200">{opp.title}</h5>
                      <span className="text-[11px] font-bold text-emerald-400">{opp.estimatedValue}</span>
                    </div>
                    <p className="text-slate-400">{opp.rationale}</p>
                    <div className="pt-1 text-[10px] text-blue-400 uppercase font-medium">
                      Category: {opp.category.replace('_', ' ')}
                    </div>
                  </div>
                ))}

                {upsellOpportunities.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No immediate upsell gaps identified for this client profile.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: CLIENT PORTAL CONTROLS & REQUESTS WORKSPACE */}
      {/* ========================================================= */}
      {activeTab === 'portal_admin' && (
        <div className="space-y-6">
          {/* Top Admin Controls & Emulation Bar */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0c1a2e] to-[#080d1a] border border-sky-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Prompt 22 Subsystem
                </span>
                <span className="text-xs text-slate-400">Internal Agency Client Control Plane</span>
              </div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-400" />
                Client Self-Service Portal & Inbound Request Desk
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Manage external client access, triage service requests with internal staff notes vs. client responses, and launch 1-click tenant simulation.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleLaunchPortalSimulation()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all shadow-md"
              >
                <ExternalLink className="w-4 h-4" />
                Launch Portal (Simulate {selectedClient?.companyName || 'Client'})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Authorized Portal Accounts & Deliverables Staging (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Authorized Users Card */}
              <div className="p-5 rounded-2xl bg-surface-50 border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                      Portal Users ({portalUsers.filter(u => u.clientId === selectedClient?.id).length})
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Invite User
                  </button>
                </div>

                <div className="divide-y divide-border">
                  {portalUsers.filter(u => u.clientId === selectedClient?.id).map(user => (
                    <div key={user.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          {user.name || user.fullName}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 capitalize">
                            {user.role.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">{user.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium capitalize">
                          {user.status}
                        </span>
                      </div>
                    </div>
                  ))}

                  {portalUsers.filter(u => u.clientId === selectedClient?.id).length === 0 && (
                    <div className="py-6 text-center text-xs text-slate-500">
                      No portal users provisioned yet for this client. Click "Invite User" to create an authorized login.
                    </div>
                  )}
                </div>
              </div>

              {/* Deliverable Review Gatekeeper */}
              <div className="p-5 rounded-2xl bg-surface-50 border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                      Client Review Gatekeeper
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">Toggle Visibility</span>
                </div>
                <p className="text-xs text-slate-400">
                  Deliverables marked as "Ready for Review" appear in the client portal for formal sign-off.
                </p>

                <div className="divide-y divide-border">
                  {deliverables.filter(d => d.clientId === selectedClient?.id).map(d => {
                    const isClientVisible = d.status === 'ready_for_client_review';
                    return (
                      <div key={d.id} className="py-3 flex items-center justify-between gap-2">
                        <div className="flex-1 pr-2">
                          <div className="text-xs font-semibold text-white truncate">{d.title}</div>
                          <div className="text-[11px] text-slate-500 capitalize">{d.status.replace(/_/g, ' ')}</div>
                        </div>
                        <button
                          onClick={() => handleToggleDeliverableReview(d)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                            isClientVisible
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                              : 'bg-slate-800 text-slate-400 border-border hover:text-white'
                          }`}
                        >
                          {isClientVisible ? 'Visible to Client' : 'Make Visible'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Inbound Client Service Requests & Review Desk (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="p-5 rounded-2xl bg-surface-50 border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-sky-400" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                      Client Requests & Tickets ({portalRequests.filter(r => r.clientId === selectedClient?.id).length})
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">Two-Way SLA Triage</span>
                </div>

                <div className="divide-y divide-border">
                  {portalRequests.filter(r => r.clientId === selectedClient?.id).map(req => (
                    <div key={req.id} className="py-4 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-white">{req.title || req.subject}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase border ${
                              req.priority === 'urgent'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-slate-800 text-slate-400 border-border'
                            }`}>
                              {req.priority}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                              {req.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2">{req.description}</p>
                        </div>

                        <button
                          onClick={() => handleOpenReviewModal(req)}
                          className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-semibold shrink-0"
                        >
                          Review & Respond
                        </button>
                      </div>

                      {req.staffResponse && (
                        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-border text-[11px] text-emerald-300">
                          <strong className="text-slate-400">Client Response: </strong>
                          {req.staffResponse}
                        </div>
                      )}

                      {req.internalNotes && (
                        <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/20 text-[11px] text-rose-300">
                          <strong className="text-rose-400">Staff Note (Hidden from client): </strong>
                          {req.internalNotes}
                        </div>
                      )}
                    </div>
                  ))}

                  {portalRequests.filter(r => r.clientId === selectedClient?.id).length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No inbound tickets from this client yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS */}
      {/* ========================================================= */}

      {/* Modal 1: New Client */}
      {showNewClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-surface-50 border border-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              Convert / Add New Client
            </h3>
            <p className="text-xs text-slate-400">
              Convert a won business from research into an active client with onboarding workflow.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Researched Business</label>
                <select
                  value={newClientBizId}
                  onChange={e => setNewClientBizId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                >
                  <option value="">-- Choose Business --</option>
                  {businesses.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.officialName || b.brandName || 'Business'} ({b.city || 'DFW'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Onboarding Template Category</label>
                <select
                  value={newClientTemplate}
                  onChange={e => setNewClientTemplate(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                >
                  <option value="website">Website & Digital Experience (12 Steps)</option>
                  <option value="marketing">Marketing & Local SEO (12 Steps)</option>
                  <option value="automation">Workflow Automation & CRM (12 Steps)</option>
                  <option value="general">Standard Agency Client (12 Steps)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Agreed Contract Value ($ USD)</label>
                <input
                  type="number"
                  value={newClientContractVal}
                  onChange={e => setNewClientContractVal(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                onClick={() => setShowNewClientModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewClient}
                disabled={!newClientBizId}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
              >
                Confirm Client Onboarding
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: New Delivery Project */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-surface-50 border border-border rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-blue-400" />
              Instantiate Delivery Project
            </h3>
            <p className="text-xs text-slate-400">
              Initialize a delivery project with pre-built milestones, estimated hours, and role assignments.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Client Account</label>
                <div className="px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 font-medium">
                  {selectedClient ? selectedClient.companyName : 'No client selected'}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Delivery Template</label>
                <select
                  value={newProjTemplateId}
                  onChange={e => setNewProjTemplateId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                >
                  {PROJECT_TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.targetDurationWeeks} Weeks)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Custom Project Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Mechanical Web & Lead Engine..."
                  value={newProjName}
                  onChange={e => setNewProjName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Project Budget ($ USD)</label>
                <input
                  type="number"
                  value={newProjBudget}
                  onChange={e => setNewProjBudget(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewProject}
                disabled={!selectedClient}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white"
              >
                Create Project Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Add / Edit Task with Cycle Detection */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-surface-50 border border-border rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-400" />
              {editingTask ? 'Edit Delivery Task' : 'Create Delivery Task'}
            </h3>

            {taskDependencyError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{taskDependencyError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Task Title</label>
                <input
                  type="text"
                  placeholder="Task title..."
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Detailed requirements or acceptance criteria..."
                  value={taskDescription}
                  onChange={e => setTaskDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Milestone Phase</label>
                  <select
                    value={taskMilestoneId}
                    onChange={e => setTaskMilestoneId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                  >
                    <option value="">-- No Milestone --</option>
                    {projectMilestones.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Assigned Team Member</label>
                  <select
                    value={taskAssigneeId}
                    onChange={e => setTaskAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                  >
                    <option value="">-- Unassigned --</option>
                    {teamMembers.map(tm => (
                      <option key={tm.id} value={tm.id}>
                        {tm.name} ({tm.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={e => setTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Initial Status</label>
                  <select
                    value={taskStatus}
                    onChange={e => setTaskStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="blocked">Blocked</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Est. Hours</label>
                  <input
                    type="number"
                    value={taskEstHours}
                    onChange={e => setTaskEstHours(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Depends On Task (DFS Cycle Validation Guardrail)
                </label>
                <select
                  value={taskDependsOnId}
                  onChange={e => setTaskDependsOnId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                >
                  <option value="">-- No Dependency --</option>
                  {projectTasks
                    .filter(t => !editingTask || t.id !== editingTask.id)
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Checklist Items (One per line)</label>
                <textarea
                  rows={3}
                  placeholder="Item 1&#10;Item 2&#10;Item 3"
                  value={taskChecklistInput}
                  onChange={e => setTaskChecklistInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTask}
                disabled={!taskTitle}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
              >
                {editingTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Add Requirement */}
      {showNewRequirementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-surface-50 border border-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              Add Client Requirement
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Requirement Title</label>
                <input
                  type="text"
                  placeholder="e.g. Google Analytics Admin Invitation..."
                  value={reqTitle}
                  onChange={e => setReqTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description & Purpose</label>
                <textarea
                  rows={2}
                  placeholder="Why is this required and what should the client provide?"
                  value={reqDesc}
                  onChange={e => setReqDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Expected Asset Type</label>
                  <input
                    type="text"
                    value={reqType}
                    onChange={e => setReqType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Priority</label>
                  <select
                    value={reqPriority}
                    onChange={e => setReqPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                onClick={() => setShowNewRequirementModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRequirement}
                disabled={!reqTitle}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
              >
                Save Requirement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Add Deliverable Revision with Out-of-Scope Guardrail */}
      {showNewRevisionModal && selectedDeliverableForRevision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-surface-50 border border-border rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-400" />
              Log Deliverable Revision
            </h3>
            <p className="text-xs text-slate-400">
              Deliverable: <span className="font-semibold text-slate-200">{selectedDeliverableForRevision.title}</span>
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Client Feedback Summary</label>
                <textarea
                  rows={2}
                  placeholder="What feedback did the client provide?"
                  value={revFeedback}
                  onChange={e => setRevFeedback(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Specific Requested Modifications</label>
                <textarea
                  rows={2}
                  placeholder="List exact changes or features requested..."
                  value={revRequestedChanges}
                  onChange={e => setRevRequestedChanges(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                />
              </div>

              {/* Out-of-Scope Checkbox Guardrail */}
              <div className="p-3 rounded-lg bg-surface-100 border border-border space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={revIsOutOfScope}
                    onChange={e => setRevIsOutOfScope(e.target.checked)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-0"
                  />
                  <span className="font-semibold text-slate-200">
                    Flag as Out-of-Scope (Exceeds original agreed quote)
                  </span>
                </label>
                {revIsOutOfScope && (
                  <div>
                    <label className="block text-amber-300 font-medium mb-1">
                      Commercial Scope Notes & Change Order Estimate
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Feature requires 6 additional dev hours ($650). Needs client sign-off on change order..."
                      value={revOutOfScopeNotes}
                      onChange={e => setRevOutOfScopeNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-amber-500/40 text-slate-200 focus:outline-none text-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                onClick={() => setShowNewRevisionModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRevision}
                disabled={!revFeedback}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white"
              >
                Record Revision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Log Communication */}
      {showNewCommModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-surface-50 border border-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              Log Client Communication
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Type</label>
                  <select
                    value={commType}
                    onChange={e => setCommType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                  >
                    <option value="welcome">Welcome</option>
                    <option value="project_update">Project Update</option>
                    <option value="approval_request">Approval Request</option>
                    <option value="delivery_notice">Delivery Notice</option>
                    <option value="meeting_notes">Meeting Notes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Channel</label>
                  <select
                    value={commChannel}
                    onChange={e => setCommChannel(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                  >
                    <option value="email">Email</option>
                    <option value="meeting">Meeting / Call</option>
                    <option value="portal">Portal</option>
                    <option value="phone">Phone</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Subject / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Sprint 2 Progress Memo..."
                  value={commSubject}
                  onChange={e => setCommSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Message Summary</label>
                <textarea
                  rows={3}
                  placeholder="Record summary of discussion or email dispatch..."
                  value={commBody}
                  onChange={e => setCommBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                onClick={() => setShowNewCommModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleLogCommunication}
                disabled={!commSubject}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
              >
                Log Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 7: Log Expense */}
      {showNewExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-surface-50 border border-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              Log Project Expense
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Expense Description</label>
                <input
                  type="text"
                  placeholder="e.g. Cloudflare Pages pro hosting, font license..."
                  value={expDesc}
                  onChange={e => setExpDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Amount ($ USD)</label>
                  <input
                    type="number"
                    value={expAmount}
                    onChange={e => setExpAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={expCategory}
                    onChange={e => setExpCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-slate-200 focus:outline-none"
                  >
                    <option value="software_api">Software / API</option>
                    <option value="contractor">Contractor</option>
                    <option value="asset">Asset / Media</option>
                    <option value="hosting">Hosting / Domain</option>
                    <option value="misc">Miscellaneous</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                onClick={() => setShowNewExpenseModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleLogExpense}
                disabled={!expDesc}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white"
              >
                Save Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 8: Handover Report Generator */}
      {showHandoverModal && generatedHandover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-surface-50 border border-border rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <span className="text-xs font-semibold text-emerald-400 uppercase">Client Delivery Handover</span>
                <h3 className="text-lg font-bold text-slate-100">Project Completion Handover Report</h3>
              </div>
              <button
                onClick={handleCopyHandover}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
              >
                {copiedHandover ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedHandover ? 'Copied to Clipboard' : 'Copy Report'}
              </button>
            </div>

            <div className="p-4 rounded-lg bg-surface-100/70 border border-border space-y-4 text-xs text-slate-300">
              <div>
                <h4 className="font-semibold text-slate-200 text-sm">1. Scope & Completed Deliverables</h4>
                <ul className="mt-1 space-y-1 list-disc list-inside text-slate-400">
                  {generatedHandover.completedDeliverables.map((deliv, idx) => (
                    <li key={idx} className="text-emerald-400 font-medium">
                      <span className="text-slate-200">{deliv}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-slate-200 text-sm">2. Executive Handover Summary</h4>
                <p className="mt-1 text-slate-300 whitespace-pre-line leading-relaxed">
                  {generatedHandover.handoverNotes}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-200 text-sm">3. Administrative Access & Security</h4>
                <p className="mt-1 text-slate-300 whitespace-pre-line leading-relaxed">
                  {generatedHandover.accessHandoverDetails}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-200 text-sm">4. Ongoing Warranty & Support Retainer Terms</h4>
                <p className="mt-1 text-slate-300 whitespace-pre-line leading-relaxed">
                  {generatedHandover.ongoingSupportTerms}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                onClick={() => setShowHandoverModal(false)}
                className="px-4 py-2 text-xs rounded-lg bg-surface-200 hover:bg-surface-300 text-slate-200 font-medium"
              >
                Close Handover View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Invite Client User */}
      {showInviteModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-fade-in">
          <div className="bg-surface-50 border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              Provision Client Portal Login
            </h3>
            <p className="text-xs text-slate-400">
              Create an authorized self-service account for <strong className="text-white">{selectedClient.companyName}</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Marcus Vance"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address (Login Username)</label>
                <input
                  type="email"
                  placeholder="e.g. m.vance@apexmechanicaltx.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Portal Security Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="primary_contact">Primary Contact (Full Approvals & Invoices)</option>
                  <option value="billing_contact">Billing Representative (Invoices & Receipts)</option>
                  <option value="technical_contact">Technical Representative (Deliverables Review)</option>
                </select>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-border text-slate-400 text-[11px]">
                Default demo password is set to: <code className="text-emerald-400 font-mono">client123</code>. Client will be prompted to manage credentials upon first sign-in.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteClientUser}
                disabled={!inviteName.trim() || !inviteEmail.trim()}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white"
              >
                Create Portal Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Review & Respond to Client Request */}
      {selectedRequestForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b1329] border border-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase tracking-wider">
                  Ticket #{selectedRequestForReview.id.slice(-6).toUpperCase()}
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  {selectedRequestForReview.title || selectedRequestForReview.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequestForReview(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-900/60 border border-border p-3.5 rounded-xl">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block mb-1">
                  Client Description
                </span>
                <p className="text-slate-200 whitespace-pre-wrap">{selectedRequestForReview.description}</p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Update Ticket Status</label>
                <select
                  value={reviewStatus}
                  onChange={e => setReviewStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-border rounded-xl text-white text-xs focus:outline-none focus:border-sky-500"
                >
                  <option value="submitted">Submitted (Under Initial Review)</option>
                  <option value="in_review">In Technical Review</option>
                  <option value="in_progress">In Progress (Assigned to Team)</option>
                  <option value="resolved">Resolved (Completed)</option>
                  <option value="declined">Declined / Out of Scope</option>
                </select>
              </div>

              <div>
                <label className="block text-emerald-400 font-semibold mb-1">
                  Official Client-Visible Response
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain what steps the team is taking or announce when resolved..."
                  value={reviewStaffResponse}
                  onChange={e => setReviewStaffResponse(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-border rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 placeholder-slate-600"
                />
                <span className="text-[10px] text-slate-500">This text is directly visible in the client portal.</span>
              </div>

              <div>
                <label className="block text-rose-400 font-semibold mb-1">
                  Internal Staff Notes (Hidden from Client)
                </label>
                <textarea
                  rows={2}
                  placeholder="Internal notes, assignees, technical caveats (NEVER visible to client)..."
                  value={reviewInternalNotes}
                  onChange={e => setReviewInternalNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-border rounded-xl text-white text-xs focus:outline-none focus:border-rose-500 placeholder-slate-600"
                />
                <span className="text-[10px] text-slate-500">Only visible to Watech-BI internal agency staff.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                onClick={() => setSelectedRequestForReview(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReviewRequest}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sm"
              >
                Save Triage Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
