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
  ChevronDown,
} from 'lucide-react';
import CountryFlagIcon from '@/components/CountryFlagIcon';
import CountryPickerModal from '@/components/CountryPickerModal';
import { COUNTRIES, SELECTABLE_COUNTRIES, SUPPORTED_CURRENCIES } from '@/data/countries';

export const STORAGE_KEY_LAST_RATES = 'travel_os_last_rates_v1';
export const MAX_RATE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getValidatedCachedRates(): ExchangeRateData | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_LAST_RATES);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.provider === 'string' &&
      typeof parsed.rateDate === 'string' &&
      parsed.rates &&
      typeof parsed.rates === 'object'
    ) {
      const parsedTime = new Date(parsed.rateDate).getTime();
      if (!Number.isNaN(parsedTime)) {
        const age = Date.now() - parsedTime;
        // Only accept if within 7 days and not future beyond 1 day
        if (age >= 0 && age <= MAX_RATE_AGE_MS) {
          return {
            ...parsed,
            isStale: true,
          };
        }
      }
    }
  } catch {
    // Corrupt cache
  }
  return null;
}

export default function CurrencyView() {
  const {
    country,
    setCountry,
    homeCurrency,
    localCurrency,
    activePlace,
    returnToMapWithPlace,
    showToast,
  } = useTravel();

  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState<boolean>(false);
  const [selectedSide, setSelectedSide] = useState<'from' | 'to'>('from');
  const [fromCurrency, setFromCurrency] = useState<string>(localCurrency);
  const [toCurrency, setToCurrency] = useState<string>(homeCurrency);

  // Sync if context localCurrency changes
  const [prevLocalCurrency, setPrevLocalCurrency] = useState<string>(localCurrency);
  if (prevLocalCurrency !== localCurrency) {
    setPrevLocalCurrency(localCurrency);
    setFromCurrency(localCurrency);
    setToCurrency(homeCurrency);
  }

  const [inputAmount, setInputAmount] = useState<number>(1000);
  const [rateData, setRateData] = useState<ExchangeRateData | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  // Fetch exchange rates from backend API with honest offline cache fallback
  const fetchRates = useCallback(async (notifySuccess = false) => {
    setIsLoading(true);
    setRateError(null);
    try {
      const res = await fetch('/api/rates');
      const data = await res.json();
      if (res.ok && data.success && data.rates) {
        setRateData(data);
        setRateError(null);
        try {
          localStorage.setItem(STORAGE_KEY_LAST_RATES, JSON.stringify(data));
        } catch {
          // ignore storage error
        }
        if (notifySuccess) {
          showToast(t('currency.rate.updated'), 'success');
        }
      } else {
        const cached = getValidatedCachedRates();
        if (cached) {
          setRateData(cached);
          setRateError(null);
        } else {
          setRateError(data.message || t('common.error.service_unavailable'));
        }
      }
    } catch {
      const cached = getValidatedCachedRates();
      if (cached) {
        setRateData(cached);
        setRateError(null);
      } else {
        setRateError(t('common.error.service_unavailable'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let ignore = false;
    async function loadInitialRates() {
      try {
        const res = await fetch('/api/rates');
        const data = await res.json();
        if (res.ok && data.success && data.rates && !ignore) {
          setRateData(data);
          setRateError(null);
          try {
            localStorage.setItem(STORAGE_KEY_LAST_RATES, JSON.stringify(data));
          } catch {
            // ignore
          }
        } else if (!ignore) {
          const cached = getValidatedCachedRates();
          if (cached) {
            setRateData(cached);
            setRateError(null);
          } else {
            setRateError(data.message || t('common.error.service_unavailable'));
          }
        }
      } catch {
        if (!ignore) {
          const cached = getValidatedCachedRates();
          if (cached) {
            setRateData(cached);
            setRateError(null);
          } else {
            setRateError(t('common.error.service_unavailable'));
          }
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
    const fromPerKrw = rates[fromCurrency];
    const toPerKrw = rates[toCurrency];

    const isValid = (val: unknown): val is number =>
      typeof val === 'number' && Number.isFinite(val) && val > 0;

    if (!isValid(fromPerKrw) || !isValid(toPerKrw)) {
      return null;
    }

    // 1 FROM = (1 / fromPerKrw) * toPerKrw TO
    return (1 / fromPerKrw) * toPerKrw;
  }, [rateData, fromCurrency, toCurrency]);

  const convertedAmount = useMemo(() => {
    if (currentRate === null) return 0;
    return inputAmount * currentRate;
  }, [inputAmount, currentRate]);

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

  const getCurrencySymbol = (code: string) => {
    return (
      SUPPORTED_CURRENCIES.find((c) => c.code === code)?.symbol ||
      (code === country.defaultCurrency ? country.currencySymbol : code)
    );
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#191F28] pb-24 flex flex-col max-w-md mx-auto">
      {/* Active Place Context Sticky Banner */}
      {activePlace && (
        <div className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#E5E8EB] px-4 py-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <MapPin className="w-4 h-4 text-[#1B64DA] shrink-0" />
            <span className="text-xs font-semibold text-[#191F28] truncate">
              {activePlace.name} · {t('place.detail.quick_currency')}
            </span>
          </div>
          <button
            onClick={() => returnToMapWithPlace(activePlace)}
            className="flex items-center gap-1 text-xs font-semibold text-[#4E5968] hover:text-[#191F28] bg-[#FFFFFF] hover:bg-[#F8FAFC] px-2.5 py-1.5 rounded-lg border border-[#E5E8EB] transition-all active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('currency.return_map')}</span>
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="p-4 space-y-4">
        {/* Currency Selector Bar (with Circular Flags) */}
        <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
          {/* From Currency Side (기준 통화) */}
          <button
            type="button"
            onClick={() => {
              setSelectedSide('from');
              setIsCountryPickerOpen(true);
            }}
            className="flex-1 flex items-center gap-2.5 min-w-0 text-left p-1.5 -m-1.5 rounded-xl hover:bg-[#F8FAFC] active:scale-[0.98] transition-all group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1B64DA]"
            aria-label="기준 통화 변경"
          >
            <CountryFlagIcon currency={fromCurrency} size={28} />
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-medium text-[#8B95A1] block leading-tight">
                {t('currency.from.label')}
              </span>
              <span className="text-sm font-bold text-[#191F28] truncate flex items-center gap-1">
                <span>{fromCurrency} ({getCurrencySymbol(fromCurrency)})</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#8B95A1] group-hover:text-[#191F28] transition-colors shrink-0" />
              </span>
            </div>
          </button>

          {/* Swap Button (min-h-[44px] min-w-[44px] pure white button) */}
          <button
            onClick={handleSwapCurrencies}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#1B64DA] border border-[#E5E8EB] active:scale-90 transition-all shadow-xs flex items-center justify-center shrink-0 mx-1"
            aria-label={t('currency.swap')}
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>

          {/* To Currency Side (환산 통화) */}
          <button
            type="button"
            onClick={() => {
              setSelectedSide('to');
              setIsCountryPickerOpen(true);
            }}
            className="flex-1 flex items-center justify-end gap-2.5 min-w-0 text-right p-1.5 -m-1.5 rounded-xl hover:bg-[#F8FAFC] active:scale-[0.98] transition-all group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1B64DA]"
            aria-label="환산 통화 변경"
          >
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-medium text-[#8B95A1] block leading-tight">
                {t('currency.to.label')}
              </span>
              <span className="text-sm font-bold text-[#191F28] truncate flex items-center justify-end gap-1">
                <ChevronDown className="w-3.5 h-3.5 text-[#8B95A1] group-hover:text-[#191F28] transition-colors shrink-0" />
                <span>{toCurrency} ({getCurrencySymbol(toCurrency)})</span>
              </span>
            </div>
            <CountryFlagIcon currency={toCurrency} size={28} />
          </button>
        </div>

        {/* Input Amount Card */}
        <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-[#8B95A1] font-medium">
            <span>{t('currency.input.label')}</span>
            {inputAmount > 0 && (
              <button
                onClick={handleClearAmount}
                className="text-xs text-[#8B95A1] hover:text-[#191F28] p-0.5 flex items-center gap-0.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>지우기</span>
              </button>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#4E5968]">{fromCurrency}</span>
            <input
              type="number"
              value={inputAmount || ''}
              onChange={(e) => setInputAmount(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="0"
              className="w-full bg-transparent text-3xl font-extrabold text-[#191F28] tracking-tight focus:outline-none"
            />
          </div>

          {/* Quick Increment Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-[#E5E8EB]">
            {chipIncrements.map((chipVal) => (
              <button
                key={chipVal}
                onClick={() => handleAddAmount(chipVal)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#191F28] text-xs font-semibold whitespace-nowrap border border-[#E5E8EB] active:scale-95 transition-all shadow-xs"
              >
                <Plus className="w-3 h-3 text-[#1B64DA]" />
                <span>{formatAmountNumber(chipVal, fromCurrency)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Real-time Converted Result Card or Error State */}
        {rateError || !currentRate ? (
          <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-[#4E5968] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-[#191F28]">
                  {t('currency.rate.offline_title')}
                </h4>
                <p className="text-xs text-[#4E5968] mt-1 leading-relaxed">
                  {rateError || t('currency.rate.offline_body')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-[#E5E8EB]">
              <button
                onClick={() => fetchRates()}
                disabled={isLoading}
                className="py-2 px-3 rounded-xl bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#191F28] text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 border border-[#E5E8EB]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{t('currency.rate.retry')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[#4E5968]">
              <span>{t('currency.title')}</span>
              <button
                onClick={() => fetchRates(true)}
                disabled={isLoading}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[11px] text-[#4E5968] hover:text-[#191F28] border border-[#E5E8EB] transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{t('currency.rate.retry')}</span>
              </button>
            </div>

            {/* Main Converted Typography */}
            <div className="py-1">
              <div className="text-3xl font-extrabold text-[#191F28] tracking-tight">
                {t('currency.result.summary', {
                  convertedAmount: formatCurrency(convertedAmount, toCurrency),
                })}
              </div>
              <div className="text-xs text-[#8B95A1] mt-1">
                {t('currency.result.equivalence', {
                  baseAmount: formatCurrency(inputAmount, fromCurrency),
                  quoteAmount: formatCurrency(convertedAmount, toCurrency),
                })}
              </div>
            </div>

            {/* Stale rate warning if applicable */}
            {rateData?.isStale && (
              <div className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#E5E8EB] text-xs text-[#4E5968]">
                {t('currency.rate.stale_body', { rateDate: rateData.rateDate })}
              </div>
            )}

            {/* Rate Breakdown Badges (Without visible provider text) */}
            <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#E5E8EB] space-y-1.5 text-xs shadow-xs">
              <div className="flex items-center justify-between text-[#191F28]">
                <span className="text-[#8B95A1]">{t('currency.result.rate_label')}</span>
                <span className="font-semibold text-[#191F28]">
                  1 {fromCurrency} = {formatAmountNumber(currentRate, toCurrency)} {toCurrency}
                </span>
              </div>

              <div className="flex items-center justify-between text-[#8B95A1] text-[11px]">
                <span>{t('currency.result.as_of', { rateDate: rateData?.rateDate || formatDate(new Date()) })}</span>
              </div>
            </div>

            {/* Honest Disclaimer */}
            <div className="flex items-start gap-1.5 text-[11px] text-[#8B95A1] pt-1">
              <AlertCircle className="w-3.5 h-3.5 text-[#8B95A1] shrink-0 mt-0.5" />
              <span>{t('currency.result.warning')}</span>
            </div>
          </div>
        )}

        {/* Quick Travel Budget Comparison Table */}
        <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-4 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#4E5968]">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#1B64DA]" />
              <span className="text-[#191F28] font-bold">현지 주요 금액 환산표</span>
            </span>
            <span className="text-[11px] text-[#8B95A1] font-normal">기준: {fromCurrency} → {toCurrency}</span>
          </div>

          <div className="divide-y divide-[#E5E8EB] text-xs">
            {comparisonRows.map((row) => (
              <div
                key={row.base}
                onClick={() => setInputAmount(row.base)}
                className="py-2.5 flex items-center justify-between hover:bg-[#F8FAFC] px-1 rounded-lg cursor-pointer transition-colors"
              >
                <span className="font-semibold text-[#191F28]">
                  {formatCurrency(row.base, fromCurrency)}
                </span>
                <span className="font-bold text-[#1B64DA]">
                  ≈ {formatCurrency(row.converted, toCurrency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Country Picker Modal ("여행 정보 수정") */}
      <CountryPickerModal
        isOpen={isCountryPickerOpen}
        countries={SELECTABLE_COUNTRIES}
        selectedCode={
          selectedSide === 'from'
            ? (fromCurrency === 'KRW' ? 'KR' : (COUNTRIES.find((c) => c.defaultCurrency === fromCurrency)?.code || country.code))
            : (toCurrency === 'KRW' ? 'KR' : (COUNTRIES.find((c) => c.defaultCurrency === toCurrency)?.code || country.code))
        }
        onConfirm={(nextCountry) => {
          if (selectedSide === 'from') {
            setFromCurrency(nextCountry.defaultCurrency);
            if (nextCountry.code !== 'KR') {
              setCountry(nextCountry);
            }
            showToast(`${nextCountry.name} (${nextCountry.defaultCurrency}) 기준 통화로 설정했어요`, 'success');
          } else {
            setToCurrency(nextCountry.defaultCurrency);
            if (nextCountry.code !== 'KR' && fromCurrency === 'KRW') {
              setCountry(nextCountry);
            }
            showToast(`${nextCountry.name} (${nextCountry.defaultCurrency}) 환산 통화로 설정했어요`, 'success');
          }
          setIsCountryPickerOpen(false);
        }}
        onClose={() => setIsCountryPickerOpen(false)}
      />
    </div>
  );
}
