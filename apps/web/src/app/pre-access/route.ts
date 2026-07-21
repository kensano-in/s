import { NextResponse } from 'next/server';

/**
 * /pre-access → redirect to homepage Advance Access section
 * Users who navigate directly to this URL are sent to the
 * Advance Access anchor on the homepage.
 */
export function GET() {
  return NextResponse.redirect(new URL('/#advance-access', 'https://verlyn.in'), 302);
}
