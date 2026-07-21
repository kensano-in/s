import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUserRestricted } from "@/lib/spamGuard";
import { recordActivityAndCheckSpam } from "@/lib/moderationEngine";
import { generatePresignedUploadUrl } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Anti-Spam Check
    if (await isUserRestricted(user.id, "posts") || await isUserRestricted(user.id, "stories") || await isUserRestricted(user.id, "messages")) {
      return NextResponse.json(
        { error: "You are restricted from uploading media due to spamming." },
        { status: 403 }
      );
    }

    const spamResult = await recordActivityAndCheckSpam(user.id, "upload_media");
    if (spamResult.blocked) {
      return NextResponse.json(
        { error: spamResult.warning || "You are restricted from uploading media due to spamming." },
        { status: 429 }
      );
    }

    // 3. Parse request
    const body = await req.json();
    const { fileName, contentType } = body;

    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'Missing fileName or contentType' }, { status: 400 });
    }

    // 4. Generate unique file path in R2 bucket
    // Prefix with user ID to ensure users can't overwrite each other's files
    const ext = fileName.split(".").pop() || "bin";
    const uniqueFileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // 5. Generate the presigned URL
    const { uploadUrl, finalUrl } = await generatePresignedUploadUrl(uniqueFileName, contentType);

    return NextResponse.json({ uploadUrl, finalUrl });
  } catch (error: any) {
    console.error('Presign route error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
