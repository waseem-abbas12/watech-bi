import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { JobQueue, type JobType, type JobPriority, type JobStatus } from '@/lib/server/jobQueue';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('status' in auth) return auth;

  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') as JobStatus | null;
    const type = searchParams.get('type') as JobType | null;
    const isDeadLetter = searchParams.get('isDeadLetter') === 'true' ? true : searchParams.get('isDeadLetter') === 'false' ? false : undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { jobs, total } = JobQueue.listJobs({
      tenantId: auth.user.tenantId,
      status: status || undefined,
      type: type || undefined,
      isDeadLetter,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      jobs,
      total,
      limit,
      offset,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('status' in auth) return auth;

  try {
    const body = await request.json();
    const { type, payload, priority, scheduledFor, maxRetries, idempotencyKey } = body;

    if (!type) {
      return NextResponse.json({ success: false, error: 'Job type is required.' }, { status: 400 });
    }

    const result = await JobQueue.enqueue({
      tenantId: auth.user.tenantId,
      type: type as JobType,
      payload: payload || {},
      priority: priority as JobPriority,
      scheduledFor,
      maxRetries,
      idempotencyKey,
    });

    return NextResponse.json({
      success: true,
      job: result.job,
      isDuplicate: result.isDuplicate,
      message: result.isDuplicate ? 'Duplicate job detected; existing job returned.' : 'Job queued successfully.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// Trigger worker queue process tick
export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('status' in auth) return auth;

  try {
    const stats = await JobQueue.processQueue();
    return NextResponse.json({ success: true, ...stats });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
