'use client';

import React from 'react';
import { ProjectProvider } from '@/context/ProjectContext';
import { AppShell } from '@/components/layout/AppShell';
import { BackgroundJobsView } from '@/components/modules/BackgroundJobsView';

export default function BackgroundJobsPage() {
  return (
    <ProjectProvider>
      <AppShell>
        <BackgroundJobsView />
      </AppShell>
    </ProjectProvider>
  );
}
