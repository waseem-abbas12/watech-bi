import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, signToken, setAuthCookie } from '@/lib/server/auth';
import { prisma, isDatabaseConfigured } from '@/lib/server/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, organizationName, slug } = body;

    if (!email || !password || !organizationName) {
      return NextResponse.json({ error: 'Email, password, and organization name are required' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedSlug = (slug || organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-')).replace(/-+/g, '-').slice(0, 40);
    const passwordHash = await hashPassword(password);

    if (isDatabaseConfigured) {
      // Check existing tenant
      const existing = await prisma.tenant.findUnique({ where: { slug: normalizedSlug } });
      if (existing) {
        return NextResponse.json({ error: 'An organization with this slug already exists' }, { status: 409 });
      }

      // Create Tenant and Owner User
      const tenant = await prisma.tenant.create({
        data: {
          slug: normalizedSlug,
          name: organizationName,
          planId: 'plan-starter',
          contactEmail: normalizedEmail,
          branding: {
            create: {
              companyName: organizationName,
              footerText: `Powered by ${organizationName}`,
              supportEmail: normalizedEmail,
            },
          },
          users: {
            create: {
              email: normalizedEmail,
              fullName: fullName || organizationName,
              passwordHash,
              role: 'owner',
            },
          },
        },
        include: { users: true },
      });

      const ownerUser = tenant.users[0];
      const token = signToken({
        userId: ownerUser.id,
        email: ownerUser.email,
        fullName: ownerUser.fullName,
        tenantId: tenant.id,
        role: 'owner',
        isPlatformSuperAdmin: false,
      });

      const response = NextResponse.json({
        user: {
          id: ownerUser.id,
          email: ownerUser.email,
          fullName: ownerUser.fullName,
          role: 'owner',
          tenantId: tenant.id,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
      });

      setAuthCookie(response, token);
      return response;
    }

    // Fallback response
    const mockTenantId = `tenant-${Date.now()}`;
    const token = signToken({
      userId: `user-${Date.now()}`,
      email: normalizedEmail,
      fullName: fullName || organizationName,
      tenantId: mockTenantId,
      role: 'owner',
      isPlatformSuperAdmin: false,
    });

    const response = NextResponse.json({
      user: {
        id: `user-${Date.now()}`,
        email: normalizedEmail,
        fullName: fullName || organizationName,
        role: 'owner',
        tenantId: mockTenantId,
      },
      tenant: {
        id: mockTenantId,
        name: organizationName,
        slug: normalizedSlug,
      },
    });

    setAuthCookie(response, token);
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: 'Registration failed', details: error.message }, { status: 500 });
  }
}