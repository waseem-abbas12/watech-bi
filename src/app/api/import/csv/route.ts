import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/auth';
import { processCsvData, CsvImportOptions } from '@/lib/server/csvImportEngine';
import { prisma, isDatabaseConfigured } from '@/lib/server/db';
import { ServerTenantRepository } from '@/lib/server/tenantRepository';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    const body = await request.json().catch(() => ({}));
    const { csvContent, projectId, mapping, dryRun = false, cityFallback, stateFallback } = body;

    if (!csvContent || !projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'csvContent and projectId are required for CSV ingestion.',
          errorCode: 'INVALID_ARGUMENT',
        },
        { status: 400 }
      );
    }

    const tenantId = sessionUser?.tenantId || body.tenantId || 'tenant-watech-hq';

    // Verify project ownership if database configured
    const tenantRepo = new ServerTenantRepository(tenantId, sessionUser?.isPlatformSuperAdmin);
    const isOwner = await tenantRepo.verifyProjectOwnership(projectId);
    if (!isOwner) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: You do not have permission to import records into this project.',
          errorCode: 'PROJECT_OWNERSHIP_MISMATCH',
        },
        { status: 403 }
      );
    }

    // Query existing businesses for duplicate prevention
    let existingBusinesses: any[] = [];
    if (isDatabaseConfigured) {
      existingBusinesses = await prisma.business.findMany({
        where: { projectId, tenantId },
        select: { id: true, domain: true, officialName: true, phone: true },
      });
    }

    const options: CsvImportOptions = {
      projectId,
      tenantId,
      mapping,
      existingBusinesses,
      dryRun,
      cityFallback,
      stateFallback,
    };

    const result = processCsvData(csvContent, options);

    // If not dry run and database is configured, persist valid imported businesses
    if (!dryRun && result.importedBusinesses.length > 0 && isDatabaseConfigured) {
      await prisma.$transaction(
        result.importedBusinesses.map((biz) =>
          prisma.business.upsert({
            where: { id: biz.id },
            create: {
              id: biz.id,
              tenantId,
              projectId,
              officialName: biz.officialName,
              brandName: biz.brandName || null,
              domain: biz.domain || null,
              websiteUrl: biz.websiteUrl || null,
              phone: biz.phone || null,
              email: biz.email || null,
              city: biz.city || null,
              state: biz.state || null,
              status: biz.status || 'discovered',
              opportunityScore: biz.opportunityScore || 0,
            },
            update: {
              officialName: biz.officialName,
              domain: biz.domain || null,
              websiteUrl: biz.websiteUrl || null,
            },
          })
        )
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      summary: {
        totalRows: result.totalRows,
        validCount: result.validCount,
        importedCount: result.importedCount,
        duplicateCount: result.duplicateCount,
        invalidCount: result.invalidCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: `CSV processing failed: ${error.message}`,
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
