import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { emitAutomationEvent } from '@/lib/engines/automationEngine';
import type { AutomationEventType } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('status' in auth) return auth;

  try {
    const body = await request.json();
    const { eventType, sourceModule, recordId, payload = {} } = body;

    if (!eventType || !sourceModule || !recordId) {
      return NextResponse.json(
        { success: false, error: 'eventType, sourceModule, and recordId are required.' },
        { status: 400 }
      );
    }

    const result = await emitAutomationEvent(
      eventType as AutomationEventType,
      sourceModule,
      recordId,
      {
        ...payload,
        tenantId: auth.user.tenantId,
      }
    );

    return NextResponse.json({
      success: true,
      event: result.event,
      triggeredExecutions: result.triggeredExecutions,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
