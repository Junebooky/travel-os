'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTravel } from '@/context/TravelContext';
import { t, formatCurrency, formatAmountNumber, formatDate } from '@/lib/i18n';
import { ExchangeRateData } from '@/types/travel';
import {
  ArrowLeft,
  ArrowRightLeft,
  RefreshCw,
  MapPin,
  TrendingUp,
  AlertCircle,
  X,
  Plus,
} from 'lucide-react';

export default function CurrencyView() {
  const {
    country,
    homeCurrency,
    localCurrency,
    activePlace,
    returnToMapWithPlace,
    showToast,
  } = useTravel();

  const [isSwapped, setIsSwapped] = useState<boolean>(false);
  const [inputAmount, setInputAmount] = useState<number>(1000);
  const [rateData, setRateData] = useState<ExchangeRateData | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fromCurrency = isSwapped ? homeCurrency : localCurrency;
  const toCurrency = isSwapped ? localCurrency : homeCurrency;

  // Fetch exchange rates from backend API
  const fetchRates = useCallback(async () => {
    setIsLoading(true);
    setRateError(null);
    try {
      const res = await fetch('/api/rates');
      const data = await res.json();
      if (res.ok && data.success && data.rates) {
        setRateData(data);
        setRateError(null);
      } else {
        setRateError(data.message || t('common.error.service_unavailable'));
      }
    } catch {
      setRateError(t('common.error.service_unavailable'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadInitialRates() {
      try {
        const res = await fetch('/api/rates');
        const data = await res.json();
        if (res.ok && data.success && data.rates && !ignore) {
          setRateData(data);
          setRateError(null);
        } else if (!ignore) {
          setRateError(data.message || t('common.error.service_unavailable'));
        }
      } catch {
        if (!ignore) {
          setRateError(t('common.error.service_unavailable'));
        }
      }
    }
    loadInitialRates();
    return () => {
      ignore = true;
    };
  }, []);

  // Compute conversion rate strictly based on verified rateData
  const currentRate = useMemo(() => {
    if (!rateData || !rateData.rates) {
      return null;
    }

    const rates = rateData.rates;
    const fromPerKrw = rates[fromCurrency] || 1;
    const toPerKrw = rates[toCurrency] || 1;

    // 1 FROM = (1 / fromPerKrw) * toPerKrw TO
    return (1 / fromPerKrw) * toPerKrw;
  }, [rateData, fromCurrency, toCurrency]);

  const convertedAmount = useMemo(() => {
    if (currentRate === null) return 0;
    return inputAmount * currentRate;
  }, [inputAmount, currentRate]);

  const handleSwapCurrencies = () => {
    setIsSwapped((prev) => !prev);
  };

  const handleAddAmount = (addVal: number) => {
    setInputAmount((prev) => prev + addVal);
  };

  const handleClearAmount = () => {
    setInputAmount(0);
  };

  // Quick increment chips based on currency denomination
  const chipIncrements = useMemo(() => {
    if (fromCurrency === 'JPY' || fromCurrency === 'TWD') {
      return [100, 500, 1000, 5000, 10000];
    }
    if (fromCurrency === 'USD' || fromCurrency === 'EUR' || fromCurrency === 'GBP') {
      return [5, 10, 20, 50, 100];
    }
    if (fromCurrency === 'VND') {
      return [10000, 50000, 100000, 200000, 500000];
    }
    return [1000, 5000, 10000, 50000, 100000];
  }, [fromCurrency]);

  // Reference comparison table rows
  const comparisonRows = useMemo(() => {
    if (currentRate === null) return [];

    const bases =
      fromCurrency === 'JPY' || fromCurrency === 'TWD'
        ? [100, 500, 1000, 2000, 5000, 10000, 20000]
        : fromCurrency === 'USD' || fromCurrency === 'EUR' || fromCurrency === 'GBP'
        ? [5, 10, 20, 50, 100, 200, 500]
        : fromCurrency === 'VND'
        ? [20000, 50000, 100000, 200000, 500000, 1000000]
        : [1000, 5000, 10000, 30000, 50000, 100000];

    return bases.map((base) => ({
      base,
      converted: base * currentRate,
    }));
  }, [fromCurrency, currentRate]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 flex flex-col max-w-md mx-auto">
      {/* Active Place Context Sticky Banner */}
      {activePlace && (
        <div className="sticky top-0 z-30 bg-blue-950/90 backdrop-blur-md border-b border-blue-800/60 px-4 py-2.5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-xs font-semibold text-blue-200 truncate">
              {activePlace.name} · {t('place.detail.quick_currency')}
            </span>
          </div>
          <button
            onClick={() => returnToMapWithPlace(activePlace)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-300 hover:text-white bg-blue-900/60 hover:bg-blue-800/80 px-2.5 py-1.5 rounded-lg border border-blue-700/60 transition-all active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('currency.return_map')}</span>
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="p-4 space-y-4">
        {/* Currency Selector Bar */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-lg">
          <div className="flex-1 text-center">
            <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
              {t('currency.from.label')}
            </span>
            <span className="text-sm font-bold text-amber-400">
              {fromCurrency} ({country.currencySymbol || fromCurrency})
            </span>
          </div>

          <button
            onClick={handleSwapCurrencies}
            className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700/80 active:scale-90 transition-all shadow-md mx-2"
            aria-label={t('currency.swap')}
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 text-center">
            <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
              {t('currency.to.label')}
            </span>
            <span className="text-sm font-bold text-slate-100">
              {toCurrency} (₩)
            </span>
          </div>
        </div>

        {/* Input Amount Card */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>{t('currency.input.label')}</span>
            {inputAmount > 0 && (
              <button
                onClick={handleClearAmount}
                className="text-xs text-slate-400 hover:text-slate-200 p-0.5 flex items-center gap-0.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>지우기</span>
              </button>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400">{fromCurrency}</span>
            <input
              type="number"
              value={inputAmount || ''}
              onChange={(e) => setInputAmount(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="0"
              className="w-full bg-transparent text-3xl font-extrabold text-white tracking-tight focus:outline-none"
            />
          </div>

          {/* Quick Increment Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-slate-800">
            {chipIncrements.map((chipVal) => (
              <button
                key={chipVal}
                onClick={() => handleAddAmount(chipVal)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold whitespace-nowrap border border-slate-700/60 active:scale-95 transition-all"
              >
                <Plus className="w-3 h-3 text-blue-400" />
                <span>{formatAmountNumber(chipVal, fromCurrency)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Real-time Converted Result Card or Error State */}
        {rateError || !currentRate ? (
          <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-300">
                  {t('currency.rate.offline_title')}
                </h4>
                <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                  {rateError || t('currency.rate.offline_body')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-amber-900/50">
              <button
                onClick={fetchRates}
                disabled={isLoading}
                className="py-2 px-3 rounded-xl bg-amber-900/60 hover:bg-amber-850 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{t('currency.rate.refresh')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-b from-blue-950/40 via-slate-900 to-slate-950 border border-blue-500/30 rounded-2xl p-4 shadow-xl shadow-blue-950/20 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-300">
              <span>{t('currency.title')}</span>
              <button
                onClick={() => {
                  fetchRates();
                  showToast(t('currency.rate.refresh_success'), 'success');
                }}
                disabled={isLoading}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900 text-[11px] text-blue-300 border border-blue-800/50 transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{t('currency.rate.refresh')}</span>
              </button>
            </div>

            {/* Main Converted Typography */}
            <div className="py-1">
              <div className="text-3xl font-black text-white tracking-tight">
                {t('currency.result.summary', {
                  convertedAmount: formatCurrency(convertedAmount, toCurrency),
                })}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {t('currency.result.equivalence', {
                  baseAmount: formatCurrency(inputAmount, fromCurrency),
                  quoteAmount: formatCurrency(convertedAmount, toCurrency),
                })}
              </div>
            </div>

            {/* Stale rate warning if applicable */}
            {rateData?.isStale && (
              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-xs text-amber-300">
                {t('currency.rate.stale_body', { rateDate: rateData.rateDate })}
              </div>
            )}

            {/* Rate Breakdown Badges */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">적용 환율</span>
                <span className="font-semibold text-slate-100">
                  1 {fromCurrency} = {formatAmountNumber(currentRate, toCurrency)} {toCurrency}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>{t('currency.result.as_of', { rateDate: rateData?.rateDate || formatDate(new Date()) })}</span>
                <span>{t('currency.result.source', { providerName: rateData?.provider || 'open.er-api' })}</span>
              </div>
            </div>

            {/* Honest Disclaimer */}
            <div className="flex items-start gap-1.5 text-[11px] text-slate-400/90 pt-1">
              <AlertCircle className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <span>{t('currency.rate.disclaimer')}</span>
            </div>
          </div>
        )}

        {/* Quick Travel Budget Comparison Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>현지 주요 금액 환산표</span>
            </span>
            <span className="text-[11px] text-slate-400 font-normal">기준: {fromCurrency} → {toCurrency}</span>
          </div>

          <div className="divide-y divide-slate-800/80 text-xs">
            {comparisonRows.map((row) => (
              <div
                key={row.base}
                onClick={() => setInputAmount(row.base)}
                className="py-2.5 flex items-center justify-between hover:bg-slate-800/40 px-1 rounded-lg cursor-pointer transition-colors"
              >
                <span className="font-semibold text-slate-200">
                  {formatCurrency(row.base, fromCurrency)}
                </span>
                <span className="font-bold text-blue-400">
                  ≈ {formatCurrency(row.converted, toCurrency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
