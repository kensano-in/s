import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { convId } = await req.json();
    if (!convId) return NextResponse.json({ error: "Missing convId" }, { status: 400 });

    // -- Fetch last 100 messages from group --
    const supabase = createAdminClient();
    const { data: messages, error } = await supabase
      .from("messages")
      .select("content, type, sender:users!sender_id(display_name, username)")
      .eq("conversation_id", convId)
      .eq("type", "text")
      .order("sent_at", { ascending: false })
      .limit(100);

    if (error || !messages?.length) {
      return NextResponse.json({ error: "Not enough messages to summarize." }, { status: 422 });
    }

    // Build transcript (reverse so chronological)
    const transcript = messages
      .reverse()
      .map((m: any) => {
        const name = m.sender?.display_name || m.sender?.username || "User";
        return `${name}: ${m.content}`;
      })
      .join("\n");

    // -- Gemini API --
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Graceful fallback when no API key set
      return NextResponse.json({
        bullets: [
          "Add GEMINI_API_KEY to your Vercel environment variables to enable AI summaries.",
          "Get a free key at https://aistudio.google.com",
        ]
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are summarizing a group chat conversation for someone catching up.
    
Analyze the following conversation transcript and return EXACTLY 3-5 bullet points (no headers, no markdown) that summarize:
- The main topics discussed  
- Any decisions made or action items
- Notable moments or reactions

Keep each bullet under 20 words. Be direct. No fluff.

Transcript:
${transcript}

Return ONLY the bullet points, one per line, no dashes or numbers:`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse bullet points
    const bullets = text
      .split("\n")
      .map((l: string) => l.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter((l: string) => l.length > 5)
      .slice(0, 5);

    if (!bullets.length) {
      return NextResponse.json({ error: "Could not parse AI response." }, { status: 500 });
    }

    return NextResponse.json({ bullets });
  } catch (err: any) {
    console.error("[/api/summarize]", err);
    return NextResponse.json({ error: "AI summary failed." }, { status: 500 });
  }
}
