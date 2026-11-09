import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/auth';
import { prisma, isDatabaseConfigured } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    const tenantId = sessionUser?.tenantId || request.nextUrl.searchParams.get('tenantId') || 'tenant-watech-hq';

    if (isDatabaseConfigured) {
      const workspaces = await prisma.workspace.findMany({
        where: { tenantId },
        include: { _count: { select: { projects: true } } },
        orderBy: { createdAt: 'asc' },
      });
      return NextResponse.json({ success: true, workspaces });
    }

    // Local / fallback workspace
    return NextResponse.json({
      success: true,
      workspaces: [
        {
          id: 'ws-default',
          tenantId,
          name: 'Main Operations',
          slug: 'main-operations',
          description: 'Default primary operational workspace',
          isDefault: true,
          _count: { projects: 1 },
        },
      ],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    const body = await request.json().catch(() => ({}));
    const { name, slug, description, tenantId: clientTenantId } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Workspace name is required', errorCode: 'INVALID_ARGUMENT' },
        { status: 400 }
      );
    }

    const effectiveTenantId = sessionUser?.tenantId || clientTenantId || 'tenant-watech-hq';
    const cleanSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-')).replace(/-+/g, '-').slice(0, 40);

    if (isDatabaseConfigured) {
      const workspace = await prisma.workspace.create({
        data: {
          tenantId: effectiveTenantId,
          name: name.trim(),
          slug: cleanSlug,
          description: description?.trim() || null,
          isDefault: false,
        },
      });
      return NextResponse.json({ success: true, workspace });
    }

    return NextResponse.json({
      success: true,
      workspace: {
        id: `ws-${Date.now()}`,
        tenantId: effectiveTenantId,
        name: name.trim(),
        slug: cleanSlug,
        description: description?.trim() || null,
        isDefault: false,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `Failed to create workspace: ${error.message}`, errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
