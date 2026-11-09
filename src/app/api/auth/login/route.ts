import { NextRequest, NextResponse } from 'next/server';
import { signToken, setAuthCookie, verifyPassword, hashPassword } from '@/lib/server/auth';
import { prisma, isDatabaseConfigured } from '@/lib/server/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, tenantId } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // 1. If PostgreSQL database is configured, verify against database
    if (isDatabaseConfigured) {
      const user = await prisma.tenantUser.findFirst({
        where: {
          email: normalizedEmail,
          ...(tenantId ? { tenantId } : {}),
        },
        include: { tenant: true },
      });

      if (!user || !user.passwordHash) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const token = signToken({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        tenantId: user.tenantId,
        role: user.role as any,
        isPlatformSuperAdmin: user.isPlatformSuperAdmin,
      });

      const response = NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          tenantId: user.tenantId,
          isPlatformSuperAdmin: user.isPlatformSuperAdmin,
        },
      });

      setAuthCookie(response, token);
      return response;
    }

    // 2. Fallback for Local / Preview Environment before PostgreSQL is provisioned
    // Allows owner login with requested email
    const isOwner = normalizedEmail === 'waseem000094@gmail.com' || normalizedEmail === 'ceo@watech.agency';
    const resolvedTenantId = tenantId || 'tenant-watech-hq';

    const token = signToken({
      userId: isOwner ? 'user-owner-1' : `user-${Date.now()}`,
      email: normalizedEmail,
      fullName: isOwner ? 'Waseem Abbas (Owner)' : 'Team Member',
      tenantId: resolvedTenantId,
      role: isOwner ? 'owner' : 'employee',
      isPlatformSuperAdmin: isOwner,
    });

    const response = NextResponse.json({
      user: {
        id: isOwner ? 'user-owner-1' : `user-${Date.now()}`,
        email: normalizedEmail,
        fullName: isOwner ? 'Waseem Abbas (Owner)' : 'Team Member',
        role: isOwner ? 'owner' : 'employee',
        tenantId: resolvedTenantId,
        isPlatformSuperAdmin: isOwner,
      },
    });

    setAuthCookie(response, token);
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: 'Authentication failed', details: error.message }, { status: 500 });
  }
}