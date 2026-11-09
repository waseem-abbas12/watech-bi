import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { repository } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('status' in auth) return auth;

  try {
    const workflows = await repository.getAutomationWorkflows();
    const executions = await repository.getAutomationExecutions(undefined, 50);
    const approvals = await repository.getAutomationApprovals();

    return NextResponse.json({
      success: true,
      workflows,
      executions,
      approvals,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('status' in auth) return auth;

  try {
    const workflow = await request.json();
    if (!workflow.name || !workflow.trigger) {
      return NextResponse.json({ success: false, error: 'Workflow name and trigger are required.' }, { status: 400 });
    }

    if (!workflow.id) {
      workflow.id = `wf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      workflow.createdAt = new Date().toISOString();
    }
    workflow.updatedAt = new Date().toISOString();

    await repository.saveAutomationWorkflow(workflow);
    return NextResponse.json({ success: true, workflow });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
