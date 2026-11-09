import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/server/auth';
import { BackupService } from '@/lib/server/backupService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'manage_platform');
  if ('status' in auth) return auth;

  try {
    const backups = BackupService.listBackups();
    return NextResponse.json({ success: true, backups });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'manage_platform');
  if ('status' in auth) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const { action = 'create', backupId } = body;

    if (action === 'create') {
      const backup = BackupService.createBackup();
      return NextResponse.json({ success: true, backup });
    }

    if (action === 'verify_restore' && backupId) {
      const result = BackupService.verifyRestore(backupId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Invalid action or backupId' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
