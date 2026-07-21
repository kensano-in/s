import '@/lib/sanitize-env';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import os from 'os';

const LOG_FILE = path.join(os.tmpdir(), 'verlyn_client_debug_logs.txt');

export async function POST(request: Request) {
  try {
    const { log } = await request.json();
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ${log}\n`;

    // Ensure scratch directory exists
    const dir = path.dirname(LOG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.appendFileSync(LOG_FILE, message);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
