import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// In-memory cache for high-velocity IP rate limiting (resets on edge bounce)
const localRateLimit = new Map<string, { count: number; resetAt: number }>();

const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
};

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) return NextResponse.next();

  const ip = getClientIp(request);
  const ua = request.headers.get('user-agent') || 'unknown';

  // 1. TIER 1: Global IP Rate Limit (Strict)
  if (ip !== 'unknown') {
    const now = Date.now();
    const windowMs = 60 * 1000;
    const maxReqs = 150; // Hard limit for all requests
    
    let limit = localRateLimit.get(ip);
    if (!limit || now > limit.resetAt) {
      localRateLimit.set(ip, { count: 1, resetAt: now + windowMs });
    } else {
      limit.count++;
      if (limit.count > maxReqs) {
        return new NextResponse('Security Fortress: Too many requests from this IP.', { status: 429 });
      }
    }
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 2. TIER 2: Banned Identity Check
  // We check the DB for banned IPs or User IDs
  // Since we're in middleware, we only do this for sensitive or standard routes to avoid extreme latency
  const isSensitiveRoute = request.nextUrl.pathname.startsWith('/api') || 
                          request.nextUrl.pathname.startsWith('/login') ||
                          request.nextUrl.pathname.startsWith('/messages');

  if (isSensitiveRoute) {
    // Check if IP is banned
    const { data: ban } = await supabase
      .from('banned_identities')
      .select('id, expires_at')
      .eq('identifier', ip)
      .eq('type', 'ip')
      .maybeSingle();

    if (ban) {
      if (!ban.expires_at || new Date(ban.expires_at) > new Date()) {
        return new NextResponse('Access Denied: Your IP has been flagged for abuse.', { status: 403 });
      }
    }

    if (user) {
      const { data: userBan } = await supabase
        .from('banned_identities')
        .select('id')
        .eq('identifier', user.id)
        .eq('type', 'user')
        .maybeSingle();
      
      if (userBan) return new NextResponse('Account Suspended.', { status: 403 });
    }
  }

  // 3. Security Headers (Best Practices)
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff');
  supabaseResponse.headers.set('X-Frame-Options', 'DENY');
  supabaseResponse.headers.set('X-XSS-Protection', '1; mode=block');
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')
  const isStaticFile = request.nextUrl.pathname.match(/\.(.*)$/)

  if (!user && !isAuthRoute && !isApiRoute && !isStaticFile) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/feed'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
