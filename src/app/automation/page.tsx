'use client';

import React from 'react';
import { ProjectProvider } from '@/context/ProjectContext';
import { AppShell } from '@/components/layout/AppShell';
import { AutomationHubView } from '@/components/modules/AutomationHubView';

export default function AutomationPage() {
  return (
    <ProjectProvider>
      <AppShell>
        <AutomationHubView />
      </AppShell>
    </ProjectProvider>
  );
}
