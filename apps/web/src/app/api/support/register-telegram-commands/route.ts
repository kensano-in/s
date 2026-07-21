import '@/lib/sanitize-env';
import { NextResponse } from 'next/server';
import { TOP_100_COMMANDS } from '@/lib/coming-soon/telegram-commands';

export async function GET(req: Request) {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) {
      return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN is missing in env.' }, { status: 500 });
    }

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: TOP_100_COMMANDS
      })
    });

    const data = await response.json();

    if (data.ok) {
      return NextResponse.json({ 
        success: true, 
        message: 'Successfully registered Top 100 Commands to Telegram UI!',
        commands_registered: TOP_100_COMMANDS.length,
        note: 'The remaining 210+ commands will still work perfectly if typed out manually.'
      });
    } else {
      return NextResponse.json({ success: false, error: data }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
