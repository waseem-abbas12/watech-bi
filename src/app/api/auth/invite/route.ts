import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/server/auth';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'manage_users');
  if ('status' in auth) return auth;

  try {
    const body = await request.json();
    const { email, role } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const invitationToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return NextResponse.json({
      success: true,
      invitation: {
        email,
        role: role || 'employee',
        tenantId: auth.user.tenantId,
        token: invitationToken,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}