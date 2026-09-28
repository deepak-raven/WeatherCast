import React from 'react';
import { 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2,
  Info
} from 'lucide-react';
import type { 
  ExplainabilityData, 
  DynamicModelWeights, 
  FusedForecast, 
  LocationCoordinates, 
  WeatherRegime 
} from '../types/weather';

interface AlertExplainabilityProps {
  explainability: ExplainabilityData;
  weights: DynamicModelWeights;
  fused: FusedForecast;
  location: LocationCoordinates;
  regime: WeatherRegime;
  onNavigateToComparison: () => void;
}

export const AlertExplainability: React.FC<AlertExplainabilityProps> = ({
  explainability,
  weights,
  fused,
  location,
  regime,
  onNavigateToComparison
}) => {
  const isHighPriority = regime.riskLevel === 'HIGH' || regime.riskLevel === 'VERY_HIGH';

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
            4
          </span>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>Alert &amp; Explainability Panel</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Extreme-weather alerts &middot; Confidence level &middot; Shows which model influenced the forecast
            </div>
          </div>
        </div>

        <span className={isHighPriority ? 'badge badge-red' : 'badge badge-green'}>
          {isHighPriority ? 'High Priority' : 'Normal Advisory'}
        </span>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.25fr) minmax(280px, 1fr)', gap: '1rem', padding: '1.25rem', flex: 1 }}>
        {/* Left Side: Extreme Weather Alert Box matching slide */}
        <div style={{
          background: isHighPriority ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-app)',
          border: isHighPriority ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '0.75rem'
        }}>
          <div>
            {/* Alert Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: isHighPriority ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: isHighPriority ? '#ef4444' : '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>
                    {explainability.headline}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {location.name} Region ({location.state || location.country})
                  </div>
                </div>
              </div>

              {isHighPriority && (
                <span className="badge badge-red" style={{ fontSize: '0.6875rem' }}>
                  High Priority
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Valid Period: 28 Sep 2026, 12:00 PM &mdash; 30 Sep 2026, 12:00 PM
            </div>

            {/* Expected Values & Confidence Ring */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              margin: '0.75rem 0'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected Rainfall</div>
                <div className="numeric" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginTop: '0.1rem' }}>
                  {fused.precipitation > 0 ? `${Math.round(fused.precipitation * 2)} - ${Math.round(fused.precipitation * 4)} mm` : '0 - 5 mm'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confidence Level</div>
                  <div className="numeric" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>
                    {fused.confidenceLevel}%
                  </div>
                </div>

                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '3px solid rgba(16, 185, 129, 0.25)',
                  borderTopColor: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981'
                }}>
                  <CheckCircle2 size={16} />
                </div>
              </div>
            </div>

            {/* Reason for Alert */}
            <div style={{ fontSize: '0.8125rem', lineHeight: 1.45 }}>
              <b style={{ color: 'var(--text-secondary)' }}>Reason for Alert: </b>
              <span style={{ color: 'var(--text-primary)' }}>
                {explainability.reasonForAlert}
              </span>
            </div>
          </div>

          {/* Action Link */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
            <button
              onClick={onNavigateToComparison}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#3b82f6',
                fontSize: '0.8125rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer'
              }}
            >
              <span>View Model Contribution</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Right Side: Forecast Summary & Explainable Forecast Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Forecast Summary Row */}
          <div style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.75rem 1rem'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Forecast Summary
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Temperature</div>
                <div className="numeric" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>
                  {Math.round(fused.temperature)}° - {Math.round(fused.temperature + 3)}°C
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Rainfall</div>
                <div className="numeric" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#38bdf8' }}>
                  {fused.precipitation} mm
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Wind</div>
                <div className="numeric" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>
                  {fused.windSpeed} km/h
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Humidity</div>
                <div className="numeric" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#c084fc' }}>
                  {fused.humidity}%
                </div>
              </div>
            </div>
          </div>

          {/* Model Contribution Breakdown Bar */}
          <div style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.75rem 1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Model Contribution (Next 72h)
              </span>
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                AI Lead: {weights.ai}%
              </span>
            </div>

            {/* Tri-color Stacked Bar */}
            <div style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
              background: 'rgba(255,255,255,0.06)'
            }}>
              <div style={{ width: `${weights.ai}%`, background: '#10b981', height: '100%' }} />
              <div style={{ width: `${weights.nwp}%`, background: '#38bdf8', height: '100%' }} />
              <div style={{ width: `${weights.ensemble}%`, background: '#a855f7', height: '100%' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', marginTop: '0.35rem' }}>
              <span style={{ color: '#10b981' }}>&bull; AI Model {weights.ai}%</span>
              <span style={{ color: '#38bdf8' }}>&bull; NWP Model {weights.nwp}%</span>
              <span style={{ color: '#a855f7' }}>&bull; Ensemble {weights.ensemble}%</span>
            </div>
          </div>

          {/* Explainable Forecast Card */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.05)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '8px',
            padding: '0.875rem',
            display: 'flex',
            gap: '0.75rem'
          }}>
            <div style={{ color: '#3b82f6', flexShrink: 0, marginTop: '2px' }}>
              <Info size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>
                Explainable Forecast
              </div>
              <p style={{ fontSize: '0.78125rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: '0.25rem' }}>
                {explainability.explainableRationale}
              </p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.35rem' }}>
                <b>Actionable Recommendation:</b> {explainability.actionableRecommendation}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
