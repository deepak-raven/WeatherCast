import React, { useState } from 'react';
import type { DynamicModelWeights, ModelAccuracyTimelinePoint } from '../types/weather';

interface ModelComparisonProps {
  weights: DynamicModelWeights;
  accuracyTimeline: ModelAccuracyTimelinePoint[];
  selectedLeadHours: number;
}

export const ModelComparison: React.FC<ModelComparisonProps> = ({
  weights,
  accuracyTimeline,
  selectedLeadHours
}) => {
  const [activeMetricTab, setActiveMetricTab] = useState<'Rainfall' | 'Temperature' | 'Wind'>('Rainfall');

  const accuracySeries = {
    Rainfall: {
      nwp: [68, 71, 70, 73, 72, 74, weights.accuracyScore.nwp * 100],
      ai: [82, 84, 85, 87, 86, 88, weights.accuracyScore.ai * 100],
      ensemble: [75, 77, 76, 78, 80, 81, weights.accuracyScore.ensemble * 100],
    },
    Temperature: {
      nwp: [84, 85, 86, 85, 87, 88, 87],
      ai: [80, 82, 83, 84, 85, 86, 86],
      ensemble: [82, 83, 84, 85, 86, 87, 86],
    },
    Wind: {
      nwp: [76, 78, 77, 79, 81, 80, 82],
      ai: [85, 86, 87, 88, 89, 90, 89],
      ensemble: [81, 82, 83, 84, 85, 86, 85],
    }
  }[activeMetricTab];

  const svgWidth = 420;
  const svgHeight = 130;
  const paddingX = 35;
  const paddingY = 15;

  const getPointsPath = (values: number[]) => {
    const minVal = 60;
    const maxVal = 100;
    const stepX = (svgWidth - paddingX * 2) / (values.length - 1);

    return values
      .map((val, idx) => {
        const x = paddingX + idx * stepX;
        const normalized = (val - minVal) / (maxVal - minVal);
        const y = svgHeight - paddingY - normalized * (svgHeight - paddingY * 2);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

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
            2
          </span>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>Model Comparison</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              NWP vs AI vs Ensemble &middot; Accuracy comparison &middot; Dynamic model weights
            </div>
          </div>
        </div>

        <span style={{ fontSize: '0.75rem', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.12)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 500 }}>
          Lead: +{selectedLeadHours}h
        </span>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(280px, 1.25fr)', gap: '1rem', padding: '1.25rem', flex: 1 }}>
        {/* Left: Model Contributions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Model Contribution (Current Forecast)
          </div>

          {/* NWP Model */}
          <div style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#fff' }}>NWP Model</span>
              <span className="numeric" style={{ fontSize: '0.875rem', fontWeight: 700, color: '#38bdf8' }}>{weights.nwp}%</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${weights.nwp}%`, height: '100%', background: '#38bdf8', borderRadius: '3px' }} />
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>ECMWF: {weights.breakdown.ecmwf}%</span>
              <span>GFS: {weights.breakdown.gfs}%</span>
              <span>ICON: {weights.breakdown.icon}%</span>
            </div>
          </div>

          {/* AI Weather Model */}
          <div style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#fff' }}>AI Weather Model</span>
              <span className="numeric" style={{ fontSize: '0.875rem', fontWeight: 700, color: '#10b981' }}>{weights.ai}%</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${weights.ai}%`, height: '100%', background: '#10b981', borderRadius: '3px' }} />
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Higher accuracy in active precipitation regimes
            </div>
          </div>

          {/* Ensemble Model */}
          <div style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#fff' }}>Ensemble Model</span>
              <span className="numeric" style={{ fontSize: '0.875rem', fontWeight: 700, color: '#a855f7' }}>{weights.ensemble}%</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${weights.ensemble}%`, height: '100%', background: '#a855f7', borderRadius: '3px' }} />
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Uncertainty bounds &amp; outlier capture
            </div>
          </div>

          {/* Model Performance (Last 7 Days) */}
          <div style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '0.5rem 0.75rem',
            fontSize: '0.75rem'
          }}>
            <div style={{ color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '0.25rem' }}>
              Model Performance Score (Last 7 Days)
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>NWP: <b style={{ color: '#fff' }}>{weights.accuracyScore.nwp}</b></span>
              <span>AI: <b style={{ color: '#10b981' }}>{weights.accuracyScore.ai}</b></span>
              <span>Ensemble: <b style={{ color: '#a855f7' }}>{weights.accuracyScore.ensemble}</b></span>
            </div>
          </div>
        </div>

        {/* Right: Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Accuracy Comparison Chart */}
          <div style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.875rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>
                Model Accuracy Comparison
              </span>

              {/* Metric Tabs */}
              <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-card)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                {(['Rainfall', 'Temperature', 'Wind'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveMetricTab(tab)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.6875rem',
                      fontWeight: activeMetricTab === tab ? 600 : 400,
                      color: activeMetricTab === tab ? '#fff' : 'var(--text-muted)',
                      background: activeMetricTab === tab ? '#2563eb' : 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Chart */}
            <div style={{ width: '100%', height: '100px' }}>
              <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
                <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.06)" />
                <line x1={paddingX} y1={svgHeight / 2} x2={svgWidth - paddingX} y2={svgHeight / 2} stroke="rgba(255,255,255,0.06)" />
                <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} stroke="rgba(255,255,255,0.12)" />

                <path d={getPointsPath(accuracySeries.nwp)} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                <path d={getPointsPath(accuracySeries.ai)} fill="none" stroke="#10b981" strokeWidth="2.5" />
                <path d={getPointsPath(accuracySeries.ensemble)} fill="none" stroke="#a855f7" strokeWidth="2.5" />
              </svg>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <span style={{ color: '#38bdf8' }}>&bull; NWP</span>
                <span style={{ color: '#10b981' }}>&bull; AI</span>
                <span style={{ color: '#a855f7' }}>&bull; Ensemble</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <span>Sep 22</span>
                <span>Sep 25</span>
                <span>Today</span>
              </div>
            </div>
          </div>

          {/* Dynamic Model Weight Curve */}
          <div style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.875rem'
          }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>
              Dynamic Model Weight (Next 72h)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.375rem' }}>
              {accuracyTimeline.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: selectedLeadHours === item.leadHours ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)',
                    border: '1px solid',
                    borderColor: selectedLeadHours === item.leadHours ? '#3b82f6' : 'var(--border-color)',
                    padding: '0.4rem 0.25rem',
                    textAlign: 'center',
                    borderRadius: '6px'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>{item.leadTime}</div>
                  <div style={{ fontSize: '0.6875rem', color: '#10b981', marginTop: '0.2rem' }}>AI: {item.aiWeight}%</div>
                  <div style={{ fontSize: '0.6875rem', color: '#38bdf8' }}>NWP: {item.nwpWeight}%</div>
                  <div style={{ fontSize: '0.6875rem', color: '#a855f7' }}>Ens: {item.ensembleWeight}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
