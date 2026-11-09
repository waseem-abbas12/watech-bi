'use client';

import React from 'react';
import { ProjectProvider } from '@/context/ProjectContext';
import { AppShell } from '@/components/layout/AppShell';
import { NotificationsView } from '@/components/modules/NotificationsView';

export default function NotificationsPage() {
  return (
    <ProjectProvider>
      <AppShell>
        <NotificationsView />
      </AppShell>
    </ProjectProvider>
  );
}
