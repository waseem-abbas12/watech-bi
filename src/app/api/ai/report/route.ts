import { NextRequest, NextResponse } from 'next/server';
import { generateStrategicReport, BusinessResearchContext } from '@/lib/engines/aiAnalystEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { context } = body;

    if (!context || !context.business) {
      return NextResponse.json({ error: 'Valid business context is required' }, { status: 400 });
    }

    const report = generateStrategicReport(context as BusinessResearchContext);

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error('AI report route error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate strategic report' }, { status: 500 });
  }
}
