import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { sendTransactionalEmail } from '@/lib/server/emailService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('status' in auth) return auth;

  try {
    const body = await request.json();
    const { to, subject, template, variables, bodyHtml, senderName, senderEmail } = body;

    if (!to || !subject) {
      return NextResponse.json(
        { success: false, error: 'Recipient "to" and "subject" are required.' },
        { status: 400 }
      );
    }

    const result = await sendTransactionalEmail({
      tenantId: auth.user.tenantId,
      to,
      subject,
      template,
      variables,
      bodyHtml,
      senderName,
      senderEmail,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: result.status === 'suppressed' ? 422 : 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
