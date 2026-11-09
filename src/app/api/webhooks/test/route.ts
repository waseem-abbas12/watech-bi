import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, secret = 'watech_test_secret', payload = { ping: true, message: 'Watech-BI Webhook Connectivity Test' }, eventType = 'manual.triggered' } = body;

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return NextResponse.json(
        { success: false, error: 'A valid HTTP or HTTPS destination URL is required.' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const payloadString = JSON.stringify({
      ...payload,
      _watech_metadata: {
        eventType,
        timestamp,
        testRun: true,
      },
    });

    // Generate HMAC-SHA256 signature
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Watech-Signature': signature,
          'X-Watech-Timestamp': timestamp,
          'X-Watech-Event': eventType,
          'User-Agent': 'Watech-BI-Automation/1.0',
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;
      const responseText = await response.text().catch(() => '');

      return NextResponse.json({
        success: response.ok,
        httpStatus: response.status,
        durationMs,
        responseSnippet: responseText.slice(0, 300),
        signature: `sha256=${signature.slice(0, 16)}...`,
        message: response.ok
          ? `Webhook received successfully (HTTP ${response.status}) in ${durationMs}ms.`
          : `Webhook responded with HTTP ${response.status}: ${response.statusText}`,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;
      const isTimeout = fetchErr.name === 'AbortError';

      return NextResponse.json({
        success: false,
        httpStatus: isTimeout ? 504 : 0,
        durationMs,
        error: isTimeout
          ? 'Destination URL timed out after 6000ms.'
          : `Connection failed: ${fetchErr.message || 'Unknown network error'}`,
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: `Invalid request payload: ${err.message}` },
      { status: 500 }
    );
  }
}
