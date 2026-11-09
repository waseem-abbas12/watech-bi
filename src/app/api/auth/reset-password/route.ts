import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hashPassword } from '@/lib/server/auth';
import { prisma, isDatabaseConfigured } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Reset token and new password are required', errorCode: 'INVALID_ARGUMENT' },
        { status: 400 }
      );
    }

    if (String(newPassword).length < 8) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 8 characters long', errorCode: 'WEAK_PASSWORD' },
        { status: 400 }
      );
    }

    // Verify token validity & expiration
    const payload = verifyToken(token);
    if (!payload || !payload.email) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired password reset token', errorCode: 'TOKEN_INVALID' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);

    if (isDatabaseConfigured) {
      await prisma.tenantUser.updateMany({
        where: { email: payload.email },
        data: { passwordHash },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You may now log in with your new credentials.',
      email: payload.email,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `Password reset failed: ${error.message}`, errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
