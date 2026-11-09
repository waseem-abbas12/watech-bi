'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Briefcase,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  ShieldCheck,
  ArrowLeft,
  PackageCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useClientPortalAuth } from '@/context/ClientPortalAuthContext';
import {
  getClientVisibleProjects,
  getClientVisibleTasks,
  getClientVisibleDeliverables,
} from '@/lib/engines/clientPortalEngine';
import { repository } from '@/lib/db/repository';
import { ClientProject, ProjectMilestone, ProjectTask, Deliverable } from '@/types';

export default function PortalProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;
  const { currentClient, isLoading: authLoading } = useClientPortalAuth();

  const [project, setProject] = useState<ClientProject | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    async function loadProjectDetails() {
      if (!currentClient || !projectId) return;

      try {
        setIsLoading(true);
        const projects = await getClientVisibleProjects(currentClient.id);
        const match = projects.find((p) => p.id === projectId);

        // Strict Tenant Isolation Check
        if (!match) {
          setUnauthorized(true);
          setIsLoading(false);
          return;
        }

        setProject(match);

        const [projMilestones, projTasks, allDeliverables] = await Promise.all([
          repository.getProjectMilestones(projectId, currentClient.id),
          getClientVisibleTasks(projectId, currentClient.id),
          getClientVisibleDeliverables(currentClient.id),
        ]);

        setMilestones(projMilestones);
        setTasks(projTasks);
        setDeliverables(allDeliverables.filter((d) => d.projectId === projectId));
      } catch (err) {
        console.error('Error loading project details:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading && currentClient) {
      loadProjectDetails();
    }
  }, [currentClient, projectId, authLoading]);

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-400">Verifying Project Scope & Access Authorization...</span>
      </div>
    );
  }

  if (unauthorized || !project) {
    return (
      <div className="bg-surface-50 border border-border rounded-xl p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <h2 className="text-sm font-semibold text-white">Project Scope Not Found or Unauthorized</h2>
        <p className="text-xs text-slate-400">
          This project does not exist or is not associated with your authorized client tenant account.
        </p>
        <Link
          href="/portal/projects"
          className="inline-block px-4 py-2 rounded-lg bg-surface-100 hover:bg-surface-200 text-white text-xs font-semibold transition-colors"
        >
          Return to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Return */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/portal/projects" className="hover:text-white flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Projects</span>
        </Link>
        <span>/</span>
        <span className="text-white font-medium truncate">{project.name}</span>
      </div>

      {/* Project Header Banner */}
      <div className="bg-surface-50 border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">{project.name}</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
                {project.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">{project.description}</p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Target Completion</span>
            <span className="text-sm font-bold text-white font-mono">{project.targetCompletionDate}</span>
          </div>
        </div>

        {/* Delivery Progress Bar */}
        <div className="space-y-1.5 pt-2 border-t border-border/80">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Milestone Progress</span>
            <span className="font-mono font-bold text-emerald-400">{project.progressPercent}% Completed</span>
          </div>
          <div className="w-full bg-surface-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all"
              style={{ width: `${project.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid: Milestones Roadmap & Deliverables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Milestone Phases */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Delivery Milestones & Phase Progress</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Key delivery stages agreed upon in project scope of work.
              </p>
            </div>

            <div className="space-y-3">
              {milestones.map((m, idx) => (
                <div
                  key={m.id}
                  className={`rounded-xl p-4 border transition-all text-xs space-y-2 ${
                    m.isCompleted
                      ? 'bg-emerald-500/5 border-emerald-500/30'
                      : 'bg-surface-100 border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                          m.isCompleted
                            ? 'bg-emerald-500 text-white'
                            : 'bg-surface-200 text-slate-400'
                        }`}
                      >
                        {m.isCompleted ? '✓' : idx + 1}
                      </div>
                      <div>
                        <span className="font-bold text-white text-xs block">{m.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Target Delivery: {m.targetDate}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase font-semibold ${
                        m.isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-surface-200 text-slate-400 border border-border'
                      }`}
                    >
                      {m.isCompleted ? 'Completed' : 'In Progress'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 pl-8">{m.description}</p>
                </div>
              ))}
              {milestones.length === 0 && (
                <p className="text-xs text-slate-400 py-6 text-center italic">No milestones defined for this scope.</p>
              )}
            </div>
          </div>

          {/* Client-Visible Execution Tasks */}
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Execution Activities & Tasks</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Client-visible work items tracked by our delivery team.
              </p>
            </div>

            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-surface-100 rounded-lg p-3 border border-border flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        task.status === 'completed'
                          ? 'bg-emerald-400'
                          : task.status === 'in_progress'
                          ? 'bg-blue-400'
                          : 'bg-slate-500'
                      }`}
                    />
                    <div>
                      <span className="text-white font-medium block">{task.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Due: {task.dueDate}</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-200 text-slate-300 uppercase">
                    {task.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center italic">No tasks currently published.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Deliverables & PM Lead */}
        <div className="space-y-6">
          {/* Deliverables for this Project */}
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-white">Project Deliverables</h3>
            <div className="space-y-2.5">
              {deliverables.map((del) => (
                <div key={del.id} className="bg-surface-100 rounded-lg p-3 border border-border text-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white">{del.title}</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full uppercase ${
                        del.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {del.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">{del.description}</p>
                  <div className="pt-1 border-t border-border/80 flex justify-end">
                    <Link
                      href="/portal/deliverables"
                      className="text-[11px] text-emerald-400 hover:underline font-medium flex items-center gap-1"
                    >
                      <span>Review in Deliverables Center</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
              {deliverables.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center italic">No deliverables published yet.</p>
              )}
            </div>
          </div>

          {/* Assigned PM Card */}
          <div className="bg-surface-50 border border-border rounded-xl p-5 shadow-sm space-y-3 text-xs">
            <h3 className="text-sm font-semibold text-white">Assigned Delivery Lead</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                SJ
              </div>
              <div>
                <span className="font-bold text-white block">Sarah Jenkins</span>
                <span className="text-[11px] text-slate-400 block">Senior Delivery Lead</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-300">
              For scope revisions, expedited reviews, or strategic alignments, reach out directly via the Client Request Center.
            </p>
            <Link
              href="/portal/requests"
              className="w-full py-2 rounded-lg bg-surface-100 hover:bg-surface-200 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors border border-border"
            >
              <span>Submit Request / Inquiry</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
