import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { isSafeTargetUrl, isSafeTargetUrlAsync } from './ssrfGuard';

export interface WebhookEndpointConfig {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  secret: string; // HMAC secret
  subscribedEvents: string[];
  isActive: boolean;
  consecutiveFailures: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

export interface OutboundWebhookDelivery {
  id: string;
  tenantId: string;
  endpointId: string;
  endpointName: string;
  url: string;
  eventType: string;
  payload: Record<string, any>;
  httpStatus?: number;
  durationMs: number;
  status: 'success' | 'failed' | 'blocked_ssrf';
  error?: string;
  attemptNumber: number;
  signature: string;
  timestamp: string;
}

// Persistent Storage
const DATA_DIR = path.join(process.cwd(), '.watech', 'webhooks');
const ENDPOINTS_FILE = path.join(DATA_DIR, 'endpoints.json');
const DELIVERIES_FILE = path.join(DATA_DIR, 'deliveries.json');
const PROCESSED_INBOUND_FILE = path.join(DATA_DIR, 'processed_inbound.json');

function ensureWebhookStorage(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ENDPOINTS_FILE)) {
    fs.writeFileSync(ENDPOINTS_FILE, JSON.stringify([]), 'utf8');
  }
  if (!fs.existsSync(DELIVERIES_FILE)) {
    fs.writeFileSync(DELIVERIES_FILE, JSON.stringify([]), 'utf8');
  }
  if (!fs.existsSync(PROCESSED_INBOUND_FILE)) {
    fs.writeFileSync(PROCESSED_INBOUND_FILE, JSON.stringify([]), 'utf8');
  }
}

