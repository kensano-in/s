import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from "next/server";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get("file");
  const storage = req.nextUrl.searchParams.get("storage"); // 'r2' or 'supabase'

  if (!file || !storage) {
    return new NextResponse("Missing file or storage parameter", { status: 400 });
  }

  let targetUrl = "";

  if (storage === "r2") {
    targetUrl = `${R2_PUBLIC_URL ? R2_PUBLIC_URL : "https://pub-your-id.r2.dev"}/${file}`;
  } else if (storage === "supabase") {
    // Standard public bucket path for Supabase
    targetUrl = `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${file}`;
  } else {
    return new NextResponse("Invalid storage provider", { status: 400 });
  }

  try {
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      return new NextResponse("File not found", { status: 404 });
    }

    const buffer = await response.arrayBuffer();
    const headers = new Headers();
    
    // Pass along the content type, default to octet-stream
    headers.set("Content-Type", response.headers.get("Content-Type") || "application/octet-stream");
    
    // Highly cacheable since media files are immutable (they get a unique filename on upload)
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(buffer, { headers });
  } catch (error) {
    console.error("[MEDIA PROXY ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
