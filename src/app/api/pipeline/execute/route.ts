import { NextRequest, NextResponse } from 'next/server';
import { executePipeline, PipelineExecuteInput, PipelineMode } from '@/lib/server/pipeline/pipelineRunner';
import { getSessionUser } from '@/lib/server/auth';
import { ServerTenantRepository } from '@/lib/server/tenantRepository';
import type { Business } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    const body = await req.json().catch(() => ({}));
    const {
      mode: requestedMode,
      industry,
      location,
      count = 10,
      minimumScore = 50,
      projectId,
      projectName,
      existingBusinesses,
      excludeDemo = true,
      tenantId: clientSuppliedTenantId,
    } = body;

    // Authentication & Multi-Tenant Authorization Checks
    if (!sessionUser && process.env.NODE_ENV === 'production' && !req.headers.get('x-internal-test')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Authentication required to execute lead pipelines.',
          errorCode: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Resolve tenant identity from authenticated session (never trust client input blindly)
    const effectiveTenantId = sessionUser?.tenantId || clientSuppliedTenantId || 'tenant-watech-hq';

    // Cross-tenant access prevention: Prevent authenticated users from targeting another tenant's resources
    if (sessionUser && !sessionUser.isPlatformSuperAdmin) {
      if (clientSuppliedTenantId && clientSuppliedTenantId.trim() !== sessionUser.tenantId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden: Cross-tenant execution blocked. You cannot run pipelines against another organization.',
            errorCode: 'CROSS_TENANT_ACCESS_DENIED',
          },
          { status: 403 }
        );
      }
    }

    // Verify project ownership if targeting an existing project
    if (projectId && sessionUser) {
      const tenantRepo = new ServerTenantRepository(effectiveTenantId, sessionUser.isPlatformSuperAdmin);
      const isOwner = await tenantRepo.verifyProjectOwnership(projectId);
      if (!isOwner) {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden: The requested project does not belong to your organization.',
            errorCode: 'PROJECT_OWNERSHIP_MISMATCH',
          },
          { status: 403 }
        );
      }
    }

    const mode: PipelineMode =
      requestedMode === 'existing_businesses' ||
      (Array.isArray(existingBusinesses) && existingBusinesses.length > 0 && requestedMode !== 'discovery')
        ? 'existing_businesses'
        : 'discovery';

    // 1. Validation for Mode B (Existing Businesses)
    if (mode === 'existing_businesses') {
      if (!Array.isArray(existingBusinesses) || existingBusinesses.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              'No existing businesses were provided for processing. Please select up to 10 businesses from your project.',
            errorCode: 'INVALID_ARGUMENT',
          },
          { status: 400 }
        );
      }

      // Cap maximum batch limit to 100 for stability and bounded concurrency
      const maxBatchLimit = Math.min(Math.max(Number(count) || 10, 1), 100);
      const selectedBusinesses: Business[] = existingBusinesses.slice(0, maxBatchLimit);

      // Validate each record has an ID and name
      for (const biz of selectedBusinesses) {
        if (!biz.id || !biz.officialName) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid business record format: missing id or officialName.',
              errorCode: 'INVALID_ARGUMENT',
            },
            { status: 400 }
          );
        }
      }

      const parsedScore = Math.max(0, Math.min(Number(minimumScore) || 50, 100));

      const pipelineInput: PipelineExecuteInput = {
        mode: 'existing_businesses',
        industry: typeof industry === 'string' && industry.trim() ? industry.trim() : undefined,
        location: typeof location === 'string' && location.trim() ? location.trim() : undefined,
        count: selectedBusinesses.length,
        minimumScore: parsedScore,
        projectId: typeof projectId === 'string' ? projectId : selectedBusinesses[0]?.projectId,
        projectName: typeof projectName === 'string' ? projectName : undefined,
        existingBusinesses: selectedBusinesses,
        excludeDemo: Boolean(excludeDemo),
        tenantId: effectiveTenantId,
        userId: sessionUser?.userId,
      };

      const result = await executePipeline(pipelineInput);
      if (result.errorCode === 'CONCURRENT_EXECUTION_LOCKED') {
        return NextResponse.json(result, { status: 409 });
      }
      return NextResponse.json(result);
    }

    // 2. Validation for Mode A (Discovery API)
    if (!industry || typeof industry !== 'string' || !industry.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Industry is required for live discovery (e.g., "HVAC", "Plumbing", "Roofing").',
          errorCode: 'INVALID_ARGUMENT',
        },
        { status: 400 }
      );
    }

    if (!location || typeof location !== 'string' || !location.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Location is required for live discovery (e.g., "Canton, Ohio, USA", "Austin, TX").',
          errorCode: 'INVALID_ARGUMENT',
        },
        { status: 400 }
      );
    }

    const parsedCount = Math.max(1, Math.min(Number(count) || 10, 50));
    const parsedScore = Math.max(0, Math.min(Number(minimumScore) || 50, 100));

    const pipelineInput: PipelineExecuteInput = {
      mode: 'discovery',
      industry: industry.trim(),
      location: location.trim(),
      count: parsedCount,
      minimumScore: parsedScore,
      projectId: typeof projectId === 'string' ? projectId : undefined,
      projectName: typeof projectName === 'string' ? projectName : undefined,
      existingBusinesses: Array.isArray(existingBusinesses) ? existingBusinesses : undefined,
      excludeDemo: Boolean(excludeDemo),
      tenantId: effectiveTenantId,
      userId: sessionUser?.userId,
    };

    const result = await executePipeline(pipelineInput);

    if (result.errorCode === 'PROVIDER_NOT_CONFIGURED') {
      return NextResponse.json(result, { status: 422 });
    }

    if (result.errorCode === 'CONCURRENT_EXECUTION_LOCKED') {
      return NextResponse.json(result, { status: 409 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: `Pipeline execution failed: ${err.message || 'Unknown server error'}`,
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
