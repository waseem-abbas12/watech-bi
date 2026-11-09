export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'security';
  message: string;
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

const REDACT_KEYS = ['password', 'passwordHash', 'token', 'authorization', 'secret', 'creditCard', 'apiKey'];

function sanitizeMetadata(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeMetadata);

  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (REDACT_KEYS.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
      clean[key] = '[REDACTED]';
    } else if (typeof val === 'object') {
      clean[key] = sanitizeMetadata(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export function logEvent(
  level: LogEntry['level'],
  message: string,
  context: { correlationId?: string; tenantId?: string; userId?: string; metadata?: Record<string, any> } = {}
): void {
  const entry: LogEntry = {
    level,
    message,
    correlationId: context.correlationId || `req-${Date.now()}`,
    tenantId: context.tenantId,
    userId: context.userId,
    metadata: context.metadata ? sanitizeMetadata(context.metadata) : undefined,
    timestamp: new Date().toISOString(),
  };

  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'security') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}