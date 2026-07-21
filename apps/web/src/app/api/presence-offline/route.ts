import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null;
    try {
      const body = await req.json();
      userId = body?.userId;
    } catch (_) {}

    if (!userId) {
      return NextResponse.json({ success: true, warning: "No userId provided" });
    }

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from("users")
      .update({
        is_online: false,
        presence_expires_at: new Date().toISOString()
      })
      .eq("id", userId);

    if (error) {
      console.error("[presence-offline] DB update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[presence-offline] request failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
