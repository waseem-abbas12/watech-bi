'use client';

import React from 'react';
import { ProjectProvider } from '@/context/ProjectContext';
import { AppShell } from '@/components/layout/AppShell';
import { AutomationsManagementView } from '@/components/modules/AutomationsManagementView';

export default function AutomationsPage() {
  return (
    <ProjectProvider>
      <AppShell>
        <AutomationsManagementView />
      </AppShell>
    </ProjectProvider>
  );
}
