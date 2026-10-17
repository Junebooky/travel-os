'use client';

import React, { useState, useRef, ChangeEvent } from 'react';
import { useTravel } from '@/context/TravelContext';
import { t, formatCurrency, formatAmountNumber } from '@/lib/i18n';
import { MenuItemOCR, Place } from '@/types/travel';
import {
  Camera,
  Upload,
  X,
  RotateCcw,
  Sparkles,
  Wallet,
  MapPin,
  AlertCircle,
  Check,
  Edit2,
  RefreshCw,
} from 'lucide-react';

interface CameraMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlace?: Place | null;
}

export default function CameraMenuModal({ isOpen, onClose, initialPlace }: CameraMenuModalProps) {
  const {
    country,
    localCurrency,
    activePlace,
    addExpense,
    returnToMapWithPlace,
    convertCurrencyToKrw,
    showToast,
  } = useTravel();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [menuItems, setMenuItems] = useState<MenuItemOCR[]>([]);
  const [detectedCurrency, setDetectedCurrency] = useState<string>(localCurrency);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [demoNotice, setDemoNotice] = useState<string>('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>('');
  const [lastImageData, setLastImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [reviewingItem, setReviewingItem] = useState<MenuItemOCR | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const targetPlace = initialPlace || activePlace;

  // Load curated authentic sample menu explicitly
  const handleLoadSampleMenu = async () => {
    setIsLoading(true);
    setImagePreview('sample_demo');
    setLastImageData(null);
    setOcrError(null);
    try {
      const res = await fetch('/api/camera/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isSample: true,
          countryCode: country.code,
          currency: localCurrency,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setMenuItems(data.items);
        setDetectedCurrency(data.currency || localCurrency);
        setIsDemo(true);
        setDemoNotice(data.demoNotice || '');
        setOcrError(null);
      } else {
        const errMsg = data.message || t('common.error.service_unavailable');
        setOcrError(errMsg);
        showToast(errMsg, 'error');
      }
    } catch {
      const errMsg = t('common.error.service_unavailable');
      setOcrError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Reusable core OCR translation call (supports initial upload and retry without losing image)
  const processImage = async (base64Data: string, mimeType: string) => {
    setImagePreview(base64Data);
    setLastImageData({ base64: base64Data, mimeType });
    setIsLoading(true);
    setOcrError(null);

    // Build verified rates map from TravelContext
    const verifiedRatesMap: Record<string, number> = {};
    ['JPY', 'USD', 'EUR', 'VND', 'GBP', 'CNY', 'TWD', 'THB', 'SGD', 'AUD', 'CAD', 'CHF', 'HKD', 'PHP'].forEach((c) => {
      const conv = convertCurrencyToKrw(1, c);
      if (conv?.rate && conv.rate > 0 && !conv.isStale) {
        verifiedRatesMap[c] = conv.rate;
      }
    });

    const rateConv = convertCurrencyToKrw(100, localCurrency);
    const currentRateToKrw = rateConv && !rateConv.isStale ? rateConv.rate : undefined;

    try {
      const res = await fetch('/api/camera/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType,
          countryCode: country.code,
          currency: localCurrency,
          rateCurrency: localCurrency,
          rateToKrw: currentRateToKrw,
          ratesMap: verifiedRatesMap,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        const processedItems: MenuItemOCR[] = data.items.map((item: MenuItemOCR) => {
          const itemCurrency = (item.currency || data.currency || localCurrency).toUpperCase();
          // Verify conversion using the actual item currency
          const conv = convertCurrencyToKrw(item.originalPrice, itemCurrency);
          const isValid = Boolean(conv && conv.krw !== null && !conv.isStale);
          return {
            ...item,
            currency: itemCurrency,
            estimatedKrw: isValid ? conv!.krw : null,
            rateUnverified: !isValid,
          };
        });

        setMenuItems(processedItems);
        setDetectedCurrency((data.currency || localCurrency).toUpperCase());
        setIsDemo(Boolean(data.isDemo));
        setDemoNotice(data.demoNotice || '');
        setOcrError(null);
      } else {
        const errMsg = data.error === 'VISION_AI_NOT_CONFIGURED'
          ? t('camera.error.api_not_configured')
          : (data.message || t('camera.error.no_text'));
        setOcrError(errMsg);
        showToast(errMsg, data.error === 'VISION_AI_NOT_CONFIGURED' ? 'info' : 'error');
      }
    } catch {
      const errMsg = t('common.error.service_unavailable');
      setOcrError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Process image from file input
  const handleImageSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      showToast(t('camera.error.too_large'), 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      await processImage(base64Data, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  // Retry analyzing currently retained photo (D-P1-04)
  const handleRetryAnalysis = () => {
    if (lastImageData) {
      processImage(lastImageData.base64, lastImageData.mimeType);
    }
  };

  // Confirm and add extracted item to Travel Wallet with user review (D-P1-05 & Issue #17)
  const handleConfirmSaveToWallet = (item: MenuItemOCR) => {
    const itemCurrency = (item.currency || detectedCurrency).toUpperCase();
    const conversion = convertCurrencyToKrw(item.originalPrice, itemCurrency);
    const hasValidRate = Boolean(conversion && conversion.krw !== null && !conversion.isStale);

    const saved = addExpense({
      amount: item.originalPrice,
      currency: itemCurrency,
      amountKrw: hasValidRate ? conversion!.krw : null,
      placeName: targetPlace?.name || '현지 음식점',
      category: 'food',
      paymentMethod: 'card',
      memo: `메뉴 촬영 인식: ${item.originalName} (${item.translatedName})${isDemo ? ' [데모 예시]' : ''}`,
      rateUsed: hasValidRate && conversion
        ? {
            rate: conversion.rate,
            provider: conversion.provider,
            date: conversion.date,
          }
        : undefined,
    });

    if (saved) {
      setReviewingItem(null);
    }
  };

  // Return to Map with context preserved
  const handleReturnToMap = () => {
    onClose();
    returnToMapWithPlace(targetPlace);
  };

  // Save edited price (TB-P1-02 fix: only verified rates or null, no arbitrary 9.15)
  const handleSaveEditedPrice = (id: string) => {
    const num = parseFloat(editingPrice);
    if (!isNaN(num) && num >= 0) {
      setMenuItems((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            const itemCurrency = (item.currency || detectedCurrency).toUpperCase();
            const conversion = convertCurrencyToKrw(num, itemCurrency);
            const isValid = Boolean(conversion && conversion.krw !== null && !conversion.isStale);
            return {
              ...item,
              originalPrice: num,
              currency: itemCurrency,
              estimatedKrw: isValid ? conversion!.krw : null,
              rateUnverified: !isValid,
            };
          }
          return item;
        })
      );
    }
    setEditingItemId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                {t('camera.title')}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  B2·B3
                </span>
              </h2>
              {targetPlace && (
                <p className="text-[11px] text-emerald-400/90 flex items-center gap-1 truncate max-w-[200px]">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {targetPlace.name}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.action.close')}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleImageSelected}
          className="hidden"
        />
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageSelected}
          className="hidden"
        />

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Top Actions: Take Photo / Upload */}
          {!imagePreview && (
            <div className="border-2 border-dashed border-slate-700/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3 bg-slate-950/40">
              <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400">
                <Camera className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{t('camera.empty.title')}</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">{t('camera.empty.body')}</p>
              </div>

              <div className="flex items-center gap-2 pt-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  {t('camera.action.take_photo')}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  {t('camera.action.upload')}
                </button>
              </div>

              {/* Sample demo trigger button */}
              <button
                type="button"
                onClick={handleLoadSampleMenu}
                className="text-xs text-emerald-400/90 hover:text-emerald-300 hover:underline pt-1 flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {t('camera.action.load_sample')}
              </button>

              {/* Privacy Notice */}
              <div className="flex items-start gap-1.5 text-[11px] text-slate-400/90 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-left w-full max-w-xs mt-1">
                <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="block text-slate-300 font-semibold">{t('camera.privacy.benefit')}</span>
                  <span>{t('camera.privacy.notice')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Active Preview Thumbnail & Retake Button */}
          {imagePreview && (
            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div className="flex items-center space-x-2.5 truncate">
                {imagePreview === 'sample_demo' ? (
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                    DEMO
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt="Captured Menu"
                    className="w-10 h-10 object-cover rounded-lg border border-slate-700 shrink-0"
                  />
                )}
                <div className="truncate text-left">
                  <p className="text-xs font-semibold text-white truncate">
                    {t('price.detected_count', { count: menuItems.length })}
                  </p>
                  <p className="text-[10px] text-slate-400">{t('price.currency.detected', { currencyCode: detectedCurrency })}</p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setLastImageData(null);
                    setOcrError(null);
                    setMenuItems([]);
                    setReviewingItem(null);
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t('camera.action.rephoto')}
                </button>
              </div>
            </div>
          )}

          {/* Demo Notice Banner */}
          {isDemo && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="leading-tight space-y-0.5">
                <span className="font-semibold block">{demoNotice || t('camera.demo.notice')}</span>
                <span className="text-[11px] text-amber-400/80 block">{t('camera.demo.wallet_warning')}</span>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="py-10 flex flex-col items-center justify-center space-y-2 text-center">
              <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
              <p className="text-xs font-medium text-slate-300">{t('camera.status.processing')}</p>
              <p className="text-[11px] text-slate-500">{t('camera.status.ocr_analyzing')}</p>
            </div>
          )}

          {/* OCR Error with Retain Photo & Retry Button (D-P1-04) */}
          {ocrError && !isLoading && menuItems.length === 0 && (
            <div className="p-4 bg-rose-950/70 border border-rose-800/80 rounded-2xl text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-rose-200">{ocrError}</p>
                <p className="text-[11px] text-rose-300/80 mt-0.5">{t('camera.error.no_text')}</p>
              </div>
              {lastImageData && (
                <button
                  type="button"
                  onClick={handleRetryAnalysis}
                  className="py-2 px-4 bg-rose-800 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t('camera.action.retry_analysis')}
                </button>
              )}
            </div>
          )}

          {/* Extracted Menu Items List */}
          {!isLoading && menuItems.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-300 px-1 flex items-center justify-between">
                <span>{t('price.items.title')}</span>
                <span className="text-[10px] font-normal text-slate-400">{t('price.fee_notice')}</span>
              </h3>

              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-colors"
                >
                  {/* Dish Name: Original vs Korean */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-400 font-mono">{item.originalName}</p>
                      <h4 className="text-sm font-bold text-white tracking-wide">
                        {item.translatedName}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(item.isDemo || isDemo) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                          {t('camera.sample_badge')}
                        </span>
                      )}
                      {item.confidence && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {t('camera.preview.confidence_label', { confidencePercent: Math.round(item.confidence * 100) })}
                        </span>
                      )}
                    </div>
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-400 leading-snug">{item.description}</p>
                  )}

                  {/* Price & KRW Estimation */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <div className="flex items-baseline space-x-2">
                      {editingItemId === item.id ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            value={editingPrice}
                            onChange={(e) => setEditingPrice(e.target.value)}
                            className="w-20 px-1.5 py-0.5 bg-slate-800 border border-emerald-500 rounded text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditedPrice(item.id)}
                            className="p-1 bg-emerald-600 rounded text-white"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-bold text-emerald-400">
                            {formatAmountNumber(item.originalPrice, item.currency)} {item.currency}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItemId(item.id);
                              setEditingPrice(String(item.originalPrice));
                            }}
                            className="opacity-40 hover:opacity-100 text-slate-400 p-0.5"
                            title={t('price.action.edit_price')}
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {item.estimatedKrw !== null ? (
                        <span className="text-xs text-slate-400">
                          (약 {formatCurrency(item.estimatedKrw, 'KRW')})
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-400/90 font-medium">
                          ({t('price.unconvertible')})
                        </span>
                      )}
                    </div>

                    {/* Review Spend and Save to Wallet */}
                    <button
                      type="button"
                      onClick={() => setReviewingItem(item)}
                      aria-label={t('wallet.review.open')}
                      className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      {t('price.action.save_to_wallet')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Privacy Notice */}
          <div className="flex items-start space-x-1.5 text-[10px] text-slate-500 leading-tight pt-2">
            <AlertCircle className="w-3 h-3 shrink-0 text-slate-500 mt-0.5" />
            <span>{t('camera.privacy.notice')}</span>
          </div>
        </div>

        {/* Review Spend Dialog before Saving to Wallet (D-P1-05 & Issue #17) */}
        {reviewingItem && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-4 space-y-3.5 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Wallet className="w-4 h-4 text-indigo-400" />
                  <span>{t('wallet.review.open')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewingItem(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-slate-300">
                  {t('wallet.form.confirm_source')}
                </p>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-400 font-mono">{reviewingItem.originalName}</p>
                    <p className="text-sm font-bold text-white">{reviewingItem.translatedName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">
                      {formatAmountNumber(reviewingItem.originalPrice, reviewingItem.currency)} {reviewingItem.currency}
                    </p>
                    {reviewingItem.estimatedKrw !== null ? (
                      <p className="text-xs text-slate-400">
                        약 {formatCurrency(reviewingItem.estimatedKrw, 'KRW')}
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-400 font-medium">
                        {t('price.unconvertible')}
                      </p>
                    )}
                  </div>
                </div>
                {targetPlace && (
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-800/80">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    <span>{targetPlace.name}</span>
                  </p>
                )}
                {(isDemo || reviewingItem.isDemo) && (
                  <p className="text-[10px] text-amber-400 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                    * {t('wallet.form.sample_not_actual')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setReviewingItem(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  {t('wallet.form.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmSaveToWallet(reviewingItem)}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-all"
                >
                  {t('wallet.form.confirm_actual')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer: Return to Map CTA */}
        {targetPlace && (
          <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
            <span className="text-xs text-slate-400 truncate max-w-[200px]">
              {targetPlace.name}
            </span>
            <button
              type="button"
              onClick={handleReturnToMap}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              {t('camera.action.view_on_map')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
