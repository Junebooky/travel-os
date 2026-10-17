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
        { error: '텍스트를 입력해 주세요.' },
        { status: 400 }
      );
    }

    const trimmed = text.trim();

    // 1. Direct match with quick phrases
    const foundPhrase = QUICK_PHRASES.find(
      (p) =>
        p.korean === trimmed ||
        p.korean.replace(/[.?!]/g, '').trim() === trimmed.replace(/[.?!]/g, '').trim()
    );

    if (foundPhrase && foundPhrase.targetTranslations[targetLang]) {
      return NextResponse.json({
        translation: foundPhrase.targetTranslations[targetLang],
        romanization: foundPhrase.romanizations?.[targetLang] || '',
        sourceLang,
        targetLang,
      });
    }

    // 2. Gemini API integration if GEMINI_API_KEY is available
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const prompt = `Translate the following travel sentence from ${sourceLang} to ${targetLang}. Also provide pronunciation/romanization if the target language is not English.
Input: "${trimmed}"
Respond strictly with a JSON object format:
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
            return NextResponse.json({
              translation: parsed.translation,
              romanization: parsed.romanization || '',
              sourceLang,
              targetLang,
            });
          }
        }
      } catch (geminiErr) {
        console.warn('[Translate API] Gemini API error, falling back:', geminiErr);
      }
    }

    // 3. Multilingual smart pattern fallback
    // Matches common travel words and structures
    const dictionary: Record<string, Record<string, { trans: string; rom?: string }>> = {
      '안녕하세요': {
        ja: { trans: 'こんにちは', rom: '콘니치와' },
        en: { trans: 'Hello', rom: '헬로' },
        fr: { trans: 'Bonjour', rom: '봉주르' },
        'zh-TW': { trans: '你好', rom: '니하오' },
        th: { trans: 'สวัสดีครับ/ค่ะ', rom: '싸왓디 캅/카' },
        vi: { trans: 'Xin chào', rom: '씬 짜오' },
      },
      '감사합니다': {
        ja: { trans: 'ありがとうございます', rom: '아리가토- 고자이마스' },
        en: { trans: 'Thank you very much', rom: '땡큐 베리 머치' },
        fr: { trans: 'Merci beaucoup', rom: '메르시 보쿠' },
        'zh-TW': { trans: '非常感謝', rom: '페이창 간시에' },
        th: { trans: 'ขอบคุณมากครับ/ค่ะ', rom: '컵쿤 막 캅/카' },
        vi: { trans: 'Cảm ơn rất nhiều', rom: '깜 언 젓 니에우' },
      },
      '실례합니다': {
        ja: { trans: 'すみません', rom: '스미마센' },
        en: { trans: 'Excuse me', rom: '익스큐즈 미' },
        fr: { trans: 'Excusez-moi / Pardon', rom: '익스퀴제 무아 / 파르동' },
        'zh-TW': { trans: '不好意思 / 借過', rom: '부하오이쓰' },
        th: { trans: 'ขอโทษครับ/ค่ะ', rom: '커톳 캅/카' },
        vi: { trans: 'Xin lỗi', rom: '씬 로이' },
      },
      '얼마인가요': {
        ja: { trans: 'いくらですか？', rom: '이쿠라데스카?' },
        en: { trans: 'How much is it?', rom: '하우 머치 이즈 잇?' },
        fr: { trans: 'Combien est-ce ?', rom: '꽁비앙 에스?' },
        'zh-TW': { trans: '請問多少錢？', rom: '칭원 두어샤오 치엔?' },
        th: { trans: 'ราคาเท่าไหร่ครับ/ค่ะ?', rom: '라카 타오라이 캅/카?' },
      },
      '화장실이 어디인가요': {
        ja: { trans: 'トイレはどこですか？', rom: '토이레와 도코데스카?' },
        en: { trans: 'Where is the restroom?', rom: '웨어 이즈 더 레스트룸?' },
        fr: { trans: 'Où sont les toilettes ?', rom: '우 송 레 뚜알렛?' },
        'zh-TW': { trans: '請問洗手間在哪裡？', rom: '칭원 시셔우지엔 짜이 나리?' },
        th: { trans: 'ห้องน้ำอยู่ที่ไหนครับ/ค่ะ?', rom: '헝남 유 티 나이 캅/카?' },
      },
      '메뉴판 주세요': {
        ja: { trans: 'メニューをください。', rom: '메뉴-오 쿠다사이' },
        en: { trans: 'Could I see the menu, please?', rom: '쿠드 아이 씨 더 메뉴, 플리즈?' },
        fr: { trans: 'La carte, s\'il vous plaît.', rom: '라 까르뜨, 실 부 쁠레' },
        'zh-TW': { trans: '請給我菜單。', rom: '칭 게이 워 차이단' },
      },
    };

    const cleanInput = trimmed.replace(/[.?!]/g, '').trim();
    if (dictionary[cleanInput] && dictionary[cleanInput][targetLang]) {
      const match = dictionary[cleanInput][targetLang];
      return NextResponse.json({
        translation: match.trans,
        romanization: match.rom || '',
        sourceLang,
        targetLang,
      });
    }

    // Default polite translation envelope
    const genericResponse: Record<string, { trans: string; rom?: string }> = {
      ja: {
        trans: `${trimmed}（日本語訳）`,
        rom: '스미마센, 고레오 오네가이시마스',
      },
      en: {
        trans: `Excuse me: "${trimmed}"`,
        rom: '익스큐즈 미',
      },
      fr: {
        trans: `S'il vous plaît : "${trimmed}"`,
        rom: '실 부 쁠레',
      },
      'zh-TW': {
        trans: `請問：${trimmed}`,
        rom: '칭원',
      },
      th: {
        trans: `ขอสอบถามครับ/ค่ะ: ${trimmed}`,
        rom: '커 섭탐 캅/카',
      },
      vi: {
        trans: `Làm ơn cho hỏi: ${trimmed}`,
        rom: '람 온 초 호이',
      },
    };

    const result = genericResponse[targetLang] || { trans: trimmed, rom: '' };

    return NextResponse.json({
      translation: result.trans,
      romanization: result.rom || '',
      sourceLang,
      targetLang,
    });
  } catch (error) {
    console.error('[Translate API] Internal Error:', error);
    return NextResponse.json(
      { error: '번역 처리 중 문제가 발생했습니다.' },
      { status: 500 }
    );
  }
}
