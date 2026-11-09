'use client';

import React from 'react';
import { ProjectProvider } from '@/context/ProjectContext';
import { AppShell } from '@/components/layout/AppShell';
import { IntegrationsView } from '@/components/modules/IntegrationsView';

export default function IntegrationsPage() {
  return (
    <ProjectProvider>
      <AppShell>
        <IntegrationsView />
      </AppShell>
    </ProjectProvider>
  );
}
