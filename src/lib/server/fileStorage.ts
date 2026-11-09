import crypto from 'crypto';

export interface FileMetadata {
  id: string;
  tenantId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  visibility: 'private' | 'tenant' | 'public';
  createdAt: string;
}

export interface SignedUrlResponse {
  downloadUrl: string;
  expiresAt: string;
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/csv',
  'application/json',
];

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export function validateUploadMetadata(fileName: string, mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
  // Path traversal check
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return { valid: false, error: 'Invalid file name. Path traversal characters not permitted.' };
  }

  // File size check
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File size exceeds 25MB limit (provided: ${(sizeBytes / (1024 * 1024)).toFixed(2)}MB).` };
  }

  // MIME type check
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: `Unsupported MIME type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` };
  }

  return { valid: true };
}

/**
 * Generates an HMAC-signed time-expiring download URL for secure tenant files.
 */
export function generateSignedDownloadUrl(
  tenantId: string,
  storageKey: string,
  expiresInSeconds = 900 // 15 minutes
): SignedUrlResponse {
  const secret = process.env.STORAGE_SIGNING_SECRET || process.env.JWT_SECRET || 'watech-file-secret-min-32-chars';
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  
  const token = crypto
    .createHmac('sha256', secret)
    .update(`${tenantId}:${storageKey}:${expiresAt}`)
    .digest('hex');

  const downloadUrl = `/api/files/download?tenantId=${encodeURIComponent(tenantId)}&key=${encodeURIComponent(storageKey)}&exp=${expiresAt}&sig=${token}`;

  return {
    downloadUrl,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}

export function verifySignedDownloadUrl(
  tenantId: string,
  storageKey: string,
  expiresAtTimestamp: number,
  signature: string
): boolean {
  if (Math.floor(Date.now() / 1000) > expiresAtTimestamp) {
    return false; // Expired
  }

  const secret = process.env.STORAGE_SIGNING_SECRET || process.env.JWT_SECRET || 'watech-file-secret-min-32-chars';
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${tenantId}:${storageKey}:${expiresAtTimestamp}`)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}