import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, templateType = 'premium_business', currency = 'USD' } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      businessId,
      templateType,
      currency,
      message: 'Proposal generated successfully',
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Proposal generation error:', err);
    return NextResponse.json({ error: err.message || 'Proposal generation failed' }, { status: 500 });
  }
}
