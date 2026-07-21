import '@/lib/sanitize-env';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  
  // Fetch all cookies sent in the request
  const allCookies = request.cookies.getAll();
  
  // Wipe out every single cookie by setting its maxAge to 0 and forcing expiration
  allCookies.forEach((cookie) => {
    response.cookies.set(cookie.name, '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });
    
    // Also try clearing it with common domain prefixes just in case
    response.cookies.set(cookie.name, '', {
      path: '/',
      domain: 'localhost',
      maxAge: 0,
      expires: new Date(0),
    });
    
    response.cookies.set(cookie.name, '', {
      path: '/',
      domain: '127.0.0.1',
      maxAge: 0,
      expires: new Date(0),
    });
  });
  
  // Prevent any browser page caching
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}
