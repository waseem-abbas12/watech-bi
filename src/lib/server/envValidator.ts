export interface EnvValidationResult {
  isValid: boolean;
  environment: 'production' | 'staging' | 'development' | 'test';
  missingCriticalVars: string[];
  warnings: string[];
  variables: Record<string, { configured: boolean; isSecure: boolean; note?: string }>;
}

const CRITICAL_PRODUCTION_VARS = [
  'JWT_SECRET',
  'ENCRYPTION_SECRET',
  'DATABASE_URL',
  'CRON_SECRET',
];

const RECOMMENDED_VARS = [
  'WEBHOOK_INBOUND_SECRET',
  'RESEND_API_KEY',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_APP_URL',
];

export function validateEnvironment(): EnvValidationResult {
  const env = (process.env.NODE_ENV || 'development') as 'production' | 'staging' | 'development' | 'test';
  const isProduction = env === 'production';

  const missingCritical: string[] = [];
  const warnings: string[] = [];
  const variableDetails: Record<string, { configured: boolean; isSecure: boolean; note?: string }> = {};

  // Check critical variables
  for (const varName of CRITICAL_PRODUCTION_VARS) {
    const val = process.env[varName];
    if (!val) {
      if (isProduction) {
        missingCritical.push(varName);
      } else {
        warnings.push(`Missing ${varName} in ${env} mode (using secure dev fallback)`);
      }
      variableDetails[varName] = { configured: false, isSecure: false, note: 'Not configured' };
    } else if (val.includes('placeholder') || val.length < 16) {
      warnings.push(`${varName} uses an insecure or short default value.`);
      variableDetails[varName] = { configured: true, isSecure: false, note: 'Weak or default secret' };
    } else {
      variableDetails[varName] = { configured: true, isSecure: true };
    }
  }

  // Check recommended variables
  for (const varName of RECOMMENDED_VARS) {
    const val = process.env[varName];
    if (!val) {
      warnings.push(`Optional variable ${varName} is not set; running in sandbox/mock mode.`);
      variableDetails[varName] = { configured: false, isSecure: true, note: 'Sandbox fallback active' };
    } else {
      variableDetails[varName] = { configured: true, isSecure: true };
    }
  }

  return {
    isValid: missingCritical.length === 0,
    environment: env,
    missingCriticalVars: missingCritical,
    warnings,
    variables: variableDetails,
  };
}
