import { NextRequest, NextResponse } from 'next/server';
import { generateDeterministicAnalystResponse, BusinessResearchContext } from '@/lib/engines/aiAnalystEngine';
import type { AIMessage, AICitation } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, context, provider = 'auto', conversationId } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    let selectedProvider = provider;
    if (selectedProvider === 'auto') {
      if (geminiKey) selectedProvider = 'gemini';
      else if (openaiKey) selectedProvider = 'openai';
      else if (anthropicKey) selectedProvider = 'anthropic';
      else selectedProvider = 'deterministic';
    }

    // 1. External Gemini Call
    if (selectedProvider === 'gemini' && geminiKey) {
      try {
        const systemInstruction = `You are Watech-BI Strategic Research Assistant & Senior HVAC Business Analyst.
Ground every answer strictly in the provided verified business context.
Do not hallucinate facts or contact details. If a data point is missing from the context, explicitly say it is unverified or unavailable.
Cite the data point using brackets [Source: X].

Context provided:
${JSON.stringify(context || {}, null, 2)}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemInstruction}\n\nUser Question: ${query}` }],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1500,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            const deterministicFallback = generateDeterministicAnalystResponse(query, context);
            const message: AIMessage = {
              id: `msg-${Date.now()}`,
              conversationId: conversationId || `conv-${Date.now()}`,
              role: 'assistant',
              content,
              citations: deterministicFallback.citations,
              dataGaps: deterministicFallback.dataGaps,
              timestamp: new Date().toISOString(),
              modelUsed: 'gemini-1.5-flash',
            };
            return NextResponse.json({ success: true, message });
          }
        }
      } catch (e) {
        console.warn('Gemini call failed, falling back to deterministic analyst engine:', e);
      }
    }

    // 2. External OpenAI Call
    if (selectedProvider === 'openai' && openaiKey) {
      try {
        const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are Watech-BI Strategic Research Analyst. Ground all answers strictly in this verified context:\n${JSON.stringify(context || {}, null, 2)}.\nStrict anti-hallucination: If an attribute is not in context, state it is unverified.`,
              },
              { role: 'user', content: query },
            ],
            temperature: 0.2,
          }),
        });

        if (openAiRes.ok) {
          const aiData = await openAiRes.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            const deterministicFallback = generateDeterministicAnalystResponse(query, context);
            const message: AIMessage = {
              id: `msg-${Date.now()}`,
              conversationId: conversationId || `conv-${Date.now()}`,
              role: 'assistant',
              content,
              citations: deterministicFallback.citations,
              dataGaps: deterministicFallback.dataGaps,
              timestamp: new Date().toISOString(),
              modelUsed: 'gpt-4o-mini',
            };
            return NextResponse.json({ success: true, message });
          }
        }
      } catch (e) {
        console.warn('OpenAI call failed, falling back to deterministic analyst engine:', e);
      }
    }

    // 3. Fallback / Deterministic Grounded Engine
    const { content, citations, dataGaps } = generateDeterministicAnalystResponse(query, context);
    const message: AIMessage = {
      id: `msg-${Date.now()}`,
      conversationId: conversationId || `conv-${Date.now()}`,
      role: 'assistant',
      content,
      citations,
      dataGaps,
      timestamp: new Date().toISOString(),
      modelUsed: 'watech-analyst-deterministic-v1',
    };

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error('AI chat route error:', error);
    return NextResponse.json({ error: error.message || 'Internal AI analyst error' }, { status: 500 });
  }
}
