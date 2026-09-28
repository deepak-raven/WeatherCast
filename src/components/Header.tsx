import React, { useState, useRef } from 'react';
import { 
  Search, 
  RefreshCw, 
  MapPin, 
  LayoutDashboard,
  CloudRain,
  Flame,
  Wind,
  CheckCircle2,
  AlertTriangle,
  Globe2
} from 'lucide-react';
import type { LocationCoordinates, WeatherRegime } from '../types/weather';
import { searchLocations } from '../services/openMeteoService';

interface HeaderProps {
  currentLocation: LocationCoordinates;
  onSelectLocation: (loc: LocationCoordinates) => void;
  activeRegime: WeatherRegime;
  selectedLeadHours: number;
  onSelectLeadHours: (hours: number) => void;
  activeView: 'quad' | 'dashboard' | 'comparison' | 'riskmap' | 'mithuna' | 'alerts';
  onChangeView: (view: 'quad' | 'dashboard' | 'comparison' | 'riskmap' | 'mithuna' | 'alerts') => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentLocation,
  onSelectLocation,
  activeRegime,
  selectedLeadHours,
  onSelectLeadHours,
  activeView,
  onChangeView,
  onRefresh,
  isLoading
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationCoordinates[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (val.trim().length >= 2) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        const results = await searchLocations(val);
        setSearchResults(results);
        setIsSearching(false);
        setIsDropdownOpen(true);
      }, 300);
    } else {
      setSearchResults([]);
      setIsDropdownOpen(false);
      setIsSearching(false);
    }
  };

  const handleSelect = (loc: LocationCoordinates) => {
    onSelectLocation(loc);
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const getRegimeBadge = () => {
    switch (activeRegime.type) {
      case 'TROPICAL_CYCLONE':
        return <span className="badge badge-red"><AlertTriangle size={13} /> Cyclone Alert</span>;
      case 'MONSOON_DEPRESSION':
        return <span className="badge badge-blue"><CloudRain size={13} /> Monsoon Trough</span>;
      case 'HEATWAVE':
        return <span className="badge badge-amber"><Flame size={13} /> Heatwave Alert</span>;
      case 'SEVERE_CONVECTIVE':
        return <span className="badge badge-amber"><Wind size={13} /> Convective Storm</span>;
      default:
        return <span className="badge badge-green"><CheckCircle2 size={13} /> Stable Baseline</span>;
    }
  };

  return (
    <header style={{
      borderBottom: '1px solid var(--border-color)',
      background: 'var(--bg-card)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      {/* Main Top Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '0.875rem 1.5rem',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: '#2563eb',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CloudRain size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
                WeatherCast
              </span>
              <span style={{
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                fontSize: '0.6875rem',
                fontWeight: 600,
                padding: '0.15rem 0.45rem',
                borderRadius: '4px'
              }}>
                SIH 2026
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Intelligent Multi-Model Weather &amp; Risk Platform
            </div>
          </div>
        </div>

        {/* Clean Search Bar */}
        <div style={{ position: 'relative', width: '340px', maxWidth: '100%' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.45rem 0.75rem',
            gap: '0.5rem',
            transition: 'border-color 0.15s ease'
          }}>
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search district (e.g., Chennai, Mumbai, Delhi)..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => { if (searchResults.length > 0) setIsDropdownOpen(true); }}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                width: '100%'
              }}
            />
            {isSearching && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>...</span>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isDropdownOpen && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
              zIndex: 1000,
              maxHeight: '260px',
              overflowY: 'auto'
            }}>
              {searchResults.map((loc, idx) => (
                <div
                  key={`${loc.name}-${loc.lat}-${idx}`}
                  onClick={() => handleSelect(loc)}
                  style={{
                    padding: '0.6rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    borderBottom: '1px solid var(--border-color)'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-subtle)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={14} color="#3b82f6" />
                    <span style={{ fontWeight: 600, color: '#fff' }}>{loc.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {loc.state ? `${loc.state}, ` : ''}{loc.country}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Location Indicator & Active Regime Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'var(--bg-app)',
            padding: '0.4rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            fontSize: '0.8125rem'
          }}>
            <MapPin size={14} color="#3b82f6" />
            <span style={{ fontWeight: 600, color: '#fff' }}>{currentLocation.name}</span>
            <span style={{ color: 'var(--text-muted)' }}>({currentLocation.state || currentLocation.country})</span>
          </div>

          {getRegimeBadge()}

          <button
            onClick={onRefresh}
            className="btn"
            title="Refresh Live Data"
            style={{ padding: '0.4rem 0.65rem' }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin-icon' : ''} />
            <span>{isLoading ? 'Updating...' : 'Live'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.5rem 1.5rem',
        background: 'var(--bg-card)'
      }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => onChangeView('quad')}
            className={`btn ${activeView === 'quad' ? 'btn-active' : ''}`}
          >
            <LayoutDashboard size={14} />
            <span>Overview (Quad View)</span>
          </button>

          <button
            onClick={() => onChangeView('dashboard')}
            className={`btn ${activeView === 'dashboard' ? 'btn-active' : ''}`}
          >
            <span>1. Forecast Dashboard</span>
          </button>

          <button
            onClick={() => onChangeView('comparison')}
            className={`btn ${activeView === 'comparison' ? 'btn-active' : ''}`}
          >
            <span>2. Model Comparison</span>
          </button>

          <button
            onClick={() => onChangeView('riskmap')}
            className={`btn ${activeView === 'riskmap' ? 'btn-active' : ''}`}
          >
            <span>3. District Risk Map</span>
          </button>

          <button
            onClick={() => onChangeView('mithuna')}
            className={`btn ${activeView === 'mithuna' ? 'btn-active' : ''}`}
            style={{
              borderColor: activeView === 'mithuna' ? '#3b82f6' : 'rgba(59, 130, 246, 0.4)',
              background: activeView === 'mithuna' ? '#2563eb' : 'rgba(59, 130, 246, 0.12)'
            }}
          >
            <Globe2 size={14} color={activeView === 'mithuna' ? '#ffffff' : '#60a5fa'} />
            <span style={{ fontWeight: 600 }}>Mithuna Synoptic Map</span>
            <span style={{
              fontSize: '0.625rem',
              background: activeView === 'mithuna' ? '#1d4ed8' : '#2563eb',
              color: '#fff',
              padding: '1px 5px',
              borderRadius: '4px',
              fontWeight: 700
            }}>
              LIVE NWP
            </span>
          </button>

          <button
            onClick={() => onChangeView('alerts')}
            className={`btn ${activeView === 'alerts' ? 'btn-active' : ''}`}
          >
            <span>4. Alert &amp; Explainability</span>
          </button>
        </div>

        {/* Lead Time Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Lead Time:
          </span>
          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '2px',
            gap: '2px'
          }}>
            {[6, 12, 24, 48, 72].map((hours) => (
              <button
                key={hours}
                onClick={() => onSelectLeadHours(hours)}
                style={{
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.75rem',
                  fontWeight: selectedLeadHours === hours ? 600 : 500,
                  color: selectedLeadHours === hours ? '#fff' : 'var(--text-secondary)',
                  background: selectedLeadHours === hours ? '#2563eb' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                +{hours}h
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
