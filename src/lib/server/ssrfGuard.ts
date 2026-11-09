import net from 'node:net';
import dns from 'node:dns/promises';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254',
  'metadata.google.internal',
  'instance-data',
  'metadata',
]);

const BLOCKED_PORTS = new Set([
  22,    // SSH
  25,    // SMTP
  110,   // POP3
  143,   // IMAP
  465,   // SMTPS
  587,   // Submission
  2375,  // Docker daemon
  2376,  // Docker TLS
  3000,  // Local dev server
  3306,  // MySQL
  5432,  // PostgreSQL
  6379,  // Redis
  8080,  // Alternate HTTP / internal services
  8443,  // Alternate HTTPS
  9200,  // Elasticsearch
  11211, // Memcached
  27017, // MongoDB
]);

/**
 * Checks whether an IP address belongs to private, loopback, link-local, or reserved ranges.
 */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true; // Malformed IPv4
    }
    // 0.0.0.0/8 (Current network)
    if (parts[0] === 0) return true;
    // 10.0.0.0/8 (Private)
    if (parts[0] === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 169.254.0.0/16 (Link-local & AWS/GCP/Azure metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 172.16.0.0/12 (Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 100.64.0.0/10 (Shared address / CGNAT)
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    // 198.18.0.0/15 (Benchmark testing)
    if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true;
    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (parts[0] >= 224) return true;
    return false;
  }

  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // ::1 (Loopback) and :: (Unspecified)
    if (lower === '::1' || lower === '::' || lower === '0:0:0:0:0:0:0:1') return true;
    // fe80::/10 (Link-local)
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) {
      return true;
    }
    // fc00::/7 (Unique local)
    if (lower.startsWith('fc') || lower.startsWith('fd')) {
      return true;
    }
    // IPv4-mapped IPv6 (::ffff:127.0.0.1)
    if (lower.includes('::ffff:')) {
      const ipv4Part = lower.split('::ffff:')[1];
      if (ipv4Part && net.isIPv4(ipv4Part)) {
        return isPrivateIp(ipv4Part);
      }
    }
    return false;
  }

  return true; // Unknown format
}

/**
 * Synchronously validates URL protocol, host, and port for SSRF prevention.
 */
export function isSafeTargetUrl(rawUrl: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(rawUrl);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Invalid protocol. Only HTTP and HTTPS are permitted.' };
    }

    const host = parsed.hostname.toLowerCase();

    if (BLOCKED_HOSTNAMES.has(host)) {
      return { safe: false, reason: 'Access to loopback or cloud metadata services is blocked.' };
    }

    // Check blocked ports
    const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === 'https:' ? 443 : 80;
    if (BLOCKED_PORTS.has(port)) {
      return { safe: false, reason: `Port ${port} is restricted for security.` };
    }

    // Check if host is direct IP
    if (net.isIP(host)) {
      if (isPrivateIp(host)) {
        return { safe: false, reason: 'Direct access to private or reserved IP addresses is blocked.' };
      }
    }

    // Check basic pattern indicators
    if (
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.endsWith('.localhost') ||
      host.endsWith('.onion')
    ) {
      return { safe: false, reason: 'Access to internal or local domain names is blocked.' };
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: 'Malformed URL provided.' };
  }
}

/**
 * Asynchronously validates URL with live DNS resolution to prevent DNS Rebinding attacks.
 */
export async function isSafeTargetUrlAsync(
  rawUrl: string
): Promise<{ safe: boolean; reason?: string; resolvedIps?: string[] }> {
  const syncCheck = isSafeTargetUrl(rawUrl);
  if (!syncCheck.safe) {
    return syncCheck;
  }

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();

    if (net.isIP(host)) {
      return { safe: !isPrivateIp(host), resolvedIps: [host] };
    }

    // Resolve DNS records
    const lookupResults = await dns.lookup(host, { all: true });
    if (!lookupResults || lookupResults.length === 0) {
      return { safe: false, reason: `Could not resolve host ${host}` };
    }

    const resolvedIps: string[] = [];
    for (const record of lookupResults) {
      resolvedIps.push(record.address);
      if (isPrivateIp(record.address)) {
        return {
          safe: false,
          reason: `DNS Rebinding defense: Host ${host} resolves to private/internal IP ${record.address}.`,
          resolvedIps,
        };
      }
    }

    return { safe: true, resolvedIps };
  } catch (err: any) {
    return { safe: false, reason: `DNS resolution failed: ${err.message || 'Unknown error'}` };
  }
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
  method?: string;
  validateDns?: boolean;
}

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  text: string;
  finalUrl: string;
  durationMs: number;
  error?: string;
  redirectCount: number;
}

