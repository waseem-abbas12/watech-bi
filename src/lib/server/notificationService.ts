import fs from 'fs';
import path from 'path';

export type NotificationType =
  | 'job_completed'
  | 'job_failed'
  | 'automation_executed'
  | 'approval_needed'
  | 'lead_qualified'
  | 'system_alert'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

export interface AppNotification {
  id: string;
  tenantId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  readAt?: string;
}

const DATA_DIR = path.join(process.cwd(), '.watech', 'notifications');
const NOTIF_FILE = path.join(DATA_DIR, 'notifications.json');

function ensureNotifStorage(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(NOTIF_FILE)) {
    // Seed sample notification
    const sample = [
      {
        id: 'notif_welcome',
        tenantId: 'tenant-apex-canton',
        title: 'Automation & Integration Engine Active',
        message: 'Your workspace has connected background worker and notification feeds.',
        type: 'system_alert',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(NOTIF_FILE, JSON.stringify(sample, null, 2), 'utf8');
  }
}

function readNotifications(): AppNotification[] {
  ensureNotifStorage();
  try {
    const raw = fs.readFileSync(NOTIF_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeNotifications(notifs: AppNotification[]): void {
  ensureNotifStorage();
  const tmp = `${NOTIF_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(notifs, null, 2), 'utf8');
  fs.renameSync(tmp, NOTIF_FILE);
}

export class NotificationService {
  /**
   * List notifications strictly scoped to tenantId.
   */
  static listNotifications(tenantId: string, limit: number = 50): { notifications: AppNotification[]; unreadCount: number } {
    if (!tenantId) return { notifications: [], unreadCount: 0 };
    const all = readNotifications();
    const tenantScoped = all.filter((n) => n.tenantId === tenantId);
    const unreadCount = tenantScoped.filter((n) => !n.read).length;

    return {
      notifications: tenantScoped.slice(0, limit),
      unreadCount,
    };
  }

  /**
   * Create an in-app notification.
   */
  static createNotification(params: {
    tenantId: string;
    title: string;
    message: string;
    type?: NotificationType;
    actionUrl?: string;
    metadata?: Record<string, any>;
  }): AppNotification {
    const notifs = readNotifications();
    const newNotif: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: params.tenantId,
      title: params.title,
      message: params.message,
      type: params.type || 'info',
      read: false,
      actionUrl: params.actionUrl,
      metadata: params.metadata,
      createdAt: new Date().toISOString(),
    };

    notifs.unshift(newNotif);
    if (notifs.length > 500) notifs.pop();
    writeNotifications(notifs);

    return newNotif;
  }

  /**
   * Mark a notification as read (with tenant boundary check).
   */
  static markAsRead(tenantId: string, notificationId: string): boolean {
    const notifs = readNotifications();
    const notif = notifs.find((n) => n.id === notificationId && n.tenantId === tenantId);
    if (!notif) return false;

    notif.read = true;
    notif.readAt = new Date().toISOString();
    writeNotifications(notifs);
    return true;
  }

  /**
   * Mark all notifications as read for a tenant.
   */
  static markAllAsRead(tenantId: string): number {
    const notifs = readNotifications();
    let updated = 0;
    const now = new Date().toISOString();

    for (const n of notifs) {
      if (n.tenantId === tenantId && !n.read) {
        n.read = true;
        n.readAt = now;
        updated++;
      }
    }

    if (updated > 0) {
      writeNotifications(notifs);
    }
    return updated;
  }
}
