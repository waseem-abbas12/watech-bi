import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { NotificationService } from '@/lib/server/notificationService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('status' in auth) return auth;

  try {
    const { notifications, unreadCount } = NotificationService.listNotifications(auth.user.tenantId, 50);
    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('status' in auth) return auth;

  try {
    const body = await request.json();
    const { action, notificationId } = body;

    if (action === 'mark_all_read') {
      const count = NotificationService.markAllAsRead(auth.user.tenantId);
      return NextResponse.json({ success: true, markedReadCount: count });
    }

    if (notificationId) {
      const marked = NotificationService.markAsRead(auth.user.tenantId, notificationId);
      if (!marked) {
        return NextResponse.json({ success: false, error: 'Notification not found or access denied.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, markedRead: notificationId });
    }

    return NextResponse.json({ success: false, error: 'Invalid action or notificationId.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
