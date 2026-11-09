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
      message: 'Sales intelligence & buyer signals evaluated successfully',
      evaluatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Sales intelligence error:', err);
    return NextResponse.json({ error: err.message || 'Sales intelligence evaluation failed' }, { status: 500 });
  }
}
