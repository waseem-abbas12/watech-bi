import type { Metadata } from 'next';
import './globals.css';
import { TenantProvider } from '@/context/TenantContext';

export const metadata: Metadata = {
  title: 'WATECH BI & Growth Research OS',
  description: 'Evidence-backed B2B Market Intelligence & Growth Research Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground min-h-screen selection:bg-brand-500 selection:text-white">
        <TenantProvider>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
