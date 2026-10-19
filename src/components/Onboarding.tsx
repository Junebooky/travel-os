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
    setMapViewport,
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
        (pos) => {
          setMapViewport({
            center: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            zoom: 15,
          });
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
    <div className="min-h-screen bg-[#FFFFFF] text-[#191F28] flex flex-col justify-between p-6 max-w-md mx-auto relative overflow-hidden">
      {/* Header & Progress Indicator */}
      <div className="relative z-10 pt-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#087F8C] flex items-center justify-center shadow-sm">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight text-[#191F28]">Travel OS</span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FFFFFF] text-[#087F8C] border border-[#E5E8EB] shadow-sm">
            {t('onboarding.progress.label', { currentStep: step, totalSteps })}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#E5E8EB] h-1.5 rounded-full overflow-hidden mb-6">
          <div
            className="bg-[#087F8C] h-full transition-all duration-300 ease-out"
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
              <h2 className="text-2xl font-bold tracking-tight text-[#191F28] mb-1.5">
                {t('onboarding.country.title')}
              </h2>
              <p className="text-sm text-[#4E5968]">
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
                className="w-full bg-[#FFFFFF] border border-[#E5E8EB] rounded-xl px-4 py-3 text-sm text-[#191F28] placeholder-[#8B95A1] focus:outline-none focus:ring-2 focus:ring-[#087F8C]/30 shadow-sm transition-all"
              />
              {countrySearch && (
                <button
                  onClick={() => setCountrySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8B95A1] hover:text-[#191F28]"
                >
                  지우기
                </button>
              )}
            </div>

            {/* Country List */}
            <div className="grid grid-cols-1 gap-2.5 max-h-[46vh] overflow-y-auto pr-1">
              {filteredCountries.length === 0 ? (
                <div className="text-center py-10 text-[#8B95A1] text-sm">
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
                          ? 'bg-[#FFFFFF] border-[#087F8C] shadow-sm ring-1 ring-[#087F8C]'
                          : 'bg-[#FFFFFF] border-[#E5E8EB] hover:border-[#8B95A1]/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{c.flag}</span>
                        <div>
                          <div className="font-semibold text-sm text-[#191F28] flex items-center gap-2">
                            {c.name}
                            <span className="text-xs font-normal text-[#8B95A1]">({c.code})</span>
                          </div>
                          <div className="text-xs text-[#4E5968] mt-0.5">
                            {c.defaultCurrency} · {c.defaultLang}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#087F8C] flex items-center justify-center text-white">
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
              <h2 className="text-2xl font-bold tracking-tight text-[#191F28] mb-1.5">
                {t('onboarding.language.title')}
              </h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFFFF] text-[#087F8C] text-xs border border-[#E5E8EB] mt-1 shadow-sm font-medium">
                <Globe className="w-3.5 h-3.5 text-[#087F8C] shrink-0" />
                <span>{t('onboarding.language.auto_note')}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-3.5 bg-[#FFFFFF] border border-[#E5E8EB] rounded-xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-xs font-medium text-[#4E5968] block mb-0.5">
                    {t('onboarding.language.source_label')}
                  </span>
                  <span className="text-sm font-semibold text-[#191F28]">한국어 (Korean)</span>
                </div>
                <span className="text-xs text-[#087F8C] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#E5E8EB] font-medium">
                  기본
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-[#4E5968] block mb-2">
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
                            ? 'bg-[#FFFFFF] border-[#087F8C] shadow-sm ring-1 ring-[#087F8C]'
                            : 'bg-[#FFFFFF] border-[#E5E8EB] hover:border-[#8B95A1]/40'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-sm text-[#191F28]">{lang.name}</div>
                          <div className="text-xs text-[#4E5968]">{lang.nativeName}</div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#087F8C] flex items-center justify-center text-white">
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
              <h2 className="text-2xl font-bold tracking-tight text-[#191F28] mb-1.5">
                {t('onboarding.currency.title')}
              </h2>
              <p className="text-sm text-[#4E5968]">
                여행지의 가격을 원화(KRW)로 실시간 비교 계산해 드려요.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="p-3.5 bg-[#FFFFFF] border border-[#E5E8EB] rounded-xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-xs font-medium text-[#4E5968] block mb-0.5">
                    {t('onboarding.currency.home_label')}
                  </span>
                  <span className="text-sm font-semibold text-[#191F28]">대한민국 원 (KRW, ₩)</span>
                </div>
                <span className="text-xs text-[#087F8C] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#E5E8EB] font-medium">
                  기본
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-[#4E5968] block mb-2">
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
                            ? 'bg-[#FFFFFF] border-[#087F8C] shadow-sm ring-1 ring-[#087F8C]'
                            : 'bg-[#FFFFFF] border-[#E5E8EB] hover:border-[#8B95A1]/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-[#FFFFFF] border border-[#E5E8EB] flex items-center justify-center font-bold text-[#191F28] text-sm">
                            {curr.symbol}
                          </span>
                          <div>
                            <div className="font-semibold text-sm text-[#191F28]">{curr.name}</div>
                            <div className="text-xs text-[#4E5968]">{curr.code}</div>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#087F8C] flex items-center justify-center text-white">
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
            <div className="w-20 h-20 rounded-full bg-[#087F8C]/10 border border-[#087F8C]/20 flex items-center justify-center mx-auto text-[#087F8C]">
              <MapPin className="w-10 h-10 animate-bounce duration-1000" />
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[#191F28] mb-2">
                {t('onboarding.location.pre_title')}
              </h2>
              <p className="text-sm text-[#4E5968] leading-relaxed max-w-xs mx-auto">
                {t('onboarding.location.pre_body')}
              </p>
            </div>

            {locationDenied && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-left">
                <div className="text-xs font-semibold text-amber-800 mb-0.5">
                  {t('onboarding.location.denied_title')}
                </div>
                <div className="text-xs text-amber-700">
                  {t('onboarding.location.denied_body')}
                </div>
              </div>
            )}

            <div className="pt-4 space-y-3">
              <button
                onClick={handleRequestLocation}
                className="w-full bg-[#087F8C] hover:bg-[#066B77] text-white font-semibold py-3.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <MapPin className="w-4 h-4" />
                <span>{t('onboarding.location.allow')}</span>
              </button>

              <button
                onClick={handleFinish}
                className="w-full bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#4E5968] font-medium py-3.5 px-4 rounded-xl border border-[#E5E8EB] transition-all active:scale-[0.98]"
              >
                {t('onboarding.location.not_now')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Buttons (Steps 1-3) */}
      {step < 4 && (
        <div className="relative z-10 pt-4 border-t border-[#E5E8EB] flex items-center gap-3">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="flex-1 py-3 px-4 rounded-xl bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#4E5968] font-medium border border-[#E5E8EB] transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('onboarding.back')}</span>
            </button>
          ) : (
            <div className="flex-1" />
          )}

          <button
            onClick={handleNext}
            className="flex-1 py-3 px-4 rounded-xl bg-[#087F8C] hover:bg-[#066B77] text-white font-semibold shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>{t('onboarding.next')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
