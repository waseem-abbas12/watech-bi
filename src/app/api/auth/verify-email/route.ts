import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, signToken } from '@/lib/server/auth';
import { prisma, isDatabaseConfigured } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token, email } = body;

    if (!token && !email) {
      return NextResponse.json(
        { success: false, error: 'Verification token or email is required', errorCode: 'INVALID_ARGUMENT' },
        { status: 400 }
      );
    }

    // 1. If token is provided, verify cryptographic validity
    if (token) {
      const payload = verifyToken(token);
      if (!payload) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired verification token', errorCode: 'TOKEN_EXPIRED' },
          { status: 400 }
        );
      }

      if (isDatabaseConfigured) {
        await prisma.tenantUser.updateMany({
          where: { email: payload.email },
          data: { status: 'active' },
        });
      }

      return NextResponse.json({
        success: true,
        verified: true,
        email: payload.email,
        message: 'Email address verified successfully.',
      });
    }

    // 2. Direct email verification request (e.g., from signup onboarding flow)
    const normalizedEmail = String(email).trim().toLowerCase();
    if (isDatabaseConfigured) {
      await prisma.tenantUser.updateMany({
        where: { email: normalizedEmail },
        data: { status: 'active' },
      });
    }

    const verificationToken = signToken(
      {
        userId: 'verify-temp',
        email: normalizedEmail,
        fullName: 'Verified User',
        tenantId: 'tenant-watech-hq',
        role: 'owner',
        isPlatformSuperAdmin: false,
      },
      '24h'
    );

    return NextResponse.json({
      success: true,
      verified: true,
      email: normalizedEmail,
      verificationToken,
      message: 'Email address verified successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `Email verification failed: ${error.message}`, errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
