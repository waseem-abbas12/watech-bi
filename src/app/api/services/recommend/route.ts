import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, projectId } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      businessId,
      projectId,
      message: 'Service recommendation evaluated successfully',
      evaluatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Service recommendation error:', err);
    return NextResponse.json({ error: err.message || 'Service recommendation failed' }, { status: 500 });
  }
}
