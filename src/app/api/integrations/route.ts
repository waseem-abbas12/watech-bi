import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePermission } from '@/lib/server/auth';
import { IntegrationService, type IntegrationCategory, type IntegrationProvider } from '@/lib/server/integrationService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('status' in auth) return auth;

  try {
    const integrations = IntegrationService.listIntegrations(auth.user.tenantId);
    const auditLogs = IntegrationService.getAuditLogs(auth.user.tenantId, 20);

    return NextResponse.json({
      success: true,
      integrations,
      auditLogs,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'manage_tenant');
  if ('status' in auth) return auth;

  try {
    const body = await request.json();
    const { name, category, provider, credentials, config } = body;

    if (!provider || !category) {
      return NextResponse.json(
        { success: false, error: 'Provider and category are required fields.' },
        { status: 400 }
      );
    }

    const saved = await IntegrationService.connectIntegration({
      tenantId: auth.user.tenantId,
      actorId: auth.user.userId,
      name,
      category: category as IntegrationCategory,
      provider: provider as IntegrationProvider,
      credentials: credentials || {},
      config: config || {},
    });

    return NextResponse.json({
      success: true,
      integration: saved,
      message: `${provider} integration configured successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
