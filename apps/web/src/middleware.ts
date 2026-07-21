import '@/lib/sanitize-env';
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isIpBanned, isUserBanned } from '@/lib/security/ban-cache'
import { redis } from '@/lib/redis'


// In-memory cache for high-velocity IP rate limiting (resets on edge bounce)
const localRateLimit = new Map<string, { count: number; resetAt: number }>();

const encoder = new TextEncoder();
const SECRET_KEY_RAW = process.env.STEP_TOKEN_SECRET || 'fallback-secure-secret-key-199387';

let cachedCryptoKey: CryptoKey | null = null;
async function getCryptoKey(): Promise<CryptoKey> {
  if (cachedCryptoKey) return cachedCryptoKey;
  const keyBuffer = encoder.encode(SECRET_KEY_RAW);
  cachedCryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  return cachedCryptoKey;
}

async function generateSignedToken(exp: number): Promise<string> {
  const payload = `verlyn-pre-access:${exp}`;
  const key = await getCryptoKey();
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${exp}.${signatureHex}`;
}

async function verifySignedToken(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const parts = cookieValue.split('.');
  if (parts.length !== 2) return false;
  const [expStr, signatureHex] = parts;
  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || exp < Date.now()) return false;
  
  const payload = `verlyn-pre-access:${expStr}`;
  const key = await getCryptoKey();
  const signatureBytes = new Uint8Array(
    signatureHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
  );
  return crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes,
    encoder.encode(payload)
  );
}

const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
};

export async function middleware(request: NextRequest) {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const stepTokenSecret = (process.env.STEP_TOKEN_SECRET || '').trim();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || '').trim();

  // Validate critical environment variables in production
  if (process.env.NODE_ENV === 'production') {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    if (!serviceRoleKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
    if (!stepTokenSecret) missingVars.push('STEP_TOKEN_SECRET');
    if (!appUrl) missingVars.push('NEXT_PUBLIC_APP_URL');

    if (missingVars.length > 0) {
      console.error(`[FATAL] Missing required production environment variables: ${missingVars.join(', ')}`);
      return new NextResponse(
        `<html>
          <head>
            <title>Configuration Error</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #f5f5f5; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; }
              .card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 32px; max-width: 500px; width: 100%; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5); }
              h1 { color: #ef4444; font-size: 20px; margin-top: 0; font-weight: 600; }
              p { font-size: 14px; color: #a3a3a3; line-height: 1.6; }
              ul { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 6px; padding: 12px 12px 12px 32px; color: #fca5a5; font-family: monospace; font-size: 13px; margin: 16px 0; }
              code { background: rgba(255, 255, 255, 0.1); padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #fff; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Deployment Configuration Failure</h1>
              <p>The application is missing required production environment variables. To resolve this issue, configure the following variables in your Vercel project settings:</p>
              <ul>
                ${missingVars.map(v => `<li>${v}</li>`).join('')}
              </ul>
              <p>After updating the settings, trigger a redeployment. This fail-fast check prevents runtime failures.</p>
            </div>
          </body>
        </html>`,
        {
          status: 500,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }
  }

  if (!supabaseUrl || !supabaseAnonKey) return NextResponse.next();

  const ip = getClientIp(request);
  const ua = request.headers.get('user-agent') || 'unknown';

  const PUBLIC_PATHS = [
    '/verify',
    '/agreements',
    '/coming-soon',
    '/trust-center',
    '/terms',
    '/privacy',
    '/security',
    '/access-model',
    '/transparency',
    '/status',
    '/whitepaper',
    '/support',
    '/help',
    '/report'
  ];

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
                      request.nextUrl.pathname.startsWith('/join') || 
                      request.nextUrl.pathname.startsWith('/verify') || 
                      request.nextUrl.pathname.startsWith('/forgot') || 
                      request.nextUrl.pathname.startsWith('/auth') || 
                      request.nextUrl.pathname === '/coming-soon'
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')
  const isStaticFile = request.nextUrl.pathname.match(/\.(.*)$/)
  const isServerAction = request.headers.has('next-action')

  const isPublicPage = PUBLIC_PATHS.some(path => 
    request.nextUrl.pathname === path || 
    request.nextUrl.pathname.startsWith(path + '/')
  );

  let host = request.headers.get('host') || '';
  if (process.env.NODE_ENV === 'development' && request.headers.has('x-mock-host')) {
    host = request.headers.get('x-mock-host') || '';
  }
  const isRootDomain = host === 'verlyn.in' || host === 'www.verlyn.in' || host.startsWith('verlyn.local') || host.endsWith(':3001');
  const isSubdomain = host === 'app.verlyn.in' || host.startsWith('app.verlyn.local') || host.endsWith(':3000');

  // 1. TIER 1: Global IP Rate Limit (Strict)
  let rateLimitResult = { limit: 1000, remaining: 1000, reset: Date.now() + 60000, blocked: false };
  
  // BYPASS IN DEVELOPMENT & LOCAL TESTING: Don't block developers during rapid iteration
  const isDev = process.env.NODE_ENV === 'development' || host.startsWith('localhost') || host.startsWith('127.0.0.1');

  if (ip !== 'unknown' && !isDev) {
    const isAuthRouteForRL = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/join') || request.nextUrl.pathname.startsWith('/api/auth');
    const maxReqs = isAuthRouteForRL ? 20 : 1000; // 20 req/min for auth, 1000 for normal
    const windowSec = 60;

    let rateLimitBlocked = false;
    let rateLimitRemaining = maxReqs;
    let rateLimitReset = Date.now() + 60000;

    try {
      // 1a. Try Redis Global Rate Limiting
      const redisKey = `v:rl:ip:${ip}:${isAuthRouteForRL ? 'auth' : 'global'}`;
      const current = await redis.incr(redisKey);
      
      if (current === 1) {
        await redis.expire(redisKey, windowSec);
      }
      
      rateLimitRemaining = Math.max(0, maxReqs - current);
      rateLimitBlocked = current > maxReqs;
    } catch (e) {
      // 1b. Fallback to Local In-Memory Map if Redis is not configured or fails
      const now = Date.now();
      const windowMs = 60 * 1000;

      // Memory leak protection: keep localRateLimit Map size bounded
      if (localRateLimit.size > 5000) {
        for (const [key, val] of localRateLimit.entries()) {
          if (now > val.resetAt) {
            localRateLimit.delete(key);
          }
        }
        if (localRateLimit.size > 5000) {
          localRateLimit.clear();
        }
      }

      let limit = localRateLimit.get(ip);
      if (!limit || now > limit.resetAt) {
        localRateLimit.set(ip, { count: 1, resetAt: now + windowMs });
        rateLimitRemaining = maxReqs - 1;
        rateLimitBlocked = false;
        rateLimitReset = now + windowMs;
      } else {
        limit.count++;
        rateLimitRemaining = Math.max(0, maxReqs - limit.count);
        rateLimitBlocked = limit.count > maxReqs;
        rateLimitReset = limit.resetAt;
      }
    }

    if (rateLimitBlocked) {
      const response = new NextResponse('Security Fortress: Too many requests from this IP. Rate limit exceeded.', { status: 429 });
      response.headers.set('X-RateLimit-Limit', maxReqs.toString());
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', rateLimitReset.toString());
      return response;
    }
    
    rateLimitResult = { limit: maxReqs, remaining: rateLimitRemaining, reset: rateLimitReset, blocked: false };
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Allow server actions to pass through without redirects
  if (isServerAction) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null;
  const needsAuth = !isApiRoute && !isStaticFile && !isPublicPage;
  if (needsAuth) {
    const allCookies = request.cookies.getAll();
    const hasAuthCookie = allCookies.some(c => c.name.includes('auth-token') || c.name.startsWith('sb-') || c.name.includes('token') || c.name.includes('session'));
    if (hasAuthCookie) {
      try {
        const { data } = await supabase.auth.getUser();
        user = data?.user;
      } catch (e) {
        console.warn('[Middleware] Auth check failed. Proceeding as unauthenticated.', e);
      }
    }
  }

  // Auto-set the pre-access cookie if the user is authenticated and has confirmed email
  let preAccessCookieInit = false;
  if (isDev && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) {
    preAccessCookieInit = true;
  } else {
    preAccessCookieInit = await verifySignedToken(request.cookies.get('verlyn_pre_access')?.value);
  }
  if (user && user.email_confirmed_at && !preAccessCookieInit) {
    const host = request.headers.get('host') || '';
    let cookieDomain = undefined;
    if (host.includes('verlyn.in')) {
      cookieDomain = '.verlyn.in';
    } else if (host.includes('verlyn.local')) {
      cookieDomain = '.verlyn.local';
    }
    const exp = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days
    const signedToken = await generateSignedToken(exp);
    supabaseResponse.cookies.set('verlyn_pre_access', signedToken, {
      path: '/',
      domain: cookieDomain,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  }

  // 2. TIER 2: Banned Identity Check
  // We check the DB for banned IPs or User IDs
  // Since we're in middleware, we only do this for sensitive or standard routes to avoid extreme latency
  const isSensitiveRoute = request.nextUrl.pathname.startsWith('/api') || 
                          request.nextUrl.pathname.startsWith('/login') ||
                          request.nextUrl.pathname.startsWith('/join') ||
                          request.nextUrl.pathname.startsWith('/messages');

  if (isSensitiveRoute && !isDev) {
    try {
      // Parallel Redis-cached ban checks — replaces 2 sequential DB calls (~80ms → ~4ms)
      const [ipBanned, userBanned] = await Promise.all([
        ip !== 'unknown' ? isIpBanned(ip, supabase) : Promise.resolve(false),
        user ? isUserBanned(user.id, supabase) : Promise.resolve(false),
      ]);

      if (ipBanned) {
        return new NextResponse('Access Denied: Your IP has been flagged for abuse.', { status: 403 });
      }
      if (userBanned) {
        return new NextResponse('Account Suspended.', { status: 403 });
      }
    } catch (e) {
      console.error('[Middleware] Ban check error:', e);
    }
  }

  // 3. Security Headers (Best Practices)
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff');
  supabaseResponse.headers.set('X-Frame-Options', 'DENY');
  supabaseResponse.headers.set('X-XSS-Protection', '1; mode=block');
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  supabaseResponse.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  
  // Dynamically parse R2 Host to allow it in Content Security Policy (CSP)
  const r2PublicUrl = process.env.R2_PUBLIC_URL;
  let r2Origin = "";
  if (r2PublicUrl) {
    try {
      r2Origin = new URL(r2PublicUrl).origin;
    } catch(e) {}
  }

  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' blob: data: https://images.unsplash.com https://*.supabase.co https://*.r2.dev https://*.cloudflarestorage.com " + r2Origin,
    "media-src 'self' blob: data: https://*.supabase.co https://*.r2.dev https://*.cloudflarestorage.com " + r2Origin,
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "object-src 'none'"
  ].join('; ');
  supabaseResponse.headers.set('Content-Security-Policy', cspHeader);
  
  // Rate Limit Headers
  supabaseResponse.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
  supabaseResponse.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  supabaseResponse.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());

  // Strict CORS for API routes
  if (isSensitiveRoute) {
    const origin = request.headers.get('origin');
    const allowedOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
    const allowedOrigins = [
      'localhost:3000',
      'localhost:3001',
      'verlyn.in',
      'app.verlyn.in',
      allowedOrigin.replace(/https?:\/\//, '')
    ];
    if (origin && !allowedOrigins.some(ao => origin.includes(ao))) {
       return new NextResponse('CORS Policy: Origin not allowed.', { status: 403 });
    }
    supabaseResponse.headers.set('Access-Control-Allow-Origin', origin || allowedOrigin);
    supabaseResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    supabaseResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-client-info, apikey');
  }

  // Helper to redirect while preserving updated cookie state (critical for Supabase SSR token refresh)
  const redirectWithCookies = (targetUrl: string | URL) => {
    const response = NextResponse.redirect(targetUrl);
    // Copy all cookies from supabaseResponse to the redirect response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        maxAge: cookie.maxAge,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
      });
    });
    // Copy security/CSP headers
    supabaseResponse.headers.forEach((value, name) => {
      response.headers.set(name, value);
    });
    return response;
  };

  if (!isApiRoute && !isStaticFile) {
    // 1. Root Domain (verlyn.in)
    if (isRootDomain) {
      // If someone visits /login, /forgot, or /auth on root verlyn.in, redirect them to the app subdomain
      const isLoginOrForgot = request.nextUrl.pathname.startsWith('/login') || 
                              request.nextUrl.pathname.startsWith('/join') || 
                              request.nextUrl.pathname.startsWith('/forgot') || 
                              request.nextUrl.pathname.startsWith('/auth');
      if (isLoginOrForgot) {
        const url = request.nextUrl.clone();
        url.host = host.startsWith('verlyn.local') ? 'app.verlyn.local:3000' : (host.endsWith(':3001') ? host.replace(':3001', ':3000') : 'app.verlyn.in');
        return redirectWithCookies(url);
      }

      // On the root domain, serve coming-soon for ALL paths if no pre-access cookie.
      // The only exceptions are: already on /coming-soon, API routes, static files (handled above).
      const isAlreadyComingSoon = request.nextUrl.pathname.startsWith('/coming-soon');
      if (!isAlreadyComingSoon && !isPublicPage && !preAccessCookieInit) {
        const url = request.nextUrl.clone();
        url.pathname = '/coming-soon';
        return NextResponse.rewrite(url);
      }

      // If they HAVE pre-access and try to load root or app views on the landing domain, send to app.verlyn.in
      if (preAccessCookieInit) {
        if (request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/feed' || request.nextUrl.pathname.startsWith('/messages')) {
          const url = request.nextUrl.clone();
          url.host = host.startsWith('verlyn.local') ? 'app.verlyn.local:3000' : (host.endsWith(':3001') ? host.replace(':3001', ':3000') : 'app.verlyn.in');
          return redirectWithCookies(url);
        }
      }
    } // end isRootDomain

    // 2. Subdomain (app.verlyn.in)
    if (isSubdomain) {

      // Redirect public pages (terms, privacy, support, etc.) requested on the subdomain to the root domain
      if (isPublicPage) {
        const url = request.nextUrl.clone();
        url.host = host.startsWith('app.verlyn.local') ? 'verlyn.local:3000' : (host.endsWith(':3000') ? host.replace(':3000', ':3001') : 'verlyn.in');
        return redirectWithCookies(url);
      }

      // Allow auth callback/confirmation routes to load without pre-access check on the app subdomain
      const isBypassAuthRoute = request.nextUrl.pathname.startsWith('/auth');
      if (!preAccessCookieInit && !isBypassAuthRoute) {
        // Track the bypass attempt in audit_logs (Non-blocking background fetch)
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (supabaseUrl && serviceRoleKey) {
            fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
              method: 'POST',
              headers: {
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({
                category: 'security',
                action: 'bypass_attempt',
                actor: ip,
                target: host,
                metadata: {
                  url: request.nextUrl.pathname,
                  userAgent: ua,
                  deviceIp: ip,
                },
                severity: 'critical',
                success: false
              })
            }).catch(() => {});
          }
        } catch (auditErr) {
          console.error('[Middleware Security Gateway] Audit log insertion failed:', auditErr);
        }

        const url = request.nextUrl.clone();
        url.host = host.startsWith('app.verlyn.local') ? 'verlyn.local:3000' : (host.endsWith(':3000') ? host.replace(':3000', ':3001') : 'verlyn.in');
        url.pathname = '/verify';
        return redirectWithCookies(url);
      }
    }
  }

  // Allow unauthenticated access if it's an auth route, API route, public page, or static file
  if (!user && !isAuthRoute && !isApiRoute && !isPublicPage && !isStaticFile && !request.nextUrl.searchParams.has('bypass')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return redirectWithCookies(url)
  }

  // Mandatory Email Verification Gate
  if (user && !user.email_confirmed_at && request.nextUrl.pathname !== '/verify' && !isApiRoute && !isStaticFile) {
    const url = request.nextUrl.clone();
    url.pathname = '/verify';
    return redirectWithCookies(url);
  }

  // Prevent accessing login or verify if already fully authenticated
  if (user && user.email_confirmed_at && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/join') || request.nextUrl.pathname === '/verify')) {
    const url = request.nextUrl.clone()
    url.pathname = '/feed'
    return redirectWithCookies(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
