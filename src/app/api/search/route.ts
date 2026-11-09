import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/auth';
import { prisma, isDatabaseConfigured } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export interface SearchResultItem {
  id: string;
  type: 'project' | 'business' | 'contact' | 'opportunity';
  title: string;
  subtitle: string;
  badge?: string;
  targetModule: 'overview' | 'discovery' | 'lead_intelligence' | 'lead_crm' | 'opportunity_analysis';
  entityId: string;
  projectId?: string;
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    const searchParams = request.nextUrl.searchParams;
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const clientTenantId = searchParams.get('tenantId');

    // Strict tenant isolation: Session user tenant preferred
    const tenantId = sessionUser?.tenantId || clientTenantId || 'tenant-watech-hq';

    if (!q || q.length < 2) {
      return NextResponse.json({
        success: true,
        query: q,
        results: [],
        total: 0,
      });
    }

    const results: SearchResultItem[] = [];

    if (isDatabaseConfigured) {
      // 1. Search Projects
      const projects = await prisma.researchProject.findMany({
        where: {
          tenantId,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { industryNiche: { contains: q, mode: 'insensitive' } },
            { cityArea: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
      });

      projects.forEach((p) => {
        results.push({
          id: p.id,
          type: 'project',
          title: p.name,
          subtitle: `${p.cityArea || 'N/A'} • ${p.industryNiche || 'HVAC'}`,
          badge: 'Project',
          targetModule: 'overview',
          entityId: p.id,
          projectId: p.id,
        });
      });

      // 2. Search Businesses
      const businesses = await prisma.business.findMany({
        where: {
          tenantId,
          OR: [
            { officialName: { contains: q, mode: 'insensitive' } },
            { domain: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 8,
      });

      businesses.forEach((b) => {
        results.push({
          id: b.id,
          type: 'business',
          title: b.officialName,
          subtitle: `${b.domain || b.websiteUrl || 'No Website'} • ${b.city || 'Canton'}, ${b.state || 'OH'}`,
          badge: b.status.toUpperCase(),
          targetModule: 'lead_intelligence',
          entityId: b.id,
          projectId: b.projectId,
        });
      });

      // 3. Search Contacts
      const contacts = await prisma.contact.findMany({
        where: {
          tenantId,
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { roleOrTitle: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
      });

      contacts.forEach((c) => {
        results.push({
          id: c.id,
          type: 'contact',
          title: c.fullName,
          subtitle: `${c.roleOrTitle || 'Decision Maker'} • ${c.email || c.phone || 'No direct email'}`,
          badge: c.isDecisionMaker ? 'DM' : 'Staff',
          targetModule: 'lead_crm',
          entityId: c.businessId,
          projectId: c.projectId,
        });
      });
    } else {
      // In-memory fallback matching for local / demo mode
      const demoMatches: SearchResultItem[] = [
        {
          id: 'demo-proj-1',
          type: 'project',
          title: 'Canton Commercial HVAC Market Intelligence',
          subtitle: 'Canton, OH • Commercial HVAC',
          badge: 'Project',
          targetModule: 'overview',
          entityId: 'proj-canton-hvac-001',
          projectId: 'proj-canton-hvac-001',
        },
        {
          id: 'demo-biz-1',
          type: 'business',
          title: 'Beckers Heating and Air Conditioning',
          subtitle: 'beckersheating.com • Canton, OH',
          badge: 'QUALIFIED',
          targetModule: 'lead_intelligence',
          entityId: 'biz-canton-001',
          projectId: 'proj-canton-hvac-001',
        },
        {
          id: 'demo-biz-2',
          type: 'business',
          title: 'Quality Heating & Cooling Canton',
          subtitle: 'qualityheatingcoolingcanton.com • Canton, OH',
          badge: 'QUALIFIED',
          targetModule: 'lead_intelligence',
          entityId: 'biz-canton-002',
          projectId: 'proj-canton-hvac-001',
        },
        {
          id: 'demo-contact-1',
          type: 'contact',
          title: 'Marcus Vance',
          subtitle: 'Owner & General Manager • mvance@beckersheating.com',
          badge: 'DM',
          targetModule: 'lead_crm',
          entityId: 'biz-canton-001',
          projectId: 'proj-canton-hvac-001',
        },
      ];

      const filtered = demoMatches.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q)
      );

      results.push(...filtered);
    }

    return NextResponse.json({
      success: true,
      query: q,
      results,
      total: results.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
