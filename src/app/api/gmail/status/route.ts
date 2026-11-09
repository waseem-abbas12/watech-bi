import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const isConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const sessionCookie = req.cookies.get('watech_gmail_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({
        configured: isConfigured,
        isConnected: false,
        userEmail: null,
        draftOnlyMode: true,
        lastChecked: new Date().toISOString(),
        message: isConfigured
          ? 'Gmail integration is configured and ready for connection.'
          : 'Gmail integration is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local to enable real OAuth connection.',
      });
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
      const res = NextResponse.json({
        configured: isConfigured,
        isConnected: false,
        userEmail: null,
        draftOnlyMode: true,
        lastChecked: new Date().toISOString(),
      });
      res.cookies.delete('watech_gmail_session');
      return res;
    }

    // Check if token expired and refresh if needed
    let accessToken = session.accessToken;
    let expiresAt = session.expiresAt;
    let tokenRefreshed = false;

    if (Date.now() >= expiresAt - 60000 && session.refreshToken) {
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
            expiresAt = Date.now() + (refreshData.expires_in || 3600) * 1000;
            session.accessToken = accessToken;
            session.expiresAt = expiresAt;
            tokenRefreshed = true;
          }
        } catch {}
      }
    }

    // Test token validity via Gmail profile
    let profileRes: Response;
    try {
      profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err: any) {
      return NextResponse.json({
        configured: isConfigured,
        isConnected: false,
        error: `Could not reach Google API: ${err.message}`,
        lastChecked: new Date().toISOString(),
      });
    }

    if (!profileRes.ok) {
      const res = NextResponse.json({
        configured: isConfigured,
        isConnected: false,
        userEmail: null,
        draftOnlyMode: true,
        warning: 'Authorization expired or revoked by Google. Reconnect your account.',
        lastChecked: new Date().toISOString(),
      });
      res.cookies.delete('watech_gmail_session');
      return res;
    }

    const profileData = await profileRes.json();
    const activeEmail = profileData.emailAddress || session.userEmail;

    const res = NextResponse.json({
      configured: isConfigured,
      isConnected: true,
      userEmail: activeEmail,
      draftOnlyMode: true,
      expiresAt,
      lastChecked: new Date().toISOString(),
    });

    if (tokenRefreshed) {
      const newSessionString = Buffer.from(JSON.stringify(session)).toString('base64');
      res.cookies.set('watech_gmail_session', newSessionString, {
        httpOnly: true,
        secure: req.url.startsWith('https://'),
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return res;
  } catch (err: any) {
    return NextResponse.json({
      configured: false,
      isConnected: false,
      error: err.message || 'Status check failed',
      lastChecked: new Date().toISOString(),
    });
  }
}
