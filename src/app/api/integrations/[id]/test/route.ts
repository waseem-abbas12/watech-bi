import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/server/auth';
import { IntegrationService } from '@/lib/server/integrationService';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission(request, 'manage_tenant');
  if ('status' in auth) return auth;

  try {
    const result = await IntegrationService.testConnection(
      auth.user.tenantId,
      params.id,
      auth.user.userId
    );

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 400 }
    );
  }
}
