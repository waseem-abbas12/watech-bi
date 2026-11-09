import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_WATECH_SERVICES, DEFAULT_WATECH_PACKAGES } from '@/lib/engines/serviceCatalogData';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    
    let services = [...DEFAULT_WATECH_SERVICES];
    if (category) {
      services = services.filter(s => s.category === category);
    }

    return NextResponse.json({
      success: true,
      services,
      packages: DEFAULT_WATECH_PACKAGES,
      totalServices: services.length,
      totalPackages: DEFAULT_WATECH_PACKAGES.length,
    });
  } catch (err: any) {
    console.error('Service catalog fetch error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch catalog' }, { status: 500 });
  }
}
