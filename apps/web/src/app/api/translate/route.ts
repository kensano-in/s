import '@/lib/sanitize-env';
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  // Require authenticated Supabase session
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userToken = authHeader.slice(7);
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser(userToken);
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {

    const { text, targetLang = "en" } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `You are an expert translation assistant. Translate the following text into target language: "${targetLang}".
Analyze the original text. Identify its language.
If the original text contains slang, informal phrasing, or mixed languages (like Hinglish - Hindi written in English script), translate it into the target language while retaining the exact meaning, humor, and spirit.

Provide a JSON object with the following fields:
1. "translated": The direct translation of the text into the target language.
2. "detectedSrcLang": The ISO 639-1 code of the source language (e.g. 'hi' for Hindi/Hinglish, 'es' for Spanish, 'en' for English).
3. "transliteration": If the original text is in a non-Latin script (like Devanagari, Japanese Kanji/Kana, Russian Cyrillic, Arabic), provide the Romanized/Latin transliteration (e.g. for 'नमस्ते' write 'namaste'). If it is already in Latin script, leave this field empty ("").
4. "explanation": A brief (1-2 sentences) explanation of any cultural context, idioms, slang, or nuances in the original text (e.g. explaining "bhai" or "jugad"). If there are none, leave it empty ("").
5. "variants": An object containing the translation in different tones:
   - "professional": A polite, formal, professional version of the translation in the target language.
   - "casual": A friendly, casual version of the translation in the target language.
   - "slang": An informal, street-style, or colloquial version of the translation in the target language.

Original Text:
${text}

Return ONLY a valid JSON object.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const data = JSON.parse(responseText);

        return NextResponse.json({
          translated: data.translated,
          detectedSrcLang: data.detectedSrcLang || "en",
          transliteration: data.transliteration || "",
          explanation: data.explanation || "",
          variants: data.variants || null
        });
      } catch (geminiErr) {
        console.error("Gemini translation failed, falling back to Google Translate:", geminiErr);
      }
    }

    // Fallback: Google Translate API
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Google Translate API returned status ${res.status}`);
    }
    const json = await res.json();
    const translated = json[0].map((item: any) => item[0]).join('');
    const detectedSrcLang = json[2];

    return NextResponse.json({
      translated,
      detectedSrcLang,
      transliteration: "",
      explanation: "",
      variants: null
    });
  } catch (err: any) {
    console.error("[/api/translate] error:", err);
    return NextResponse.json({ error: err.message || "Translation failed" }, { status: 500 });
  }
}

