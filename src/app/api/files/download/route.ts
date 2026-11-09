import { NextRequest, NextResponse } from 'next/server';
import { verifySignedDownloadUrl } from '@/lib/server/fileStorage';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const key = searchParams.get('key');
  const expStr = searchParams.get('exp');
  const sig = searchParams.get('sig');

  if (!tenantId || !key || !expStr || !sig) {
    return NextResponse.json({ error: 'Missing required signature parameters' }, { status: 400 });
  }

  const exp = parseInt(expStr, 10);
  const isValid = verifySignedDownloadUrl(tenantId, key, exp, sig);
  if (!isValid) {
    return NextResponse.json({ error: 'Signature is invalid or download link has expired' }, { status: 403 });
  }

  return NextResponse.json({
    status: 'authorized',
    tenantId,
    storageKey: key,
    message: 'Authorized download session. File stream ready.',
  });
}