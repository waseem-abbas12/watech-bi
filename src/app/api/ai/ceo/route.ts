import { NextRequest, NextResponse } from 'next/server';
import { evaluateCeoQuery } from '@/lib/engines/ceoAiEngine';
import { AgencyExecutiveData } from '@/lib/engines/ceoAnalyticsEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, data } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query string is required' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    // 1. If Gemini Key is present, try LLM inference with strict grounding
    if (geminiKey && data) {
      try {
        const systemPrompt = `You are the AI Chief Executive Officer & Strategic Agency Partner for Watech-BI.
You are addressing the agency owner.
Strict grounding rule: Ground every answer strictly in the provided verified executive data.
Never invent financial figures, client names, or conversion rates.
If cost data or historical tracking is missing, explicitly disclose it.
Highlight key trade-offs and recommend actionable next steps.

Agency Verified Context:
${JSON.stringify({
  overview: data.overview || {},
  health: data.health || {},
  pipeline: data.pipeline || {},
  actionsCount: data.actions?.length || 0,
}, null, 2)}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemPrompt}\n\nOwner Question: ${query}` }],
                },
              ],
              generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
            }),
          }
        );

        if (geminiRes.ok) {
          const resJson = await geminiRes.json();
          const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const fallback = evaluateCeoQuery(query, data as AgencyExecutiveData);
            return NextResponse.json({
              success: true,
              response: {
                ...fallback,
                answer: text,
              },
            });
          }
        }
      } catch (err) {
        console.warn('Gemini CEO call failed, falling back to deterministic analytics engine:', err);
      }
    }

    // 2. Deterministic Grounded Fallback
    const response = evaluateCeoQuery(query, (data || {}) as AgencyExecutiveData);
    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error('Error processing CEO AI query:', error);
    return NextResponse.json(
      { error: 'Internal server error processing CEO request' },
      { status: 500 }
    );
  }
}
