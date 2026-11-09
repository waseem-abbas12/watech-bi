'use client';

import React from 'react';
import { ProjectProvider, useProject } from '@/context/ProjectContext';
import { AppShell } from '@/components/layout/AppShell';
import { OverviewDashboard } from '@/components/modules/OverviewDashboard';
import { AutomatedMarketResearchView } from '@/components/modules/AutomatedMarketResearchView';
import { MarketMappingView } from '@/components/modules/MarketMappingView';
import { BusinessDiscoveryView } from '@/components/modules/BusinessDiscoveryView';
import { WebsiteAuditView } from '@/components/modules/WebsiteAuditView';
import { LocalSeoIntelligenceView } from '@/components/modules/LocalSeoIntelligenceView';
import { ContactDiscoveryView } from '@/components/modules/ContactDiscoveryView';
import { EmailVerificationView } from '@/components/modules/EmailVerificationView';
import { OutreachStrategyView } from '@/components/modules/OutreachStrategyView';
import { BusinessIntelligenceView } from '@/components/modules/BusinessIntelligenceView';
import { ContentDiscoveryView } from '@/components/modules/ContentDiscoveryView';
import { OpportunityAnalysisView } from '@/components/modules/OpportunityAnalysisView';
import { LeadScoringView } from '@/components/modules/LeadScoringView';
import { ResearchReportsView } from '@/components/modules/ResearchReportsView';
import { LeadCrmView } from '@/components/modules/LeadCrmView';
import { AiResearchAssistantView } from '@/components/modules/AiResearchAssistantView';
import { CompetitorMonitoringView } from '@/components/modules/CompetitorMonitoringView';
import { MultiMarketView } from '@/components/modules/MultiMarketView';
import { ServiceRecommendationView } from '@/components/modules/ServiceRecommendationView';
import { ProposalQuotationView } from '@/components/modules/ProposalQuotationView';
import { ClientProjectView } from '@/components/modules/ClientProjectView';
import { AgencyPerformanceView } from '@/components/modules/AgencyPerformanceView';
import { AutomationHubView } from '@/components/modules/AutomationHubView';
import { IntegrationsView } from '@/components/modules/IntegrationsView';
import { BackgroundJobsView } from '@/components/modules/BackgroundJobsView';
import { NotificationsView } from '@/components/modules/NotificationsView';
import { SettingsView } from '@/components/modules/SettingsView';
import { CeoCommandCenterView } from '@/components/modules/CeoCommandCenterView';
import { PipelineWorkflowView } from '@/components/modules/PipelineWorkflowView';
import { ProjectsManagementView } from '@/components/modules/ProjectsManagementView';
import { LeadIntelligenceView } from '@/components/modules/LeadIntelligenceView';
import { FollowUpWorkspaceView } from '@/components/modules/FollowUpWorkspaceView';
import { BillingSubscriptionView } from '@/components/modules/BillingSubscriptionView';
import { OnboardingChecklistWidget } from '@/components/onboarding/OnboardingChecklistWidget';

function MainModuleRouter() {
  const { activeModule, activeProject, isLoading } = useProject();

  if (isLoading && !activeProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-400">Loading Watech Research OS...</span>
      </div>
    );
  }

  switch (activeModule) {
    case 'overview':
      return <OverviewDashboard />;
    case 'projects':
      return <ProjectsManagementView />;
    case 'lead_pipeline':
      return <PipelineWorkflowView />;
    case 'lead_intelligence':
      return <LeadIntelligenceView />;
    case 'followups':
      return <FollowUpWorkspaceView />;
    case 'billing':
      return <BillingSubscriptionView />;
    case 'command_center':
      return <CeoCommandCenterView />;
    case 'market_research':
      return <AutomatedMarketResearchView />;
    case 'market_mapping':
      return <MarketMappingView />;
    case 'discovery':
      return <BusinessDiscoveryView />;
    case 'website_audit':
      return <WebsiteAuditView />;
    case 'local_seo':
      return <LocalSeoIntelligenceView />;
    case 'contact_discovery':
      return <ContactDiscoveryView />;
    case 'email_verification':
      return <EmailVerificationView />;
    case 'outreach_strategy':
      return <OutreachStrategyView />;
    case 'business_intelligence':
      return <BusinessIntelligenceView />;
    case 'content_discovery':
      return <ContentDiscoveryView />;
    case 'opportunity_analysis':
      return <OpportunityAnalysisView />;
    case 'lead_scoring':
      return <LeadScoringView />;
    case 'research_reports':
      return <ResearchReportsView />;
    case 'lead_crm':
      return <LeadCrmView />;
    case 'ai_assistant':
      return <AiResearchAssistantView />;
    case 'competitor_monitoring':
      return <CompetitorMonitoringView />;
    case 'multi_market':
      return <MultiMarketView />;
    case 'sales_intelligence':
    case 'service_recommendations':
      return <ServiceRecommendationView />;
    case 'proposals':
      return <ProposalQuotationView />;
    case 'client_projects':
      return <ClientProjectView />;
    case 'agency_performance':
      return <AgencyPerformanceView />;
    case 'automation':
      return <AutomationHubView />;
    case 'integrations':
      return <IntegrationsView />;
    case 'jobs':
      return <BackgroundJobsView />;
    case 'notifications':
      return <NotificationsView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <OverviewDashboard />;
  }
}

export default function Home() {
  return (
    <ProjectProvider>
      <AppShell>
        <OnboardingChecklistWidget />
        <MainModuleRouter />
      </AppShell>
    </ProjectProvider>
  );
}
