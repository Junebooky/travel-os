import { NextResponse } from 'next/server';

// Standard fallback exchange rates (base: KRW)
// 1 KRW = x Foreign Currency
const FALLBACK_RATES: Record<string, number> = {
  KRW: 1.0,
  JPY: 0.11, // 100 JPY ≈ 909 KRW -> 1 KRW ≈ 0.11 JPY
  USD: 0.00073, // 1 USD ≈ 1,370 KRW
  EUR: 0.00067, // 1 EUR ≈ 1,490 KRW
  TWD: 0.023, // 1 TWD ≈ 43.5 KRW
  THB: 0.026, // 1 THB ≈ 38.5 KRW
  VND: 18.5, // 1 KRW ≈ 18.5 VND (10,000 VND ≈ 540 KRW)
  GBP: 0.00057, // 1 GBP ≈ 1,750 KRW
  SGD: 0.00096, // 1 SGD ≈ 1,040 KRW
};

export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://open.er-api.com/v6/latest/KRW', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache 1 hour
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        provider: 'open.er-api',
        rateDate: data.time_last_update_utc
          ? new Date(data.time_last_update_utc).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        base: 'KRW',
        rates: data.rates || FALLBACK_RATES,
      });
    }
  } catch (err) {
    console.warn('[Rates API] Remote fetch failed or timed out, returning fallback rates:', err);
  }

  // Graceful fallback
  return NextResponse.json({
    provider: 'open.er-api (캐시 기준)',
    rateDate: new Date().toISOString().split('T')[0],
    base: 'KRW',
    rates: FALLBACK_RATES,
  });
}
