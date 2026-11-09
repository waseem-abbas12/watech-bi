import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/server/auth';
import { IntegrationService } from '@/lib/server/integrationService';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(request, 'manage_tenant');
  if ('status' in auth) return auth;

  try {
    const success = await IntegrationService.disconnectIntegration(
      auth.user.tenantId,
      params.id,
      auth.user.userId
    );

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Integration not found or access denied.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Integration disconnected and credentials purged.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
