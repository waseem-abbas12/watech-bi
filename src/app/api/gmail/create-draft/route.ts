import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function toBase64Url(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, projectId, recipient, subject, body: emailBody, leadId } = body;

    if (!recipient || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Recipient email, subject, and body are required.' },
        { status: 400 }
      );
    }

    // RFC syntax validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(recipient.trim())) {
      return NextResponse.json(
        { error: `Invalid recipient email format: ${recipient}` },
        { status: 400 }
      );
    }

    const sessionCookie = req.cookies.get('watech_gmail_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        {
          success: false,
          requiresAuth: true,
          error: 'Gmail is not connected. Please authenticate in Settings or use Manual Copy mode.',
        },
        { status: 401 }
      );
    }

    let session: {
      accessToken: string;
      refreshToken?: string;
      expiresAt: number;
      userEmail: string;
    };

    try {
      session = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8'));
    } catch {
      return NextResponse.json(
        { success: false, requiresAuth: true, error: 'Malformed session. Please reconnect Gmail.' },
        { status: 401 }
      );
    }

    let accessToken = session.accessToken;

    // Refresh if needed
    if (Date.now() >= session.expiresAt - 60000 && session.refreshToken) {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (clientId && clientSecret) {
        try {
          const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: session.refreshToken,
              grant_type: 'refresh_token',
            }),
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            accessToken = refreshData.access_token;
            session.accessToken = accessToken;
            session.expiresAt = Date.now() + (refreshData.expires_in || 3600) * 1000;
          }
        } catch {}
      }
    }

    // Construct standard RFC 2822 email payload
    const cleanRecipient = recipient.trim();
    const cleanSubject = subject.trim().replace(/[\r\n]+/g, ' ');
    const rawRfc2822 = [
      `To: ${cleanRecipient}`,
      `Subject: =?UTF-8?B?${Buffer.from(cleanSubject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      emailBody,
    ].join('\r\n');

    const base64UrlRaw = toBase64Url(rawRfc2822);

    // Call Gmail API: Create Draft
    const draftRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          raw: base64UrlRaw,
        },
      }),
    });

    if (!draftRes.ok) {
      const errData = await draftRes.json().catch(() => ({}));
      const errMsg = errData.error?.message || `Gmail API responded with HTTP ${draftRes.status}`;
      return NextResponse.json(
        {
          success: false,
          error: `Gmail Draft creation failed: ${errMsg}`,
          apiDetails: errData,
        },
        { status: draftRes.status }
      );
    }

    const draftData = await draftRes.json();

    const responsePayload = {
      success: true,
      mode: 'gmail_api',
      draftId: draftData.id,
      messageId: draftData.message?.id,
      recipient: cleanRecipient,
      subject: cleanSubject,
      webLink: 'https://mail.google.com/mail/u/0/#drafts',
      createdAt: new Date().toISOString(),
    };

    const res = NextResponse.json(responsePayload);

    // Update session cookie if refreshed
    const updatedSessionString = Buffer.from(JSON.stringify(session)).toString('base64');
    res.cookies.set('watech_gmail_session', updatedSessionString, {
      httpOnly: true,
      secure: req.url.startsWith('https://'),
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: `Internal draft error: ${err.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
