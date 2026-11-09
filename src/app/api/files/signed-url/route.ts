import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { generateSignedDownloadUrl, validateUploadMetadata } from '@/lib/server/fileStorage';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('status' in auth) return auth;

  try {
    const body = await request.json();
    const { fileName, mimeType, sizeBytes } = body;

    const validation = validateUploadMetadata(fileName, mimeType, sizeBytes);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const storageKey = `tenants/${auth.user.tenantId}/files/${Date.now()}-${fileName}`;
    const signedData = generateSignedDownloadUrl(auth.user.tenantId, storageKey, 900); // 15 min expiration

    return NextResponse.json({
      storageKey,
      ...signedData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}