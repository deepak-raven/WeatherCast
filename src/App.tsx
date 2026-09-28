import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ForecastDashboard } from './components/ForecastDashboard';
import { ModelComparison } from './components/ModelComparison';
import { DistrictRiskMap } from './components/DistrictRiskMap';
import { AlertExplainability } from './components/AlertExplainability';
import { MithunaAtmosphericMap } from './components/MithunaAtmosphericMap';
import type { LocationCoordinates } from './types/weather';
import { fetchLiveMultiModelData } from './services/openMeteoService';
import type { RawMultiModelResponse } from './services/openMeteoService';
import { detectWeatherRegime } from './services/regimeClassifier';
import { computeDynamicFusion } from './services/fusionEngine';
import { 
  AlertCircle, 
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';

const DEFAULT_LOCATION: LocationCoordinates = {
  name: 'Chennai',
  state: 'Tamil Nadu',
  country: 'India',
  lat: 13.0827,
  lon: 80.2707,
};

export const App: React.FC = () => {
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates>(DEFAULT_LOCATION);
  const [selectedLeadHours, setSelectedLeadHours] = useState<number>(24);
  const [activeView, setActiveView] = useState<'quad' | 'dashboard' | 'comparison' | 'riskmap' | 'mithuna' | 'alerts'>('mithuna');
  
  const [rawData, setRawData] = useState<RawMultiModelResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (loc: LocationCoordinates) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchLiveMultiModelData(loc.lat, loc.lon);
      setRawData(data);
    } catch (err: any) {
      console.error('Failed to load multi-model data:', err);
      setError(err?.message || 'Error fetching live multi-model meteorological feeds.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(currentLocation);
  }, [currentLocation, loadData]);

  const handleSelectLocation = (loc: LocationCoordinates) => {
    setCurrentLocation(loc);
  };

  const handleScenarioSelect = (name: string, state: string, lat: number, lon: number) => {
    setCurrentLocation({ name, state, country: 'India', lat, lon });
  };

  const activeRegime = rawData
    ? detectWeatherRegime(rawData)
    : {
        type: 'MONSOON_DEPRESSION' as const,
        title: 'Monsoon Depression',
        badgeText: 'Active Monsoon',
        description: 'Atmospheric telemetry calculating...',
        riskLevel: 'HIGH' as const,
        triggerMetrics: { precipRate: 12, cape: 1850, pressureDrop: 4.5, windGust: 38, tempAnomaly: -1.2, rh: 82 }
      };

  const fusionResult = rawData
    ? computeDynamicFusion(rawData, activeRegime, selectedLeadHours)
    : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>
      {/* Header */}
      <Header
        currentLocation={currentLocation}
        onSelectLocation={handleSelectLocation}
        activeRegime={activeRegime}
        selectedLeadHours={selectedLeadHours}
        onSelectLeadHours={setSelectedLeadHours}
        activeView={activeView}
        onChangeView={setActiveView}
        onRefresh={() => loadData(currentLocation)}
        isLoading={isLoading}
      />

      {/* Preset Scenarios Strip for Live Presentation */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.45rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
        fontSize: '0.78125rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <SlidersHorizontal size={14} color="#3b82f6" />
          <span style={{ fontWeight: 500 }}>Live Regional Scenarios:</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleScenarioSelect('Chennai', 'Tamil Nadu', 13.0827, 80.2707)}
            className={`btn ${currentLocation.name === 'Chennai' ? 'btn-active' : ''}`}
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
          >
            Chennai (Monsoon Trough)
          </button>

          <button
            onClick={() => handleScenarioSelect('Ahmedabad', 'Gujarat', 23.0225, 72.5714)}
            className={`btn ${currentLocation.name === 'Ahmedabad' ? 'btn-active' : ''}`}
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
          >
            Ahmedabad (Heatwave)
          </button>

          <button
            onClick={() => handleScenarioSelect('Bhubaneswar', 'Odisha', 20.2961, 85.8245)}
            className={`btn ${currentLocation.name === 'Bhubaneswar' ? 'btn-active' : ''}`}
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
          >
            Bhubaneswar (Coastal Gale)
          </button>

          <button
            onClick={() => handleScenarioSelect('Shimla', 'Himachal Pradesh', 31.1048, 77.1734)}
            className={`btn ${currentLocation.name === 'Shimla' ? 'btn-active' : ''}`}
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
          >
            Shimla (Western Disturbance)
          </button>
        </div>

        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          Dynamic multi-model weighting active
        </div>
      </div>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            color: '#f87171',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8125rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadData(currentLocation)}
              className="btn"
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
            >
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        )}

        {activeView === 'mithuna' ? (
          <div style={{
            flex: 1,
            minHeight: '760px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)'
          }}>
            <MithunaAtmosphericMap
              onLocationSelect={(lat, lon, name) => {
                setCurrentLocation({ name, state: '', country: 'India', lat, lon });
              }}
            />
          </div>
        ) : isLoading && !fusionResult ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            minHeight: '380px'
          }}>
            <RefreshCw size={24} color="#3b82f6" className="spin-icon" />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#fff' }}>
                Fetching multi-model forecast data...
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Querying live ECMWF, GFS, and ICON streams for {currentLocation.name}...
              </div>
            </div>
          </div>
        ) : fusionResult ? (
          <>
            {/* View Mode: Quad View */}
            {activeView === 'quad' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(520px, 1fr))',
                gap: '1rem',
                flex: 1
              }}>
                <ForecastDashboard
                  location={currentLocation}
                  fused={fusionResult.fusedCurrent}
                  hourly={fusionResult.hourlyPoints}
                  regime={activeRegime}
                />

                <ModelComparison
                  weights={fusionResult.weights}
                  accuracyTimeline={fusionResult.accuracyTimeline}
                  selectedLeadHours={selectedLeadHours}
                />

                <DistrictRiskMap
                  onSelectDistrict={handleSelectLocation}
                  currentLocation={currentLocation}
                  fusedRain={fusionResult.fusedCurrent.precipitation}
                  fusedTemp={fusionResult.fusedCurrent.temperature}
                  windSpeed={fusionResult.fusedCurrent.windSpeed}
                />

                <AlertExplainability
                  explainability={fusionResult.explainability}
                  weights={fusionResult.weights}
                  fused={fusionResult.fusedCurrent}
                  location={currentLocation}
                  regime={activeRegime}
                  onNavigateToComparison={() => setActiveView('comparison')}
                />
              </div>
            )}

            {/* Individual Views */}
            {activeView === 'dashboard' && (
              <div style={{ flex: 1, minHeight: '620px' }}>
                <ForecastDashboard
                  location={currentLocation}
                  fused={fusionResult.fusedCurrent}
                  hourly={fusionResult.hourlyPoints}
                  regime={activeRegime}
                />
              </div>
            )}

            {activeView === 'comparison' && (
              <div style={{ flex: 1, minHeight: '620px' }}>
                <ModelComparison
                  weights={fusionResult.weights}
                  accuracyTimeline={fusionResult.accuracyTimeline}
                  selectedLeadHours={selectedLeadHours}
                />
              </div>
            )}

            {activeView === 'riskmap' && (
              <div style={{ flex: 1, minHeight: '620px' }}>
                <DistrictRiskMap
                  onSelectDistrict={handleSelectLocation}
                  currentLocation={currentLocation}
                  fusedRain={fusionResult.fusedCurrent.precipitation}
                  fusedTemp={fusionResult.fusedCurrent.temperature}
                  windSpeed={fusionResult.fusedCurrent.windSpeed}
                />
              </div>
            )}

            {activeView === 'alerts' && (
              <div style={{ flex: 1, minHeight: '620px' }}>
                <AlertExplainability
                  explainability={fusionResult.explainability}
                  weights={fusionResult.weights}
                  fused={fusionResult.fusedCurrent}
                  location={currentLocation}
                  regime={activeRegime}
                  onNavigateToComparison={() => setActiveView('comparison')}
                />
              </div>
            )}
          </>
        ) : null}
      </main>

      {/* Footer */}
      <footer style={{
        padding: '0.75rem 1.5rem',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>WeatherCast</span>
          <span>&middot;</span>
          <span>Adaptive Multi-Model Weather Forecasting &amp; Risk Platform</span>
        </div>

        <div>
          Smart India Hackathon 2026 Submission
        </div>
      </footer>
    </div>
  );
};

export default App;
