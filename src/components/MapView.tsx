'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useTravel } from '@/context/TravelContext';
import { t } from '@/lib/i18n';
import { Place, PlaceCategory } from '@/types/travel';
import {
  Search,
  X,
  Compass,
  Utensils,
  Coffee,
  ShoppingBag,
  HeartPulse,
  Store,
  Landmark,
  Train,
  Plus,
  Minus,
  Navigation as NavigationIcon,
  ExternalLink,
  Languages,
  Coins,
  Bookmark,
  BookmarkCheck,
  Share2,
  Clock,
  MapPin,
  Star,
} from 'lucide-react';

const CATEGORIES: Array<{ id: PlaceCategory; labelKey: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'all', labelKey: 'map.category.all', icon: Compass },
  { id: 'food', labelKey: 'map.category.food', icon: Utensils },
  { id: 'cafe', labelKey: 'map.category.cafe', icon: Coffee },
  { id: 'convenience', labelKey: 'map.category.convenience', icon: Store },
  { id: 'pharmacy', labelKey: 'map.category.pharmacy', icon: HeartPulse },
  { id: 'shopping', labelKey: 'map.category.shopping', icon: ShoppingBag },
  { id: 'attraction', labelKey: 'map.category.attraction', icon: Landmark },
  { id: 'transit', labelKey: 'map.category.transit', icon: Train },
];

