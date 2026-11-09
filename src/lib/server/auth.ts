import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { TenantRole } from '@/types';
import { ROLE_PERMISSIONS, type TenantPermission } from '@/lib/engines/rbacEngine';

const JWT_SECRET = process.env.JWT_SECRET || 'watech-bi-dev-jwt-secret-replace-in-production-min-32-chars';
const TOKEN_COOKIE_NAME = 'watech_auth_token';

export interface TokenPayload {
  userId: string;
  email: string;
  fullName: string;
  tenantId: string;
  role: TenantRole;
  isPlatformSuperAdmin: boolean;
  iat?: number;
  exp?: number;
}

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hashed: string): Promise<boolean> {
  return await bcrypt.compare(plainText, hashed);
}

export function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, expiresIn: jwt.SignOptions['expiresIn'] = '7d'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(response: NextResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function getSessionUser(request?: NextRequest): Promise<TokenPayload | null> {
  let token: string | undefined;

  if (request) {
    token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
  } else {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    } catch {
      return null;
    }
  }

  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(request: NextRequest): Promise<{ user: TokenPayload } | NextResponse> {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
  }
  return { user };
}

export async function requirePermission(
  request: NextRequest,
  permission: TenantPermission
): Promise<{ user: TokenPayload } | NextResponse> {
  const authResult = await requireAuth(request);
  if ('status' in authResult) return authResult;

  const { user } = authResult;
  if (user.isPlatformSuperAdmin) return { user };

  const permissions = ROLE_PERMISSIONS[user.role] || [];
  if (!permissions.includes(permission)) {
    return NextResponse.json({ error: `Forbidden: Missing required permission '${permission}'`, errorCode: 'FORBIDDEN' }, { status: 403 });
  }

  return { user };
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: TenantRole[]
): Promise<{ user: TokenPayload } | NextResponse> {
  const authResult = await requireAuth(request);
  if ('status' in authResult) return authResult;

  const { user } = authResult;
  if (user.isPlatformSuperAdmin) return { user };

  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: `Forbidden: Role '${user.role}' is not authorized for this resource`, errorCode: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  return { user };
}

export async function requireTenantContext(
  request: NextRequest,
  targetTenantId?: string
): Promise<{ user: TokenPayload; tenantId: string } | NextResponse> {
  const authResult = await requireAuth(request);
  if ('status' in authResult) return authResult;

  const { user } = authResult;

  // Cross-tenant access prevention: Never allow a user to access another tenant's resources
  if (targetTenantId && targetTenantId.trim()) {
    const cleanTarget = targetTenantId.trim();
    if (!user.isPlatformSuperAdmin && cleanTarget !== user.tenantId) {
      return NextResponse.json(
        {
          error: 'Forbidden: Cross-tenant access attempt blocked. You do not have permission to access resources in this organization.',
          errorCode: 'CROSS_TENANT_ACCESS_DENIED',
        },
        { status: 403 }
      );
    }
  }

  return { user, tenantId: user.tenantId };
}