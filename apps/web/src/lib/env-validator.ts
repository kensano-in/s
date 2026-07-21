

export class SupabaseInitializationError extends Error {
  constructor(options: {
    sourceFile: string;
    functionName: string;
    envVar: string;
    reason: string;
    suggestedFix: string;
  }) {
    const stackLines = new Error().stack?.split('\n') || [];
    // Skip internal helper frames from the stack trace
    const stackTrace = stackLines.slice(2).join('\n');
    const message = `
==================================================
[SUPABASE INITIALIZATION ERROR]
Source File:   ${options.sourceFile}
Function:      ${options.functionName}
Env Var:       ${options.envVar}
Reason:        ${options.reason}
Suggested Fix: ${options.suggestedFix}
Stack Trace:
${stackTrace}
==================================================
`;
    super(message);
    this.name = 'SupabaseInitializationError';
    Object.setPrototypeOf(this, SupabaseInitializationError.prototype);
  }
}

function isValidHttpsUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateSupabaseEnv(
  type: 'browser' | 'server' | 'admin' | 'realtime',
  sourceFile: string,
  functionName: string
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

  // 1. Validate NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new SupabaseInitializationError({
      sourceFile,
      functionName,
      envVar: 'NEXT_PUBLIC_SUPABASE_URL',
      reason: 'Environment variable is missing or empty string',
      suggestedFix: 'Configure NEXT_PUBLIC_SUPABASE_URL in your environment variables or Vercel settings.',
    });
  }

  const trimmedUrl = url.trim();
  if (trimmedUrl !== url) {
    throw new SupabaseInitializationError({
      sourceFile,
      functionName,
      envVar: 'NEXT_PUBLIC_SUPABASE_URL',
      reason: 'Contains hidden leading or trailing whitespace',
      suggestedFix: 'Remove any spaces, tabs, or newlines surrounding the URL value.',
    });
  }

  if (url === 'undefined' || url === 'null') {
    throw new SupabaseInitializationError({
      sourceFile,
      functionName,
      envVar: 'NEXT_PUBLIC_SUPABASE_URL',
      reason: `Value is the literal string "${url}"`,
      suggestedFix: 'Check your deployment scripts or vercel.json. Do not assign "undefined" or "null" as string values.',
    });
  }

  // URL variables must be valid HTTPS URLs
  // Allow http for localhost only during local development
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
  if (isLocalhost && isProd) {
    throw new SupabaseInitializationError({
      sourceFile,
      functionName,
      envVar: 'NEXT_PUBLIC_SUPABASE_URL',
      reason: `Production/Preview environment cannot use localhost URL: "${url}"`,
      suggestedFix: 'Provide a valid production Supabase URL starting with https://.',
    });
  }

  if (!isValidHttpsUrl(url) && (!isLocalhost || isProd)) {
    throw new SupabaseInitializationError({
      sourceFile,
      functionName,
      envVar: 'NEXT_PUBLIC_SUPABASE_URL',
      reason: `URL "${url}" is not a valid HTTPS URL`,
      suggestedFix: 'Ensure NEXT_PUBLIC_SUPABASE_URL starts with https:// and points to your Supabase project.',
    });
  }

  // 2. Validate keys based on type
  if (type === 'admin') {
    if (!serviceRoleKey) {
      throw new SupabaseInitializationError({
        sourceFile,
        functionName,
        envVar: 'SUPABASE_SERVICE_ROLE_KEY',
        reason: 'Environment variable is missing or empty string',
        suggestedFix: 'Set SUPABASE_SERVICE_ROLE_KEY in your server-side environment settings.',
      });
    }

    const trimmedKey = serviceRoleKey.trim();
    if (trimmedKey !== serviceRoleKey) {
      throw new SupabaseInitializationError({
        sourceFile,
        functionName,
        envVar: 'SUPABASE_SERVICE_ROLE_KEY',
        reason: 'Contains hidden leading or trailing whitespace',
        suggestedFix: 'Remove any whitespace surrounding the key.',
      });
    }

    if (serviceRoleKey === 'undefined' || serviceRoleKey === 'null') {
      throw new SupabaseInitializationError({
        sourceFile,
        functionName,
        envVar: 'SUPABASE_SERVICE_ROLE_KEY',
        reason: `Value is the literal string "${serviceRoleKey}"`,
        suggestedFix: 'Ensure the actual service role key is pasted without quotes.',
      });
    }

    if (isProd && (serviceRoleKey.includes('placeholder') || serviceRoleKey.includes('your-key'))) {
      throw new SupabaseInitializationError({
        sourceFile,
        functionName,
        envVar: 'SUPABASE_SERVICE_ROLE_KEY',
        reason: 'Placeholder key is used in production environment',
        suggestedFix: 'Configure a real Supabase service role key.',
      });
    }
  } else {
    // browser, server, realtime need anon key
    if (!anonKey) {
      throw new SupabaseInitializationError({
        sourceFile,
        functionName,
        envVar: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        reason: 'Environment variable is missing or empty string',
        suggestedFix: 'Set NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment/Vercel settings.',
      });
    }

    const trimmedKey = anonKey.trim();
    if (trimmedKey !== anonKey) {
      throw new SupabaseInitializationError({
        sourceFile,
        functionName,
        envVar: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        reason: 'Contains hidden leading or trailing whitespace',
        suggestedFix: 'Remove any whitespace surrounding the anon key.',
      });
    }

    if (anonKey === 'undefined' || anonKey === 'null') {
      throw new SupabaseInitializationError({
        sourceFile,
        functionName,
        envVar: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        reason: `Value is the literal string "${anonKey}"`,
        suggestedFix: 'Ensure the actual anon key is pasted without quotes.',
      });
    }

    if (isProd && (anonKey.includes('placeholder') || anonKey.includes('your-key'))) {
      throw new SupabaseInitializationError({
        sourceFile,
        functionName,
        envVar: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        reason: 'Placeholder key is used in production environment',
        suggestedFix: 'Configure a real Supabase anon key.',
      });
    }
  }
}

/**
 * Validates other generic environment secrets.
 */
export function validateSecretEnv(
  name: string,
  sourceFile: string,
  functionName: string,
  isSecret = true
) {
  const val = process.env[name];
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

  if (!val) {
    throw new SupabaseInitializationError({
      sourceFile,
      functionName,
      envVar: name,
      reason: 'Environment variable is missing or empty string',
      suggestedFix: `Configure the ${name} environment variable.`,
    });
  }

  const trimmed = val.trim();
  if (trimmed !== val) {
    throw new SupabaseInitializationError({
      sourceFile,
      functionName,
      envVar: name,
      reason: 'Contains hidden leading or trailing whitespace',
      suggestedFix: `Remove whitespace surrounding the value of ${name}.`,
    });
  }

  if (val === 'undefined' || val === 'null') {
    throw new SupabaseInitializationError({
      sourceFile,
      functionName,
      envVar: name,
      reason: `Value is the literal string "${val}"`,
      suggestedFix: `Configure a valid value for ${name}, not the string "undefined" or "null".`,
    });
  }

  if (isProd && isSecret && (val.toLowerCase().includes('placeholder') || val.toLowerCase().includes('your-') || val.toLowerCase().includes('example'))) {
    throw new SupabaseInitializationError({
      sourceFile,
      functionName,
      envVar: name,
      reason: 'Placeholder value used in production environment',
      suggestedFix: `Configure a real production value for the secret ${name}.`,
    });
  }
}
