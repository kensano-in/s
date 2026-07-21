import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUserRestricted } from "@/lib/spamGuard";
import { recordActivityAndCheckSpam } from "@/lib/moderationEngine";
import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Singleton R2 S3 Client to enable keep-alive TCP connections across requests
let s3Client: S3Client | null = null;

function getS3Client() {
  if (s3Client) return s3Client;

  const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
  const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

  if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}


export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Server-Authoritative Anti-Spam Check for Uploads
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

    // 3. Process file
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "chat";
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 1. Enforce File Size Restrictions (Max 50MB) to prevent OOM / DoS crashes
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds the maximum size limit of 50MB." }, { status: 400 });
    }

    // 2. Enforce Safe File Extensions (prevents stored XSS via .html, .svg, and executables)
    const SAFE_EXTENSIONS = new Set([
      "png", "jpg", "jpeg", "webp", "gif", "heic", "heif",
      "mp3", "wav", "m4a", "ogg", "webm", "aac", "flac",
      "mp4", "mov", "avi", "mkv",
      "pdf", "txt", "doc", "docx", "xls", "xlsx", "ppt", "pptx"
    ]);

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!SAFE_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: "File type is not permitted." }, { status: 400 });
    }

    // 3. Restrict Profile customizations (avatars, banners) to images only
    const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
    const isProfileUpload = folder.includes("avatar") || folder.includes("banner") || folder.includes("profile");
    if (isProfileUpload && !IMAGE_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: "Only image files (png, jpg, jpeg, webp, gif) are allowed for profile customization." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique name
    const filename = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // 4. Cloudflare R2 Upload Path
    const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
    const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
    const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
    const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

    const client = getS3Client();
    if (client && R2_BUCKET_NAME) {
      try {
        const command = new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: `${folder}/${user.id}/${filename}`,
          Body: buffer,
          ContentType: file.type || 'application/octet-stream',
          CacheControl: 'max-age=3600',
        });
        
        await client.send(command);
        
        const publicUrl = `${R2_PUBLIC_URL ? R2_PUBLIC_URL : `https://pub-your-id.r2.dev`}/${folder}/${user.id}/${filename}`;
        return NextResponse.json({ url: publicUrl });
      } catch (err: any) {
        console.error('[R2 API UPLOAD ERROR]', err);
        // Fallback to local upload if R2 fails
      }
    }

    // 5. Local File System Fallback
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;
    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error("Local upload API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
