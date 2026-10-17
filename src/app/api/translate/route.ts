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
    const normalize = (s: string) => s.toLowerCase().replace(/[\s.?!,;:~，。？！…\-_()（）]/g, '');
    const normalizedInput = normalize(trimmed);

    // 1. Check exact or punctuation/case-normalized match with verified travel phrases in both directions
    const foundPhrase = QUICK_PHRASES.find((p) => {
      // Check Korean match
      if (sourceLang === 'ko' || targetLang !== 'ko') {
        if (normalize(p.korean) === normalizedInput) return true;
      }
      // Check foreign source language match
      if (p.targetTranslations[sourceLang] && normalize(p.targetTranslations[sourceLang]) === normalizedInput) {
        return true;
      }
      // Reverse fallback match: user typed foreign phrase or korean
      for (const trans of Object.values(p.targetTranslations)) {
        if (normalize(trans) === normalizedInput) return true;
      }
      return false;
    });

    if (foundPhrase) {
      let translation = '';
      let romanization = '';

      if (targetLang === 'ko') {
        // Foreign -> Korean
        translation = foundPhrase.korean;
        romanization = '';
      } else {
        // Korean -> Foreign (or Cross-Language)
        translation = foundPhrase.targetTranslations[targetLang] || foundPhrase.targetTranslations['en'] || foundPhrase.korean;
        romanization = foundPhrase.romanizations?.[targetLang] || '';
      }

      if (translation) {
        return NextResponse.json({
          success: true,
          translation,
          romanization,
          sourceLang,
          targetLang,
          provider: 'verified_phrase',
        });
      }
    }

    // 2. Real Gemini API translation if server-side GEMINI_API_KEY is configured
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const prompt = `You are a professional travel translator. Translate the following travel sentence from ${sourceLang} to ${targetLang}. Provide an accurate translation and a natural Korean pronunciation guide (romanization) for travelers (leave romanization empty if translating into Korean).
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
    // Return explicit 503 error with matching situational recommendations for both directions
    const isTargetKorean = targetLang === 'ko';
    const suggestedPhrases = QUICK_PHRASES.filter(
      (p) => isTargetKorean ? Boolean(p.targetTranslations[sourceLang]) : Boolean(p.targetTranslations[targetLang])
    ).slice(0, 3).map((p) => ({
      id: p.id,
      korean: p.korean,
      sourceText: isTargetKorean ? (p.targetTranslations[sourceLang] || p.korean) : p.korean,
      targetText: isTargetKorean ? p.korean : (p.targetTranslations[targetLang] || ''),
      translation: isTargetKorean ? p.korean : (p.targetTranslations[targetLang] || ''),
      romanization: isTargetKorean ? '' : (p.romanizations?.[targetLang] || ''),
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
