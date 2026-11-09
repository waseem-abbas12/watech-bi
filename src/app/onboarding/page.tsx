'use client';

import React from 'react';
import { ProjectProvider } from '@/context/ProjectContext';
import { TenantProvider } from '@/context/TenantContext';
import { CustomerOnboardingWizard } from '@/components/onboarding/CustomerOnboardingWizard';

export default function OnboardingPage() {
  return (
    <TenantProvider>
      <ProjectProvider initialModule="overview">
        <CustomerOnboardingWizard />
      </ProjectProvider>
    </TenantProvider>
  );
}
