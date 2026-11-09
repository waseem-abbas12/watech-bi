import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      baseUrl,
      authType = 'none',
      apiKey,
      user,
      password,
      webhookPath,
    } = body;

    if (!baseUrl || typeof baseUrl !== 'string' || !baseUrl.startsWith('http')) {
      return NextResponse.json(
        { success: false, error: 'A valid n8n URL (http:// or https://) is required.' },
        { status: 400 }
      );
    }

    const testUrl = webhookPath
      ? `${baseUrl.replace(/\/+$/, '')}/${webhookPath.replace(/^\/+/, '')}`
      : `${baseUrl.replace(/\/+$/, '')}/healthz`;

    const headers: Record<string, string> = {
      'User-Agent': 'Watech-BI-Automation-n8n/1.0',
      'Content-Type': 'application/json',
    };

    if (authType === 'bearer' && apiKey) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    } else if (authType === 'apiKey' && apiKey) {
      headers['X-N8N-API-KEY'] = apiKey.trim();
    } else if (authType === 'basic' && user) {
      const creds = Buffer.from(`${user}:${password || ''}`).toString('base64');
      headers['Authorization'] = `Basic ${creds}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const startTime = Date.now();

    try {
      // If probing a webhook, send POST with test payload; if probing base healthz, try GET first then POST
      const method = webhookPath ? 'POST' : 'GET';
      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (method === 'POST') {
        fetchOptions.body = JSON.stringify({
          source: 'Watech-BI',
          testPing: true,
          timestamp: new Date().toISOString(),
        });
      }

      let response = await fetch(testUrl, fetchOptions);

      // If healthz GET 404/405, fallback to root GET
      if (!response.ok && !webhookPath && (response.status === 404 || response.status === 405)) {
        response = await fetch(baseUrl, { method: 'GET', headers, signal: controller.signal });
      }

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;
      const responseSnippet = await response.text().then(t => t.slice(0, 200)).catch(() => '');

      return NextResponse.json({
        success: response.ok || response.status === 401 || response.status === 403, // 401/403 proves server is live but requires credentials
        httpStatus: response.status,
        durationMs,
        responseSnippet,
        message: response.ok
          ? `Successfully connected to n8n instance (HTTP ${response.status}) in ${durationMs}ms.`
          : response.status === 401 || response.status === 403
          ? `Instance reached in ${durationMs}ms, but returned HTTP ${response.status} (Authentication required or API key invalid).`
          : `n8n instance reached with status ${response.status}: ${response.statusText}`,
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
          ? 'Connection to n8n timed out after 6000ms.'
          : `Could not reach n8n host: ${fetchErr.message || 'Network error'}`,
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: `Invalid request payload: ${err.message}` },
      { status: 500 }
    );
  }
}
