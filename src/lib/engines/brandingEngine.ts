import type { TenantBranding } from '@/types';

/**
 * Sanitizes CSS input to prevent CSS injection, XSS vectors, external URL imports,
 * expressions, and JavaScript protocols.
 */
export function sanitizeCustomCss(rawCss?: string): string {
  if (!rawCss) return '';

  let sanitized = rawCss;

  // Block expressions, javascript:, behavior, @import, vbscript
  sanitized = sanitized.replace(/expression\s*\(/gi, 'blocked-expr(');
  sanitized = sanitized.replace(/javascript\s*:/gi, 'blocked-js:');
  sanitized = sanitized.replace(/vbscript\s*:/gi, 'blocked-vbs:');
  sanitized = sanitized.replace(/@import\s+/gi, '/* blocked-import */ ');
  sanitized = sanitized.replace(/behavior\s*:/gi, 'blocked-behavior:');
  sanitized = sanitized.replace(/-moz-binding\s*:/gi, 'blocked-binding:');
  sanitized = sanitized.replace(/url\s*\(\s*["']?\s*data\s*:\s*text\/html/gi, 'blocked-data(');
  sanitized = sanitized.replace(/<[^>]*>/g, ''); // Strip any HTML tags

  return sanitized;
}

/**
 * Validates a hexadecimal or RGB color string safely.
 */
export function isValidColorString(color?: string): boolean {
  if (!color) return false;
  // Match #hex3, #hex6, #hex8 or rgb/rgba/hsl safe patterns
  const hexPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
  const rgbPattern = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*(0|1|0?\.\d+))?\s*\)$/;
  const hslPattern = /^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*(0|1|0?\.\d+))?\s*\)$/;
  return hexPattern.test(color) || rgbPattern.test(color) || hslPattern.test(color);
}

/**
 * Injects or updates CSS variables and custom styles on the document head.
 * Safe for browser execution.
 */
export function applyTenantBrandingToDom(branding?: TenantBranding | null): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const styleId = 'watech-tenant-dynamic-branding';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  if (!branding) {
    // Reset to defaults
    styleEl.textContent = `
      :root {
        --tenant-primary: #2563eb;
        --tenant-secondary: #4f46e5;
        --tenant-accent: #10b981;
      }
    `;
    return;
  }

  const primary = isValidColorString(branding.primaryColor) ? branding.primaryColor : '#2563eb';
  const secondary = isValidColorString(branding.secondaryColor) ? branding.secondaryColor : '#4f46e5';
  const accent = isValidColorString(branding.accentColor) ? branding.accentColor : '#10b981';
  const font = branding.fontStack ? branding.fontStack.replace(/[<>'";{}]/g, '') : 'Inter, sans-serif';
  const sanitizedCustomCss = sanitizeCustomCss(branding.customCss);

  styleEl.textContent = `
    :root {
      --tenant-primary: ${primary};
      --tenant-secondary: ${secondary};
      --tenant-accent: ${accent};
      --tenant-font: ${font};
    }
    ${sanitizedCustomCss}
  `;

  // Update dynamic favicon if configured
  if (branding.faviconUrl) {
    let favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'shortcut icon';
      document.head.appendChild(favicon);
    }
    favicon.href = branding.faviconUrl;
  }
}

/**
 * Generates an SVG data URL for a generated brand initials avatar if no logo is provided.
 */
export function generateBrandAvatarSvg(brandName: string, primaryColor = '#2563eb'): string {
  const initials = brandName
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'W';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" rx="20" fill="${primaryColor}"/>
    <text x="50" y="58" font-family="system-ui, sans-serif" font-size="42" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
