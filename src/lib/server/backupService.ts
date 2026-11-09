import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface BackupMetadata {
  id: string;
  timestamp: string;
  fileName: string;
  fileSizeBytes: number;
  sha256Checksum: string;
  collections: Record<string, number>;
  status: 'created' | 'verified_restored' | 'corrupt';
  restoreDurationMs?: number;
}

const BACKUP_DIR = path.join(process.cwd(), '.watech', 'backups');

function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export class BackupService {
  /**
   * Generates a timestamped JSON backup snapshot of all system ledgers.
   */
  static createBackup(): BackupMetadata {
    ensureBackupDir();
    const now = new Date();
    const timestampStr = now.toISOString().replace(/[:.]/g, '-');
    const backupId = `backup_${timestampStr}`;
    const fileName = `${backupId}.json`;
    const targetFile = path.join(BACKUP_DIR, fileName);

    // Collect data files from .watech
    const dataSources = [
      { name: 'integrations', path: path.join(process.cwd(), '.watech', 'integrations', 'connections.json') },
      { name: 'jobs', path: path.join(process.cwd(), '.watech', 'jobs', 'jobs.json') },
      { name: 'notifications', path: path.join(process.cwd(), '.watech', 'notifications', 'notifications.json') },
      { name: 'webhooks', path: path.join(process.cwd(), '.watech', 'webhooks', 'endpoints.json') },
      { name: 'email_suppression', path: path.join(process.cwd(), '.watech', 'email', 'suppression_list.json') },
    ];

    const snapshotData: Record<string, any[]> = {};
    const counts: Record<string, number> = {};

    for (const src of dataSources) {
      if (fs.existsSync(src.path)) {
        try {
          const content = JSON.parse(fs.readFileSync(src.path, 'utf8'));
          snapshotData[src.name] = content;
          counts[src.name] = Array.isArray(content) ? content.length : 1;
        } catch {
          snapshotData[src.name] = [];
          counts[src.name] = 0;
        }
      } else {
        snapshotData[src.name] = [];
        counts[src.name] = 0;
      }
    }

    const payload = JSON.stringify({
      version: '1.0.0',
      createdAt: now.toISOString(),
      metadata: { backupId },
      data: snapshotData,
    }, null, 2);

    fs.writeFileSync(targetFile, payload, 'utf8');

    const fileSizeBytes = fs.statSync(targetFile).size;
    const sha256Checksum = crypto.createHash('sha256').update(payload).digest('hex');

    const meta: BackupMetadata = {
      id: backupId,
      timestamp: now.toISOString(),
      fileName,
      fileSizeBytes,
      sha256Checksum,
      collections: counts,
      status: 'created',
    };

    const metaFile = path.join(BACKUP_DIR, `${backupId}.meta.json`);
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf8');

    return meta;
  }

  /**
   * Performs an isolated restore verification test against a temporary destination
   * to prove that the backup is uncorrupted and recoverable.
   */
  static verifyRestore(backupId: string): {
    success: boolean;
    durationMs: number;
    checksumMatches: boolean;
    recordsRestored: number;
    error?: string;
  } {
    ensureBackupDir();
    const backupFile = path.join(BACKUP_DIR, `${backupId}.json`);
    const metaFile = path.join(BACKUP_DIR, `${backupId}.meta.json`);

    if (!fs.existsSync(backupFile) || !fs.existsSync(metaFile)) {
      return { success: false, durationMs: 0, checksumMatches: false, recordsRestored: 0, error: 'Backup file not found' };
    }

    const startTime = Date.now();
    try {
      const meta: BackupMetadata = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
      const raw = fs.readFileSync(backupFile, 'utf8');

      // Verify Checksum
      const computedChecksum = crypto.createHash('sha256').update(raw).digest('hex');
      const checksumMatches = computedChecksum === meta.sha256Checksum;

      if (!checksumMatches) {
        return { success: false, durationMs: Date.now() - startTime, checksumMatches: false, recordsRestored: 0, error: 'Checksum mismatch: backup is corrupted' };
      }

      // Perform test restore to sandbox directory
      const testRestoreDir = path.join(BACKUP_DIR, 'test_restore_sandbox');
      if (!fs.existsSync(testRestoreDir)) {
        fs.mkdirSync(testRestoreDir, { recursive: true });
      }

      const parsed = JSON.parse(raw);
      let totalRecords = 0;

      for (const [colName, records] of Object.entries(parsed.data || {})) {
        const dest = path.join(testRestoreDir, `${colName}.json`);
        fs.writeFileSync(dest, JSON.stringify(records, null, 2), 'utf8');
        if (Array.isArray(records)) totalRecords += records.length;
      }

      const durationMs = Date.now() - startTime;

      // Update metadata
      meta.status = 'verified_restored';
      meta.restoreDurationMs = durationMs;
      fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf8');

      // Clean up sandbox
      fs.rmSync(testRestoreDir, { recursive: true, force: true });

      return {
        success: true,
        durationMs,
        checksumMatches: true,
        recordsRestored: totalRecords,
      };
    } catch (err: any) {
      return {
        success: false,
        durationMs: Date.now() - startTime,
        checksumMatches: false,
        recordsRestored: 0,
        error: err.message,
      };
    }
  }

  static listBackups(): BackupMetadata[] {
    ensureBackupDir();
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.meta.json'));
    return files.map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), 'utf8'));
      } catch {
        return null;
      }
    }).filter(Boolean) as BackupMetadata[];
  }
}
