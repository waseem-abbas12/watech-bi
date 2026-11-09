import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('watech_gmail_session')?.value;

    if (sessionCookie) {
      try {
        const session = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8'));
        if (session.accessToken) {
          // Attempt revocation gracefully
          await fetch(`https://oauth2.googleapis.com/revoke?token=${session.accessToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }).catch(() => {});
        }
      } catch {}
    }

    const res = NextResponse.json({
      success: true,
      isConnected: false,
      message: 'Gmail disconnected. Credentials and session tokens cleared.',
    });

    res.cookies.delete('watech_gmail_session');
    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: `Disconnect failed: ${err.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
