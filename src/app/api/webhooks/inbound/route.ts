import { NextRequest, NextResponse } from 'next/server';
import { WebhookService } from '@/lib/server/webhookService';
import { JobQueue } from '@/lib/server/jobQueue';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secret = process.env.WEBHOOK_INBOUND_SECRET || 'watech-default-inbound-secret';
  const signatureHeader = request.headers.get('x-watech-signature');
  const timestampHeader = request.headers.get('x-watech-timestamp');

  let rawBody = '';
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 });
  }

  // 1. Signature & Timestamp Replay Protection
  const verifyResult = WebhookService.verifyInboundSignature({
    rawPayload: rawBody,
    signatureHeader,
    timestampHeader,
    secret,
  });

  if (!verifyResult.valid) {
    return NextResponse.json(
      { success: false, error: verifyResult.reason },
      { status: 401 }
    );
  }

  // 2. Parse JSON & check Idempotency
  let parsedPayload: any;
  try {
    parsedPayload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: 'Malformed JSON payload' }, { status: 400 });
  }

  const eventId = parsedPayload.id || parsedPayload.eventId || request.headers.get('x-watech-event-id');
  if (eventId) {
    const { isDuplicate } = WebhookService.recordInboundEventId(eventId);
    if (isDuplicate) {
      return NextResponse.json({
        success: true,
        message: 'Duplicate event detected; already processed.',
        eventId,
      });
    }
  }

  // 3. Enqueue event for asynchronous background processing
  const tenantId = parsedPayload.tenantId || 'agency_internal';
  await JobQueue.enqueue({
    tenantId,
    type: 'usage_aggregation',
    payload: { inboundWebhook: parsedPayload, eventId },
    priority: 'high',
  });

  return NextResponse.json({
    success: true,
    message: 'Inbound webhook authenticated, verified, and accepted.',
    eventId,
  });
}
