import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma, isDatabaseConfigured } from '@/lib/server/db';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!STRIPE_WEBHOOK_SECRET) {
      // In dev or preview where Stripe secret is not yet set, reject unauthenticated production calls
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Stripe webhook secret not configured on production' }, { status: 500 });
      }
      return NextResponse.json({ received: true, mode: 'test_unverified' }, { status: 200 });
    }

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    // Verify Stripe signature format: t=timestamp,v1=signature
    const parts = signature.split(',');
    const timestampPart = parts.find((p) => p.startsWith('t='))?.split('=')[1];
    const signaturePart = parts.find((p) => p.startsWith('v1='))?.split('=')[1];

    if (!timestampPart || !signaturePart) {
      return NextResponse.json({ error: 'Malformed stripe-signature header' }, { status: 400 });
    }

    // Protect against replay attacks (> 5 minutes old)
    const timestamp = parseInt(timestampPart, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
      return NextResponse.json({ error: 'Webhook timestamp expired / replay detected' }, { status: 400 });
    }

    const payloadToSign = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', STRIPE_WEBHOOK_SECRET)
      .update(payloadToSign)
      .digest('hex');

    const sigBuf = Buffer.from(signaturePart);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    // Idempotent event processing
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object;
        const tenantId = sub.metadata?.tenantId;
        if (tenantId && isDatabaseConfigured) {
          await prisma.tenantSubscription.upsert({
            where: { tenantId },
            create: {
              tenantId,
              planId: sub.metadata?.planId || 'plan-growth',
              status: sub.status,
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              stripeSubscriptionId: sub.id,
              stripeCustomerId: sub.customer,
            },
            update: {
              status: sub.status,
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            },
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const tenantId = sub.metadata?.tenantId;
        if (tenantId && isDatabaseConfigured) {
          await prisma.tenantSubscription.updateMany({
            where: { tenantId },
            data: { status: 'canceled' },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Webhook handler error', message: error.message }, { status: 500 });
  }
}