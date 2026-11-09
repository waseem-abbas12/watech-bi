import { NextRequest, NextResponse } from 'next/server';

export function verifyCronAuthorization(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  // Allow in local development if no secret set
  if (!cronSecret && process.env.NODE_ENV !== 'production') {
    return true;
  }

  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}`;
}