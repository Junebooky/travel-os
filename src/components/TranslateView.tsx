'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useTravel } from '@/context/TravelContext';
import { t } from '@/lib/i18n';
import { QUICK_PHRASES } from '@/data/phrases';
import { PlaceCategory, QuickPhrase } from '@/types/travel';
import {
  ArrowLeft,
  ArrowRightLeft,
  Volume2,
  Copy,
  Maximize2,
  X,
  RotateCw,
  Utensils,
  Coffee,
  HeartPulse,
  ShoppingBag,
  Train,
  AlertCircle,
  Sparkles,
  Send,
  MapPin,
  Check,
  Store,
  Mic,
  Camera,
} from 'lucide-react';
import { TRANSLATE_CATEGORIES, normalizeCategory } from '@/lib/categories';
import VoiceChatModal from '@/components/VoiceChatModal';
import CameraMenuModal from '@/components/CameraMenuModal';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  food: Utensils,
  cafe: Coffee,
  shopping: ShoppingBag,
  market: Store,
  pharmacy: HeartPulse,
  transport: Train,
};

const CATEGORIES = TRANSLATE_CATEGORIES.map((cat) => ({
  id: cat.id,
  labelKey: cat.labelKey,
  icon: CATEGORY_ICONS[cat.id] || Sparkles,
}));

