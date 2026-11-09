import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { isEmailSuppressed, addEmailToSuppressionList } from '@/lib/server/emailService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('status' in auth) return auth;

  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Email query parameter required' }, { status: 400 });
  }

  const check = isEmailSuppressed(email, auth.user.tenantId);
  return NextResponse.json({ email, ...check });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('status' in auth) return auth;

  try {
    const { email, reason } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    addEmailToSuppressionList(email, reason || 'Requested opt-out', auth.user.tenantId);
    return NextResponse.json({ success: true, message: `Added ${email} to suppression list` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
