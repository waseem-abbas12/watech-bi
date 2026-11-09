'use client';

import React from 'react';
import { ProjectProvider } from '@/context/ProjectContext';
import { AppShell } from '@/components/layout/AppShell';
import { PlatformAdminView } from '@/components/modules/PlatformAdminView';

export default function PlatformAdminPage() {
  return (
    <ProjectProvider initialModule="settings">
      <AppShell>
        <PlatformAdminView />
      </AppShell>
    </ProjectProvider>
  );
}
