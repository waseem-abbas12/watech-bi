'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ResearchProject } from '@/types';
import { repository } from '@/lib/db/repository';
import { seedDemoData, DEMO_PROJECT } from '@/lib/db/seed';

export type AppModuleId =
  | 'lead_pipeline'
  | 'command_center'
  | 'overview'
  | 'projects'
  | 'lead_intelligence'
  | 'followups'
  | 'billing'
  | 'market_research'
  | 'market_mapping'
  | 'discovery'
  | 'website_audit'
  | 'local_seo'
  | 'contact_discovery'
  | 'business_intelligence'
  | 'content_discovery'
  | 'opportunity_analysis'
  | 'lead_scoring'
  | 'email_verification'
  | 'outreach_strategy'
  | 'research_reports'
  | 'lead_crm'
  | 'ai_assistant'
  | 'competitor_monitoring'
  | 'multi_market'
  | 'sales_intelligence'
  | 'service_recommendations'
  | 'proposals'
  | 'client_projects'
  | 'agency_performance'
  | 'automation'
  | 'settings'
  | 'integrations'
  | 'jobs'
  | 'notifications';

interface ProjectContextType {
  projects: ResearchProject[];
  activeProject: ResearchProject | null;
  activeModule: AppModuleId;
  isLoading: boolean;
  setActiveModule: (mod: AppModuleId) => void;
  setActiveProject: (proj: ResearchProject | null) => void;
  refreshProjects: () => Promise<void>;
  createProject: (proj: ResearchProject) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  resetToDemoData: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({
  children,
  initialModule = 'overview',
}: {
  children: React.ReactNode;
  initialModule?: AppModuleId;
}) {
  const [projects, setProjects] = useState<ResearchProject[]>([DEMO_PROJECT]);
  const [activeProject, setActiveProject] = useState<ResearchProject | null>(DEMO_PROJECT);
  const [activeModule, setActiveModule] = useState<AppModuleId>(initialModule);
  const [isLoading, setIsLoading] = useState(false);

  const refreshProjects = async () => {
    try {
      setIsLoading(true);
      let list = await repository.getProjects();
      if (list.length === 0) {
        await seedDemoData();
        list = await repository.getProjects();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('watech_data_seeded'));
        }
      }
      setProjects(list);
      if (list.length > 0) {
        let requestedProjectId: string | null = null;
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          requestedProjectId = params.get('project');
        }
        setActiveProject((current) => {
          if (requestedProjectId) {
            const requested = list.find((p) => p.id === requestedProjectId);
            if (requested) return requested;
          }
          if (!current) return list[0];
          const exists = list.find((p) => p.id === current.id);
          return exists || list[0];
        });
      }
    } catch (err) {
      console.error('Failed to load projects from IndexedDB:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mod = params.get('module') as AppModuleId | null;
      if (mod) {
        setActiveModule(mod);
      }
    }
    refreshProjects();
  }, []);

  const createProject = async (proj: ResearchProject) => {
    await repository.saveProject(proj);
    await refreshProjects();
    setActiveProject(proj);
  };

  const deleteProject = async (id: string) => {
    await repository.deleteProject(id);
    await refreshProjects();
    setActiveProject((current) => (current?.id === id ? null : current));
  };

  const resetToDemoData = async () => {
    setIsLoading(true);
    await repository.clearAll();
    await seedDemoData();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('watech_data_seeded'));
    }
    await refreshProjects();
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        activeModule,
        isLoading,
        setActiveModule,
        setActiveProject,
        refreshProjects,
        createProject,
        deleteProject,
        resetToDemoData,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
