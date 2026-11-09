import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { JobQueue } from '@/lib/server/jobQueue';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if ('status' in auth) return auth;

  try {
    const job = JobQueue.getJob(auth.user.tenantId, params.id);
    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found or access denied.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, job });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if ('status' in auth) return auth;

  try {
    const cancelled = JobQueue.cancelJob(auth.user.tenantId, params.id);
    if (!cancelled) {
      return NextResponse.json({ success: false, error: 'Job could not be cancelled or does not exist.' }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: 'Job cancelled successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if ('status' in auth) return auth;

  try {
    const job = JobQueue.retryJob(auth.user.tenantId, params.id);
    if (!job) {
      return NextResponse.json({ success: false, error: 'Job could not be retried or does not exist.' }, { status: 400 });
    }
    return NextResponse.json({ success: true, job, message: 'Job requeued for immediate processing.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
