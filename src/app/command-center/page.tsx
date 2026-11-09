'use client';

import React from 'react';
import { ProjectProvider } from '@/context/ProjectContext';
import { AppShell } from '@/components/layout/AppShell';
import { CeoCommandCenterView } from '@/components/modules/CeoCommandCenterView';

export default function CommandCenterPage() {
  return (
    <ProjectProvider initialModule="command_center">
      <AppShell>
        <CeoCommandCenterView />
      </AppShell>
    </ProjectProvider>
  );
}
