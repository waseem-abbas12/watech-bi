import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/lib/server/db';

export async function GET(request: NextRequest) {
  const isPostgresReady = isDatabaseConfigured;
  const isEmailReady = Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
  const isStripeReady = Boolean(process.env.STRIPE_SECRET_KEY);
  const isCronConfigured = Boolean(process.env.CRON_SECRET);

  const status = isPostgresReady ? 'healthy' : 'operational_local_mode';

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    version: '1.0.0-production-rc',
    nodeEnv: process.env.NODE_ENV || 'development',
    services: {
      core: 'operational',
      database: isPostgresReady ? 'connected' : 'local_dexie_active',
      email: isEmailReady ? 'connected' : 'mock_simulator_active',
      billing: isStripeReady ? 'connected' : 'unconfigured_manual_mode',
      scheduler: isCronConfigured ? 'secured' : 'open_dev_mode',
    },
    checks: {
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      uptimeSeconds: Math.round(process.uptime()),
    },
  });
}