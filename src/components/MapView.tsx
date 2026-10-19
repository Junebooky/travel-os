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
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { MAP_CATEGORIES, normalizeCategory } from '@/lib/categories';
import CameraMenuModal from '@/components/CameraMenuModal';
import { MapProvider } from '@/types/travel';
import { getActiveMapProvider, filterCompliantPlaces, isGoogleBillingApproved } from '@/lib/mapProvider';
import {
  loadGoogleMapsSdk,
  getOrCreateGoogleMapInstance,
  notifyGoogleMapResize,
} from '@/lib/googleMapManager';

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

interface MapViewProps {
  isTabActive?: boolean;
}

export default function MapView({ isTabActive = true }: MapViewProps = {}) {
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

  const mapCenterRef = useRef(mapCenter);
  useEffect(() => {
    mapCenterRef.current = mapCenter;
  }, [mapCenter]);

  // Persistent Google Map DOM container and instance refs
  const googleMapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapInstanceRef = useRef<unknown>(null);

  // Tab activation & viewport resize observer
  const prevTabActiveRef = useRef<boolean>(isTabActive);
  useEffect(() => {
    if (isTabActive && !prevTabActiveRef.current) {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || window.innerWidth,
          height: containerRef.current.clientHeight || window.innerHeight,
        });
      }
      if (googleMapInstanceRef.current) {
        notifyGoogleMapResize(googleMapInstanceRef.current);
      }
    }
    prevTabActiveRef.current = isTabActive;
  }, [isTabActive]);

  const [mapProvider, setMapProvider] = useState<MapProvider>(getActiveMapProvider);

  // Google Maps SDK & Instance Loader (Single Instance lifecycle)
  useEffect(() => {
    if (mapProvider !== 'google') return;

    let isCurrent = true;
    async function initGoogleMap() {
      const loadRes = await loadGoogleMapsSdk();
      if (!isCurrent) return;

      if (loadRes.success && googleMapContainerRef.current) {
        const res = getOrCreateGoogleMapInstance(googleMapContainerRef.current, {
          center: mapCenterRef.current,
          zoom: zoomLevel,
        });
        if (res.instance) {
          googleMapInstanceRef.current = res.instance;
        }
      }
    }

    initGoogleMap();
    return () => {
      isCurrent = false;
    };
  }, [mapProvider, zoomLevel]);

  // Drag interaction states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [apiPlaces, setApiPlaces] = useState<Place[] | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [demoNotice, setDemoNotice] = useState<string>('');
  const [isSearchingPlaces, setIsSearchingPlaces] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState<boolean>(false);

  // Reset sheet expanded state whenever activePlace changes
  const prevActivePlaceIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activePlace?.id !== prevActivePlaceIdRef.current) {
      prevActivePlaceIdRef.current = activePlace?.id || null;
      setIsSheetExpanded(false);
    }
  }, [activePlace?.id]);

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
  }

  useEffect(() => {
    setMapViewport({ center: country.defaultCenter, zoom: 15 });
  }, [country.code, country.defaultCenter, setMapViewport]);

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
      setSearchError(null);
      try {
        const params = new URLSearchParams({
          provider: mapProvider,
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
            setSearchError(null);

            // Recenter map viewport if search returned remote or queried places (QA-P1-03)
            if (data.places.length > 0 && (query.trim().length > 0 || options.recenterOnResult)) {
              const firstPlace = data.places[0];
              const newCenter = { lat: firstPlace.lat, lng: firstPlace.lng };
              setMapCenter(newCenter);
              setMapViewport({ center: newCenter, zoom: 14 });
              setActivePlace(firstPlace);
            }
          }
        } else {
          setSearchError('search_failed');
        }
      } catch (err) {
        console.warn('[MapView] Place search fetch error:', err);
        setSearchError('network_error');
      } finally {
        setIsSearchingPlaces(false);
      }
    },
    [country.code, mapProvider, setActivePlace, setMapViewport]
  );

  // Load places when country, category, or mapProvider changes (decoupled from mapCenter to avoid unintended pan/zoom calls)
  useEffect(() => {
    let ignore = false;
    async function loadCategoryPlaces() {
      try {
        const currentCenter = mapCenterRef.current;
        const params = new URLSearchParams({
          provider: mapProvider,
          country: country.code,
          category: normalizeCategory(selectedCategory),
          query: '',
          lat: String(currentCenter.lat),
          lng: String(currentCenter.lng),
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
  }, [country.code, selectedCategory, mapProvider]);

  // Filtered places with strict Google ToS §14 compliance
  const filteredPlaces = useMemo(() => {
    const rawPlaces = apiPlaces !== null ? apiPlaces : country.popularPlaces;
    const compliant = filterCompliantPlaces(rawPlaces, mapProvider);
    return compliant.filter((p) => {
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
  }, [apiPlaces, country.popularPlaces, mapProvider, selectedCategory, searchQuery]);

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
      className="relative w-full h-[100dvh] bg-[#FFFFFF] overflow-hidden flex flex-col select-none"
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
          {mapProvider === 'osm' ? (
            tiles.map((tile) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={tile.key}
                src={`https://tile.openstreetmap.org/${zoomLevel}/${tile.urlX}/${tile.y}.png`}
                alt=""
                loading="lazy"
                className="absolute w-[256px] h-[256px]"
                style={{
                  left: `${tile.left}px`,
                  top: `${tile.top}px`,
                }}
              />
            ))
          ) : (
            <div className="absolute inset-0 bg-[#E8ECEF] overflow-hidden">
              {/* Persistent Google Map canvas container (attached once when SDK/mock available) */}
              <div
                ref={googleMapContainerRef}
                id="google-map-canvas"
                data-testid="google-map-canvas"
                className="absolute inset-0 w-full h-full"
              />
              {!isGoogleBillingApproved() && (
                <>
                  <div
                    className="absolute inset-0 opacity-40 pointer-events-none"
                    style={{
                      backgroundImage:
                        'radial-gradient(#CBD5E1 1px, transparent 1px), linear-gradient(to right, #D8E0E8 1px, transparent 1px), linear-gradient(to bottom, #D8E0E8 1px, transparent 1px)',
                      backgroundSize: '32px 32px, 128px 128px, 128px 128px',
                    }}
                  />
                  <div className="absolute bottom-20 left-4 pointer-events-none select-none opacity-90 flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md shadow-xs border border-[#CBD5E1]">
                    <span className="w-2 h-2 rounded-full bg-[#087F8C] animate-pulse" />
                    <span className="text-[11px] text-[#334155] font-semibold tracking-tight">
                      지도 미리보기 (미승인 시뮬레이션)
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
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
              <button
                type="button"
                key={place.id}
                role="button"
                tabIndex={0}
                aria-label={t('common.accessibility.map_pin', { placeName: place.name })}
                aria-pressed={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePlace(place);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    setActivePlace(place);
                  }
                }}
                className="absolute pointer-events-auto cursor-pointer group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-full"
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
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md whitespace-nowrap mb-1 transition-all ${
                      isSelected
                        ? 'bg-[#087F8C] text-white shadow-[#087F8C]/30'
                        : 'bg-[#FFFFFF] text-[#191F28] border border-[#E5E8EB]'
                    }`}
                  >
                    {place.name}
                  </div>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-all ${
                      isSelected
                        ? 'bg-[#087F8C] text-white ring-4 ring-[#087F8C]/25'
                        : 'bg-[#FFFFFF] text-[#4E5968] border border-[#E5E8EB]'
                    }`}
                  >
                    <MapPin className="w-4 h-4 fill-current" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Search & Filter Overlay */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3 pt-4 space-y-2 max-w-md mx-auto pointer-events-auto">
        {/* Search Bar */}
        <div className="relative shadow-md">
          <div className="relative flex items-center bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-[#087F8C]">
            <button
              type="button"
              onClick={() => fetchPlaces(searchQuery, selectedCategory, mapCenter, { recenterOnResult: true })}
              className="pl-3.5 pr-2 text-[#8B95A1] hover:text-[#087F8C] transition-colors"
              aria-label="어디로 가볼까요?"
            >
              <Search className={`w-4 h-4 ${isSearchingPlaces ? 'animate-pulse text-[#087F8C]' : ''}`} />
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
              aria-label={t('map.search.placeholder')}
              className="w-full bg-transparent py-3 pr-20 text-sm text-[#191F28] placeholder-[#8B95A1] focus:outline-none"
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
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#8B95A1] hover:text-[#191F28] transition-colors"
                  aria-label={t('map.search.clear')}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => fetchPlaces(searchQuery, selectedCategory, mapCenter, { recenterOnResult: true })}
                disabled={isSearchingPlaces || !searchQuery.trim()}
                className="min-h-[36px] px-3 py-1 bg-[#087F8C] hover:bg-[#066B77] disabled:opacity-40 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95"
              >
                찾아보기
              </button>
            </div>
          </div>
        </div>

        {/* Quick Result Jump Chips (Remote/Local Places Navigation) */}
        {searchQuery.trim() && apiPlaces && apiPlaces.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-3 px-3">
            <span className="text-[11px] font-semibold text-[#4E5968] bg-[#FFFFFF] border border-[#E5E8EB] px-2 py-1 rounded-xl shrink-0 shadow-sm">
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
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border shrink-0 active:scale-95 shadow-sm ${
                  activePlace?.id === place.id
                    ? 'bg-[#087F8C] text-white border-[#087F8C]'
                    : 'bg-[#FFFFFF] text-[#4E5968] border-[#E5E8EB] hover:bg-[#F8FAFC]'
                }`}
              >
                {place.name}
              </button>
            ))}
          </div>
        )}

        {/* Category Horizontal Filter Chips (44px touch targets) */}
        <div
          role="tablist"
          aria-label="장소 카테고리 필터"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-3 px-3"
        >
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isSelected}
                aria-label={t(cat.labelKey)}
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-sm active:scale-95 shrink-0 ${
                  isSelected
                    ? 'bg-[#191F28] text-white shadow-md'
                    : 'bg-[#FFFFFF] text-[#4E5968] hover:text-[#191F28] border border-[#E5E8EB]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t(cat.labelKey)}</span>
              </button>
            );
          })}
        </div>

        {/* Honest Demo Mode / Live Places / Google Preview Status Notice */}
        {mapProvider === 'google' && !isGoogleBillingApproved() ? (
          <div
            role="status"
            className="flex items-start sm:items-center gap-2 px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5E8EB] shadow-sm text-xs text-[#4E5968]"
          >
            <span className="px-1.5 py-0.5 rounded font-bold bg-[#FFFFFF] text-[#087F8C] border border-[#E5E8EB] shrink-0 text-[11px]">
              지도 미리보기
            </span>
            <span className="text-[#4E5968] text-xs leading-relaxed break-keep">
              지도 미리보기 (과금 미승인 · 외부 API 호출 차단)
            </span>
          </div>
        ) : isDemoMode ? (
          <div
            role="status"
            className="flex items-start sm:items-center gap-2 px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5E8EB] shadow-sm text-xs text-[#4E5968]"
          >
            <span className="px-1.5 py-0.5 rounded font-bold bg-[#FFFFFF] text-[#191F28] border border-[#E5E8EB] shrink-0 text-[11px]">
              데모 모드
            </span>
            <span className="text-[#4E5968] text-xs leading-relaxed break-keep">
              {demoNotice || 'Google Maps API 키 미설정 · OpenStreetMap 실지형 타일 및 추천 데이터 표시 중'}
            </span>
          </div>
        ) : (
          <div
            role="status"
            className="flex items-start sm:items-center gap-2 px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E5E8EB] shadow-sm text-xs text-[#087F8C]"
          >
            <span className="px-1.5 py-0.5 rounded font-bold bg-[#FFFFFF] text-[#087F8C] border border-[#E5E8EB] shrink-0 text-[11px]">
              주변 스팟
            </span>
            <span className="text-[#4E5968] text-xs leading-relaxed">
              주변 장소를 지도에서 확인해 보세요
            </span>
          </div>
        )}
      </div>

      {/* Map Control Floating Buttons (Zoom In/Out, My Location & Provider Switch) - Dynamic Elevation Above Sheet */}
      <div
        className={`absolute right-4 z-20 flex flex-col items-center gap-2 pointer-events-auto transition-all duration-200 ${
          activePlace
            ? isSheetExpanded
              ? 'bottom-[370px] sm:bottom-[350px]'
              : 'bottom-[220px] sm:bottom-[210px]'
            : 'bottom-24 sm:bottom-28'
        }`}
      >
        {/* Map Provider Evaluator Switch (OSM <-> Google) */}
        <button
          onClick={() => setMapProvider((prev) => (prev === 'google' ? 'osm' : 'google'))}
          className="min-w-[44px] h-[32px] px-2 flex items-center justify-center rounded-xl bg-[#FFFFFF] border border-[#E5E8EB] text-[#4E5968] hover:text-[#087F8C] hover:bg-[#F8FAFC] transition-all shadow-md active:scale-95 text-[11px] font-semibold"
          aria-label={`현재 지도: ${mapProvider === 'google' ? 'Google 지도' : 'OSM'}. 클릭하여 지도 바꾸기`}
          title="지도 바꾸기 (OSM / Google 지도)"
        >
          {mapProvider === 'google' ? 'Google 지도' : 'OSM'}
        </button>

        <div className="flex flex-col bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl shadow-md overflow-hidden divide-y divide-[#E5E8EB]">
          <button
            onClick={handleZoomIn}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#4E5968] hover:text-[#191F28] hover:bg-[#F8FAFC] transition-colors active:scale-95"
            aria-label="지도 확대"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#4E5968] hover:text-[#191F28] hover:bg-[#F8FAFC] transition-colors active:scale-95"
            aria-label="지도 축소"
          >
            <Minus className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={handleResetLocation}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#FFFFFF] border border-[#E5E8EB] text-[#087F8C] hover:text-[#066B77] hover:bg-[#F8FAFC] transition-all shadow-md active:scale-95"
          aria-label={t('map.location.action')}
        >
          <NavigationIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Map Legal Attribution (Provider Aware: OSM / Google) */}
      <div
        className={`absolute right-2 z-20 pointer-events-auto transition-all duration-200 ${
          activePlace
            ? isSheetExpanded
              ? 'bottom-[330px] sm:bottom-[310px]'
              : 'bottom-[180px] sm:bottom-[170px]'
            : 'bottom-16 sm:bottom-20'
        }`}
      >
        {mapProvider === 'osm' ? (
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded bg-[#FFFFFF]/90 text-[10px] text-[#4E5968] hover:text-[#191F28] border border-[#E5E8EB] flex items-center gap-1 shadow-sm"
          >
            <Info className="w-3 h-3" />
            <span>© OpenStreetMap</span>
          </a>
        ) : (
          <div className="px-2.5 py-1 rounded bg-[#FFFFFF]/90 text-[10px] text-[#4E5968] border border-[#E5E8EB] flex items-center gap-1 shadow-sm">
            <Info className="w-3 h-3" />
            <span>지도 미리보기</span>
          </div>
        )}
      </div>

      {/* Search Error or Empty Search Results Floating Banner */}
      {searchError ? (
        <div className="absolute inset-x-4 top-36 z-20 p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5E8EB] text-center shadow-md max-w-sm mx-auto">
          <div className="text-sm font-semibold text-[#191F28] mb-1">
            {t('map.search.error_title')}
          </div>
          <div className="text-xs text-[#4E5968] mb-3 leading-relaxed">
            {t('map.search.error_body')}
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchError(null);
              fetchPlaces(searchQuery, selectedCategory, mapCenter);
            }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#191F28] border border-[#E5E8EB] transition-colors"
          >
            {t('map.search.retry')}
          </button>
        </div>
      ) : filteredPlaces.length === 0 ? (
        <div className="absolute inset-x-4 top-36 z-20 p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5E8EB] text-center shadow-md max-w-sm mx-auto">
          <div className="text-sm font-semibold text-[#191F28] mb-1">
            {t('map.search.empty_title')}
          </div>
          <div className="text-xs text-[#4E5968] mb-3 leading-relaxed">
            {t('map.search.empty_body')}
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="text-xs font-medium text-[#087F8C] hover:underline py-1"
          >
            {t('map.search.empty_action')}
          </button>
        </div>
      ) : null}

      {/* Place Preview Card & Bottom Sheet (Peek & Expanded Modes) */}
      {activePlace && (
        <div
          role="region"
          aria-label="선택 장소 상세 정보"
          className="absolute inset-x-0 bottom-16 z-30 p-2.5 sm:p-3 max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-200 pointer-events-auto"
        >
          <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-3 max-h-[70vh] flex flex-col text-[#191F28]">
            {/* Header info (Always visible in peek & expanded) */}
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FFFFFF] text-[#4E5968] border border-[#E5E8EB]">
                    {activePlace.categoryName || activePlace.category}
                  </span>
                  {activePlace.distance && (
                    <span className="text-xs text-[#8B95A1] font-medium">
                      {t('map.place.card_distance', { distance: activePlace.distance })}
                    </span>
                  )}
                  {activePlace.rating && (
                    <span className="text-xs text-[#191F28] font-bold flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-[#191F28]" />
                      {activePlace.rating}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-[#191F28] tracking-tight leading-snug truncate">
                  {activePlace.name}
                </h3>
                <p className="text-xs text-[#8B95A1] truncate mt-0.5">
                  {activePlace.address}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Peek / Expanded Toggle */}
                <button
                  type="button"
                  onClick={() => setIsSheetExpanded((prev) => !prev)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#8B95A1] hover:text-[#191F28] hover:bg-[#F8FAFC] transition-colors"
                  aria-expanded={isSheetExpanded}
                  aria-label={isSheetExpanded ? '상세 정보 접기' : '상세 정보 펼치기'}
                >
                  {isSheetExpanded ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronUp className="w-5 h-5" />
                  )}
                </button>

                {/* Close Sheet button (44px touch target) */}
                <button
                  type="button"
                  onClick={() => setActivePlace(null)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#8B95A1] hover:text-[#191F28] hover:bg-[#F8FAFC] transition-colors"
                  aria-label={t('common.action.close')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* P0: Primary 2 Travel Actions (Always prominent in peek mode) */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => openDirections(activePlace)}
                className="min-h-[44px] py-2.5 px-3 rounded-xl bg-[#087F8C] hover:bg-[#066B77] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{t('place.detail.directions')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('translate');
                }}
                className="min-h-[44px] py-2.5 px-3 rounded-xl bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#191F28] font-semibold text-xs flex items-center justify-center gap-1.5 border border-[#E5E8EB] active:scale-95 transition-all"
              >
                <Languages className="w-4 h-4 text-[#087F8C]" />
                <span>{t('place.detail.quick_translate')}</span>
              </button>
            </div>

            {/* Peek Quick Expand Hint Bar (when in peek mode) */}
            {!isSheetExpanded && (
              <button
                type="button"
                onClick={() => setIsSheetExpanded(true)}
                className="w-full py-1.5 flex items-center justify-center gap-1 text-[11px] font-medium text-[#087F8C] hover:underline transition-colors border-t border-[#E5E8EB] mt-1"
                aria-expanded="false"
              >
                <span>상세 정보 및 추가 도구 (시간·환율·저장·메뉴)</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Expanded Content Section (Scrollable without touching map) */}
            {isSheetExpanded && (
              <div className="space-y-3 overflow-y-auto no-scrollbar border-t border-[#E5E8EB] pt-2.5">
                {/* Hours & Description */}
                {(activePlace.hoursText || activePlace.description) && (
                  <div className="space-y-1.5 text-xs text-[#4E5968]">
                    {activePlace.hoursText && (
                      <div className="flex items-center gap-1.5 text-[#191F28]">
                        <Clock className="w-3.5 h-3.5 text-[#4E5968] shrink-0" />
                        <span className="font-semibold text-[#191F28]">{t('place.detail.hours')}</span>
                        <span className="text-[#4E5968]">· {activePlace.hoursText}</span>
                      </div>
                    )}
                    {activePlace.description && (
                      <p className="text-[#4E5968] text-xs leading-relaxed">
                        {activePlace.description}
                      </p>
                    )}
                  </div>
                )}

                {/* Contextual Action Ordering based on category (P1 / P2) */}
                {normalizeCategory(activePlace.category) === 'food' || normalizeCategory(activePlace.category) === 'cafe' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsCameraModalOpen(true)}
                      className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-[#FFFFFF] border border-[#E5E8EB] hover:bg-[#F8FAFC] text-[#191F28] font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <Camera className="w-4 h-4 text-[#087F8C]" />
                      <span>{t('camera.title')} (메뉴 촬영/번역)</span>
                    </button>

                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('currency');
                        }}
                        className="flex-1 min-h-[44px] py-2 px-2.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#191F28] text-xs font-medium flex items-center justify-center gap-1.5 border border-[#E5E8EB] transition-all active:scale-95"
                      >
                        <Coins className="w-3.5 h-3.5 text-[#087F8C]" />
                        <span>{t('place.detail.quick_currency')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (isPlaceSaved(activePlace.id)) {
                            removePlace(activePlace.id);
                          } else {
                            savePlace(activePlace);
                          }
                        }}
                        className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all active:scale-95 ${
                          isPlaceSaved(activePlace.id)
                            ? 'bg-[#191F28] border-[#191F28] text-white'
                            : 'bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#4E5968] border-[#E5E8EB]'
                        }`}
                      >
                        {isPlaceSaved(activePlace.id) ? (
                          <>
                            <BookmarkCheck className="w-3.5 h-3.5 text-white" />
                            <span>{t('saved.action.remove')}</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-3.5 h-3.5 text-[#4E5968]" />
                            <span>{t('saved.action.save')}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSharePlace(activePlace)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#4E5968] border border-[#E5E8EB] active:scale-95 transition-all"
                        aria-label={t('place.detail.copy_address')}
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('currency');
                        }}
                        className="flex-1 min-h-[44px] py-2 px-2.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#191F28] text-xs font-medium flex items-center justify-center gap-1.5 border border-[#E5E8EB] transition-all active:scale-95"
                      >
                        <Coins className="w-3.5 h-3.5 text-[#087F8C]" />
                        <span>{t('place.detail.quick_currency')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (isPlaceSaved(activePlace.id)) {
                            removePlace(activePlace.id);
                          } else {
                            savePlace(activePlace);
                          }
                        }}
                        className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all active:scale-95 ${
                          isPlaceSaved(activePlace.id)
                            ? 'bg-[#191F28] border-[#191F28] text-white'
                            : 'bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#4E5968] border-[#E5E8EB]'
                        }`}
                      >
                        {isPlaceSaved(activePlace.id) ? (
                          <>
                            <BookmarkCheck className="w-3.5 h-3.5 text-white" />
                            <span>{t('saved.action.remove')}</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-3.5 h-3.5 text-[#4E5968]" />
                            <span>{t('saved.action.save')}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSharePlace(activePlace)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#4E5968] border border-[#E5E8EB] active:scale-95 transition-all"
                        aria-label={t('place.detail.copy_address')}
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsCameraModalOpen(true)}
                      className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-[#FFFFFF] border border-[#E5E8EB] hover:bg-[#F8FAFC] text-[#191F28] font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <Camera className="w-4 h-4 text-[#087F8C]" />
                      <span>{t('camera.title')} (메뉴/안내판 번역)</span>
                    </button>
                  </>
                )}
              </div>
            )}
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
