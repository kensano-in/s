import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';

export async function GET(req: NextRequest) {
  // Only allow generating a secret if one doesn't exist yet.
  if (process.env.ADMIN_2FA_SECRET) {
    return NextResponse.json({ error: 'Secret already initialized' }, { status: 403 });
  }

  const secret = speakeasy.generateSecret({
    name: 'Verlyn Admin',
    issuer: 'Verlyn'
  });

  return NextResponse.json({
    secret: secret.base32,
    otpauth_url: secret.otpauth_url
  });
}

export async function POST(req: NextRequest) {
  try {
    const { secret, token } = await req.json();

    if (!secret || !token) {
      return NextResponse.json({ error: 'Secret and token required' }, { status: 400 });
    }

    const isValid = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (isValid) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}



