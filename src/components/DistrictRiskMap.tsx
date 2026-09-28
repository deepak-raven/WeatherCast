import React, { useEffect, useRef, useState } from 'react';
import type { DistrictRiskItem, LocationCoordinates } from '../types/weather';
import { KEY_INDIAN_DISTRICTS } from '../data/indiaDistricts';
import L from 'leaflet';

interface DistrictRiskMapProps {
  onSelectDistrict: (loc: LocationCoordinates) => void;
  currentLocation: LocationCoordinates;
  fusedRain: number;
  fusedTemp: number;
  windSpeed: number;
}

export const DistrictRiskMap: React.FC<DistrictRiskMapProps> = ({
  onSelectDistrict,
  currentLocation,
  fusedRain,
  fusedTemp,
  windSpeed
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'RAIN' | 'HEAT' | 'WIND'>('ALL');

  const districtRiskList: DistrictRiskItem[] = KEY_INDIAN_DISTRICTS.map((st) => {
    let riskLevel: DistrictRiskItem['riskLevel'] = 'LOW';
    let hazard: DistrictRiskItem['hazard'] = st.baseHazard;
    let expectedRain = '0-5 mm';
    let expectedTemp = '31-34°C';
    let expectedWind = '10-20 km/h';

    if (st.id === 'chennai' || st.id === 'wayanad' || (st.region === 'South' && fusedRain > 10)) {
      riskLevel = fusedRain > 20 ? 'VERY_HIGH' : 'HIGH';
      hazard = 'Heavy Rainfall';
      expectedRain = `${Math.max(45, Math.round(fusedRain * 2))}-${Math.max(120, Math.round(fusedRain * 4))} mm`;
      expectedWind = `${Math.max(25, Math.round(windSpeed))} - 50 km/h`;
    } else if (st.id === 'jaipur' || st.id === 'ahmedabad' || st.id === 'delhi') {
      riskLevel = fusedTemp > 38 ? 'VERY_HIGH' : 'HIGH';
      hazard = 'Heatwave';
      expectedTemp = `${Math.max(38, Math.round(fusedTemp))}°C - 43°C`;
    } else if (st.id === 'bhubaneswar' || st.id === 'visakhapatnam' || windSpeed > 40) {
      riskLevel = windSpeed > 55 ? 'VERY_HIGH' : 'MODERATE';
      hazard = 'High Wind';
      expectedWind = `${Math.max(35, Math.round(windSpeed))} - 65 km/h`;
    }

    return {
      id: st.id,
      district: st.name,
      state: st.state,
      lat: st.lat,
      lon: st.lon,
      riskLevel,
      hazard,
      expectedRain,
      expectedTemp,
      expectedWind,
      confidence: 86,
      validPeriod: 'Next 24-48h',
    };
  });

  const filteredList = districtRiskList.filter((item) => {
    if (selectedFilter === 'RAIN') return item.hazard === 'Heavy Rainfall';
    if (selectedFilter === 'HEAT') return item.hazard === 'Heatwave';
    if (selectedFilter === 'WIND') return item.hazard === 'High Wind';
    return true;
  });

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([20.5937, 78.9629], 4.5);

      L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
      }).addTo(map);

      L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        opacity: 0.65
      }).addTo(map);

      mapInstanceRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
    } else {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 50);
    }

    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers();

      filteredList.forEach((st) => {
        let color = '#10b981';
        let radius = 22000;

        if (st.riskLevel === 'VERY_HIGH') {
          color = '#ef4444';
          radius = 60000;
        } else if (st.riskLevel === 'HIGH') {
          color = '#f59e0b';
          radius = 42000;
        } else if (st.riskLevel === 'MODERATE') {
          color = '#3b82f6';
          radius = 30000;
        }

        const zone = L.circle([st.lat, st.lon], {
          radius,
          fillColor: color,
          color,
          weight: 1.5,
          opacity: 0.85,
          fillOpacity: 0.3,
        });

        const dot = L.circleMarker([st.lat, st.lon], {
          radius: 5,
          fillColor: color,
          color: '#ffffff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 1,
        });

        const popupContent = `
          <div style="font-size: 12px; padding: 2px;">
            <b>${st.district} (${st.state})</b><br/>
            Risk Tier: <span style="font-weight: 600; color: ${color};">${st.riskLevel}</span><br/>
            Hazard: ${st.hazard}<br/>
            Precipitation: ${st.expectedRain}<br/>
            Temperature: ${st.expectedTemp}
          </div>
        `;
        zone.bindPopup(popupContent);
        dot.bindPopup(popupContent);

        zone.on('click', () => {
          onSelectDistrict({ name: st.district, state: st.state, country: 'India', lat: st.lat, lon: st.lon });
        });
        dot.on('click', () => {
          onSelectDistrict({ name: st.district, state: st.state, country: 'India', lat: st.lat, lon: st.lon });
        });

        layerGroupRef.current?.addLayer(zone);
        layerGroupRef.current?.addLayer(dot);
      });
    }
  }, [filteredList]);

  return (
    <div className="clean-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
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
            3
          </span>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>Risk Map</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              District-level weather risk &middot; Heavy rainfall / heatwave / high-wind zones &middot; Probability-based
            </div>
          </div>
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: '3px', background: 'var(--bg-app)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          {(['ALL', 'RAIN', 'HEAT', 'WIND'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedFilter(mode)}
              style={{
                padding: '0.2rem 0.55rem',
                fontSize: '0.6875rem',
                fontWeight: selectedFilter === mode ? 600 : 400,
                color: selectedFilter === mode ? '#fff' : 'var(--text-muted)',
                background: selectedFilter === mode ? '#2563eb' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Full Width Map View without side cards */}
      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          width: '100%',
          height: '100%',
          minHeight: '340px',
          flex: 1
        }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '340px' }} />

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
            color: '#fff'
          }}>
            India Risk Map &middot; {currentLocation.name}
          </div>

          {/* Legend */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            background: 'rgba(17, 24, 39, 0.92)',
            border: '1px solid var(--border-color)',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            zIndex: 400,
            fontSize: '0.6875rem',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>Risk Level</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '2px' }} />
                <span>Very High Risk</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: '#f59e0b', borderRadius: '2px' }} />
                <span>High Risk</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '2px' }} />
                <span>Moderate Risk</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
