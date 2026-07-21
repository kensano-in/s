import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  
  // Extract primary IP
  const rawIp = forwardedFor || realIp || '127.0.0.1';
  const ip = rawIp.split(',')[0].trim();
  
  return NextResponse.json({ ip });
}
