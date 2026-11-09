'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PortalIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/portal/dashboard');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
      <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      <span className="text-xs font-mono text-slate-400">Loading Client Portal Workspace...</span>
    </div>
  );
}
