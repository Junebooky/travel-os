'use client';

import React, { useState } from 'react';
import { useTravel } from '@/context/TravelContext';
import { COUNTRIES, SUPPORTED_LANGUAGES, SUPPORTED_CURRENCIES } from '@/data/countries';
import { t } from '@/lib/i18n';
import { Country } from '@/types/travel';
import { Check, Compass, Globe, MapPin, ArrowRight, ArrowLeft } from 'lucide-react';

export default function Onboarding() {
  const {
    country,
    setCountry,
    targetLang,
    setTargetLang,
    localCurrency,
    setLocalCurrency,
    setOnboardingCompleted,
    showToast,
  } = useTravel();

  const [step, setStep] = useState<number>(1);
  const totalSteps = 4;
  const [countrySearch, setCountrySearch] = useState<string>('');
  const [locationDenied, setLocationDenied] = useState<boolean>(false);

  // Filter countries
  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.includes(countrySearch) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Filter currencies
  const filteredCurrencies = SUPPORTED_CURRENCIES;

  const handleCountrySelect = (c: Country) => {
    setCountry(c);
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const handleRequestLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          showToast(t('onboarding.finish.toast'), 'success');
          setOnboardingCompleted(true);
        },
        (error) => {
          console.warn('[Location] Permission denied or error:', error);
          setLocationDenied(true);
        },
        { timeout: 8000 }
      );
    } else {
      setLocationDenied(true);
    }
  };

  const handleFinish = () => {
    showToast(t('onboarding.finish.toast'), 'success');
    setOnboardingCompleted(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 max-w-md mx-auto relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Progress Indicator */}
      <div className="relative z-10 pt-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">Travel OS</span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-blue-400 border border-slate-700/60">
            {t('onboarding.progress.label', { currentStep: step, totalSteps })}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-6">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 relative z-10 overflow-y-auto pr-1 -mr-1">
        {/* STEP 1: 여행 국가 선택 */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white mb-1.5">
                {t('onboarding.country.title')}
              </h2>
              <p className="text-sm text-slate-400">
                여행할 국가에 맞춰 지도, 언어, 환율을 자동으로 설정해 드려요.
              </p>
            </div>

            {/* Country search input */}
            <div className="relative">
              <input
                type="text"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder={t('onboarding.country.search')}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
              {countrySearch && (
                <button
                  onClick={() => setCountrySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  지우기
                </button>
              )}
            </div>

            {/* Country List */}
            <div className="grid grid-cols-1 gap-2.5 max-h-[46vh] overflow-y-auto pr-1">
              {filteredCountries.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  {t('onboarding.country.empty')}
                </div>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected = country.code === c.code;
                  return (
                    <button
                      key={c.code}
                      onClick={() => handleCountrySelect(c)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{c.flag}</span>
                        <div>
                          <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                            {c.name}
                            <span className="text-xs font-normal text-slate-400">({c.code})</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {c.defaultCurrency} · {c.defaultLang}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* STEP 2: 언어 설정 */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white mb-1.5">
                {t('onboarding.language.title')}
              </h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950/60 text-blue-300 text-xs border border-blue-800/40 mt-1">
                <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{t('onboarding.language.auto_note')}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-400 block mb-0.5">
                    {t('onboarding.language.source_label')}
                  </span>
                  <span className="text-sm font-semibold text-slate-100">한국어 (Korean)</span>
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50">
                  기본
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-2">
                  {t('onboarding.language.target_label')}
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-[42vh] overflow-y-auto pr-1">
                  {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'ko').map((lang) => {
                    const isSelected = targetLang === lang.code;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => setTargetLang(lang.code)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-blue-950/40 border-blue-500 shadow-sm'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-sm text-slate-100">{lang.name}</div>
                          <div className="text-xs text-slate-400">{lang.nativeName}</div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: 통화 설정 */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white mb-1.5">
                {t('onboarding.currency.title')}
              </h2>
              <p className="text-sm text-slate-400">
                여행지의 가격을 원화(KRW)로 실시간 비교 계산해 드려요.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-400 block mb-0.5">
                    {t('onboarding.currency.home_label')}
                  </span>
                  <span className="text-sm font-semibold text-slate-100">대한민국 원 (KRW, ₩)</span>
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50">
                  기본
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-2">
                  {t('onboarding.currency.local_label')}
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-[42vh] overflow-y-auto pr-1">
                  {filteredCurrencies.filter((c) => c.code !== 'KRW').map((curr) => {
                    const isSelected = localCurrency === curr.code;
                    return (
                      <button
                        key={curr.code}
                        onClick={() => setLocalCurrency(curr.code)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-blue-950/40 border-blue-500 shadow-sm'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-slate-200 text-sm">
                            {curr.symbol}
                          </span>
                          <div>
                            <div className="font-semibold text-sm text-slate-100">{curr.name}</div>
                            <div className="text-xs text-slate-400">{curr.code}</div>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: 위치 권한 안내 */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200 text-center py-6">
            <div className="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400 shadow-inner">
              <MapPin className="w-10 h-10 animate-bounce duration-1000" />
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                {t('onboarding.location.pre_title')}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-xs mx-auto">
                {t('onboarding.location.pre_body')}
              </p>
            </div>

            {locationDenied && (
              <div className="p-3.5 bg-amber-950/40 border border-amber-800/50 rounded-xl text-left">
                <div className="text-xs font-semibold text-amber-300 mb-0.5">
                  {t('onboarding.location.denied_title')}
                </div>
                <div className="text-xs text-amber-400/80">
                  {t('onboarding.location.denied_body')}
                </div>
              </div>
            )}

            <div className="pt-4 space-y-3">
              <button
                onClick={handleRequestLocation}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <MapPin className="w-4 h-4" />
                <span>{t('onboarding.location.allow')}</span>
              </button>

              <button
                onClick={handleFinish}
                className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium py-3.5 px-4 rounded-xl border border-slate-800 transition-all active:scale-[0.98]"
              >
                {t('onboarding.location.not_now')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Buttons (Steps 1-3) */}
      {step < 4 && (
        <div className="relative z-10 pt-4 border-t border-slate-900 flex items-center gap-3">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium border border-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('onboarding.back')}</span>
            </button>
          ) : (
            <div className="flex-1" />
          )}

          <button
            onClick={handleNext}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>{t('onboarding.next')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
