import { NextRequest, NextResponse } from 'next/server';
import { MenuItemOCR } from '@/types/travel';

interface CameraTranslateRequest {
  imageBase64?: string;
  mimeType?: string;
  countryCode?: string;
  currency?: string;
}

// Curated authentic demo menu datasets by country
const DEMO_MENUS_BY_COUNTRY: Record<
  string,
  { currency: string; rateToKrw: number; items: Omit<MenuItemOCR, 'id' | 'estimatedKrw'>[] }
> = {
  JP: {
    currency: 'JPY',
    rateToKrw: 9.15,
    items: [
      {
        originalName: '特製 豚骨らーめん',
        translatedName: '특제 돈코츠 라멘',
        originalPrice: 980,
        currency: 'JPY',
        description: '진한 돼지 뼈 육수에 부드러운 차슈와 반숙란을 얹은 대표 라멘',
        confidence: 0.98,
      },
      {
        originalName: '自家製 焼き餃子 (5個)',
        translatedName: '수제 군만두 (5개)',
        originalPrice: 420,
        currency: 'JPY',
        description: '바삭하게 구운 육즙 가득한 수제 교자',
        confidence: 0.95,
      },
      {
        originalName: '生ビール (中ジョッキ)',
        translatedName: '생맥주 (중)',
        originalPrice: 550,
        currency: 'JPY',
        description: '시원하고 부드러운 아사히 생맥주',
        confidence: 0.99,
      },
      {
        originalName: '替玉 (麺のおかわり)',
        translatedName: '면 추가 (카에다마)',
        originalPrice: 150,
        currency: 'JPY',
        description: '남은 육수에 추가하는 면 사리',
        confidence: 0.92,
      },
    ],
  },
  US: {
    currency: 'USD',
    rateToKrw: 1380,
    items: [
      {
        originalName: 'Classic Cheeseburger',
        translatedName: '클래식 치즈버거',
        originalPrice: 14.5,
        currency: 'USD',
        description: '체다 치즈, 양상추, 특제 소스가 들어간 소고기 패티 버거',
        confidence: 0.97,
      },
      {
        originalName: 'Truffle Fries',
        translatedName: '트러플 감자튀김',
        originalPrice: 7.0,
        currency: 'USD',
        description: '트러플 오일과 파마산 치즈가 뿌려진 감자튀김',
        confidence: 0.94,
      },
      {
        originalName: 'Iced Americano',
        translatedName: '아이스 아메리카노',
        originalPrice: 4.5,
        currency: 'USD',
        description: '진한 에스프레소에 얼음을 넣은 커피',
        confidence: 0.99,
      },
    ],
  },
  VN: {
    currency: 'VND',
    rateToKrw: 0.055,
    items: [
      {
        originalName: 'Phở Bò Tái Nạm',
        translatedName: '소고기 쌀국수 (생고기+양지)',
        originalPrice: 75000,
        currency: 'VND',
        description: '진한 소고기 육수에 부드러운 생고기를 얹은 베트남 전통 쌀국수',
        confidence: 0.96,
      },
      {
        originalName: 'Bánh Mì Thịt Nướng',
        translatedName: '돼지구이 반미 샌드위치',
        originalPrice: 40000,
        currency: 'VND',
        description: '바삭한 바게트에 숯불 돼지고기와 야채를 넣은 샌드위치',
        confidence: 0.95,
      },
      {
        originalName: 'Cà Phê Muối',
        translatedName: '소금 크림 커피',
        originalPrice: 35000,
        currency: 'VND',
        description: '단짠 매력의 부드러운 크림이 올라간 시그니처 커피',
        confidence: 0.98,
      },
    ],
  },
  FR: {
    currency: 'EUR',
    rateToKrw: 1480,
    items: [
      {
        originalName: 'Croissant au Beurre',
        translatedName: '프랑스 버터 크루아상',
        originalPrice: 2.2,
        currency: 'EUR',
        description: '프랑스 AOP 버터로 겹겹이 구워낸 바삭한 정통 크루아상',
        confidence: 0.97,
      },
      {
        originalName: 'Café Crème',
        translatedName: '카페 크렘 (카페라떼)',
        originalPrice: 4.5,
        currency: 'EUR',
        description: '에스프레소에 스팀 밀크를 더한 부드러운 커피',
        confidence: 0.96,
      },
      {
        originalName: 'Quiche Lorraine',
        translatedName: '키슈 로렌 (베이컨 파이)',
        originalPrice: 8.5,
        currency: 'EUR',
        description: '훈제 베이컨과 치즈, 달걀이 들어간 프랑스 전통 세이보리 파이',
        confidence: 0.93,
      },
    ],
  },
};