/**
 * Hardened HTTP client with SSRF, DNS Rebinding, Redirect-Loop, and Response Bomb defenses.
 */
export async function safeFetch(
  initialUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs || 8000;
  const maxRedirects = typeof options.maxRedirects === 'number' ? options.maxRedirects : 3;
  const maxBytes = options.maxBytes || 2 * 1024 * 1024; // 2MB cap
  const method = options.method || 'GET';
  const validateDns = options.validateDns !== false;

  let currentUrl = initialUrl.trim();
  if (!/^https?:\/\//i.test(currentUrl)) {
    currentUrl = `https://${currentUrl}`;
  }

  let redirectCount = 0;

  while (true) {
    // 1. SSRF & DNS Validation on current target
    if (validateDns) {
      const check = await isSafeTargetUrlAsync(currentUrl);
      if (!check.safe) {
        return {
          ok: false,
          status: 403,
          text: '',
          finalUrl: currentUrl,
          durationMs: Date.now() - startTime,
          error: `SSRF Blocked: ${check.reason}`,
          redirectCount,
        };
      }
    } else {
      const syncCheck = isSafeTargetUrl(currentUrl);
      if (!syncCheck.safe) {
        return {
          ok: false,
          status: 403,
          text: '',
          finalUrl: currentUrl,
          durationMs: Date.now() - startTime,
          error: `SSRF Blocked: ${syncCheck.reason}`,
          redirectCount,
        };
      }
    }

    // 2. Fetch with manual redirect control
    let response: Response;
    try {
      response = await fetch(currentUrl, {
        method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Watech-Reliability/1.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...(options.headers || {}),
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        text: '',
        finalUrl: currentUrl,
        durationMs: Date.now() - startTime,
        error: err.name === 'TimeoutError' ? 'Network timeout exceeded' : err.message || 'Connection failed',
        redirectCount,
      };
    }

    // 3. Handle Redirects (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        return {
          ok: false,
          status: response.status,
          text: '',
          finalUrl: currentUrl,
          durationMs: Date.now() - startTime,
          error: 'Redirect status received without Location header',
          redirectCount,
        };
      }

      redirectCount++;
      if (redirectCount > maxRedirects) {
        return {
          ok: false,
          status: 310,
          text: '',
          finalUrl: currentUrl,
          durationMs: Date.now() - startTime,
          error: `Exceeded maximum redirect limit (${maxRedirects})`,
          redirectCount,
        };
      }

      // Resolve redirect against currentUrl
      try {
        currentUrl = new URL(location, currentUrl).toString();
      } catch {
        return {
          ok: false,
          status: 400,
          text: '',
          finalUrl: currentUrl,
          durationMs: Date.now() - startTime,
          error: `Malformed redirect location: ${location}`,
          redirectCount,
        };
      }

      // Loop to re-validate new destination
      continue;
    }

    // 4. Bounded body streaming to prevent OOM
    let text = '';
    try {
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let totalBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            totalBytes += value.byteLength;
            if (totalBytes > maxBytes) {
              await reader.cancel();
              return {
                ok: false,
                status: 413,
                text: '',
                finalUrl: currentUrl,
                durationMs: Date.now() - startTime,
                error: `Response size exceeded maximum safety limit (${maxBytes} bytes)`,
                redirectCount,
              };
            }
            text += decoder.decode(value, { stream: true });
          }
        }
        text += decoder.decode(); // Flush
      } else {
        text = await response.text();
      }
    } catch (readErr: any) {
      return {
        ok: false,
        status: response.status,
        text: '',
        finalUrl: currentUrl,
        durationMs: Date.now() - startTime,
        error: `Failed to stream response body: ${readErr.message || 'Stream error'}`,
        redirectCount,
      };
    }

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      text,
      finalUrl: currentUrl,
      durationMs: Date.now() - startTime,
      redirectCount,
    };
  }
}
