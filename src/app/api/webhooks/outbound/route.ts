import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePermission } from '@/lib/server/auth';
import { WebhookService } from '@/lib/server/webhookService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('status' in auth) return auth;

  try {
    const endpoints = WebhookService.listEndpoints(auth.user.tenantId);
    const deliveries = WebhookService.listDeliveries(auth.user.tenantId, 50);

    return NextResponse.json({
      success: true,
      endpoints,
      deliveries,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'manage_automations');
  if ('status' in auth) return auth;

  try {
    const body = await request.json();
    const { name, url, subscribedEvents, secret } = body;

    if (!name || !url) {
      return NextResponse.json({ success: false, error: 'Name and URL are required.' }, { status: 400 });
    }

    const endpoint = WebhookService.createEndpoint({
      tenantId: auth.user.tenantId,
      name,
      url,
      subscribedEvents: subscribedEvents || ['*'],
      secret,
    });

    return NextResponse.json({
      success: true,
      endpoint,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

// Manual Test Dispatch
export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'manage_automations');
  if ('status' in auth) return auth;

  try {
    const body = await request.json();
    const { endpointId, eventType = 'test.ping', payload = { ping: true, user: auth.user.email } } = body;

    const endpoints = WebhookService.listEndpoints(auth.user.tenantId);
    const endpoint = endpoints.find((e) => e.id === endpointId);

    if (!endpoint) {
      return NextResponse.json({ success: false, error: 'Webhook endpoint not found or access denied.' }, { status: 404 });
    }

    const delivery = await WebhookService.dispatchOutboundWebhook({
      endpoint,
      eventType,
      payload,
    });

    return NextResponse.json({
      success: delivery.status === 'success',
      delivery,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
