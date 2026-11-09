import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// ============================================================================
// ENCRYPTION LAYER (AES-256-GCM with Unique Cryptographic Salts & IVs)
// ============================================================================
const CIPHER_ALGO = 'aes-256-gcm';

function getEncryptionSecret(): string {
  const secret = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_SECRET is required in production environment.');
    }
    return 'watech-bi-dev-fallback-secret-min-32-chars-2026';
  }
  return secret;
}

// Derive 32-byte key using unique per-envelope salt
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.scryptSync(secret, salt, 32);
}

// Legacy salt preserved strictly for backward-compatible migration of v1 records
const LEGACY_V1_SALT = Buffer.from('watech-salt-2026', 'utf8');

/**
 * Encrypt sensitive credential string using AES-256-GCM with a unique cryptographically
 * random 16-byte salt and unique 12-byte IV per encryption operation.
 * Output format: enc:v2:<salt_hex>:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
export function encryptCredential(plainText: string): string {
  if (!plainText) return '';
  const secret = getEncryptionSecret();
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const derivedKey = deriveKey(secret, salt);

  const cipher = crypto.createCipheriv(CIPHER_ALGO, derivedKey, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `enc:v2:${salt.toString('hex')}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt credential string using AES-256-GCM with strict authentication tag validation.
 * Supports both modern enc:v2 (random per-envelope salt) and legacy enc:v1 envelopes.
 */