export default function MapView() {
  const {
    country,
    activePlace,
    setActivePlace,
    setActiveTab,
    savePlace,
    removePlace,
    isPlaceSaved,
    showToast,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
  } = useTravel();

  const [mapPan, setMapPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [apiPlaces, setApiPlaces] = useState<Place[] | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState<boolean>(false);

  // Connect to /api/places/search with debouncing
  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(async () => {
      try {
        setIsSearchingPlaces(true);
        const params = new URLSearchParams({
          country: country.code,
          category: selectedCategory,
          query: searchQuery,
          lat: String(country.defaultCenter.lat),
          lng: String(country.defaultCenter.lng),
        });

        const res = await fetch(`/api/places/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore && data.places) {
            setApiPlaces(data.places);
            setIsDemoMode(Boolean(data.isDemo));
          }
        }
      } catch (err) {
        console.warn('[MapView] Place search fetch error:', err);
      } finally {
        if (!ignore) setIsSearchingPlaces(false);
      }
    }, 250);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedCategory, country]);

  // Filtered places from live API or fallback
  const filteredPlaces = useMemo(() => {
    if (apiPlaces !== null) return apiPlaces;
    return country.popularPlaces.filter((p) => {
      const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchQuery =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchQuery;
    });
  }, [apiPlaces, country.popularPlaces, selectedCategory, searchQuery]);

  // Touch & Mouse Drag handlers for Vector Map
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - mapPan.x, y: e.clientY - mapPan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setMapPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - mapPan.x,
        y: e.touches[0].clientY - mapPan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setMapPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 2.2));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.7));
  const handleResetLocation = () => {
    setMapPan({ x: 0, y: 0 });
    setZoomLevel(1);
    showToast('지도 위치를 현재 지역으로 맞췄어요', 'info');
  };

  // Direction external link
  const openDirections = (place: Place) => {
    const query = encodeURIComponent(`${place.name} ${place.address}`);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Share place
  const handleSharePlace = (place: Place) => {
    if (navigator.share) {
      navigator.share({
        title: place.name,
        text: `${place.name} - ${place.address}`,
        url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${place.name}\n${place.address}`);
      showToast(t('common.success.copied'), 'success');
    }
  };

  // Convert place coordinate to canvas projection
  const getPlacePosition = (place: Place, index: number) => {
    const latOffset = (place.lat - country.defaultCenter.lat) * 7000;
    const lngOffset = (place.lng - country.defaultCenter.lng) * 7000;
    // Spiral spread if coordinates are close
    const fallbackX = ((index % 3) - 1) * 85 + (index > 2 ? 30 : -20);
    const fallbackY = (Math.floor(index / 3) - 1) * 75 + (index % 2 === 0 ? -25 : 25);

    return {
      x: Math.round(lngOffset || fallbackX),
      y: Math.round(-latOffset || fallbackY),
    };
  };

  return (
    <div className="relative w-full h-[100dvh] bg-slate-950 overflow-hidden flex flex-col">
      {/* Top Search & Filter Overlay */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3 pt-4 space-y-2.5 max-w-md mx-auto pointer-events-auto">
        {/* Search Bar */}
        <div className="relative shadow-xl shadow-black/40">
          <div className="relative flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl overflow-hidden">
            <div className="pl-3.5 pr-2 text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('map.search.placeholder')}
              className="w-full bg-transparent py-3 pr-9 text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-slate-400 hover:text-slate-200 p-1"
                aria-label={t('map.search.clear')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Horizontal Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-3 px-3">
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
                    : 'bg-slate-900/85 text-slate-300 hover:bg-slate-800 border border-slate-800/90 backdrop-blur-md'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t(cat.labelKey)}</span>
              </button>
            );
          })}
        </div>

        {/* Demo Mode / Live Places Status Notice */}
        {isDemoMode ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-600/70 shadow-lg text-[11px] text-amber-300 backdrop-blur-md">
            <span className="px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
              데모 모드
            </span>
            <span className="text-slate-300 truncate">
              추천 예시 장소를 표시 중이에요 (실제 검색은 Google Maps API 키 필요)
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-blue-500/60 shadow-lg text-[11px] text-blue-300 backdrop-blur-md">
            <span className="px-1.5 py-0.5 rounded font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 shrink-0">
              실시간 장소
            </span>
            <span className="text-slate-300 truncate">
              실제 주변 장소 검색이 연결되어 있습니다.
            </span>
          </div>
        )}

        {/* Searching indicator or Results Count Badge */}
        {isSearchingPlaces ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-[11px] text-blue-300">
            <Compass className="w-3 h-3 animate-spin text-blue-400" />
            <span>{t('map.search.loading')}</span>
          </div>
        ) : searchQuery.trim() ? (
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-[11px] text-blue-300">
            {t('map.search.results', { count: filteredPlaces.length })}
          </div>
        ) : null}
      </div>

      {/* Interactive Vector Map Canvas */}
      <div
        className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing select-none overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Transform container */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${zoomLevel})`,
          }}
        >
          {/* Map Vector Background Grid */}
          <div className="w-[1200px] h-[1200px] relative pointer-events-none opacity-40">
            {/* River / Waterway */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0369a1" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
                </linearGradient>
              </defs>
              {/* Meandering river */}
              <path
                d="M 100,0 Q 400,300 350,600 T 700,1200"
                fill="none"
                stroke="url(#waterGrad)"
                strokeWidth="70"
                strokeLinecap="round"
              />
              {/* Secondary canal */}
              <path
                d="M 350,600 Q 800,650 1200,500"
                fill="none"
                stroke="url(#waterGrad)"
                strokeWidth="35"
              />
              {/* Major Roads */}
              <path
                d="M 0,450 L 1200,450 M 0,750 L 1200,750 M 500,0 L 500,1200 M 850,0 L 850,1200"
                stroke="#334155"
                strokeWidth="12"
                strokeDasharray="none"
              />
              {/* Local Streets */}
              <path
                d="M 0,250 L 1200,250 M 0,600 L 1200,600 M 0,950 L 1200,950 M 250,0 L 250,1200 M 700,0 L 700,1200 M 1050,0 L 1050,1200"
                stroke="#1e293b"
                strokeWidth="6"
              />
              {/* City Blocks fill */}
              <rect x="520" y="470" width="160" height="110" rx="8" fill="#1e293b" opacity="0.5" />
              <rect x="720" y="470" width="110" height="110" rx="8" fill="#1e293b" opacity="0.5" />
              <rect x="520" y="620" width="160" height="110" rx="8" fill="#1e293b" opacity="0.5" />
              <rect x="270" y="470" width="160" height="110" rx="8" fill="#1e293b" opacity="0.5" />
              <rect x="720" y="620" width="110" height="110" rx="8" fill="#1e293b" opacity="0.5" />
            </svg>
          </div>

          {/* Current User Pulse Marker */}
          <div className="absolute z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 animate-ping absolute -inset-2" />
            <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center text-white">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          </div>

          {/* Interactive Place Pins */}
          {filteredPlaces.map((place, idx) => {
            const pos = getPlacePosition(place, idx);
            const isSelected = activePlace?.id === place.id;

            return (
              <div
                key={place.id}
                style={{
                  transform: `translate(${pos.x}px, ${pos.y}px)`,
                }}
                className="absolute z-20"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePlace(place);
                  }}
                  className={`group relative -translate-x-1/2 -translate-y-full transition-all duration-200 active:scale-95 ${
                    isSelected ? 'z-30 scale-110' : 'hover:scale-105'
                  }`}
                  aria-label={t('common.accessibility.map_pin', { placeName: place.name })}
                >
                  {/* Pin Bubble */}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border shadow-xl backdrop-blur-md transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-400 ring-4 ring-blue-500/30'
                        : 'bg-slate-900/90 text-slate-100 border-slate-700/80 hover:border-slate-500'
                    }`}
                  >
                    <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-blue-400'}`} />
                    <span className="text-xs font-semibold max-w-[120px] truncate">
                      {place.name.split(' ')[0]}
                    </span>
                    {place.rating && (
                      <span className="text-[10px] text-amber-300 font-bold flex items-center">
                        ★{place.rating}
                      </span>
                    )}
                  </div>

                  {/* Pin Point Pointer */}
                  <div
                    className={`w-2 h-2 mx-auto rotate-45 -mt-1 ${
                      isSelected ? 'bg-blue-600' : 'bg-slate-900 border-r border-b border-slate-700'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Map Controls (Right Side) */}
      <div className="absolute right-3.5 top-36 z-20 flex flex-col gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl overflow-hidden shadow-lg flex flex-col">
          <button
            onClick={handleZoomIn}
            className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border-b border-slate-800"
            aria-label="지도 확대"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="지도 축소"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleResetLocation}
          className="p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-blue-400 hover:text-blue-300 hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          aria-label={t('map.control.my_location')}
        >
          <NavigationIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Empty Search Results Floating Banner */}
      {filteredPlaces.length === 0 && (
        <div className="absolute inset-x-4 top-36 z-20 p-4 rounded-2xl bg-slate-900/95 border border-slate-800 text-center shadow-2xl backdrop-blur-md max-w-sm mx-auto">
          <div className="text-sm font-semibold text-slate-200 mb-1">
            {t('map.search.empty_title')}
          </div>
          <div className="text-xs text-slate-400 mb-3">
            {t('map.search.empty_body')}
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="text-xs font-medium text-blue-400 hover:text-blue-300 underline"
          >
            {t('map.search.empty_action')}
          </button>
        </div>
      )}

      {/* Place Preview Card & Bottom Sheet */}
      {activePlace && (
        <div className="absolute inset-x-0 bottom-16 z-30 p-3 max-w-md mx-auto animate-in slide-in-from-bottom-6 duration-200">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl p-4 shadow-2xl space-y-3.5">
            {/* Header info */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/60">
                    {activePlace.categoryName || activePlace.category}
                  </span>
                  {activePlace.distance && (
                    <span className="text-xs text-slate-400 font-medium">
                      {t('map.place.card_distance', { distance: activePlace.distance })}
                    </span>
                  )}
                  {activePlace.rating && (
                    <span className="text-xs text-amber-400 font-bold flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {activePlace.rating}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white tracking-tight leading-snug truncate">
                  {activePlace.name}
                </h3>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {activePlace.address}
                </p>
              </div>

              {/* Close Sheet button */}
              <button
                onClick={() => setActivePlace(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                aria-label={t('common.action.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Opening hours & description */}
            <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-2.5">
              {activePlace.hoursText && (
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-emerald-400">{t('place.hours.open')}</span>
                  <span className="text-slate-400">· {activePlace.hoursText}</span>
                </div>
              )}
              {activePlace.description && (
                <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">
                  {activePlace.description}
                </p>
              )}
            </div>

            {/* Primary Travel Action Toolbar */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => openDirections(activePlace)}
                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 active:scale-95 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{t('place.action.directions')}</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('translate');
                }}
                className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 active:scale-95 transition-all"
              >
                <Languages className="w-3.5 h-3.5" />
                <span>{t('place.action.translate')}</span>
              </button>
            </div>

            {/* Secondary Actions: Currency & Save & Share */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={() => {
                  setActiveTab('currency');
                }}
                className="flex-1 py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-700/60 transition-all active:scale-95"
              >
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('place.action.currency')}</span>
              </button>

              <button
                onClick={() => {
                  if (isPlaceSaved(activePlace.id)) {
                    removePlace(activePlace.id);
                  } else {
                    savePlace(activePlace);
                  }
                }}
                className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all active:scale-95 ${
                  isPlaceSaved(activePlace.id)
                    ? 'bg-amber-950/60 border-amber-600/70 text-amber-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                }`}
              >
                {isPlaceSaved(activePlace.id) ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('saved.action.remove')}</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{t('saved.action.save')}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleSharePlace(activePlace)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 active:scale-95 transition-all"
                aria-label={t('place.action.share')}
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
