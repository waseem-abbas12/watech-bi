import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${proto}://${host}/api/gmail/callback`;
    const homeUrl = `${proto}://${host}/`;

    if (error) {
      return NextResponse.redirect(`${homeUrl}?gmail_error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return NextResponse.redirect(`${homeUrl}?gmail_error=no_code_provided`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${homeUrl}?gmail_error=credentials_missing`);
    }

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.redirect(
        `${homeUrl}?gmail_error=${encodeURIComponent(tokenData.error_description || tokenData.error || 'token_exchange_failed')}`
      );
    }

    // Fetch user profile email
    let userEmail = 'authenticated-user@gmail.com';
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.email) userEmail = userData.email;
      }
    } catch {}

    const sessionPayload = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
      userEmail,
      scope: tokenData.scope,
    };

    const sessionString = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

    const res = NextResponse.redirect(`${homeUrl}?gmail_status=connected`);
    res.cookies.set('watech_gmail_session', sessionString, {
      httpOnly: true,
      secure: proto === 'https',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch (err: any) {
    const host = req.headers.get('host') || 'localhost:3000';
    return NextResponse.redirect(`http://${host}/?gmail_error=${encodeURIComponent(err.message || 'callback_error')}`);
  }
}
