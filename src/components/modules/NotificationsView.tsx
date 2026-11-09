'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Clock,
  CheckCheck,
  RefreshCw,
  Sliders,
  ShieldAlert,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  tenantId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export function NotificationsView() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-amber-500" />
            Notification Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            System alerts, job completion digests, lead scoring milestones, and automation approvals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface-100 hover:bg-surface-200 text-slate-300 text-xs font-medium flex items-center gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
              Mark All Read ({unreadCount})
            </button>
          )}

          <button
            onClick={fetchNotifications}
            className="p-1.5 rounded-lg border border-border bg-surface-100 hover:bg-surface-200 text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            filter === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-surface-100 border border-border text-slate-400 hover:text-white'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            filter === 'unread'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-surface-100 border border-border text-slate-400 hover:text-white'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-50 p-12 text-center text-slate-400">
            <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No notifications in this view.</p>
            <p className="text-xs text-slate-500 mt-1">Operational updates and workflow events will appear here.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                item.read
                  ? 'border-border/60 bg-surface-100/60 opacity-75'
                  : 'border-blue-500/30 bg-blue-500/5 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {item.type === 'system_alert' || item.type === 'warning' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  ) : item.type === 'error' || item.type === 'job_failed' ? (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  ) : item.type === 'job_completed' || item.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Info className="w-5 h-5 text-blue-400" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    {!item.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.message}</p>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {!item.read && (
                <button
                  onClick={() => handleMarkAsRead(item.id)}
                  className="px-2.5 py-1 rounded bg-surface-200 hover:bg-surface-300 text-xs font-medium text-slate-300 whitespace-nowrap transition-all"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