export async function POST(req: NextRequest) {
  try {
    const body: CameraTranslateRequest = await req.json();
    const { imageBase64, mimeType = 'image/jpeg', countryCode = 'JP', currency = 'JPY' } = body;

    const geminiKey = process.env.GEMINI_API_KEY;

    // 1. If Gemini API key is configured and image base64 provided, call Gemini Multimodal Vision
    if (geminiKey && imageBase64) {
      try {
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

        const prompt = `Analyze this travel food menu or receipt image.
Extract all menu items and dishes with their prices.
Return strict JSON with this structure:
{
  "currency": "detected currency code like JPY, USD, EUR, VND, etc.",
  "items": [
    {
      "originalName": "original foreign text from image",
      "translatedName": "natural Korean translation of dish name",
      "originalPrice": number (numeric price without currency symbols, e.g. 980 or 14.5),
      "description": "brief Korean explanation of what it is",
      "confidence": number between 0.0 and 1.0
    }
  ]
}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType,
                        data: cleanBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed.items) && parsed.items.length > 0) {
              const detectedCurrency = parsed.currency || currency;
              interface GeminiRawItem {
                originalName?: string;
                translatedName?: string;
                originalPrice?: number;
                description?: string;
                confidence?: number;
              }

              const formattedItems: MenuItemOCR[] = parsed.items.map((item: GeminiRawItem, idx: number) => {
                const price = typeof item.originalPrice === 'number' ? item.originalPrice : 0;
                return {
                  id: `ocr-${Date.now()}-${idx}`,
                  originalName: item.originalName || 'Menu Item',
                  translatedName: item.translatedName || item.originalName || '메뉴',
                  originalPrice: price,
                  currency: detectedCurrency,
                  estimatedKrw: 0, // Computed below or in frontend
                  description: item.description || '',
                  confidence: item.confidence || 0.9,
                };
              });

              return NextResponse.json({
                success: true,
                isDemo: false,
                currency: detectedCurrency,
                items: formattedItems,
                detectedCount: formattedItems.length,
                provider: 'Gemini Vision AI',
              });
            }
          }
        }
      } catch (geminiErr) {
        console.warn('[Camera API] Gemini Vision call failed:', geminiErr);
      }
    }

    // 2. Demo fallback: Return transparently labeled authentic sample menu items
    const defaultData = DEMO_MENUS_BY_COUNTRY[countryCode] || DEMO_MENUS_BY_COUNTRY.JP;
    const items: MenuItemOCR[] = defaultData.items.map((it, idx) => ({
      ...it,
      id: `demo-menu-${idx}`,
      estimatedKrw: Math.round(it.originalPrice * defaultData.rateToKrw),
    }));

    return NextResponse.json({
      success: true,
      isDemo: true,
      demoNotice: '데모 모드: 실제 촬영 이미지 분석을 위해 GEMINI_API_KEY 설정이 필요합니다.',
      currency: defaultData.currency,
      items,
      detectedCount: items.length,
      provider: 'Travel OS Sample OCR Data',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '메뉴판을 분석하는 중 오류가 발생했습니다.';
    return NextResponse.json(
      {
        success: false,
        error: 'SERVER_ERROR',
        message,
      },
      { status: 500 }
    );
  }
}
