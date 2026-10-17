import { NextRequest, NextResponse } from 'next/server';
import { QUICK_PHRASES } from '@/data/phrases';

interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: TranslateRequest = await req.json();
    const { text, sourceLang = 'ko', targetLang = 'ja' } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'INVALID_INPUT', message: '번역할 내용을 입력해 주세요.' },
        { status: 400 }
      );
    }

    const trimmed = text.trim();

    // 1. Check exact or punctuation-normalized match with verified travel phrases
    const foundPhrase = QUICK_PHRASES.find(
      (p) =>
        p.korean === trimmed ||
        p.korean.replace(/[.?!]/g, '').trim() === trimmed.replace(/[.?!]/g, '').trim()
    );

    if (foundPhrase && foundPhrase.targetTranslations[targetLang]) {
      return NextResponse.json({
        success: true,
        translation: foundPhrase.targetTranslations[targetLang],
        romanization: foundPhrase.romanizations?.[targetLang] || '',
        sourceLang,
        targetLang,
        provider: 'verified_phrase',
      });
    }

    // 2. Real Gemini API translation if server-side GEMINI_API_KEY is configured
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const prompt = `You are a professional travel translator. Translate the following travel sentence from ${sourceLang} to ${targetLang}. Provide an accurate translation and a natural Korean pronunciation guide (romanization) for travelers.
Input: "${trimmed}"
Respond strictly with valid JSON format:
{"translation": "...", "romanization": "..."}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            const parsed = JSON.parse(content);
            if (parsed.translation) {
              return NextResponse.json({
                success: true,
                translation: parsed.translation,
                romanization: parsed.romanization || '',
                sourceLang,
                targetLang,
                provider: 'gemini',
              });
            }
          }
        }
      } catch (geminiErr) {
        console.warn('[Translate API] Gemini translation call error:', geminiErr);
      }
    }

    // 3. Strict honest failure: Never fabricate fake translations like '(日本語訳)' or 'Excuse me:'
    // Return explicit 503 error with matching situational recommendations
    const suggestedPhrases = QUICK_PHRASES.filter(
      (p) => p.targetTranslations[targetLang]
    ).slice(0, 3).map((p) => ({
      id: p.id,
      korean: p.korean,
      translation: p.targetTranslations[targetLang],
      romanization: p.romanizations?.[targetLang] || '',
    }));

    return NextResponse.json(
      {
        success: false,
        error: 'TRANSLATION_SERVICE_UNAVAILABLE',
        message: '실제 번역 서비스(Gemini API 키)가 설정되지 않아 임의 자유 문장을 번역할 수 없습니다. 안전한 여행을 위해 검증된 상황별 추천 문장을 이용해 주세요.',
        suggestedPhrases,
        sourceLang,
        targetLang,
      },
      { status: 503 }
    );
  } catch (error) {
    console.error('[Translate API] Internal Error:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: '번역 처리 중 문제가 발생했습니다.' },
      { status: 500 }
    );
  }
}
