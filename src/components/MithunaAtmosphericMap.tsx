import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  Thermometer,
  Droplets,
  CloudRain,
  CloudLightning,
  ChevronRight,
  ChevronLeft,
  Wind,
  Layers,
  Globe2,
  Calendar,
  Play,
  Pause,
  Ruler,
  Radio,
  RefreshCw,
  Zap
} from 'lucide-react';
import {
  mithunaEngine,
  TEMPERATURE_PALETTE,
  HUMIDITY_PALETTE,
  RAINFALL_PALETTE,
  ACCUMULATED_RAIN_PALETTE,
  interpolatePalette,
  type WeatherParameterType,
  type NWPModelType,
  type AtmosphericSample
} from '../services/mithunaSimulationService';
import {
  realTimeAtmosphericService,
  type LiveStationObservation,
  type LiveRadarMeta
} from '../services/realtimeAtmosphericService';
import {
  INDIA_NATIONAL_BOUNDARY,
  INDIA_STATE_BOUNDARIES,
  GLOBAL_REGIONAL_BOUNDARIES,
  GRATICULES
} from '../data/geoBoundaries';

interface MithunaAtmosphericMapProps {
  onLocationSelect?: (lat: number, lon: number, name: string) => void;
}

export const MithunaAtmosphericMap: React.FC<MithunaAtmosphericMapProps> = ({
  onLocationSelect
}) => {
  // Map and Layer references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const heatOverlayRef = useRef<L.ImageOverlay | null>(null);
  const radarTileLayerRef = useRef<L.TileLayer | null>(null);
  const windCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const vectorLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Real-time data state
  const [isRealTime, setIsRealTime] = useState<boolean>(true);
  const [liveStations, setLiveStations] = useState<LiveStationObservation[]>([]);
  const [liveRadarMeta, setLiveRadarMeta] = useState<LiveRadarMeta | null>(null);
  const [isLiveLoading, setIsLiveLoading] = useState<boolean>(false);
  const [lastLiveUpdated, setLastLiveUpdated] = useState<string>('Connecting...');

  // Control panel state
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [showStates, setShowStates] = useState(false);
  const [showIndia, setShowIndia] = useState(true);
  const [showGlobal, setShowGlobal] = useState(true);
  const [showLiveRadar, setShowLiveRadar] = useState(true);
  const [selectedModel, setSelectedModel] = useState<NWPModelType>('mithuna_glb');
  const [parameter, setParameter] = useState<WeatherParameterType>('temperature');
  const [pressureHpa, setPressureHpa] = useState<number>(850);
  const [opacity, setOpacity] = useState<number>(75);
  const [windsEnabled, setWindsEnabled] = useState<boolean>(true);
  const [geopotentialEnabled, setGeopotentialEnabled] = useState<boolean>(false);

  // Time playback state
  const [leadHours, setLeadHours] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Interactive probe
  const [activeTool, setActiveTool] = useState<'probe' | 'ruler' | 'polygon' | null>('probe');
  const [hoverSample, setHoverSample] = useState<{
    lat: number;
    lon: number;
    sample: AtmosphericSample;
  } | null>(null);

  // Wind particle system state
  const particlesRef = useRef<
    { x: number; y: number; age: number; maxAge: number; speed: number }[]
  >([]);

  // Current color palette based on active parameter
  const activePalette =
    parameter === 'temperature'
      ? TEMPERATURE_PALETTE
      : parameter === 'humidity'
      ? HUMIDITY_PALETTE
      : parameter === 'rainfall'
      ? RAINFALL_PALETTE
      : ACCUMULATED_RAIN_PALETTE;

  // Initialize wind particles
  const initParticles = useCallback((width: number, height: number) => {
    const count = 420;
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        age: Math.floor(Math.random() * 80),
        maxAge: 50 + Math.floor(Math.random() * 70),
        speed: 0.9 + Math.random() * 1.3
      });
    }
    particlesRef.current = particles;
  }, []);

  // Fetch live real-time feeds
  const refreshLiveFeeds = useCallback(async () => {
    setIsLiveLoading(true);
    try {
      const [stations, radar] = await Promise.all([
        realTimeAtmosphericService.fetchRealTimeGrid(),
        realTimeAtmosphericService.fetchLiveRadarMeta()
      ]);
      setLiveStations(stations);
      setLiveRadarMeta(radar);
      setLastLiveUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('Failed to load real-time atmospheric feeds:', err);
    } finally {
      setIsLiveLoading(false);
    }
  }, []);

  // Sample atmospheric telemetry (either Real-Time IDW or Synthetic NWP)
  const sampleAtmosphericTelemetry = useCallback(
    (lat: number, lon: number): AtmosphericSample => {
      if (isRealTime && liveStations.length > 0) {
        const live = realTimeAtmosphericService.interpolateRealTimeSample(lat, lon, pressureHpa);
        return {
          temperature: live.temperature,
          humidity: live.humidity,
          rainfall: live.precipitation,
          accumulatedRainfall: Math.round(live.precipitation * 24),
          windU: live.windU,
          windV: live.windV,
          windSpeed: live.windSpeed,
          windDirection: live.windDirection,
          geopotentialHeight: live.geopotentialHeight,
          pressureLevel: pressureHpa
        };
      }

      return mithunaEngine.sampleAtmosphericPoint(
        lat,
        lon,
        pressureHpa,
        leadHours,
        selectedModel
      );
    },
    [isRealTime, liveStations, pressureHpa, leadHours, selectedModel]
  );

  // Render continuous scalar atmospheric field using Leaflet ImageOverlay
  const renderAtmosphericHeatmap = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const bounds = map.getBounds();
    if (!bounds.isValid()) return;

    const size = map.getSize();
    if (size.x <= 0 || size.y <= 0) return;

    const bufferedBounds = bounds.pad(0.08);

    const cols = Math.min(320, Math.max(140, Math.round(size.x / 3)));
    const rows = Math.min(220, Math.max(90, Math.round(size.y / 3)));

    const offscreen = document.createElement('canvas');
    offscreen.width = cols;
    offscreen.height = rows;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const imgData = offCtx.createImageData(cols, rows);
    const data = imgData.data;

    const north = bufferedBounds.getNorth();
    const south = bufferedBounds.getSouth();
    const west = bufferedBounds.getWest();
    const east = bufferedBounds.getEast();

    const dLat = (north - south) / rows;
    const dLon = (east - west) / cols;

    for (let r = 0; r < rows; r++) {
      const lat = north - r * dLat;
      for (let c = 0; c < cols; c++) {
        const lon = west + c * dLon;
        const sample = sampleAtmosphericTelemetry(lat, lon);

        let scalarVal = sample.temperature;
        if (parameter === 'humidity') scalarVal = sample.humidity;
        else if (parameter === 'rainfall') scalarVal = sample.rainfall;
        else if (parameter === 'accumulated_rainfall') scalarVal = sample.accumulatedRainfall;

        const [red, green, blue] = interpolatePalette(scalarVal, activePalette);
        const idx = (r * cols + c) * 4;
        data[idx] = red;
        data[idx + 1] = green;
        data[idx + 2] = blue;
        data[idx + 3] = 255;
      }
    }

    offCtx.putImageData(imgData, 0, 0);
    const dataUrl = offscreen.toDataURL('image/png');

    if (!heatOverlayRef.current) {
      heatOverlayRef.current = L.imageOverlay(dataUrl, bufferedBounds, {
        opacity: opacity / 100,
        interactive: false,
        pane: 'atmosphericPane'
      }).addTo(map);
    } else {
      heatOverlayRef.current.setUrl(dataUrl);
      heatOverlayRef.current.setBounds(bufferedBounds);
      heatOverlayRef.current.setOpacity(opacity / 100);
    }
  }, [opacity, parameter, sampleAtmosphericTelemetry, activePalette]);

  // Update Live Doppler Radar Layer from RainViewer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (showLiveRadar && liveRadarMeta && (parameter === 'rainfall' || parameter === 'accumulated_rainfall')) {
      const radarUrl = `${liveRadarMeta.host}${liveRadarMeta.latestRadarPath}/256/{z}/{x}/{y}/2/1_1.png`;

      if (!radarTileLayerRef.current) {
        radarTileLayerRef.current = L.tileLayer(radarUrl, {
          opacity: 0.85,
          zIndex: 320,
          maxZoom: 14
        }).addTo(map);
      } else {
        radarTileLayerRef.current.setUrl(radarUrl);
        radarTileLayerRef.current.setOpacity(0.85);
      }
    } else {
      if (radarTileLayerRef.current) {
        map.removeLayer(radarTileLayerRef.current);
        radarTileLayerRef.current = null;
      }
    }
  }, [showLiveRadar, liveRadarMeta, parameter]);

  // Wind particle streamline animation loop
  const animateWinds = useCallback(() => {
    const map = mapRef.current;
    const canvas = windCanvasRef.current;
    if (!map || !canvas || !windsEnabled) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      initParticles(canvas.width, canvas.height);
    }

    const width = canvas.width;
    const height = canvas.height;
    if (width <= 0 || height <= 0) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';

    const particles = particlesRef.current;
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#bef264';
    ctx.shadowBlur = 3;
    ctx.shadowColor = '#84cc16';

    ctx.beginPath();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const latLng = map.containerPointToLatLng([p.x, p.y]);
      const sample = sampleAtmosphericTelemetry(latLng.lat, latLng.lng);

      const dx = sample.windU * 0.45 * p.speed;
      const dy = -sample.windV * 0.45 * p.speed;

      ctx.moveTo(p.x, p.y);
      p.x += dx;
      p.y += dy;
      ctx.lineTo(p.x, p.y);

      p.age++;
      if (p.age >= p.maxAge || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
        p.x = Math.random() * width;
        p.y = Math.random() * height;
        p.age = 0;
        p.maxAge = 50 + Math.floor(Math.random() * 70);
      }
    }
    ctx.stroke();

    animFrameRef.current = requestAnimationFrame(animateWinds);
  }, [windsEnabled, sampleAtmosphericTelemetry, initParticles]);

  // Update administrative and geopotential boundary overlays
  const updateVectorOverlays = useCallback(() => {
    const map = mapRef.current;
    const layerGroup = vectorLayerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Graticules (Lat/Lon grid)
    GRATICULES.forEach((g) => {
      L.polyline(g.coords, {
        color: '#ffffff',
        weight: 0.6,
        opacity: 0.18,
        dashArray: '3, 6'
      }).addTo(layerGroup);
    });

    // 2. Global / Regional country borders and coastlines
    if (showGlobal) {
      GLOBAL_REGIONAL_BOUNDARIES.forEach((b) => {
        L.polyline(b.coords, {
          color: '#1e293b',
          weight: 1.8,
          opacity: 0.95
        }).addTo(layerGroup);
      });
    }

    // 3. Indian State Boundaries
    if (showStates) {
      INDIA_STATE_BOUNDARIES.forEach((s) => {
        L.polyline(s.coords, {
          color: '#0284c7',
          weight: 1.3,
          opacity: 0.65,
          dashArray: '4, 4'
        }).addTo(layerGroup);
      });
    }

    // 4. India National Boundary (Crisp dark navy outline)
    if (showIndia) {
      L.polyline(INDIA_NATIONAL_BOUNDARY, {
        color: '#0f172a',
        weight: 2.8,
        opacity: 0.98
      }).addTo(layerGroup);
    }

    // 5. Geopotential Isolines
    if (geopotentialEnabled) {
      const bounds = map.getBounds();
      const isolines = mithunaEngine.getGeopotentialIsolines(pressureHpa, {
        south: bounds.getSouth(),
        north: bounds.getNorth(),
        west: bounds.getWest(),
        east: bounds.getEast()
      });

      isolines.forEach((iso) => {
        const poly = L.polyline(iso.points, {
          color: '#ffffff',
          weight: 1.2,
          opacity: 0.75,
          dashArray: '5, 5'
        });

        poly.bindTooltip(`${iso.level} gpm`, {
          permanent: false,
          sticky: true,
          className: 'geopotential-label'
        });

        poly.addTo(layerGroup);
      });
    }
  }, [showGlobal, showIndia, showStates, geopotentialEnabled, pressureHpa]);

  // Setup Leaflet map on mount
  useEffect(() => {
    refreshLiveFeeds();

    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [23.5, 68.0],
        zoom: 4,
        minZoom: 3,
        maxZoom: 9,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 16 }
      ).addTo(map);

      const pane = map.createPane('atmosphericPane');
      pane.style.zIndex = '250';
      pane.style.pointerEvents = 'none';

      const layerGroup = L.layerGroup().addTo(map);
      vectorLayerGroupRef.current = layerGroup;

      mapRef.current = map;

      map.on('moveend', () => {
        renderAtmosphericHeatmap();
        updateVectorOverlays();
      });

      map.on('zoomend', () => {
        renderAtmosphericHeatmap();
        updateVectorOverlays();
      });

      map.on('resize', () => {
        renderAtmosphericHeatmap();
      });

      // Hover probe
      map.on('mousemove', (e: L.LeafletMouseEvent) => {
        const sample = sampleAtmosphericTelemetry(e.latlng.lat, e.latlng.lng);
        setHoverSample({
          lat: Math.round(e.latlng.lat * 100) / 100,
          lon: Math.round(e.latlng.lng * 100) / 100,
          sample
        });
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        if (onLocationSelect) {
          onLocationSelect(e.latlng.lat, e.latlng.lng, `Probe (${e.latlng.lat.toFixed(1)}°N, ${e.latlng.lng.toFixed(1)}°E)`);
        }
      });

      map.whenReady(() => {
        setTimeout(() => {
          map.invalidateSize();
          renderAtmosphericHeatmap();
          updateVectorOverlays();
        }, 100);
      });
    }

    const timer = setTimeout(() => {
      renderAtmosphericHeatmap();
      updateVectorOverlays();
    }, 150);

    return () => clearTimeout(timer);
  }, [renderAtmosphericHeatmap, updateVectorOverlays, onLocationSelect, refreshLiveFeeds, sampleAtmosphericTelemetry]);

  // Instant opacity updates
  useEffect(() => {
    if (heatOverlayRef.current) {
      heatOverlayRef.current.setOpacity(opacity / 100);
    }
  }, [opacity]);

  // Restart wind animation when toggled
  useEffect(() => {
    if (windsEnabled) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animateWinds();
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      const canvas = windCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [windsEnabled, animateWinds]);

  // Re-render heatmap when parameters change
  useEffect(() => {
    renderAtmosphericHeatmap();
    updateVectorOverlays();
  }, [renderAtmosphericHeatmap, updateVectorOverlays]);

  // Handle simulation time playback
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setLeadHours((prev) => (prev >= 72 ? 0 : prev + 6));
      }, 1800);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '680px', overflow: 'hidden' }}>
      {/* 1. Full Map Canvas */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '680px' }} />

      {/* 2. Dynamic Wind Streamline Particle Canvas (Overlaid on top of map at zIndex 420) */}
      <canvas
        ref={windCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 420
        }}
      />

      {/* 3. Top-Left Live Status Badge */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '60px',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '8px',
        padding: '0.4rem 0.75rem',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
        fontSize: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isRealTime ? '#22c55e' : '#f59e0b',
            boxShadow: isRealTime ? '0 0 8px #22c55e' : 'none',
            display: 'inline-block'
          }} />
          <span style={{ fontWeight: 600, color: '#fff' }}>
            {isRealTime ? 'OPERATIONAL LIVE GRID' : 'SYNTHETIC SIMULATION'}
          </span>
          <span style={{ color: '#94a3b8' }}>&middot;</span>
          <span style={{ color: '#cbd5e1' }}>
            {liveStations.length > 0 ? `${liveStations.length} Anchor Stations` : 'Connecting...'}
          </span>
        </div>

        <button
          onClick={refreshLiveFeeds}
          disabled={isLiveLoading}
          style={{
            border: 'none',
            background: 'rgba(59, 130, 246, 0.2)',
            color: '#60a5fa',
            borderRadius: '4px',
            padding: '2px 6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.6875rem'
          }}
          title="Refresh Live Operational Feed"
        >
          <RefreshCw size={11} className={isLiveLoading ? 'spin-icon' : ''} />
          <span>{isLiveLoading ? 'Syncing...' : lastLiveUpdated}</span>
        </button>
      </div>

      {/* 4. Top-Left Zoom Controls */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '8px',
        padding: '3px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
      }}>
        <button
          onClick={() => mapRef.current?.zoomIn()}
          style={{
            width: '32px',
            height: '32px',
            border: 'none',
            background: 'transparent',
            color: '#fff',
            fontSize: '18px',
            fontWeight: 600,
            cursor: 'pointer',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Zoom In"
        >
          +
        </button>
        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
        <button
          onClick={() => mapRef.current?.zoomOut()}
          style={{
            width: '32px',
            height: '32px',
            border: 'none',
            background: 'transparent',
            color: '#fff',
            fontSize: '20px',
            fontWeight: 600,
            cursor: 'pointer',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Zoom Out"
        >
          &minus;
        </button>
      </div>

      {/* 5. Middle-Left Globe / Projection / Tool Button */}
      <div style={{
        position: 'absolute',
        top: '180px',
        left: '16px',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <button
          onClick={() => {
            mapRef.current?.setView([23.5, 68.0], 4);
          }}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#60a5fa',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)'
          }}
          title="Reset South Asia Synoptic View"
        >
          <Globe2 size={20} />
        </button>
      </div>

      {/* 6. Bottom-Left Measurement / Area Tools */}
      <div style={{
        position: 'absolute',
        bottom: '80px',
        left: '16px',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '8px',
        padding: '4px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
      }}>
        <button
          onClick={() => setActiveTool(activeTool === 'polygon' ? null : 'polygon')}
          style={{
            width: '32px',
            height: '32px',
            border: 'none',
            background: activeTool === 'polygon' ? '#2563eb' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Polygon Area Inspection"
        >
          <Layers size={16} />
        </button>
        <button
          onClick={() => setActiveTool(activeTool === 'ruler' ? null : 'ruler')}
          style={{
            width: '32px',
            height: '32px',
            border: 'none',
            background: activeTool === 'ruler' ? '#2563eb' : 'transparent',
            color: '#fff',
            cursor: 'pointer',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Distance Ruler"
        >
          <Ruler size={16} />
        </button>
      </div>

      {/* 7. Bottom-Left Date Badge / Simulation Player */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '8px',
        padding: '0.4rem 0.75rem',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
        color: '#fff',
        fontSize: '0.8125rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Calendar size={14} color="#60a5fa" />
          <span style={{ fontWeight: 600 }}>{isRealTime ? 'Live Synchronized' : 'Date: 2026-09-28'}</span>
          <span style={{
            background: 'rgba(59, 130, 246, 0.2)',
            color: '#93c5fd',
            padding: '0.15rem 0.4rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            {isRealTime ? 'UTC NOW' : `+${leadHours}h UTC`}
          </span>
        </div>

        <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.15)' }} />

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.75rem'
          }}
        >
          {isPlaying ? <Pause size={14} color="#f87171" /> : <Play size={14} color="#4ade80" />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        {hoverSample && (
          <>
            <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.15)' }} />
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
              <span style={{ color: '#94a3b8' }}>Coord:</span> {hoverSample.lat}°N, {hoverSample.lon}°E &middot;{' '}
              <span style={{ color: '#94a3b8' }}>Val:</span>{' '}
              <b style={{ color: '#38bdf8' }}>
                {parameter === 'temperature' && `${hoverSample.sample.temperature}°C`}
                {parameter === 'humidity' && `${hoverSample.sample.humidity}%`}
                {parameter === 'rainfall' && `${hoverSample.sample.rainfall} mm/h`}
                {parameter === 'accumulated_rainfall' && `${hoverSample.sample.accumulatedRainfall} mm`}
              </b>{' '}
              &middot; <span style={{ color: '#94a3b8' }}>Wind:</span> {hoverSample.sample.windSpeed} km/h
            </div>
          </>
        )}
      </div>

      {/* 8. Right Floating Meteorological Panel */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 500,
        width: isPanelCollapsed ? '44px' : '290px',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'rgba(22, 27, 34, 0.88)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55)',
        overflow: 'hidden',
        color: '#fff'
      }}>
        {/* Panel Header & Collapse Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isPanelCollapsed ? 'center' : 'space-between',
          padding: '0.65rem 0.85rem',
          borderBottom: isPanelCollapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {!isPanelCollapsed && (
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f1f5f9' }}>
              Administrative:
            </div>
          )}
          <button
            onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#2563eb',
              border: 'none',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title={isPanelCollapsed ? 'Expand Controls' : 'Collapse Controls'}
          >
            {isPanelCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {!isPanelCollapsed && (
          <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {/* Live Data Switch Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '0.4rem 0.6rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
                <Radio size={13} color={isRealTime ? '#22c55e' : '#94a3b8'} />
                <span style={{ fontWeight: 600, color: isRealTime ? '#4ade80' : '#cbd5e1' }}>
                  {isRealTime ? 'Live Operational Feed' : 'Offline Simulation'}
                </span>
              </div>
              <button
                onClick={() => setIsRealTime(!isRealTime)}
                style={{
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: isRealTime ? '#16a34a' : 'rgba(51, 65, 85, 0.8)',
                  color: '#fff'
                }}
              >
                {isRealTime ? 'LIVE' : 'SIM'}
              </button>
            </div>

            {/* 1. Administrative Checkboxes */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showStates}
                  onChange={(e) => setShowStates(e.target.checked)}
                  style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                />
                <span>States</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showIndia}
                  onChange={(e) => setShowIndia(e.target.checked)}
                  style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                />
                <span>India</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showGlobal}
                  onChange={(e) => setShowGlobal(e.target.checked)}
                  style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                />
                <span>Global</span>
              </label>
            </div>

            {/* 2. Choose Model Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 500 }}>
                Choose Model
              </div>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as NWPModelType)}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    color: '#fff',
                    fontSize: '0.8125rem',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none'
                  }}
                >
                  <option value="mithuna_glb">Mithuna GLB (Operational)</option>
                  <option value="ecmwf_hres">ECMWF IFS (9km)</option>
                  <option value="gfs_grib2">NOAA GFS (13km)</option>
                  <option value="ncum_reg">NCUM Regional (4km)</option>
                </select>
                <div style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  fontSize: '0.75rem',
                  color: '#94a3b8'
                }}>
                  &#9662;
                </div>
              </div>
            </div>

            {/* 3. Weather Parameter 2x2 Toggle Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.8125rem', color: '#94a3b8', fontWeight: 500 }}>
                Weather Parameter:
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem'
              }}>
                <button
                  onClick={() => setParameter('temperature')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.6rem 0.4rem',
                    borderRadius: '8px',
                    border: parameter === 'temperature' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: parameter === 'temperature' ? '#2563eb' : 'rgba(30, 41, 59, 0.6)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: parameter === 'temperature' ? 600 : 400,
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Thermometer size={16} />
                  <span>Temperature</span>
                </button>

                <button
                  onClick={() => setParameter('humidity')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.6rem 0.4rem',
                    borderRadius: '8px',
                    border: parameter === 'humidity' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: parameter === 'humidity' ? '#2563eb' : 'rgba(30, 41, 59, 0.6)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: parameter === 'humidity' ? 600 : 400,
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Droplets size={16} />
                  <span>Humidity</span>
                </button>

                <button
                  onClick={() => setParameter('rainfall')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.6rem 0.4rem',
                    borderRadius: '8px',
                    border: parameter === 'rainfall' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: parameter === 'rainfall' ? '#2563eb' : 'rgba(30, 41, 59, 0.6)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: parameter === 'rainfall' ? 600 : 400,
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <CloudRain size={16} />
                  <span>Rainfall</span>
                </button>

                <button
                  onClick={() => setParameter('accumulated_rainfall')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.6rem 0.4rem',
                    borderRadius: '8px',
                    border: parameter === 'accumulated_rainfall' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: parameter === 'accumulated_rainfall' ? '#2563eb' : 'rgba(30, 41, 59, 0.6)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: parameter === 'accumulated_rainfall' ? 600 : 400,
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <CloudLightning size={16} />
                  <span style={{ fontSize: '0.6875rem' }}>Accumulated Rain</span>
                </button>
              </div>
            </div>

            {/* Live Doppler Radar Tile Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.35rem 0.5rem',
              borderRadius: '6px',
              background: 'rgba(30, 41, 59, 0.5)',
              fontSize: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Zap size={13} color="#eab308" />
                <span>Live Doppler Radar</span>
              </div>
              <button
                onClick={() => setShowLiveRadar(!showLiveRadar)}
                style={{
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: showLiveRadar ? '#eab308' : 'rgba(71, 85, 105, 0.8)',
                  color: showLiveRadar ? '#000' : '#fff'
                }}
              >
                {showLiveRadar ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* 4. Pressure: 850 hPa Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: '#cbd5e1' }}>Pressure: {pressureHpa} hPa</span>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  {pressureHpa === 850 ? 'Lower Troposphere' : pressureHpa === 500 ? 'Mid Troposphere' : 'Surface'}
                </span>
              </div>
              <input
                type="range"
                min="200"
                max="1000"
                step="75"
                value={pressureHpa}
                onChange={(e) => setPressureHpa(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#3b82f6',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#64748b' }}>
                <span>200 hPa</span>
                <span>500</span>
                <span>850</span>
                <span>1000 hPa</span>
              </div>
            </div>

            {/* 5. Opacity: 75% Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: '#cbd5e1' }}>Opacity: {opacity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#3b82f6',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* 6. Winds & Geopotential Toggles */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '0.35rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wind size={15} color="#94a3b8" />
                <span style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>Winds</span>
                <button
                  onClick={() => setWindsEnabled(!windsEnabled)}
                  style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: windsEnabled ? '#2563eb' : 'rgba(51, 65, 85, 0.8)',
                    color: '#fff',
                    transition: 'background 0.15s ease'
                  }}
                >
                  {windsEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={15} color="#94a3b8" />
                <span style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>Geopotential</span>
                <button
                  onClick={() => setGeopotentialEnabled(!geopotentialEnabled)}
                  style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: geopotentialEnabled ? '#2563eb' : 'rgba(51, 65, 85, 0.8)',
                    color: '#fff',
                    transition: 'background 0.15s ease'
                  }}
                >
                  {geopotentialEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 9. Bottom-Right Color Scale Legend */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '6px',
        overflow: 'hidden',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.55)',
        fontSize: '0.6875rem',
        fontWeight: 600
      }}>
        <div style={{
          background: '#9333ea',
          color: '#fff',
          padding: '0.3rem 0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem'
        }}>
          {parameter === 'temperature' ? '°C' : parameter === 'humidity' ? '%' : parameter === 'rainfall' ? 'mm/h' : 'mm'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          {activePalette.map((stop) => (
            <div
              key={stop.val}
              style={{
                background: stop.hex,
                color: '#fff',
                padding: '0.3rem 0.35rem',
                minWidth: '22px',
                textAlign: 'center',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                fontSize: '0.6875rem'
              }}
            >
              {stop.val}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