function readEndpoints(): WebhookEndpointConfig[] {
  ensureWebhookStorage();
  try {
    return JSON.parse(fs.readFileSync(ENDPOINTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeEndpoints(endpoints: WebhookEndpointConfig[]): void {
  ensureWebhookStorage();
  const tmp = `${ENDPOINTS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(endpoints, null, 2), 'utf8');
  fs.renameSync(tmp, ENDPOINTS_FILE);
}

function readDeliveries(): OutboundWebhookDelivery[] {
  ensureWebhookStorage();
  try {
    return JSON.parse(fs.readFileSync(DELIVERIES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function appendDelivery(delivery: OutboundWebhookDelivery): void {
  ensureWebhookStorage();
  const deliveries = readDeliveries();
  deliveries.unshift(delivery);
  if (deliveries.length > 500) deliveries.pop();
  fs.writeFileSync(DELIVERIES_FILE, JSON.stringify(deliveries, null, 2), 'utf8');
}

export class WebhookService {
  private static MAX_CONSECUTIVE_FAILURES = 5;
  private static REPLAY_TOLERANCE_SECONDS = 300; // 5 minutes

  // ==========================================================================
  // INBOUND WEBHOOK VERIFICATION
  // ==========================================================================

  /**
   * Validates inbound HMAC-SHA256 signature and replay prevention timestamp.
   */
  static verifyInboundSignature(params: {
    rawPayload: string;
    signatureHeader: string | null;
    timestampHeader: string | null;
    secret: string;
  }): { valid: boolean; reason?: string } {
    const { rawPayload, signatureHeader, timestampHeader, secret } = params;

    if (!signatureHeader) {
      return { valid: false, reason: 'Missing X-Watech-Signature header' };
    }
    if (!timestampHeader) {
      return { valid: false, reason: 'Missing X-Watech-Timestamp header' };
    }

    // 1. Replay Attack Defense (Timestamp Freshness Check)
    const timestampMs = parseInt(timestampHeader, 10) || new Date(timestampHeader).getTime();
    if (isNaN(timestampMs)) {
      return { valid: false, reason: 'Invalid X-Watech-Timestamp header format' };
    }

    const now = Date.now();
    const ageSeconds = Math.abs((now - timestampMs) / 1000);

    if (ageSeconds > this.REPLAY_TOLERANCE_SECONDS) {
      return {
        valid: false,
        reason: `Timestamp skew exceeded: request is ${Math.round(ageSeconds)}s old (max allowed: ${this.REPLAY_TOLERANCE_SECONDS}s)`,
      };
    }

    // 2. HMAC-SHA256 Signature Verification
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${timestampHeader}.${rawPayload}`)
      .digest('hex');

    const cleanSig = signatureHeader.replace(/^sha256=/, '').trim();
    if (cleanSig.length !== expectedSignature.length) {
      return { valid: false, reason: 'HMAC signature verification failed: signature mismatch' };
    }

    const bufA = Buffer.from(cleanSig, 'hex');
    const bufB = Buffer.from(expectedSignature, 'hex');

    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      return { valid: false, reason: 'HMAC signature verification failed: signature mismatch' };
    }

    return { valid: true };
  }

  /**
   * Idempotency verification for inbound event IDs.
   */
  static recordInboundEventId(eventId: string): { isDuplicate: boolean } {
    ensureWebhookStorage();
    try {
      const raw = fs.readFileSync(PROCESSED_INBOUND_FILE, 'utf8');
      const seen: string[] = JSON.parse(raw);
      if (seen.includes(eventId)) {
        return { isDuplicate: true };
      }
      seen.push(eventId);
      if (seen.length > 1000) seen.shift();
      fs.writeFileSync(PROCESSED_INBOUND_FILE, JSON.stringify(seen), 'utf8');
      return { isDuplicate: false };
    } catch {
      return { isDuplicate: false };
    }
  }

  // ==========================================================================
  // OUTBOUND WEBHOOK DISPATCH & SSRF DEFENSE
  // ==========================================================================

  /**
   * Dispatches an outbound webhook with HMAC-SHA256 signature and SSRF defense.
   */
  static async dispatchOutboundWebhook(params: {
    endpoint: WebhookEndpointConfig;
    eventType: string;
    payload: Record<string, any>;
  }): Promise<OutboundWebhookDelivery> {
    const { endpoint, eventType, payload } = params;
    const now = new Date();
    const timestamp = now.toISOString();
    const startTime = Date.now();
    const deliveryId = `del_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Circuit Breaker Check: if endpoint disabled due to consecutive failures, abort
    if (!endpoint.isActive || endpoint.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      const delivery: OutboundWebhookDelivery = {
        id: deliveryId,
        tenantId: endpoint.tenantId,
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        url: endpoint.url,
        eventType,
        payload,
        durationMs: 0,
        status: 'failed',
        error: `Endpoint is disabled: exceeded ${this.MAX_CONSECUTIVE_FAILURES} consecutive failures.`,
        attemptNumber: 1,
        signature: '',
        timestamp,
      };
      appendDelivery(delivery);
      return delivery;
    }

    // 2. Strict SSRF Defense: Check URL against blocked IP ranges, loopbacks, metadata & DNS Rebinding
    const ssrfCheck = await isSafeTargetUrlAsync(endpoint.url);
    if (!ssrfCheck.safe) {
      const delivery: OutboundWebhookDelivery = {
        id: deliveryId,
        tenantId: endpoint.tenantId,
        endpointId: endpoint.id,
        endpointName: endpoint.name,
        url: endpoint.url,
        eventType,
        payload,
        durationMs: 0,
        status: 'blocked_ssrf',
        error: `SSRF Blocked: ${ssrfCheck.reason}`,
        attemptNumber: 1,
        signature: '',
        timestamp,
      };
      appendDelivery(delivery);
      return delivery;
    }

    // 3. Construct Payload & HMAC-SHA256 Signature
    const envelope = {
      id: deliveryId,
      event: eventType,
      timestamp,
      tenantId: endpoint.tenantId,
      data: payload,
    };
    const bodyStr = JSON.stringify(envelope);
    const signature = crypto
      .createHmac('sha256', endpoint.secret)
      .update(`${timestamp}.${bodyStr}`)
      .digest('hex');

    // 4. HTTP Dispatch with Timeout
    let httpStatus: number | undefined;
    let isSuccess = false;
    let errorMessage: string | undefined;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Watech-Signature': `sha256=${signature}`,
          'X-Watech-Timestamp': timestamp,
          'X-Watech-Event': eventType,
          'User-Agent': 'Watech-BI-Outbound-Webhook/1.0',
        },
        body: bodyStr,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      httpStatus = response.status;
      isSuccess = response.ok;
      if (!response.ok) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (err: any) {
      clearTimeout(timeout);
      isSuccess = false;
      errorMessage = err.name === 'AbortError' ? 'Destination timed out after 6000ms' : err.message;
    }

    const durationMs = Date.now() - startTime;

    // 5. Update Consecutive Failures & Circuit Breaker
    const endpoints = readEndpoints();
    const epIdx = endpoints.findIndex((e) => e.id === endpoint.id);
    if (epIdx >= 0) {
      if (isSuccess) {
        endpoints[epIdx].consecutiveFailures = 0;
      } else {
        endpoints[epIdx].consecutiveFailures = (endpoints[epIdx].consecutiveFailures || 0) + 1;
        if (endpoints[epIdx].consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
          endpoints[epIdx].isActive = false; // Auto-disable endpoint
        }
      }
      endpoints[epIdx].updatedAt = new Date().toISOString();
      writeEndpoints(endpoints);
    }

    const delivery: OutboundWebhookDelivery = {
      id: deliveryId,
      tenantId: endpoint.tenantId,
      endpointId: endpoint.id,
      endpointName: endpoint.name,
      url: endpoint.url,
      eventType,
      payload,
      httpStatus,
      durationMs,
      status: isSuccess ? 'success' : 'failed',
      error: errorMessage,
      attemptNumber: 1,
      signature: `sha256=${signature}`,
      timestamp,
    };

    appendDelivery(delivery);
    return delivery;
  }

  // ==========================================================================
  // ENDPOINT MANAGEMENT
  // ==========================================================================

  static listEndpoints(tenantId: string): WebhookEndpointConfig[] {
    const endpoints = readEndpoints();
    return endpoints.filter((e) => e.tenantId === tenantId);
  }

  static createEndpoint(params: {
    tenantId: string;
    name: string;
    url: string;
    subscribedEvents: string[];
    secret?: string;
  }): WebhookEndpointConfig {
    const { tenantId, name, url, subscribedEvents, secret } = params;

    // Validate URL upfront for SSRF
    const ssrfCheck = isSafeTargetUrl(url);
    if (!ssrfCheck.safe) {
      throw new Error(`Invalid destination URL: ${ssrfCheck.reason}`);
    }

    const endpoints = readEndpoints();
    const now = new Date().toISOString();
    const endpoint: WebhookEndpointConfig = {
      id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      name,
      url,
      secret: secret || crypto.randomBytes(24).toString('hex'),
      subscribedEvents: subscribedEvents || ['*'],
      isActive: true,
      consecutiveFailures: 0,
      maxRetries: 3,
      createdAt: now,
      updatedAt: now,
    };

    endpoints.push(endpoint);
    writeEndpoints(endpoints);
    return endpoint;
  }

  static listDeliveries(tenantId: string, limit: number = 50): OutboundWebhookDelivery[] {
    const deliveries = readDeliveries();
    return deliveries.filter((d) => d.tenantId === tenantId).slice(0, limit);
  }
}
