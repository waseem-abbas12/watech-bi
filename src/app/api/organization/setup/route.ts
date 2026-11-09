import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/auth';
import { prisma, isDatabaseConfigured } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export interface OrganizationSetupInput {
  companyName: string;
  website?: string;
  industry: string;
  country: string;
  businessLocation: string;
  companySize?: string;
  primaryBusinessObjectives?: string[];
  tenantId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    const body: OrganizationSetupInput = await request.json().catch(() => ({}));
    const {
      companyName,
      website,
      industry,
      country,
      businessLocation,
      companySize,
      primaryBusinessObjectives,
      tenantId: clientTenantId,
    } = body;

    if (!companyName || !industry || !businessLocation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company name, industry, and business location are required.',
          errorCode: 'INVALID_ARGUMENT',
        },
        { status: 400 }
      );
    }

    // Resolve tenant context: Session user preferred, with client fallback for onboarding creation
    const effectiveTenantId = sessionUser?.tenantId || clientTenantId || `tenant-${Date.now()}`;

    // Cross-tenant verification
    if (sessionUser && !sessionUser.isPlatformSuperAdmin && clientTenantId) {
      if (clientTenantId !== sessionUser.tenantId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden: Cross-tenant modification denied.',
            errorCode: 'CROSS_TENANT_ACCESS_DENIED',
          },
          { status: 403 }
        );
      }
    }

    const organizationProfile = {
      tenantId: effectiveTenantId,
      companyName: companyName.trim(),
      website: website?.trim() || null,
      industry: industry.trim(),
      country: country?.trim() || 'USA',
      businessLocation: businessLocation.trim(),
      companySize: companySize || '1-10',
      primaryBusinessObjectives: primaryBusinessObjectives || ['commercial_hvac_leads'],
      configuredAt: new Date().toISOString(),
    };

    if (isDatabaseConfigured) {
      // Upsert tenant record
      await prisma.tenant.upsert({
        where: { id: effectiveTenantId },
        create: {
          id: effectiveTenantId,
          slug: companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40),
          name: companyName.trim(),
          planId: 'plan-starter',
          contactEmail: sessionUser?.email || 'admin@customer.agency',
          status: 'active',
          branding: {
            create: {
              companyName: companyName.trim(),
              footerText: `Powered by ${companyName.trim()}`,
              supportEmail: sessionUser?.email || 'admin@customer.agency',
            },
          },
        },
        update: {
          name: companyName.trim(),
        },
      });

      // Ensure default workspace exists for this organization
      const existingWorkspace = await prisma.workspace.findFirst({
        where: { tenantId: effectiveTenantId },
      });

      if (!existingWorkspace) {
        await prisma.workspace.create({
          data: {
            tenantId: effectiveTenantId,
            name: `${companyName.trim()} Operations`,
            slug: 'main-operations',
            description: `Primary workspace for ${companyName.trim()}`,
            isDefault: true,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Organization profile and default workspace configured successfully.',
      organization: organizationProfile,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `Organization setup failed: ${error.message}`, errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    const tenantId = sessionUser?.tenantId || request.nextUrl.searchParams.get('tenantId') || 'tenant-watech-hq';

    if (isDatabaseConfigured) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { branding: true, workspaces: true },
      });

      if (!tenant) {
        return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, organization: tenant });
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: tenantId,
        name: 'Watech Intelligence HQ',
        industry: 'HVAC & Mechanical',
        businessLocation: 'Canton, Ohio, USA',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
