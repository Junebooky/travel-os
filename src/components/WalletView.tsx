'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useTravel } from '@/context/TravelContext';
import { t, formatCurrency, formatAmountNumber, formatDate } from '@/lib/i18n';
import { PlaceCategory } from '@/types/travel';
import {
  Wallet,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  Banknote,
  MapPin,
  AlertTriangle,
  X,
  TrendingDown,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface CategoryStyle {
  imageSrc: string;
  bgColor: string;
  alt: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  // Transportation & Transit
  transport: {
    imageSrc: '/assets/travel_wallet/public_transportation.png',
    bgColor: 'bg-[#EDF6FD]',
    alt: '교통',
  },
  transit: {
    imageSrc: '/assets/travel_wallet/public_transportation.png',
    bgColor: 'bg-[#EDF6FD]',
    alt: '대중교통',
  },
  airport: {
    imageSrc: '/assets/travel_wallet/public_transportation.png',
    bgColor: 'bg-[#EDF6FD]',
    alt: '공항',
  },
  // Stay & Accommodation
  stay: {
    imageSrc: '/assets/travel_wallet/hotel.png',
    bgColor: 'bg-[#E0F9F0]',
    alt: '숙소',
  },
  // Food & Cafe
  food: {
    imageSrc: '/assets/travel_wallet/restaurant.png',
    bgColor: 'bg-[#FFF8E2]',
    alt: '음식점',
  },
  cafe: {
    imageSrc: '/assets/travel_wallet/restaurant.png',
    bgColor: 'bg-[#FFF8E2]',
    alt: '카페',
  },
  // Shopping & Market
  shopping: {
    imageSrc: '/assets/travel_wallet/shopping.png',
    bgColor: 'bg-[#FDF0F8]',
    alt: '쇼핑',
  },
  market: {
    imageSrc: '/assets/travel_wallet/shopping.png',
    bgColor: 'bg-[#FDF0F8]',
    alt: '마트/시장',
  },
  // Attraction & Fun
  attraction: {
    imageSrc: '/assets/travel_wallet/activity_fun.png',
    bgColor: 'bg-[#F6EEFD]',
    alt: '관광/액티비티',
  },
  // Convenience & Grocery
  convenience: {
    imageSrc: '/assets/travel_wallet/grocery_convenience.png',
    bgColor: 'bg-[#FFF0E8]',
    alt: '편의점/식료품',
  },
  // Pharmacy & Emergency
  pharmacy: {
    imageSrc: '/assets/travel_wallet/pharmacy_essentials.png',
    bgColor: 'bg-[#E8FAFB]',
    alt: '약국',
  },
  emergency: {
    imageSrc: '/assets/travel_wallet/pharmacy_essentials.png',
    bgColor: 'bg-[#E8FAFB]',
    alt: '병원/응급',
  },
  // General fallback
  etc: {
    imageSrc: '/assets/travel_wallet/etc.png',
    bgColor: 'bg-[#F1F4F8]',
    alt: '기타',
  },
  all: {
    imageSrc: '/assets/travel_wallet/etc.png',
    bgColor: 'bg-[#F1F4F8]',
    alt: '전체',
  },
};

const getWalletBackgroundImage = (countryCode?: string, countryName?: string): string => {
  const code = (countryCode || '').toUpperCase();
  const name = countryName || '';

  // 1. Japan
  if (code === 'JP' || name.includes('일본')) {
    return '/assets/travel_wallet/background/japan_wallet.png';
  }

  // 2. United States, Canada, Guam, North America
  if (
    code === 'US' ||
    code === 'CA' ||
    code === 'GU' ||
    name.includes('미국') ||
    name.includes('캐나다') ||
    name.includes('괌')
  ) {
    return '/assets/travel_wallet/background/us_wallet.png';
  }

  // 3. United Kingdom
  if (
    code === 'GB' ||
    code === 'UK' ||
    name.includes('영국') ||
    name.includes('잉글랜드') ||
    name.includes('런던')
  ) {
    return '/assets/travel_wallet/background/uk_wallet.png';
  }

  // 4. Spain
  if (code === 'ES' || name.includes('스페인')) {
    return '/assets/travel_wallet/background/spain_wallet.png';
  }

  // 5. Europe (France, Italy, Germany, Switzerland, Netherlands, Austria, Czech, etc.)
  if (
    code === 'FR' ||
    code === 'IT' ||
    code === 'DE' ||
    code === 'CH' ||
    code === 'NL' ||
    code === 'AT' ||
    code === 'CZ' ||
    code === 'EU' ||
    name.includes('프랑스') ||
    name.includes('이탈리아') ||
    name.includes('독일') ||
    name.includes('스위스') ||
    name.includes('네덜란드') ||
    name.includes('오스트리아') ||
    name.includes('체코') ||
    name.includes('유럽')
  ) {
    return '/assets/travel_wallet/background/europe_wallet.png';
  }

  // 6. Russia
  if (code === 'RU' || name.includes('러시아')) {
    return '/assets/travel_wallet/background/russia_wallet.png';
  }

  // 7. China, Taiwan, Hong Kong, Macau
  if (
    code === 'CN' ||
    code === 'TW' ||
    code === 'HK' ||
    code === 'MO' ||
    name.includes('중국') ||
    name.includes('대만') ||
    name.includes('홍콩') ||
    name.includes('마카오')
  ) {
    return '/assets/travel_wallet/background/china_wallet.png';
  }

  // 8. South America (Brazil, Argentina, Chile, Peru, Colombia, etc.)
  if (
    code === 'BR' ||
    code === 'AR' ||
    code === 'CL' ||
    code === 'PE' ||
    code === 'CO' ||
    name.includes('남미') ||
    name.includes('브라질') ||
    name.includes('아르헨티나') ||
    name.includes('칠레') ||
    name.includes('페루')
  ) {
    return '/assets/travel_wallet/background/south_america_wallet.png';
  }

  // 9. Africa (Egypt, South Africa, Kenya, Tanzania, Morocco, etc.)
  if (
    code === 'ZA' ||
    code === 'EG' ||
    code === 'KE' ||
    code === 'TZ' ||
    code === 'MA' ||
    name.includes('아프리카') ||
    name.includes('이집트') ||
    name.includes('남아공') ||
    name.includes('케냐') ||
    name.includes('모로코')
  ) {
    return '/assets/travel_wallet/background/africa.png';
  }

  // 10. Southeast Asia & Tropical (Thailand, Vietnam, Philippines, Indonesia/Bali, Malaysia, Singapore, Australia)
  if (
    code === 'TH' ||
    code === 'VN' ||
    code === 'PH' ||
    code === 'ID' ||
    code === 'MY' ||
    code === 'SG' ||
    code === 'AU' ||
    name.includes('태국') ||
    name.includes('베트남') ||
    name.includes('필리핀') ||
    name.includes('인도네시아') ||
    name.includes('발리') ||
    name.includes('말레이시아') ||
    name.includes('싱가포르') ||
    name.includes('호주')
  ) {
    return '/assets/travel_wallet/background/thailand_wallet.png';
  }

  // Korea fallback: East Asia aesthetic
  if (code === 'KR' || name.includes('한국') || name.includes('대한민국')) {
    return '/assets/travel_wallet/background/japan_wallet.png';
  }

  // Default fallback
  return '/assets/travel_wallet/background/thailand_wallet.png';
};

export default function WalletView() {
  const {
    country,
    localCurrency,
    expenses,
    addExpense,
    deleteExpense,
    clearAllExpenses,
    activePlace,
    returnToMapWithPlace,
    convertCurrencyToKrw,
    refreshRates,
  } = useTravel();

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isClearAllOpen, setIsClearAllOpen] = useState<boolean>(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form states
  const [amountInput, setAmountInput] = useState<string>('');
  const [currencyInput, setCurrencyInput] = useState<string>(localCurrency);
  const [placeNameInput, setPlaceNameInput] = useState<string>(activePlace?.name || '');
  const [categoryInput, setCategoryInput] = useState<PlaceCategory>('food');
  const [paymentMethodInput, setPaymentMethodInput] = useState<'card' | 'cash' | undefined>(undefined);
  const [memoInput, setMemoInput] = useState<string>('');

  const walletBgImage = useMemo(() => {
    return getWalletBackgroundImage(country?.code, country?.name);
  }, [country?.code, country?.name]);

  // Total KRW spent and local spent
  const totalKrw = useMemo(() => {
    return expenses.reduce((sum, item) => sum + (item.amountKrw || 0), 0);
  }, [expenses]);

  const hasUncalculatedExpenses = useMemo(() => {
    return expenses.some((item) => item.amountKrw === null);
  }, [expenses]);

  const totalLocal = useMemo(() => {
    return expenses
      .filter((item) => item.currency === localCurrency)
      .reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [expenses, localCurrency]);

  // Category breakdown
  const categoryTotals = useMemo(() => {
    const map: Partial<Record<PlaceCategory, number>> = {};
    expenses.forEach((e) => {
      if (e.amountKrw !== null) {
        map[e.category] = (map[e.category] || 0) + e.amountKrw;
      }
    });
    return map;
  }, [expenses]);

  // TB-P1-05: Genuine rate conversion using convertCurrencyToKrw, no fabricated rates
  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const conversion = convertCurrencyToKrw(parsedAmount, currencyInput);
    const computedKrw = conversion ? conversion.krw : null;
    const rateUsed = conversion
      ? {
        rate: conversion.rate,
        provider: conversion.provider,
        date: conversion.date,
      }
      : undefined;

    const saved = addExpense({
      amount: parsedAmount,
      currency: currencyInput,
      amountKrw: computedKrw,
      placeName: placeNameInput.trim() || '여행 지출',
      category: categoryInput,
      paymentMethod: paymentMethodInput,
      memo: memoInput.trim() || undefined,
      rateUsed,
    });

    if (saved) {
      setAmountInput('');
      setMemoInput('');
      setIsAddModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#191F28] pb-24 flex flex-col max-w-md mx-auto p-4 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#191F28] flex items-center gap-1.5">
            {t('wallet.title')}
          </h1>
          <p className="text-xs text-[#8B95A1] font-medium mt-0.5">
            {country.flag} {country.name} · 이번 여행
          </p>
        </div>

        <div className="flex items-center space-x-1.5">
          {expenses.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearAllOpen(true)}
              aria-label={t('wallet.action.clear_all')}
              className="w-10 h-10 rounded-full bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#8B95A1] hover:text-rose-600 border border-[#E5E8EB] flex items-center justify-center shadow-xs active:scale-95 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setCurrencyInput(localCurrency);
              setPlaceNameInput(activePlace?.name || '');
              setPaymentMethodInput(undefined);
              setIsAddModalOpen(true);
            }}
            className="py-2.5 px-4 bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#191F28] border border-[#E5E8EB] rounded-full text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 text-[#087F8C]" />
            {t('wallet.action.add')}
          </button>
        </div>
      </div>

      {/* Active Place Context Banner */}
      {activePlace && (
        <div className="flex items-center justify-between p-3 bg-[#FFFFFF] border border-[#E5E8EB] rounded-xl text-xs shadow-sm">
          <div className="flex items-center space-x-2 truncate">
            <MapPin className="w-3.5 h-3.5 text-[#087F8C] shrink-0" />
            <span className="text-[#4E5968] truncate font-medium">
              {activePlace.name}에서 방문 중
            </span>
          </div>
          <button
            type="button"
            onClick={() => returnToMapWithPlace(activePlace)}
            aria-label={t('wallet.a11y.return_map')}
            className="text-[11px] text-[#087F8C] hover:underline font-semibold shrink-0 ml-2"
          >
            {t('flow.return_map')}
          </button>
        </div>
      )}

      {/* Summary Card with Country Dynamic Background */}
      <div className="relative rounded-[26px] overflow-hidden shadow-md min-h-[210px] sm:min-h-[230px] flex flex-col justify-between p-5 text-white">
        {/* Dynamic Country Background Image */}
        <Image
          src={walletBgImage}
          alt={`${country.name} 배경`}
          fill
          priority
          className="object-cover object-[75%_center] select-none pointer-events-none"
        />

        {/* Subtle Gradient Overlays for High Contrast & Legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/20 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10 pointer-events-none" />

        {/* Top Row: Total Label + Count */}
        <div className="relative z-10 flex items-center justify-between text-white">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold drop-shadow-sm">
            <TrendingDown className="w-4 h-4 text-white shrink-0" />
            <span>{t('wallet.summary.total_krw')}</span>
            <ChevronRight className="w-4 h-4 text-white/80 shrink-0" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-white/95 drop-shadow-sm">
            {t('wallet.summary.count', { count: expenses.length })}
          </span>
        </div>

        {/* Middle: Total Converted KRW & Local Equivalent */}
        <div className="relative z-10 my-2">
          <div className="text-3xl sm:text-[40px] font-black text-white tracking-tight leading-none drop-shadow-md">
            {formatCurrency(totalKrw, 'KRW')}
          </div>
          {totalLocal > 0 && (
            <div className="text-xs sm:text-sm font-medium text-white/95 drop-shadow-sm mt-1.5">
              약 {formatAmountNumber(totalLocal, localCurrency)} {localCurrency}
            </div>
          )}
        </div>

        {/* Uncalculated rate warning if applicable */}
        {hasUncalculatedExpenses && (
          <div className="relative z-10 flex items-center justify-between text-[11px] text-white/95 font-medium pt-1 pb-1">
            <span>* {t('wallet.summary.partial')} {t('wallet.rate.not_available')}</span>
            <button
              type="button"
              onClick={() => refreshRates()}
              className="text-white underline font-semibold ml-2 shrink-0 hover:text-white/80"
            >
              {t('common.action.refresh')}
            </button>
          </div>
        )}

        {/* Category breakdown bar if expenses exist */}
        {expenses.length > 0 && (
          <div className="relative z-10 bg-[#FFFFFF]/90 backdrop-blur-md rounded-2xl p-2 sm:p-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar border border-white/50 shadow-xs mt-1">
            {Object.entries(categoryTotals).map(([cat, val]) => {
              const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.etc;
              return (
                <div
                  key={cat}
                  className="bg-[#FFFFFF] rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-[#191F28] shadow-xs border border-[#E5E8EB]/60 shrink-0"
                >
                  <Image
                    src={style.imageSrc}
                    alt={style.alt}
                    width={18}
                    height={18}
                    className="w-4 h-4 sm:w-[18px] sm:h-[18px] object-contain shrink-0"
                  />
                  <span>{formatCurrency(val || 0, 'KRW')}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Empty State */}
      {expenses.length === 0 && (
        <div className="p-8 text-center bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#FFFFFF] border border-[#E5E8EB] flex items-center justify-center text-[#8B95A1] mb-1 shadow-xs">
            <Wallet className="w-6 h-6 text-[#087F8C]" />
          </div>
          <h3 className="text-sm font-bold text-[#191F28]">{t('wallet.empty.title')}</h3>
          <p className="text-xs text-[#8B95A1] max-w-xs">{t('wallet.empty.body')}</p>
        </div>
      )}

      {/* Expense Item List */}
      {expenses.length > 0 && (
        <div className="space-y-3">
          {/* Section Header */}
          <div className="flex items-center justify-between pt-1 pb-0.5 px-0.5">
            <h2 className="text-base font-bold text-[#191F28]">지출 내역</h2>
            <div className="flex items-center gap-1 text-xs text-[#8B95A1] font-medium cursor-pointer hover:text-[#191F28] transition-colors">
              <span>최신순</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#8B95A1]" />
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-2.5">
            {expenses.map((item) => {
              const style = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.etc;

              return (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl flex items-start justify-between gap-3 hover:border-[#8B95A1] transition-all shadow-xs"
                >
                  {/* Left: Round Category Icon + Details */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Round Category Icon with Theme Pastel Background */}
                    <div
                      className={`w-[52px] h-[52px] min-w-[52px] min-h-[52px] rounded-full ${style.bgColor} flex items-center justify-center shrink-0 mt-0.5`}
                    >
                      <Image
                        src={style.imageSrc}
                        alt={style.alt}
                        width={40}
                        height={40}
                        className="w-10 h-10 object-contain"
                      />
                    </div>

                    {/* Details: Place Name + Payment Tag, Date/Time, Memo */}
                    <div className="space-y-1 flex-1 min-w-0">
                      {/* Row 1: Title + Payment Method Pill */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm sm:text-[15px] font-bold text-[#191F28] tracking-tight truncate max-w-[155px] sm:max-w-[185px]">
                          {item.placeName}
                        </h4>
                        {item.paymentMethod && item.paymentMethod !== 'unknown' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F1F3F5] text-[#6B7684] text-[11px] font-medium">
                            {item.paymentMethod === 'card' ? (
                              <CreditCard className="w-2.5 h-2.5 text-[#6B7684]" />
                            ) : (
                              <Banknote className="w-2.5 h-2.5 text-[#6B7684]" />
                            )}
                            <span>{item.paymentMethod === 'card' ? '카드' : '현금'}</span>
                          </span>
                        )}
                      </div>

                      {/* Row 2: Date & Time */}
                      <p className="text-xs text-[#8B95A1] flex items-center gap-1 font-normal">
                        <Calendar className="w-3.5 h-3.5 text-[#8B95A1] shrink-0" />
                        <span>{formatDate(new Date(item.timestamp), true)}</span>
                      </p>

                      {/* Row 3: Memo Tag (if present) */}
                      {item.memo && (
                        <div className="pt-0.5">
                          <span className="inline-block text-xs text-[#6B7684] bg-[#F1F3F5] px-2.5 py-1 rounded-lg truncate max-w-[210px]">
                            {item.memo}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Amounts & Trash Action */}
                  <div className="flex flex-col items-end justify-between self-stretch shrink-0 pl-1">
                    {/* Converted Amount with Chevron */}
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-base sm:text-[17px] font-bold text-[#191F28] tracking-tight">
                          {item.amountKrw !== null
                            ? formatCurrency(item.amountKrw, 'KRW')
                            : t('wallet.rate.unverified')}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#8B95A1] shrink-0" />
                      </div>
                      {/* Local Amount */}
                      <p className="text-xs text-[#8B95A1] font-medium pr-5">
                        {formatAmountNumber(item.amount, item.currency)} {item.currency}
                      </p>
                    </div>

                    {/* Trash Delete Action Button */}
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(item.id)}
                      aria-label={t('wallet.action.delete')}
                      className="p-1 text-[#8B95A1] hover:text-rose-600 transition-colors pt-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual Expense Bottom Sheet */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FFFFFF] border-t border-[#E5E8EB] rounded-t-3xl w-full max-w-md p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E8EB]">
              <div>
                <h3 className="text-base font-extrabold text-[#191F28] flex items-center gap-1.5">
                  {t('wallet.form.title')}
                </h3>
                <p className="text-xs text-[#8B95A1]">실제로 사용한 금액을 입력해 주세요.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-[#8B95A1] hover:text-[#191F28] rounded-full hover:bg-[#F8FAFC]"
                aria-label={t('common.action.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              {/* Amount & Currency */}
              <div>
                <label className="text-xs font-semibold text-[#8B95A1] block mb-1">
                  {t('wallet.form.amount')} · {currencyInput}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="any"
                    required
                    autoFocus
                    placeholder="0"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="flex-1 bg-[#FFFFFF] border border-[#E5E8EB] rounded-xl px-3.5 py-3 text-2xl font-bold text-[#191F28] focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                  />
                  <select
                    value={currencyInput}
                    onChange={(e) => setCurrencyInput(e.target.value)}
                    className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-xl px-3 py-3 text-sm font-semibold text-[#191F28] focus:outline-none"
                  >
                    <option value={localCurrency}>{localCurrency}</option>
                    <option value="KRW">KRW</option>
                    <option value="USD">USD</option>
                    <option value="JPY">JPY</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              {/* Payment Method - 2 Chips: Card / Cash (Unselected by default) */}
              <div>
                <label className="text-xs font-semibold text-[#8B95A1] block mb-1.5">
                  {t('wallet.form.payment_method')} · 선택 사항
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPaymentMethodInput((prev) => (prev === 'card' ? undefined : 'card'))
                    }
                    className={`min-h-[48px] rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 border ${paymentMethodInput === 'card'
                      ? 'bg-[#191F28] text-white border-[#191F28] shadow-sm'
                      : 'bg-[#FFFFFF] text-[#4E5968] border-[#E5E8EB] hover:bg-[#F8FAFC]'
                      }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>카드</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPaymentMethodInput((prev) => (prev === 'cash' ? undefined : 'cash'))
                    }
                    className={`min-h-[48px] rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 border ${paymentMethodInput === 'cash'
                      ? 'bg-[#191F28] text-white border-[#191F28] shadow-sm'
                      : 'bg-[#FFFFFF] text-[#4E5968] border-[#E5E8EB] hover:bg-[#F8FAFC]'
                      }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>현금</span>
                  </button>
                </div>
              </div>

              {/* Place / Merchant Name */}
              <div>
                <label className="text-xs font-semibold text-[#8B95A1] block mb-1">
                  {t('wallet.form.place')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="상호명 또는 장소 입력"
                    value={placeNameInput}
                    onChange={(e) => setPlaceNameInput(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#E5E8EB] rounded-xl px-3.5 py-2.5 text-xs text-[#191F28] focus:outline-none focus:ring-2 focus:ring-[#087F8C] pl-8"
                  />
                  <MapPin className="w-3.5 h-3.5 text-[#8B95A1] absolute left-2.5 top-3" />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-[#8B95A1] block mb-1">
                  {t('wallet.form.category')}
                </label>
                <select
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value as PlaceCategory)}
                  className="w-full bg-[#FFFFFF] border border-[#E5E8EB] rounded-xl px-3 py-2.5 text-xs font-medium text-[#191F28] focus:outline-none"
                >
                  <option value="food">식비 / 카페</option>
                  <option value="transit">교통</option>
                  <option value="shopping">쇼핑 / 마트</option>
                  <option value="stay">숙소</option>
                  <option value="attraction">관광</option>
                  <option value="all">기타</option>
                </select>
              </div>

              {/* Memo */}
              <div>
                <label className="text-xs font-semibold text-[#8B95A1] block mb-1">
                  {t('wallet.form.memo')}
                </label>
                <input
                  type="text"
                  placeholder={t('wallet.form.memo_placeholder')}
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#E5E8EB] rounded-xl px-3.5 py-2.5 text-xs text-[#191F28] focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                />
              </div>

              {/* Sticky / Primary Submit Action with Exact Amount Label */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!amountInput || parseFloat(amountInput) <= 0}
                  className="w-full min-h-[52px] py-3.5 bg-[#087F8C] hover:bg-[#066B77] disabled:opacity-40 text-white rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-all"
                >
                  {amountInput && parseFloat(amountInput) > 0
                    ? t('wallet.form.submit_amount', {
                      amount: formatAmountNumber(parseFloat(amountInput), currencyInput),
                      currencyName: currencyInput,
                    })
                    : t('wallet.form.save')}
                </button>
                <p className="text-[11px] text-[#8B95A1] text-center pt-2 leading-tight">
                  기기 저장 성공 후에만 기록 완료 표시
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {isClearAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-xl">
            <div className="w-10 h-10 rounded-full bg-[#FFFFFF] border border-[#E5E8EB] text-[#4E5968] flex items-center justify-center mx-auto mb-1 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <h3 className="text-sm font-bold text-center text-[#191F28]">
              {t('wallet.delete_all.title')}
            </h3>
            <p className="text-xs text-center text-[#4E5968]">
              {t('wallet.delete_all.body')}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearAllOpen(false)}
                className="flex-1 py-2.5 bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#4E5968] rounded-xl text-xs font-semibold border border-[#E5E8EB]"
              >
                {t('wallet.delete_all.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAllExpenses();
                  setIsClearAllOpen(false);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                {t('wallet.delete_all.action')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Expense Delete Confirmation Modal (D-P1-05 & Issue #17) */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl w-full max-w-sm p-5 space-y-3 shadow-xl">
            <div className="w-10 h-10 rounded-full bg-[#FFFFFF] border border-[#E5E8EB] text-[#4E5968] flex items-center justify-center mx-auto mb-1 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <h3 className="text-sm font-bold text-center text-[#191F28]">
              {t('wallet.delete_one.title')}
            </h3>
            <p className="text-xs text-center text-[#4E5968]">
              {t('wallet.delete_one.body')}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 py-2.5 bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#4E5968] rounded-xl text-xs font-semibold border border-[#E5E8EB]"
              >
                {t('wallet.delete_all.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteExpense(deleteTargetId);
                  setDeleteTargetId(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                {t('wallet.delete_one.action')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
