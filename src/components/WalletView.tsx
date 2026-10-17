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
  } = useTravel();

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isClearAllOpen, setIsClearAllOpen] = useState<boolean>(false);

  // Form states
  const [amountInput, setAmountInput] = useState<string>('');
  const [currencyInput, setCurrencyInput] = useState<string>(localCurrency);
  const [placeNameInput, setPlaceNameInput] = useState<string>(activePlace?.name || '');
  const [categoryInput, setCategoryInput] = useState<PlaceCategory>('food');
  const [paymentMethodInput, setPaymentMethodInput] = useState<'card' | 'cash'>('card');
  const [memoInput, setMemoInput] = useState<string>('');

  // Total KRW spent and local spent
  const totalKrw = useMemo(() => {
    return expenses.reduce((sum, item) => sum + (item.amountKrw || 0), 0);
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
      map[e.category] = (map[e.category] || 0) + (e.amountKrw || 0);
    });
    return map;
  }, [expenses]);

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    // Approximate conversion rate based on currency
    const rateToKrw =
      currencyInput === 'JPY' ? 9.15 : currencyInput === 'USD' ? 1380 : currencyInput === 'EUR' ? 1480 : currencyInput === 'VND' ? 0.055 : 1;
    const computedKrw = Math.round(parsedAmount * rateToKrw);

    addExpense({
      amount: parsedAmount,
      currency: currencyInput,
      amountKrw: computedKrw,
      placeName: placeNameInput.trim() || '여행 지출',
      category: categoryInput,
      paymentMethod: paymentMethodInput,
      memo: memoInput.trim() || undefined,
      rateUsed: {
        rate: rateToKrw,
        provider: 'ECB/Frankfurter',
        date: formatDate(new Date()),
      },
    });

    // Reset and close
    setAmountInput('');
    setMemoInput('');
    setIsAddModalOpen(false);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 flex flex-col max-w-md mx-auto p-4 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              {t('wallet.title')}
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                {country.flag} {country.name}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {expenses.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearAllOpen(true)}
              aria-label={t('wallet.action.clear_all')}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setCurrencyInput(localCurrency);
              setPlaceNameInput(activePlace?.name || '');
              setIsAddModalOpen(true);
            }}
            className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-md active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            {t('wallet.action.add')}
          </button>
        </div>
      </div>

      {/* Active Place Context Banner */}
      {activePlace && (
        <div className="flex items-center justify-between p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs">
          <div className="flex items-center space-x-2 truncate">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-300 truncate">
              {activePlace.name}에서 방문 중
            </span>
          </div>
          <button
            type="button"
            onClick={() => returnToMapWithPlace(activePlace)}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium shrink-0 ml-2"
          >
            지도로 복귀
          </button>
        </div>
      )}

      {/* Summary Card */}
      <div className="p-4 bg-gradient-to-br from-indigo-950/60 to-slate-900/80 border border-indigo-900/40 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs text-indigo-300">
          <span className="flex items-center gap-1 font-medium">
            <TrendingDown className="w-3.5 h-3.5" />
            {t('wallet.summary.total_krw')}
          </span>
          <span className="text-slate-400 font-mono">
            {t('wallet.summary.count', { count: expenses.length })}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-extrabold text-white tracking-tight">
            {formatCurrency(totalKrw, 'KRW')}
          </div>
          {totalLocal > 0 && (
            <div className="text-xs text-slate-400 font-mono">
              약 {formatAmountNumber(totalLocal, localCurrency)} {localCurrency}
            </div>
          )}
        </div>

        {/* Category breakdown bar if expenses exist */}
        {expenses.length > 0 && (
          <div className="pt-2 border-t border-indigo-900/40 flex flex-wrap gap-1.5">
            {Object.entries(categoryTotals).map(([cat, val]) => (
              <span
                key={cat}
                className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 font-medium flex items-center gap-1"
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
        <div className="p-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center text-slate-500 mb-1">
            <Wallet className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">{t('wallet.empty.title')}</h3>
          <p className="text-xs text-slate-400 max-w-xs">{t('wallet.empty.body')}</p>
        </div>
      )}

      {/* Expense Item List */}
      <div className="space-y-2">
        {expenses.map((item) => (
          <div
            key={item.id}
            className="p-3.5 bg-slate-900/80 border border-slate-800/90 rounded-2xl flex items-center justify-between hover:border-slate-700/80 transition-all shadow-sm"
          >
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                {getCategoryIcon(item.category)}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-white tracking-wide truncate max-w-[160px]">
                    {item.placeName}
                  </h4>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 flex items-center gap-0.5">
                    {item.paymentMethod === 'card' ? (
                      <CreditCard className="w-2.5 h-2.5" />
                    ) : (
                      <Banknote className="w-2.5 h-2.5" />
                    )}
                    {item.paymentMethod === 'card' ? '카드' : '현금'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  {formatDate(new Date(item.timestamp), true)}
                </p>

                {item.memo && (
                  <p className="text-[10px] text-slate-400 bg-slate-950/40 px-1.5 py-0.5 rounded italic truncate max-w-[190px]">
                    {item.memo}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Amounts & Actions */}
            <div className="flex items-center space-x-2 shrink-0">
              <div className="text-right">
                <p className="text-xs font-bold text-white">
                  {formatCurrency(item.amountKrw, 'KRW')}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {formatAmountNumber(item.amount, item.currency)} {item.currency}
                </p>
              </div>

              <button
                type="button"
                onClick={() => deleteExpense(item.id)}
                aria-label={t('wallet.action.delete')}
                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Manual Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-4 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-400" />
                {t('wallet.form.title')}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3">
              {/* Amount & Currency */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  {t('wallet.form.amount')}
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
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <select
                    value={currencyInput}
                    onChange={(e) => setCurrencyInput(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value={localCurrency}>{localCurrency}</option>
                    <option value="KRW">KRW</option>
                    <option value="USD">USD</option>
                    <option value="JPY">JPY</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              {/* Place / Merchant Name */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  {t('wallet.form.place')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="상호명 또는 장소 입력"
                    value={placeNameInput}
                    onChange={(e) => setPlaceNameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 pl-8"
                  />
                  <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Category & Payment Method */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    {t('wallet.form.category')}
                  </label>
                  <select
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value as PlaceCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="food">식비 / 카페</option>
                    <option value="transit">교통</option>
                    <option value="shopping">쇼핑 / 마트</option>
                    <option value="stay">숙소</option>
                    <option value="attraction">관광</option>
                    <option value="all">기타</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    {t('wallet.form.payment_method')}
                  </label>
                  <div className="flex rounded-xl bg-slate-950 border border-slate-800 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setPaymentMethodInput('card')}
                      className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                        paymentMethodInput === 'card'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400'
                      }`}
                    >
                      카드
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethodInput('cash')}
                      className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                        paymentMethodInput === 'cash'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400'
                      }`}
                    >
                      현금
                    </button>
                  </div>
                </div>
              </div>

              {/* Memo */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  {t('wallet.form.memo')}
                </label>
                <input
                  type="text"
                  placeholder="예: 2인 점심 식사"
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-all mt-2"
              >
                {t('wallet.form.save')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {isClearAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-1">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-center text-white">
              {t('wallet.delete_all.title')}
            </h3>
            <p className="text-xs text-center text-slate-400">
              {t('wallet.delete_all.body')}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearAllOpen(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
              >
                {t('wallet.delete_all.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAllExpenses();
                  setIsClearAllOpen(false);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
              >
                {t('wallet.delete_all.action')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
