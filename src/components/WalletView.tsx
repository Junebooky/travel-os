'use client';

import React, { useState, useMemo } from 'react';
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
  ShoppingBag,
  Utensils,
  Car,
  Home,
  Compass,
} from 'lucide-react';

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

  const getCategoryIcon = (cat: PlaceCategory) => {
    switch (cat) {
      case 'food':
      case 'cafe':
        return <Utensils className="w-3.5 h-3.5 text-amber-400" />;
      case 'transit':
      case 'transport':
        return <Car className="w-3.5 h-3.5 text-blue-400" />;
      case 'stay':
        return <Home className="w-3.5 h-3.5 text-emerald-400" />;
      case 'shopping':
      case 'market':
        return <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Compass className="w-3.5 h-3.5 text-indigo-400" />;
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
              className="p-2 text-[#8B95A1] hover:text-[#191F28] hover:bg-[#FFFFFF] rounded-xl transition-colors"
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
            className="py-2 px-3.5 bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#191F28] border border-[#E5E8EB] rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 text-[#1B64DA]" />
            {t('wallet.action.add')}
          </button>
        </div>
      </div>

      {/* Active Place Context Banner */}
      {activePlace && (
        <div className="flex items-center justify-between p-3 bg-[#FFFFFF] border border-[#E5E8EB] rounded-xl text-xs shadow-sm">
          <div className="flex items-center space-x-2 truncate">
            <MapPin className="w-3.5 h-3.5 text-[#1B64DA] shrink-0" />
            <span className="text-[#4E5968] truncate font-medium">
              {activePlace.name}에서 방문 중
            </span>
          </div>
          <button
            type="button"
            onClick={() => returnToMapWithPlace(activePlace)}
            aria-label={t('wallet.a11y.return_map')}
            className="text-[11px] text-[#1B64DA] hover:underline font-semibold shrink-0 ml-2"
          >
            {t('flow.return_map')}
          </button>
        </div>
      )}

      {/* Summary Card */}
      <div className="p-4 bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs text-[#8B95A1]">
          <span className="flex items-center gap-1 font-medium text-[#4E5968]">
            <TrendingDown className="w-3.5 h-3.5 text-[#1B64DA]" />
            {t('wallet.summary.total_krw')}
          </span>
          <span className="text-[#8B95A1] font-mono">
            {t('wallet.summary.count', { count: expenses.length })}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div className="text-3xl font-extrabold text-[#191F28] tracking-tight">
            {formatCurrency(totalKrw, 'KRW')}
          </div>
          {totalLocal > 0 && (
            <div className="text-xs text-[#8B95A1] font-mono">
              약 {formatAmountNumber(totalLocal, localCurrency)} {localCurrency}
            </div>
          )}
        </div>

        {hasUncalculatedExpenses && (
          <div className="flex items-center justify-between text-[11px] text-[#4E5968] font-medium pt-1 border-t border-[#E5E8EB]">
            <span>* {t('wallet.summary.partial')} {t('wallet.rate.not_available')}</span>
            <button
              type="button"
              onClick={() => refreshRates()}
              className="text-[#1B64DA] hover:underline font-semibold ml-2 shrink-0"
            >
              {t('common.action.refresh')}
            </button>
          </div>
        )}

        {/* Category breakdown bar if expenses exist */}
        {expenses.length > 0 && (
          <div className="pt-2 border-t border-[#E5E8EB] flex flex-wrap gap-1.5">
            {Object.entries(categoryTotals).map(([cat, val]) => (
              <span
                key={cat}
                className="text-[10px] px-2.5 py-1 rounded-full bg-[#FFFFFF] text-[#4E5968] font-medium flex items-center gap-1 border border-[#E5E8EB]"
              >
                {getCategoryIcon(cat as PlaceCategory)}
                {formatCurrency(val || 0, 'KRW')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {expenses.length === 0 && (
        <div className="p-8 text-center bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#FFFFFF] border border-[#E5E8EB] flex items-center justify-center text-[#8B95A1] mb-1 shadow-xs">
            <Wallet className="w-6 h-6 text-[#1B64DA]" />
          </div>
          <h3 className="text-sm font-bold text-[#191F28]">{t('wallet.empty.title')}</h3>
          <p className="text-xs text-[#8B95A1] max-w-xs">{t('wallet.empty.body')}</p>
        </div>
      )}

      {/* Expense Item List */}
      <div className="space-y-2">
        {expenses.map((item) => (
          <div
            key={item.id}
            className="p-3.5 bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl flex items-center justify-between hover:border-[#8B95A1] transition-all shadow-sm"
          >
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-[#FFFFFF] border border-[#E5E8EB] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                {getCategoryIcon(item.category)}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-[#191F28] tracking-wide truncate max-w-[160px]">
                    {item.placeName}
                  </h4>
                  {item.paymentMethod && item.paymentMethod !== 'unknown' && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FFFFFF] text-[#4E5968] flex items-center gap-0.5 font-medium border border-[#E5E8EB]">
                      {item.paymentMethod === 'card' ? (
                        <CreditCard className="w-2.5 h-2.5 text-[#1B64DA]" />
                      ) : (
                        <Banknote className="w-2.5 h-2.5 text-[#4E5968]" />
                      )}
                      {item.paymentMethod === 'card' ? '카드' : '현금'}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[#8B95A1] flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#8B95A1]" />
                  {formatDate(new Date(item.timestamp), true)}
                </p>

                {item.memo && (
                  <p className="text-[10px] text-[#4E5968] bg-[#FFFFFF] border border-[#E5E8EB] px-1.5 py-0.5 rounded italic truncate max-w-[190px]">
                    {item.memo}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Amounts & Actions */}
            <div className="flex items-center space-x-2 shrink-0">
              <div className="text-right">
                {item.amountKrw !== null ? (
                  <p className="text-xs font-bold text-[#191F28]">
                    {formatCurrency(item.amountKrw, 'KRW')}
                  </p>
                ) : (
                  <p className="text-[11px] font-medium text-[#4E5968]">
                    {t('wallet.rate.unverified')}
                  </p>
                )}
                <p className="text-[10px] text-[#8B95A1] font-mono">
                  {formatAmountNumber(item.amount, item.currency)} {item.currency}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDeleteTargetId(item.id)}
                aria-label={t('wallet.action.delete')}
                className="p-1.5 text-[#8B95A1] hover:text-rose-600 hover:bg-[#F8FAFC] rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

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
                    className="flex-1 bg-[#FFFFFF] border border-[#E5E8EB] rounded-xl px-3.5 py-3 text-2xl font-bold text-[#191F28] focus:outline-none focus:ring-2 focus:ring-[#1B64DA]"
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
                    className={`min-h-[48px] rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 border ${
                      paymentMethodInput === 'card'
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
                    className={`min-h-[48px] rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 border ${
                      paymentMethodInput === 'cash'
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
                    className="w-full bg-[#FFFFFF] border border-[#E5E8EB] rounded-xl px-3.5 py-2.5 text-xs text-[#191F28] focus:outline-none focus:ring-2 focus:ring-[#1B64DA] pl-8"
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
                  className="w-full bg-[#FFFFFF] border border-[#E5E8EB] rounded-xl px-3.5 py-2.5 text-xs text-[#191F28] focus:outline-none focus:ring-2 focus:ring-[#1B64DA]"
                />
              </div>

              {/* Sticky / Primary Submit Action with Exact Amount Label */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!amountInput || parseFloat(amountInput) <= 0}
                  className="w-full min-h-[52px] py-3.5 bg-[#1B64DA] hover:bg-[#1652B5] disabled:opacity-40 text-white rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-all"
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
