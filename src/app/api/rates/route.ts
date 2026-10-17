import { NextResponse } from 'next/server';

interface RateCache {
  rates: Record<string, number>;
  rateDate: string;
  cachedAt: number;
  provider: string;
}

// In-memory cache for genuinely fetched rates
let genuineRateCache: RateCache | null = null;

export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://open.er-api.com/v6/latest/KRW', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        const rateDate = data.time_last_update_utc
          ? new Date(data.time_last_update_utc).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        // Store only genuine fetched rates
        genuineRateCache = {
          rates: data.rates,
          rateDate,
          cachedAt: Date.now(),
          provider: 'open.er-api',
        };

        return NextResponse.json({
          success: true,
          provider: 'open.er-api',
          rateDate,
          base: 'KRW',
          rates: data.rates,
          isCached: false,
        });
      }
    }
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'digest' in err) {
      throw err;
    }
    console.warn('[Rates API] Remote fetch failed or timed out:', err);
  }

  // If remote fetch failed, check if we have genuine previous cache
  if (genuineRateCache) {
    return NextResponse.json({
      success: true,
      provider: `${genuineRateCache.provider} (저장된 환율)`,
      rateDate: genuineRateCache.rateDate,
      base: 'KRW',
      rates: genuineRateCache.rates,
      isCached: true,
      isStale: true,
    });
  }

  // Honest failure: No fabricated rates or fake dates
  return NextResponse.json(
    {
      success: false,
      error: 'RATES_UNAVAILABLE',
      message: '환율 정보를 불러오지 못했어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
    },
    { status: 503 }
  );
}
