import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { repository } from '@/lib/db/repository';
import { decideApproval } from '@/lib/engines/automationEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('status' in auth) return auth;

  try {
    const approvals = await repository.getAutomationApprovals();
    return NextResponse.json({ success: true, approvals });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('status' in auth) return auth;

  try {
    const { approvalId, decision, decisionNotes } = await request.json();

    if (!approvalId || !decision || !['approved', 'rejected'].includes(decision)) {
      return NextResponse.json(
        { success: false, error: 'approvalId and valid decision ("approved" | "rejected") required.' },
        { status: 400 }
      );
    }

    const execution = await decideApproval(
      approvalId,
      decision,
      auth.user.email || auth.user.userId,
      decisionNotes
    );

    return NextResponse.json({
      success: true,
      decision,
      execution,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
