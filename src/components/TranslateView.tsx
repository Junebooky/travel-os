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
  const [translatedText, setTranslatedText] = useState<string>(
    () => defaultPhrase.targetTranslations[targetLang] || defaultPhrase.targetTranslations['ja'] || ''
  );
  const [romanization, setRomanization] = useState<string>(
    () => defaultPhrase.romanizations?.[targetLang] || defaultPhrase.romanizations?.['ja'] || ''
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestedAlternatives, setSuggestedAlternatives] = useState<Array<{ id: string; korean: string; translation: string; romanization: string }>>([]);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState<boolean>(false);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef<number>(0);

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
      if (sourceLang === 'ko') {
        setInputText(phrase.korean);
        const trans = phrase.targetTranslations[targetLang] || phrase.targetTranslations['en'] || phrase.korean;
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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 flex flex-col max-w-md mx-auto">
      {/* Active Place Context Sticky Banner */}
      {activePlace && (
        <div className="sticky top-0 z-30 bg-blue-950/90 backdrop-blur-md border-b border-blue-800/60 px-4 py-2.5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-xs font-semibold text-blue-200 truncate">
              {activePlace.name} · {t('place.detail.quick_phrases')}
            </span>
          </div>
          <button
            onClick={() => returnToMapWithPlace(activePlace)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-300 hover:text-white bg-blue-900/60 hover:bg-blue-800/80 px-2.5 py-1.5 rounded-lg border border-blue-700/60 transition-all active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('translate.return_map')}</span>
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="p-4 space-y-4">
        {/* Language Selection Header */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-lg">
          <div className="flex-1 text-center">
            <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
              {t('translate.source.label')}
            </span>
            <span className="text-sm font-bold text-slate-100">
              {sourceLang === 'ko' ? '한국어' : sourceLang.toUpperCase()}
            </span>
          </div>

          <button
            onClick={handleSwapLanguages}
            className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700/80 active:scale-90 transition-all shadow-md mx-2"
            aria-label={t('translate.language.swap')}
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 text-center">
            <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
              {t('translate.target.label')}
            </span>
            <span className="text-sm font-bold text-blue-400">
              {targetLang === 'ko' ? '한국어' : `${country.name}어 (${targetLang.toUpperCase()})`}
            </span>
          </div>
        </div>

        {/* Track B Features Launcher Row */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setIsVoiceModalOpen(true)}
            className="p-3 bg-gradient-to-r from-indigo-950/80 to-slate-900 border border-indigo-800/60 rounded-2xl flex items-center space-x-2.5 text-left hover:border-indigo-600 transition-all active:scale-95 shadow-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1">
                {t('voice.title')}
                <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">B1</span>
              </p>
              <p className="text-[10px] text-slate-400">실시간 2인 음성 대화</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsCameraModalOpen(true)}
            className="p-3 bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-800/60 rounded-2xl flex items-center space-x-2.5 text-left hover:border-emerald-600 transition-all active:scale-95 shadow-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1">
                {t('camera.title')}
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">B2·B3</span>
              </p>
              <p className="text-[10px] text-slate-400">메뉴판 번역·가격 환산</p>
            </div>
          </button>
        </div>

        {/* Situational Category Filter Tabs */}
        <div>
          <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shadow-md active:scale-95 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-blue-600/30 ring-1 ring-blue-400'
                      : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
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
                className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-500 text-blue-200 shadow-md shadow-blue-500/10'
                    : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-slate-100 mb-0.5">{phrase.korean}</div>
                {phrase.targetTranslations[targetLang] && (
                  <div className="text-[11px] text-blue-400/90 font-medium truncate">
                    {phrase.targetTranslations[targetLang]}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Input Text Box */}
        <div className="relative bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3 shadow-lg focus-within:ring-2 focus-within:ring-blue-500/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-slate-400">
              {t('translate.input.label')}
            </span>
            {inputText && (
              <button
                onClick={() => handleInputChange('')}
                className="text-xs text-slate-400 hover:text-slate-200 p-0.5"
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
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none"
          />

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <button
              onClick={() => handleTranslate(inputText)}
              disabled={isLoading || !inputText.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isLoading ? t('translate.processing') : t('translate.action')}</span>
            </button>
          </div>
        </div>

        {/* Translation Error & Safety Card */}
        {errorMessage && (
          <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-4 shadow-xl space-y-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-amber-300 mb-1">
                  {t('common.error.generic_title')}
                </div>
                <div className="text-xs text-amber-200/90 leading-relaxed">
                  {errorMessage}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-amber-900/50">
              <button
                onClick={() => handleTranslate(inputText)}
                className="py-2 px-3 rounded-xl bg-amber-900/60 hover:bg-amber-850 text-amber-200 text-xs font-semibold transition-all active:scale-95"
              >
                {t('common.action.retry')}
              </button>
            </div>

            {/* Suggested verified travel phrases if available */}
            {suggestedAlternatives.length > 0 && (
              <div className="pt-2 border-t border-amber-900/50 space-y-2">
                <span className="text-[11px] font-semibold text-amber-300 block">
                  안전한 추천 상황별 문장 사용하기
                </span>
                <div className="space-y-1.5">
                  {suggestedAlternatives.map((alt) => (
                    <button
                      key={alt.id}
                      onClick={() => handleSelectPhrase(alt)}
                      className="w-full text-left p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-amber-900/40 hover:border-amber-700/60 text-xs transition-all text-slate-200"
                    >
                      <div className="font-semibold text-slate-100">{alt.korean}</div>
                      <div className="text-[11px] text-blue-400">{alt.translation}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Translation Result Card */}
        {translatedText && (
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-blue-500/30 rounded-2xl p-4 shadow-xl shadow-blue-950/20 space-y-3 relative overflow-hidden animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs text-blue-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                {targetLang === 'ko' ? '한국어 번역 결과' : `${country.name}어 번역 결과`}
              </span>
              <button
                onClick={() => setIsFullscreenModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/70 hover:bg-blue-900 border border-blue-800/60 text-[11px] text-blue-300 transition-all active:scale-95"
              >
                <Maximize2 className="w-3 h-3" />
                <span>{t('translate.result.large')}</span>
              </button>
            </div>

            {/* Translated Output */}
            <div className="text-xl font-extrabold text-white tracking-tight leading-relaxed select-all">
              {translatedText}
            </div>

            {/* Romanization / Pronunciation Guide */}
            {romanization && (
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-amber-300 font-medium">
                <span className="text-[10px] text-slate-400 block mb-0.5">발음 안내</span>
                {romanization}
              </div>
            )}

            {/* Actions: Speak & Copy */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
              <button
                onClick={() => handleSpeakText(translatedText, targetLang)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-100 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700/60 transition-all active:scale-95 shadow-sm"
              >
                <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('translate.result.listen')}</span>
              </button>

              <button
                onClick={() => handleCopyText(translatedText)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-100 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700/60 transition-all active:scale-95 shadow-sm"
              >
                <Copy className="w-3.5 h-3.5 text-slate-300" />
                <span>{t('translate.result.copy')}</span>
              </button>
            </div>
          </div>
        )}
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
