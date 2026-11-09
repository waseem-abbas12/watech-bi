import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.userId,
        email: user.email,
        fullName: user.fullName,
        tenantId: user.tenantId,
        role: user.role,
        isPlatformSuperAdmin: user.isPlatformSuperAdmin,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}