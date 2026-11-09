import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/server/auth';
import { prisma, isDatabaseConfigured } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email address is required', errorCode: 'INVALID_ARGUMENT' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Verify user exists if database configured
    let userFound = true;
    if (isDatabaseConfigured) {
      const user = await prisma.tenantUser.findFirst({
        where: { email: normalizedEmail },
      });
      userFound = Boolean(user);
    }

    // Generate 1-hour cryptographic reset token
    const resetToken = signToken(
      {
        userId: 'reset-request',
        email: normalizedEmail,
        fullName: 'Password Reset',
        tenantId: 'tenant-watech-hq',
        role: 'employee',
        isPlatformSuperAdmin: false,
      },
      '1h'
    );

    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a password recovery token has been issued.',
      resetToken, // Returned for client-side recovery simulation and testing
      expiresIn: '1 hour',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `Password recovery failed: ${error.message}`, errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
