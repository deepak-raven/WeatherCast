import React, { useEffect, useRef } from 'react';
import { 
  CloudRain, 
  Wind, 
  Droplets, 
  Sun
} from 'lucide-react';
import type { LocationCoordinates, FusedForecast, HourlyModelPoint, WeatherRegime } from '../types/weather';
import L from 'leaflet';

interface ForecastDashboardProps {
  location: LocationCoordinates;
  fused: FusedForecast;
  hourly: HourlyModelPoint[];
  regime: WeatherRegime;
}

export const ForecastDashboard: React.FC<ForecastDashboardProps> = ({
  location,
  fused,
  hourly
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const radarLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([location.lat, location.lon], 7);

      L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
      }).addTo(map);

      L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        opacity: 0.65
      }).addTo(map);

      mapInstanceRef.current = map;
      radarLayerRef.current = L.layerGroup().addTo(map);
    } else {
      mapInstanceRef.current.setView([location.lat, location.lon], 7);
    }

    if (radarLayerRef.current) {
      radarLayerRef.current.clearLayers();

      const marker = L.circleMarker([location.lat, location.lon], {
        radius: 7,
        fillColor: '#3b82f6',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 1
      }).bindPopup(`<b>${location.name}</b><br/>Rainfall: ${fused.precipitation} mm<br/>Temperature: ${fused.temperature}°C`);
      radarLayerRef.current.addLayer(marker);

      const baseRadius = (fused.precipitation > 0 ? 45000 : 25000);
      const rainColor = fused.precipitation > 20 ? '#ef4444' : fused.precipitation > 5 ? '#f59e0b' : '#3b82f6';

      const radarCore = L.circle([location.lat, location.lon], {
        radius: baseRadius,
        fillColor: rainColor,
        color: rainColor,
        weight: 1.5,
        opacity: 0.7,
        fillOpacity: 0.25
      });
      radarLayerRef.current.addLayer(radarCore);

      const radarOuter = L.circle([location.lat, location.lon], {
        radius: baseRadius * 1.6,
        fillColor: '#0284c7',
        color: '#0284c7',
        weight: 1,
        opacity: 0.3,
        fillOpacity: 0.1
      });
      radarLayerRef.current.addLayer(radarOuter);
    }
  }, [location, fused]);

  const timelineSlice = hourly.slice(0, 8);

  return (
    <div className="clean-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header matching Presentation */}
      <div className="clean-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: '#2563eb',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            1
          </span>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>Forecast Dashboard</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Real-time weather forecast &middot; Rainfall, temperature &amp; wind &middot; Forecast timeline
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {location.name}, {location.state || location.country}
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.25fr) minmax(280px, 1fr)', gap: '1rem', padding: '1.25rem', flex: 1 }}>
        {/* Left Side: Radar Map */}
        <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', minHeight: '260px' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '260px' }} />

          {/* Map Top Badge */}
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(17, 24, 39, 0.9)',
            border: '1px solid var(--border-color)',
            padding: '0.35rem 0.65rem',
            borderRadius: '6px',
            zIndex: 400,
            fontSize: '0.75rem',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            <span>Doppler Radar Composite: <b>{location.name}</b></span>
          </div>

          {/* Rainfall Intensity Scale Legend */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            background: 'rgba(17, 24, 39, 0.92)',
            border: '1px solid var(--border-color)',
            padding: '0.4rem 0.65rem',
            borderRadius: '6px',
            zIndex: 400,
            fontSize: '0.6875rem',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.2rem' }}>Rainfall (mm)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '12px', height: '8px', background: '#3b82f6', borderRadius: '2px' }} />
              <span style={{ width: '12px', height: '8px', background: '#06b6d4', borderRadius: '2px' }} />
              <span style={{ width: '12px', height: '8px', background: '#f59e0b', borderRadius: '2px' }} />
              <span style={{ width: '12px', height: '8px', background: '#ef4444', borderRadius: '2px' }} />
              <span style={{ marginLeft: '4px', color: '#fff' }}>0 - 50+</span>
            </div>
          </div>
        </div>

        {/* Right Side: Weather Stats & Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Main Temperature Hero Card */}
          <div style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {location.name}, {location.state}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginTop: '0.15rem' }}>
                <span className="numeric" style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                  {fused.temperature}
                </span>
                <span style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', fontWeight: 500 }}>°C</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#38bdf8', fontWeight: 500, marginTop: '0.25rem' }}>
                {fused.conditionText}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Feels like {fused.feelsLike}°C &middot; Surface Pressure: {fused.surfacePressure} hPa
              </div>
            </div>

            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.12)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {fused.precipitation > 0 ? <CloudRain size={28} /> : <Sun size={28} color="#fbbf24" />}
            </div>
          </div>

          {/* 3 Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <div style={{
              background: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '0.625rem',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 500 }}>
                <CloudRain size={13} /> Rainfall
              </div>
              <div className="numeric" style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', marginTop: '0.2rem' }}>
                {fused.precipitation} <span style={{ fontSize: '0.6875rem', fontWeight: 400 }}>mm</span>
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Next 24h</div>
            </div>

            <div style={{
              background: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '0.625rem',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', color: '#93c5fd', fontSize: '0.75rem', fontWeight: 500 }}>
                <Wind size={13} /> Wind
              </div>
              <div className="numeric" style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', marginTop: '0.2rem' }}>
                {fused.windSpeed} <span style={{ fontSize: '0.6875rem', fontWeight: 400 }}>km/h</span>
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{fused.windDirection}° Dir</div>
            </div>

            <div style={{
              background: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '0.625rem',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', color: '#c084fc', fontSize: '0.75rem', fontWeight: 500 }}>
                <Droplets size={13} /> Humidity
              </div>
              <div className="numeric" style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', marginTop: '0.2rem' }}>
                {fused.humidity}<span style={{ fontSize: '0.6875rem', fontWeight: 400 }}>%</span>
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Rel. Humidity</div>
            </div>
          </div>

          {/* Timeline Cards */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Forecast Timeline
            </div>
            <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
              {timelineSlice.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    minWidth: '54px',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '0.5rem 0.25rem',
                    textAlign: 'center',
                    flexShrink: 0
                  }}
                >
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    {idx === 0 ? 'Now' : item.hourLabel}
                  </div>
                  <div style={{ margin: '0.3rem 0', color: item.fusedRain > 0 ? '#38bdf8' : '#fbbf24' }}>
                    {item.fusedRain > 0 ? <CloudRain size={16} style={{ margin: '0 auto' }} /> : <Sun size={16} style={{ margin: '0 auto' }} />}
                  </div>
                  <div className="numeric" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>
                    {Math.round(item.fusedTemp)}°
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: item.fusedRain > 0 ? '#38bdf8' : 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {item.fusedRain > 0 ? `${item.fusedRain}mm` : '0mm'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