export default function TranslateView() {
  const {
    country,
    sourceLang,
    setSourceLang,
    targetLang,
    setTargetLang,
    activePlace,
    returnToMapWithPlace,
    showToast,
  } = useTravel();

  // Set default category based on activePlace category if available
  const initialCategory: PlaceCategory = activePlace?.category
    ? normalizeCategory(activePlace.category)
    : 'food';

  const defaultPhrase = QUICK_PHRASES[0];

  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory>(initialCategory);
  const [inputText, setInputText] = useState<string>(defaultPhrase.korean);
  const [translatedText, setTranslatedText] = useState<string>(() => {
    if (sourceLang === targetLang) return '';
    return defaultPhrase.targetTranslations[targetLang] || '';
  });
  const [romanization, setRomanization] = useState<string>(() => {
    if (sourceLang === targetLang) return '';
    return defaultPhrase.romanizations?.[targetLang] || '';
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestedAlternatives, setSuggestedAlternatives] = useState<Array<{ id: string; korean: string; translation: string; romanization: string }>>([]);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState<boolean>(false);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef<number>(0);

  // Sync translation when targetLang or sourceLang changes from context (e.g. country change)
  const [prevLangs, setPrevLangs] = useState<{ source: string; target: string }>({ source: sourceLang, target: targetLang });
  if (prevLangs.source !== sourceLang || prevLangs.target !== targetLang) {
    setPrevLangs({ source: sourceLang, target: targetLang });
    setErrorMessage(null);
    setSuggestedAlternatives([]);
    if (sourceLang === targetLang) {
      setTranslatedText('');
      setRomanization('');
    } else {
      const match = QUICK_PHRASES.find((p) => p.korean === inputText);
      if (match && match.targetTranslations[targetLang]) {
        setTranslatedText(match.targetTranslations[targetLang]);
        setRomanization(match.romanizations?.[targetLang] || '');
      } else {
        setTranslatedText('');
        setRomanization('');
      }
    }
  }

  // Invalidate stale translation and cancel any in-flight requests when input text changes
  const handleInputChange = (newText: string) => {
    setInputText(newText);
    setTranslatedText('');
    setRomanization('');
    setErrorMessage(null);
    setSuggestedAlternatives([]);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  // Filter phrases by category
  const categoryPhrases = useMemo(() => {
    return QUICK_PHRASES.filter(
      (p) => normalizeCategory(p.category) === normalizeCategory(selectedCategory)
    );
  }, [selectedCategory]);

  // Translate function with AbortController and race condition safety
  const handleTranslate = useCallback(async (textToTranslate: string) => {
    if (!textToTranslate.trim()) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = ++activeRequestIdRef.current;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToTranslate,
          sourceLang,
          targetLang,
        }),
        signal: controller.signal,
      });

      const data = await res.json();
      if (requestId !== activeRequestIdRef.current) return;

      if (res.ok && data.success) {
        setTranslatedText(data.translation || '');
        setRomanization(data.romanization || '');
        setErrorMessage(null);
        setSuggestedAlternatives([]);
      } else {
        // Translation service error or key missing:
        // Strictly preserve user input, DO NOT show fake translation
        setTranslatedText('');
        setRomanization('');
        setErrorMessage(
          data.message || t('common.error.service_unavailable')
        );
        if (data.suggestedPhrases) {
          setSuggestedAlternatives(data.suggestedPhrases);
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      if (requestId !== activeRequestIdRef.current) return;

      // Local check if matches verified phrases
      const match = QUICK_PHRASES.find(
        (p) => p.korean.replace(/[.?!]/g, '').trim() === textToTranslate.replace(/[.?!]/g, '').trim()
      );
      if (match && match.targetTranslations[targetLang]) {
        setTranslatedText(match.targetTranslations[targetLang]);
        setRomanization(match.romanizations?.[targetLang] || '');
        setErrorMessage(null);
      } else {
        setTranslatedText('');
        setRomanization('');
        setErrorMessage(t('common.error.service_unavailable'));
      }
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [sourceLang, targetLang]);

  const handleSelectPhrase = (phrase: QuickPhrase | { id: string; korean: string; translation?: string; romanization?: string; sourceText?: string; targetText?: string }) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setErrorMessage(null);
    setSuggestedAlternatives([]);
    if ('targetTranslations' in phrase) {
      if (sourceLang === targetLang) {
        setInputText(phrase.korean);
        setTranslatedText(phrase.korean);
        setRomanization('');
      } else if (sourceLang === 'ko') {
        setInputText(phrase.korean);
        const trans = phrase.targetTranslations[targetLang] || phrase.korean;
        setTranslatedText(trans);
        setRomanization(phrase.romanizations?.[targetLang] || '');
      } else if (targetLang === 'ko') {
        const foreign = phrase.targetTranslations[sourceLang] || phrase.korean;
        setInputText(foreign);
        setTranslatedText(phrase.korean);
        setRomanization('');
      } else {
        const src = phrase.targetTranslations[sourceLang] || phrase.korean;
        const tgt = phrase.targetTranslations[targetLang] || phrase.korean;
        setInputText(src);
        setTranslatedText(tgt);
        setRomanization(phrase.romanizations?.[targetLang] || '');
      }
    } else {
      if (phrase.sourceText && phrase.targetText) {
        setInputText(phrase.sourceText);
        setTranslatedText(phrase.targetText);
      } else {
        setInputText(phrase.korean);
        setTranslatedText(phrase.translation || phrase.korean);
      }
      setRomanization(phrase.romanization || '');
    }
  };

  const handleSwapLanguages = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    setErrorMessage(null);
    setSuggestedAlternatives([]);
    // Swap text
    if (translatedText) {
      const oldInput = inputText;
      setInputText(translatedText);
      setTranslatedText(oldInput);
      setRomanization('');
    } else {
      setTranslatedText('');
      setRomanization('');
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(t('translate.result.copied'), 'success');
  };

  const getSpeechLangCode = (lang: string) => {
    switch (lang) {
      case 'ja': return 'ja-JP';
      case 'en': return 'en-US';
      case 'zh-TW': return 'zh-TW';
      case 'th': return 'th-TH';
      case 'vi': return 'vi-VN';
      case 'fr': return 'fr-FR';
      case 'it': return 'it-IT';
      case 'es': return 'es-ES';
      case 'ko': return 'ko-KR';
      default: return lang;
    }
  };

  const handleSpeakText = (text: string, langCode: string) => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = getSpeechLangCode(langCode);
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      } catch {
        showToast(t('translate.result.tts_unavailable'), 'error');
      }
    } else {
      showToast(t('translate.result.tts_unavailable'), 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F4F6] text-[#191F28] pb-24 flex flex-col max-w-md mx-auto">
      {/* Active Place Context Sticky Banner */}
      {activePlace && (
        <div className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#E5E8EB] px-4 py-2.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <MapPin className="w-4 h-4 text-[#1B64DA] shrink-0" />
            <span className="text-xs font-semibold text-[#191F28] truncate">
              {activePlace.name} · {t('place.detail.quick_phrases')}
            </span>
          </div>
          <button
            onClick={() => returnToMapWithPlace(activePlace)}
            className="flex items-center gap-1 text-xs font-semibold text-[#4E5968] hover:text-[#191F28] bg-[#F2F4F6] hover:bg-[#E5E8EB] px-2.5 py-1.5 rounded-lg border border-[#E5E8EB] transition-all active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('translate.return_map')}</span>
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="p-4 space-y-4">
        {/* Language Selection Header */}
        <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
          <div className="flex-1 text-center">
            <span className="text-[11px] font-medium text-[#8B95A1] block mb-0.5">
              {t('translate.source.label')}
            </span>
            <span className="text-sm font-bold text-[#191F28]">
              {sourceLang === 'ko' ? '한국어' : sourceLang.toUpperCase()}
            </span>
          </div>

          <button
            onClick={handleSwapLanguages}
            className="p-2.5 rounded-full bg-[#F2F4F6] hover:bg-[#E5E8EB] text-[#1B64DA] border border-[#E5E8EB] active:scale-90 transition-all shadow-sm mx-2"
            aria-label={t('translate.language.swap')}
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 text-center">
            <span className="text-[11px] font-medium text-[#8B95A1] block mb-0.5">
              {t('translate.target.label')}
            </span>
            <span className="text-sm font-bold text-[#191F28]">
              {targetLang === 'ko' ? '한국어' : `${country.name}어 (${targetLang.toUpperCase()})`}
            </span>
          </div>
        </div>

        {/* Input Text Box */}
        <div className="relative bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-4 shadow-sm focus-within:ring-2 focus-within:ring-[#1B64DA]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-[#8B95A1]">
              {t('translate.input.label')}
            </span>
            {inputText && (
              <button
                onClick={() => handleInputChange('')}
                className="text-xs text-[#8B95A1] hover:text-[#191F28] p-0.5"
                aria-label={t('translate.input.clear')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <textarea
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            rows={2}
            placeholder={t('translate.input.placeholder')}
            className="w-full bg-transparent text-lg font-bold text-[#191F28] placeholder-[#8B95A1] resize-none focus:outline-none"
          />

          <div className="flex justify-end pt-2 border-t border-[#F2F4F6]">
            <button
              onClick={() => handleTranslate(inputText)}
              disabled={isLoading || !inputText.trim()}
              className="w-full py-3 rounded-xl bg-[#1B64DA] hover:bg-[#1652B5] text-white font-bold text-sm shadow-sm flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{isLoading ? t('translate.processing') : t('translate.action')}</span>
            </button>
          </div>
        </div>

        {/* Translation Error & Safety Card */}
        {errorMessage && (
          <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#4E5968] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-[#191F28] mb-1">
                  {t('common.error.generic_title')}
                </div>
                <div className="text-xs text-[#4E5968] leading-relaxed">
                  {errorMessage}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-[#E5E8EB]">
              <button
                onClick={() => handleTranslate(inputText)}
                className="py-2 px-3 rounded-xl bg-[#F2F4F6] hover:bg-[#E5E8EB] text-[#191F28] text-xs font-semibold transition-all active:scale-95 border border-[#E5E8EB]"
              >
                {t('common.action.retry')}
              </button>
            </div>

            {/* Suggested verified travel phrases if available */}
            {suggestedAlternatives.length > 0 && (
              <div className="pt-2 border-t border-[#E5E8EB] space-y-2">
                <span className="text-[11px] font-semibold text-[#4E5968] block">
                  안전한 추천 상황별 문장 사용하기
                </span>
                <div className="space-y-1.5">
                  {suggestedAlternatives.map((alt) => (
                    <button
                      key={alt.id}
                      onClick={() => handleSelectPhrase(alt)}
                      className="w-full text-left p-2.5 rounded-xl bg-[#F2F4F6] hover:bg-[#E5E8EB] border border-[#E5E8EB] text-xs transition-all text-[#191F28]"
                    >
                      <div className="font-semibold text-[#191F28]">{alt.korean}</div>
                      <div className="text-[11px] text-[#1B64DA]">{alt.translation}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Translation Result Card */}
        {translatedText && (
          <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-4 shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-[#4E5968] font-semibold">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#1B64DA]" />
                {targetLang === 'ko' ? '한국어 번역 결과' : `${country.name}어 번역 결과`}
              </span>
              <button
                onClick={() => setIsFullscreenModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F2F4F6] hover:bg-[#E5E8EB] border border-[#E5E8EB] text-[11px] text-[#4E5968] hover:text-[#191F28] transition-all active:scale-95"
              >
                <Maximize2 className="w-3 h-3" />
                <span>{t('translate.result.large')}</span>
              </button>
            </div>

            {/* Translated Output */}
            <div className="text-2xl font-bold text-[#191F28] tracking-tight leading-relaxed select-all">
              {translatedText}
            </div>

            {/* Romanization / Pronunciation Guide */}
            {romanization && (
              <div className="p-2.5 rounded-xl bg-[#F2F4F6] border border-[#E5E8EB] text-xs text-[#4E5968] font-medium">
                <span className="text-[10px] text-[#8B95A1] block mb-0.5">발음 안내</span>
                {romanization}
              </div>
            )}

            {/* Actions: Speak & Copy */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#E5E8EB]">
              <button
                onClick={() => handleSpeakText(translatedText, targetLang)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#F2F4F6] hover:bg-[#E5E8EB] text-[#191F28] font-semibold text-xs flex items-center justify-center gap-1.5 border border-[#E5E8EB] transition-all active:scale-95 shadow-sm"
              >
                <Volume2 className="w-3.5 h-3.5 text-[#1B64DA]" />
                <span>{t('translate.result.listen')}</span>
              </button>

              <button
                onClick={() => handleCopyText(translatedText)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#F2F4F6] hover:bg-[#E5E8EB] text-[#191F28] font-semibold text-xs flex items-center justify-center gap-1.5 border border-[#E5E8EB] transition-all active:scale-95 shadow-sm"
              >
                <Copy className="w-3.5 h-3.5 text-[#4E5968]" />
                <span>{t('translate.result.copy')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Track B Features Launcher Row (Clean Neutral Card Style) */}
        <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-3.5 shadow-sm space-y-2">
          <div className="text-xs font-semibold text-[#8B95A1] px-1">
            다른 방식
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsVoiceModalOpen(true)}
              className="p-3 bg-[#F2F4F6] hover:bg-[#E5E8EB] border border-[#E5E8EB] rounded-xl flex items-center space-x-2.5 text-left transition-all active:scale-95"
            >
              <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] text-[#1B64DA] flex items-center justify-center shrink-0 border border-[#E5E8EB]">
                <Mic className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#191F28] truncate">
                  {t('voice.title')}
                </p>
                <p className="text-[10px] text-[#8B95A1] truncate">실시간 2인 대화</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              className="p-3 bg-[#F2F4F6] hover:bg-[#E5E8EB] border border-[#E5E8EB] rounded-xl flex items-center space-x-2.5 text-left transition-all active:scale-95"
            >
              <div className="w-8 h-8 rounded-lg bg-[#FFFFFF] text-[#1B64DA] flex items-center justify-center shrink-0 border border-[#E5E8EB]">
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#191F28] truncate">
                  {t('camera.title')}
                </p>
                <p className="text-[10px] text-[#8B95A1] truncate">메뉴판 번역·환산</p>
              </div>
            </button>
          </div>
        </div>

        {/* Situational Category Filter Tabs */}
        <div>
          <div className="text-xs font-semibold text-[#8B95A1] mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#1B64DA]" />
            <span>{t('place.phrases.list_title')}</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-4 px-4">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-sm active:scale-95 ${
                    isSelected
                      ? 'bg-[#191F28] text-white'
                      : 'bg-[#FFFFFF] text-[#4E5968] hover:text-[#191F28] border border-[#E5E8EB]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t(cat.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Travel Phrases Carousel / Chips */}
        <div className="grid grid-cols-1 gap-2">
          {categoryPhrases.map((phrase) => {
            const isSelected = inputText === phrase.korean;
            return (
              <button
                key={phrase.id}
                onClick={() => handleSelectPhrase(phrase)}
                className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all ${
                  isSelected
                    ? 'bg-[#FFFFFF] border-[#1B64DA] ring-1 ring-[#1B64DA] text-[#191F28] shadow-sm'
                    : 'bg-[#FFFFFF] border-[#E5E8EB] text-[#4E5968] hover:text-[#191F28] hover:border-[#8B95A1]'
                }`}
              >
                <div className="font-semibold text-[#191F28] mb-0.5">{phrase.korean}</div>
                {phrase.targetTranslations[targetLang] && (
                  <div className="text-[11px] text-[#1B64DA] font-medium truncate">
                    {phrase.targetTranslations[targetLang]}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fullscreen Big Text Modal ('큰 글씨' 상대방에게 보여주기 모드) */}
      {isFullscreenModalOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Top Bar with Close and Flip controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-all"
            >
              <RotateCw className="w-4 h-4 text-blue-400" />
              <span>화면 뒤집기 (180°)</span>
            </button>

            <button
              onClick={() => setIsFullscreenModalOpen(false)}
              className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              aria-label={t('common.action.close')}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Centered Giant High-Contrast Text */}
          <div
            className={`flex-1 flex flex-col items-center justify-center text-center px-4 transition-transform duration-300 ${
              isFlipped ? 'rotate-180' : ''
            }`}
          >
            <div className="text-3xl md:text-5xl font-black text-white leading-tight mb-4 tracking-tight">
              {translatedText}
            </div>
            {romanization && (
              <div className="text-xl md:text-2xl font-bold text-amber-400/90 mt-2">
                {romanization}
              </div>
            )}
            <div className="text-sm text-slate-400 mt-6 border-t border-slate-800 pt-4">
              {inputText}
            </div>
          </div>

          {/* Bottom Audio trigger */}
          <div className="flex justify-center">
            <button
              onClick={() => handleSpeakText(translatedText, targetLang)}
              className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/40 flex items-center gap-2 active:scale-95 transition-all"
            >
              <Volume2 className="w-5 h-5" />
              <span>{t('translate.result.listen')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Track B Modals */}
      <VoiceChatModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />
      <CameraMenuModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
      />
    </div>
  );
}
