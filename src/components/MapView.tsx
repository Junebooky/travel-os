'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  Info,
  Camera,
} from 'lucide-react';
import { MAP_CATEGORIES, normalizeCategory } from '@/lib/categories';
import CameraMenuModal from '@/components/CameraMenuModal';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  all: Compass,
  food: Utensils,
  cafe: Coffee,
  shopping: ShoppingBag,
  market: Store,
  stay: Landmark,
  pharmacy: HeartPulse,
  airport: Train,
  transport: Train,
};

const CATEGORIES = MAP_CATEGORIES.map((cat) => ({
  id: cat.id,
  labelKey: cat.labelKey,
  icon: CATEGORY_ICONS[cat.id] || Compass,
}));

// Standard Web Mercator (EPSG:3857) projection functions
function lngToTileX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * Math.pow(2, zoom);
}

function latToTileY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

function tileXToLng(x: number, zoom: number): number {
  return (x / Math.pow(2, zoom)) * 360 - 180;
}

function tileYToLat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

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
    mapViewport,
    setMapViewport,
  } = useTravel();

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 390,
    height: 844,
  });

  // Geographic center and zoom (default: context viewport center or country defaultCenter, street zoom 15)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    mapViewport?.center || country.defaultCenter
  );
  const [zoomLevel, setZoomLevel] = useState<number>(mapViewport?.zoom || 15);

  // Drag interaction states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [apiPlaces, setApiPlaces] = useState<Place[] | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [demoNotice, setDemoNotice] = useState<string>('');
  const [isSearchingPlaces, setIsSearchingPlaces] = useState<boolean>(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);

  // Measure container dimensions
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || window.innerWidth,
          height: containerRef.current.clientHeight || window.innerHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Update map center when country selection changes (React 19 render-time pattern)
  const [prevCountryCode, setPrevCountryCode] = useState<string>(country.code);
  if (country.code !== prevCountryCode) {
    setPrevCountryCode(country.code);
    setMapCenter(country.defaultCenter);
    setMapViewport({ center: country.defaultCenter, zoom: 15 });
  }

  // Synchronize external viewport changes during render (e.g. from SavedPlacesModal, navigation, or Onboarding)
  const [prevExternalVp, setPrevExternalVp] = useState(mapViewport);
  if (
    mapViewport &&
    (mapViewport.center.lat !== prevExternalVp?.center.lat ||
      mapViewport.center.lng !== prevExternalVp?.center.lng ||
      mapViewport.zoom !== prevExternalVp?.zoom)
  ) {
    setPrevExternalVp(mapViewport);
    if (mapCenter.lat !== mapViewport.center.lat || mapCenter.lng !== mapViewport.center.lng) {
      setMapCenter(mapViewport.center);
    }
    if (zoomLevel !== mapViewport.zoom) {
      setZoomLevel(mapViewport.zoom);
    }
  }

  // Connect to /api/places/search (strictly submit/category based, adhering to OSM Nominatim policy)
  const fetchPlaces = useCallback(
    async (
      query: string,
      category: PlaceCategory,
      center: { lat: number; lng: number },
      options: { recenterOnResult?: boolean } = {}
    ) => {
      setIsSearchingPlaces(true);
      try {
        const params = new URLSearchParams({
          country: country.code,
          category: normalizeCategory(category),
          query: query.trim(),
          lat: String(center.lat),
          lng: String(center.lng),
        });

        const res = await fetch(`/api/places/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.places) {
            setApiPlaces(data.places);
            setIsDemoMode(Boolean(data.isDemo));
            setDemoNotice(data.demoNotice || '');

            // Recenter map viewport if search returned remote or queried places (QA-P1-03)
            if (data.places.length > 0 && (query.trim().length > 0 || options.recenterOnResult)) {
              const firstPlace = data.places[0];
              const newCenter = { lat: firstPlace.lat, lng: firstPlace.lng };
              setMapCenter(newCenter);
              setMapViewport({ center: newCenter, zoom: 14 });
              setActivePlace(firstPlace);
            }
          }
        }
      } catch (err) {
        console.warn('[MapView] Place search fetch error:', err);
      } finally {
        setIsSearchingPlaces(false);
      }
    },
    [country.code, setActivePlace, setMapViewport]
  );

  // Load places when country or category changes (strictly event/change driven, no keystroke debounce)
  useEffect(() => {
    let ignore = false;
    async function loadCategoryPlaces() {
      try {
        const params = new URLSearchParams({
          country: country.code,
          category: normalizeCategory(selectedCategory),
          query: '',
          lat: String(mapCenter.lat),
          lng: String(mapCenter.lng),
        });

        const res = await fetch(`/api/places/search?${params.toString()}`);
        if (res.ok && !ignore) {
          const data = await res.json();
          if (data.places) {
            setApiPlaces(data.places);
            setIsDemoMode(Boolean(data.isDemo));
            setDemoNotice(data.demoNotice || '');
          }
        }
      } catch (err) {
        console.warn('[MapView] Place search fetch error:', err);
      }
    }

    loadCategoryPlaces();
    return () => {
      ignore = true;
    };
  }, [country.code, selectedCategory, mapCenter.lat, mapCenter.lng]);

  // Filtered places
  const filteredPlaces = useMemo(() => {
    if (apiPlaces !== null) return apiPlaces;
    return country.popularPlaces.filter((p) => {
      const matchCategory =
        selectedCategory === 'all' ||
        normalizeCategory(p.category) === normalizeCategory(selectedCategory);
      const matchQuery =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchQuery;
    });
  }, [apiPlaces, country.popularPlaces, selectedCategory, searchQuery]);

  // Mouse & Touch Drag Event Handlers
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
    setPanOffset({ x: 0, y: 0 });
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setPanOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (panOffset.x !== 0 || panOffset.y !== 0) {
      const centerTileX = lngToTileX(mapCenter.lng, zoomLevel);
      const centerTileY = latToTileY(mapCenter.lat, zoomLevel);

      const newCenterTileX = centerTileX - panOffset.x / 256;
      const newCenterTileY = centerTileY - panOffset.y / 256;

      const newLng = tileXToLng(newCenterTileX, zoomLevel);
      const newLat = tileYToLat(newCenterTileY, zoomLevel);

      const newCenter = { lat: newLat, lng: newLng };
      setMapCenter(newCenter);
      setMapViewport({ center: newCenter, zoom: zoomLevel });
      setPanOffset({ x: 0, y: 0 });
    }
  };

  // Zoom controls with viewport persistence
  const handleZoomIn = () => {
    setZoomLevel((z) => {
      const next = Math.min(z + 1, 18);
      setMapViewport({ center: mapCenter, zoom: next });
      return next;
    });
  };

  const handleZoomOut = () => {
    setZoomLevel((z) => {
      const next = Math.max(z - 1, 11);
      setMapViewport({ center: mapCenter, zoom: next });
      return next;
    });
  };

  // Current location handler
  const handleResetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userCenter = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMapCenter(userCenter);
          setZoomLevel(16);
          setMapViewport({ center: userCenter, zoom: 16 });
          showToast('현재 내 위치로 이동했어요', 'success');
        },
        () => {
          setMapCenter(country.defaultCenter);
          setZoomLevel(15);
          setMapViewport({ center: country.defaultCenter, zoom: 15 });
          showToast('현재 지역 기본 위치로 맞췄어요', 'info');
        },
        { timeout: 6000 }
      );
    } else {
      setMapCenter(country.defaultCenter);
      setZoomLevel(15);
      setMapViewport({ center: country.defaultCenter, zoom: 15 });
      showToast('현재 지역 기본 위치로 맞췄어요', 'info');
    }
  };

  // Direction external link
  const openDirections = (place: Place) => {
    const query = encodeURIComponent(`${place.name} ${place.address}`);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Share / Copy place
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

  // Tile Calculations for Current Viewport
  const { tiles, centerTileX, centerTileY } = useMemo(() => {
    const cTileX = lngToTileX(mapCenter.lng, zoomLevel);
    const cTileY = latToTileY(mapCenter.lat, zoomLevel);

    const halfW = dimensions.width / 2;
    const halfH = dimensions.height / 2;

    const minX = Math.floor((cTileX - halfW / 256));
    const maxX = Math.floor((cTileX + halfW / 256));
    const minY = Math.floor((cTileY - halfH / 256));
    const maxY = Math.floor((cTileY + halfH / 256));

    const totalWorldTiles = 1 << zoomLevel;
    const tileList: Array<{ key: string; x: number; y: number; urlX: number; left: number; top: number }> = [];

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (y < 0 || y >= totalWorldTiles) continue;
        const wrappedX = ((x % totalWorldTiles) + totalWorldTiles) % totalWorldTiles;
        tileList.push({
          key: `${zoomLevel}-${x}-${y}`,
          x,
          y,
          urlX: wrappedX,
          left: Math.round(halfW + (x - cTileX) * 256),
          top: Math.round(halfH + (y - cTileY) * 256),
        });
      }
    }

    return { tiles: tileList, centerTileX: cTileX, centerTileY: cTileY };
  }, [mapCenter, zoomLevel, dimensions]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[100dvh] bg-slate-950 overflow-hidden flex flex-col select-none"
    >
      {/* Real Slippy Map Canvas (OpenStreetMap Tiles + Exact Coordinates) */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing overflow-hidden"
        onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
        onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={(e) => {
          if (e.touches.length === 1) {
            handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 1) {
            handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchEnd={handlePointerUp}
      >
        {/* Dynamic Tile Layer */}
        <div
          className="absolute inset-0 pointer-events-none transition-transform duration-75"
          style={{
            transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0)`,
          }}
        >
          {tiles.map((tile) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={tile.key}
              src={`https://tile.openstreetmap.org/${zoomLevel}/${tile.urlX}/${tile.y}.png`}
              alt=""
              loading="lazy"
              className="absolute w-[256px] h-[256px] filter brightness-[0.82] contrast-[1.12] invert-[0.92] hue-rotate-[190deg]"
              style={{
                left: `${tile.left}px`,
                top: `${tile.top}px`,
              }}
            />
          ))}
        </div>

        {/* Real Coordinates Place Marker Pins */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0)`,
          }}
        >
          {filteredPlaces.map((place) => {
            const placeTileX = lngToTileX(place.lng, zoomLevel);
            const placeTileY = latToTileY(place.lat, zoomLevel);

            const screenX = dimensions.width / 2 + (placeTileX - centerTileX) * 256;
            const screenY = dimensions.height / 2 + (placeTileY - centerTileY) * 256;

            const isSelected = activePlace?.id === place.id;

            return (
              <div
                key={place.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePlace(place);
                }}
                className="absolute pointer-events-auto cursor-pointer group"
                style={{
                  left: `${screenX}px`,
                  top: `${screenY}px`,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <div
                  className={`flex flex-col items-center transition-all ${
                    isSelected ? 'scale-110 z-20' : 'hover:scale-105 z-10'
                  }`}
                >
                  <div
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg whitespace-nowrap mb-1 transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-1 ring-offset-slate-900'
                        : 'bg-slate-900/90 text-slate-200 border border-slate-700 backdrop-blur-sm'
                    }`}
                  >
                    {place.name}
                  </div>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shadow-xl transition-all ${
                      isSelected
                        ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 text-white ring-4 ring-blue-500/40'
                        : 'bg-slate-900 text-blue-400 border border-blue-500/60'
                    }`}
                  >
                    <MapPin className="w-4 h-4 fill-current" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Search & Filter Overlay */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3 pt-4 space-y-2 max-w-md mx-auto pointer-events-auto">
        {/* Search Bar */}
        <div className="relative shadow-xl shadow-black/50">
          <div className="relative flex items-center bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
            <button
              type="button"
              onClick={() => fetchPlaces(searchQuery, selectedCategory, mapCenter, { recenterOnResult: true })}
              className="pl-3.5 pr-2 text-slate-400 hover:text-blue-400 transition-colors"
              aria-label="장소 검색"
            >
              <Search className={`w-4 h-4 ${isSearchingPlaces ? 'animate-pulse text-blue-400' : ''}`} />
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  fetchPlaces(searchQuery, selectedCategory, mapCenter, { recenterOnResult: true });
                }
              }}
              placeholder={t('map.search.placeholder')}
              className="w-full bg-transparent py-3 pr-20 text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setApiPlaces(null);
                    fetchPlaces('', selectedCategory, mapCenter);
                  }}
                  className="text-slate-400 hover:text-slate-200 p-1"
                  aria-label={t('map.search.clear')}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => fetchPlaces(searchQuery, selectedCategory, mapCenter, { recenterOnResult: true })}
                disabled={isSearchingPlaces || !searchQuery.trim()}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95"
              >
                검색
              </button>
            </div>
          </div>
        </div>

        {/* Quick Result Jump Chips (Remote/Local Places Navigation) */}
        {searchQuery.trim() && apiPlaces && apiPlaces.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-3 px-3">
            <span className="text-[11px] font-semibold text-slate-300 bg-slate-900/90 border border-slate-700/80 px-2 py-1 rounded-xl shrink-0 backdrop-blur-md">
              결과 {apiPlaces.length}건
            </span>
            {apiPlaces.slice(0, 5).map((place) => (
              <button
                key={place.id}
                onClick={() => {
                  const newCenter = { lat: place.lat, lng: place.lng };
                  setMapCenter(newCenter);
                  setMapViewport({ center: newCenter, zoom: 15 });
                  setActivePlace(place);
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all border shrink-0 backdrop-blur-md active:scale-95 ${
                  activePlace?.id === place.id
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                    : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                {place.name}
              </button>
            ))}
          </div>
        )}

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

        {/* Honest Demo Mode / Live Places Status Notice */}
        {isDemoMode ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/95 border border-amber-600/70 shadow-lg text-[11px] text-amber-300 backdrop-blur-md">
            <span className="px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
              데모 모드
            </span>
            <span className="text-slate-300 truncate">
              {demoNotice || 'Google Maps API 키 미설정 · OpenStreetMap 실지형 타일 및 추천 데이터 표시 중'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/95 border border-blue-500/60 shadow-lg text-[11px] text-blue-300 backdrop-blur-md">
            <span className="px-1.5 py-0.5 rounded font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 shrink-0">
              실시간 장소
            </span>
            <span className="text-slate-300 truncate">실시간 지도 검색 데이터 적용 완료</span>
          </div>
        )}
      </div>

      {/* Map Control Floating Buttons (Zoom In/Out & My Location) */}
      <div className="absolute right-4 bottom-28 z-20 flex flex-col items-center gap-2 pointer-events-auto">
        <div className="flex flex-col bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-800">
          <button
            onClick={handleZoomIn}
            className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors active:scale-95"
            aria-label="지도 확대"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors active:scale-95"
            aria-label="지도 축소"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleResetLocation}
          className="p-2.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-blue-400 hover:text-blue-300 hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          aria-label={t('map.location.action')}
        >
          <NavigationIcon className="w-4 h-4" />
        </button>
      </div>

      {/* OpenStreetMap Legal Attribution */}
      <div className="absolute right-2 bottom-20 z-20 pointer-events-auto">
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2 py-0.5 rounded bg-slate-900/80 text-[10px] text-slate-400 hover:text-slate-200 border border-slate-800 flex items-center gap-1 backdrop-blur-sm"
        >
          <Info className="w-2.5 h-2.5" />
          <span>© OpenStreetMap</span>
        </a>
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
                  <span className="font-semibold text-emerald-400">{t('place.detail.hours')}</span>
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
                <span>{t('place.detail.directions')}</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('translate');
                }}
                className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 active:scale-95 transition-all"
              >
                <Languages className="w-3.5 h-3.5" />
                <span>{t('place.detail.quick_translate')}</span>
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
                <span>{t('place.detail.quick_currency')}</span>
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
                aria-label={t('place.detail.copy_address')}
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Track B B2·B3: Camera Menu OCR Action */}
            <div className="pt-1">
              <button
                onClick={() => setIsCameraModalOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-950/70 border border-emerald-700/70 hover:bg-emerald-900/80 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>{t('camera.title')} (메뉴 촬영/번역)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Menu OCR Modal */}
      <CameraMenuModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        initialPlace={activePlace}
      />
    </div>
  );
}