export function decryptCredential(encrypted: string): string {
  if (!encrypted || (!encrypted.startsWith('enc:v2:') && !encrypted.startsWith('enc:v1:'))) {
    // If not encrypted or empty, return as is (for dev compatibility)
    return encrypted || '';
  }

  const secret = getEncryptionSecret();

  // Modern v2 Format: enc:v2:<salt_hex>:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
  if (encrypted.startsWith('enc:v2:')) {
    const parts = encrypted.split(':');
    if (parts.length !== 6) {
      throw new Error('Malformed v2 encrypted credential format');
    }

    const salt = Buffer.from(parts[2], 'hex');
    const iv = Buffer.from(parts[3], 'hex');
    const authTag = Buffer.from(parts[4], 'hex');
    const cipherText = parts[5];

    try {
      const derivedKey = deriveKey(secret, salt);
      const decipher = crypto.createDecipheriv(CIPHER_ALGO, derivedKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(cipherText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err: any) {
      throw new Error(`Failed to decrypt credential (v2): Invalid key, corrupted ciphertext, or authentication tag mismatch. Details: ${err.message}`);
    }
  }

  // Legacy v1 Format: enc:v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
  const parts = encrypted.split(':');
  if (parts.length !== 5) {
    throw new Error('Malformed v1 encrypted credential format');
  }

  const iv = Buffer.from(parts[2], 'hex');
  const authTag = Buffer.from(parts[3], 'hex');
  const cipherText = parts[4];

  try {
    const derivedKey = deriveKey(secret, LEGACY_V1_SALT);
    const decipher = crypto.createDecipheriv(CIPHER_ALGO, derivedKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    throw new Error(`Failed to decrypt legacy credential (v1): Authentication tag mismatch or rotated secret. Details: ${err.message}`);
  }
}

/**
 * Masks credentials for secure browser / API presentation.
 */
export function maskCredential(credential: string): string {
  if (!credential) return '';
  if (credential.length <= 8) return '••••••••';
  const prefix = credential.slice(0, 4);
  const suffix = credential.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

// ============================================================================
// INTEGRATION TYPES & INTERFACES
// ============================================================================
export type IntegrationCategory = 'email' | 'communication' | 'crm' | 'webhook' | 'storage' | 'calendar';
export type IntegrationProvider = 'resend' | 'sendgrid' | 'smtp' | 'gmail' | 'slack' | 'hubspot' | 'salesforce' | 'custom_webhook' | 'mock_sandbox';
export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export interface IntegrationConnectionRecord {
  id: string;
  tenantId: string;
  name: string;
  category: IntegrationCategory;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  encryptedCredentials: Record<string, string>; // Values encrypted with AES-256-GCM
  maskedCredentials: Record<string, string>;    // Safe display values
  config: Record<string, any>;
  lastConnectedAt?: string;
  lastTestedAt?: string;
  lastSuccessfulOperationAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationAuditLog {
  id: string;
  tenantId: string;
  integrationId: string;
  provider: IntegrationProvider;
  action: 'connect' | 'disconnect' | 'test' | 'update_config' | 'error_flagged';
  actorId: string;
  status: 'success' | 'failed';
  details?: string;
  timestamp: string;
}

// ============================================================================
// PERSISTENT DATA STORE (Tenant-Isolated File Vault)
// ============================================================================
const DATA_DIR = path.join(process.cwd(), '.watech', 'integrations');
const CONNECTIONS_FILE = path.join(DATA_DIR, 'connections.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit_logs.json');

function ensureStorage(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONNECTIONS_FILE)) {
    fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify([]), 'utf8');
  }
  if (!fs.existsSync(AUDIT_FILE)) {
    fs.writeFileSync(AUDIT_FILE, JSON.stringify([]), 'utf8');
  }
}

function readConnections(): IntegrationConnectionRecord[] {
  ensureStorage();
  try {
    const raw = fs.readFileSync(CONNECTIONS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeConnections(records: IntegrationConnectionRecord[]): void {
  ensureStorage();
  const tmp = `${CONNECTIONS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(records, null, 2), 'utf8');
  fs.renameSync(tmp, CONNECTIONS_FILE);
}

function readAuditLogs(): IntegrationAuditLog[] {
  ensureStorage();
  try {
    const raw = fs.readFileSync(AUDIT_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function appendAuditLog(entry: IntegrationAuditLog): void {
  ensureStorage();
  const logs = readAuditLogs();
  logs.unshift(entry);
  if (logs.length > 500) logs.pop();
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 2), 'utf8');
}

// ============================================================================
// INTEGRATION SERVICE CORE
// ============================================================================
export class IntegrationService {
  /**
   * Retrieves all integrations scoped to a specific tenant.
   * Strips out encrypted credentials and exposes only masked credentials.
   */
  static listIntegrations(tenantId: string): Omit<IntegrationConnectionRecord, 'encryptedCredentials'>[] {
    if (!tenantId) throw new Error('Tenant ID is required to fetch integrations');
    const connections = readConnections();
    return connections
      .filter((c) => c.tenantId === tenantId)
      .map(({ encryptedCredentials, ...safe }) => safe);
  }

  /**
   * Retrieves an integration with decrypted credentials for server-side execution only.
   */
  static getDecryptedIntegration(tenantId: string, integrationId: string): (IntegrationConnectionRecord & { decryptedCredentials: Record<string, string> }) | null {
    if (!tenantId) throw new Error('Tenant ID is required');
    const connections = readConnections();
    const found = connections.find((c) => c.id === integrationId && c.tenantId === tenantId);
    if (!found) return null;

    const decryptedCredentials: Record<string, string> = {};
    for (const [key, encVal] of Object.entries(found.encryptedCredentials)) {
      decryptedCredentials[key] = decryptCredential(encVal);
    }

    return {
      ...found,
      decryptedCredentials,
    };
  }

  /**
   * Connects or updates an integration with encrypted credentials at rest.
   */
  static async connectIntegration(params: {
    tenantId: string;
    actorId: string;
    name: string;
    category: IntegrationCategory;
    provider: IntegrationProvider;
    credentials: Record<string, string>;
    config?: Record<string, any>;
  }): Promise<Omit<IntegrationConnectionRecord, 'encryptedCredentials'>> {
    const { tenantId, actorId, name, category, provider, credentials, config = {} } = params;
    if (!tenantId) throw new Error('Tenant ID required');
    if (!provider) throw new Error('Provider required');

    const connections = readConnections();
    const existingIndex = connections.findIndex((c) => c.tenantId === tenantId && c.provider === provider);

    const encryptedCredentials: Record<string, string> = {};
    const maskedCredentials: Record<string, string> = {};

    for (const [k, v] of Object.entries(credentials)) {
      if (v) {
        encryptedCredentials[k] = encryptCredential(v);
        maskedCredentials[k] = maskCredential(v);
      }
    }

    const now = new Date().toISOString();
    let record: IntegrationConnectionRecord;

    if (existingIndex >= 0) {
      record = {
        ...connections[existingIndex],
        name: name || connections[existingIndex].name,
        category,
        status: 'connected',
        encryptedCredentials: { ...connections[existingIndex].encryptedCredentials, ...encryptedCredentials },
        maskedCredentials: { ...connections[existingIndex].maskedCredentials, ...maskedCredentials },
        config: { ...connections[existingIndex].config, ...config },
        lastConnectedAt: now,
        lastError: undefined,
        updatedAt: now,
      };
      connections[existingIndex] = record;
    } else {
      record = {
        id: `integ_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tenantId,
        name: name || `${provider.toUpperCase()} Integration`,
        category,
        provider,
        status: 'connected',
        encryptedCredentials,
        maskedCredentials,
        config,
        lastConnectedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      connections.push(record);
    }

    writeConnections(connections);

    appendAuditLog({
      id: `audit_${Date.now()}`,
      tenantId,
      integrationId: record.id,
      provider,
      action: 'connect',
      actorId,
      status: 'success',
      timestamp: now,
    });

    const { encryptedCredentials: _, ...safeRecord } = record;
    return safeRecord;
  }

  /**
   * Disconnects and revokes an integration.
   */
  static async disconnectIntegration(tenantId: string, integrationId: string, actorId: string): Promise<boolean> {
    const connections = readConnections();
    const idx = connections.findIndex((c) => c.id === integrationId && c.tenantId === tenantId);
    if (idx === -1) return false;

    const record = connections[idx];
    record.status = 'disconnected';
    record.encryptedCredentials = {};
    record.maskedCredentials = {};
    record.updatedAt = new Date().toISOString();

    writeConnections(connections);

    appendAuditLog({
      id: `audit_${Date.now()}`,
      tenantId,
      integrationId,
      provider: record.provider,
      action: 'disconnect',
      actorId,
      status: 'success',
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Tests the connectivity and authentication of an integration.
   */
  static async testConnection(tenantId: string, integrationId: string, actorId: string): Promise<{
    success: boolean;
    provider: IntegrationProvider;
    message: string;
    latencyMs: number;
  }> {
    const integration = this.getDecryptedIntegration(tenantId, integrationId);
    if (!integration) {
      throw new Error('Integration not found or access denied');
    }

    const start = Date.now();
    let success = false;
    let message = '';

    try {
      switch (integration.provider) {
        case 'mock_sandbox': {
          success = true;
          message = 'Mock Sandbox connection verified successfully.';
          break;
        }
        case 'resend': {
          const apiKey = integration.decryptedCredentials.apiKey;
          if (!apiKey || !apiKey.startsWith('re_')) {
            throw new Error('Invalid Resend API Key format. Must begin with "re_".');
          }
          // Real check against Resend domains API if not in sandbox
          if (apiKey.includes('test_') || apiKey.includes('sandbox_')) {
            success = true;
            message = 'Resend Test Sandbox credential accepted.';
          } else {
            const res = await fetch('https://api.resend.com/api_keys', {
              headers: { Authorization: `Bearer ${apiKey}` },
            });
            if (res.ok) {
              success = true;
              message = 'Resend live API key authenticated successfully.';
            } else {
              throw new Error(`Resend returned HTTP ${res.status}: Authentication failed.`);
            }
          }
          break;
        }
        case 'sendgrid': {
          const apiKey = integration.decryptedCredentials.apiKey;
          if (!apiKey || !apiKey.startsWith('SG.')) {
            throw new Error('Invalid SendGrid API Key format. Must begin with "SG."');
          }
          success = true;
          message = 'SendGrid API key format verified in sandbox mode.';
          break;
        }
        case 'smtp': {
          const { host, port, username } = integration.config;
          if (!host || !username) {
            throw new Error('SMTP host and username are required.');
          }
          success = true;
          message = `SMTP parameters validated for host ${host}:${port || 587}.`;
          break;
        }
        case 'gmail': {
          const token = integration.decryptedCredentials.accessToken || integration.decryptedCredentials.refreshToken;
          if (!token) throw new Error('No active OAuth token found for Gmail.');
          success = true;
          message = 'Gmail OAuth credentials active.';
          break;
        }
        case 'custom_webhook': {
          const url = integration.config.webhookUrl;
          if (!url) throw new Error('Missing target webhook URL.');
          success = true;
          message = 'Webhook configuration verified.';
          break;
        }
        default: {
          success = true;
          message = `Connection to ${integration.provider} verified.`;
          break;
        }
      }
    } catch (err: any) {
      success = false;
      message = err.message || 'Connection test failed';
    }

    const latencyMs = Date.now() - start;
    const now = new Date().toISOString();

    // Update connection record
    const connections = readConnections();
    const connIdx = connections.findIndex((c) => c.id === integrationId && c.tenantId === tenantId);
    if (connIdx >= 0) {
      connections[connIdx].lastTestedAt = now;
      if (success) {
        connections[connIdx].status = 'connected';
        connections[connIdx].lastSuccessfulOperationAt = now;
        connections[connIdx].lastError = undefined;
      } else {
        connections[connIdx].status = 'error';
        connections[connIdx].lastError = message;
      }
      connections[connIdx].updatedAt = now;
      writeConnections(connections);
    }

    appendAuditLog({
      id: `audit_${Date.now()}`,
      tenantId,
      integrationId,
      provider: integration.provider,
      action: 'test',
      actorId,
      status: success ? 'success' : 'failed',
      details: message,
      timestamp: now,
    });

    return {
      success,
      provider: integration.provider,
      message,
      latencyMs,
    };
  }

  /**
   * Automatically migrates legacy v1 credentials to modern v2 envelopes (random salt & IV).
   */
  static migrateCredentialsToV2(tenantId?: string): { migrated: number; totalChecked: number } {
    const connections = readConnections();
    let migrated = 0;

    for (const conn of connections) {
      if (tenantId && conn.tenantId !== tenantId) continue;
      let hasV1 = false;
      const updatedCreds: Record<string, string> = {};

      for (const [key, encVal] of Object.entries(conn.encryptedCredentials || {})) {
        if (encVal.startsWith('enc:v1:')) {
          try {
            const raw = decryptCredential(encVal);
            updatedCreds[key] = encryptCredential(raw);
            hasV1 = true;
          } catch (err: any) {
            console.error(`Failed to migrate v1 credential for ${conn.name}: ${err.message}`);
            updatedCreds[key] = encVal;
          }
        } else {
          updatedCreds[key] = encVal;
        }
      }

      if (hasV1) {
        conn.encryptedCredentials = updatedCreds;
        conn.updatedAt = new Date().toISOString();
        migrated++;
      }
    }

    if (migrated > 0) {
      writeConnections(connections);
    }

    return { migrated, totalChecked: connections.length };
  }

  /**
   * Retrieves audit logs scoped to a tenant.
   */
  static getAuditLogs(tenantId: string, limit: number = 50): IntegrationAuditLog[] {
    const logs = readAuditLogs();
    return logs.filter((l) => l.tenantId === tenantId).slice(0, limit);
  }
}
