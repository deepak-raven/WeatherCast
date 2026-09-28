import type { WeatherRegime } from '../types/weather';
import type { RawMultiModelResponse } from './openMeteoService';

export function detectWeatherRegime(rawData: RawMultiModelResponse): WeatherRegime {
  const current = rawData.current;
  const hourly = rawData.hourly;

  // Compute 24-hour precipitation accumulation
  const next24Precip = (hourly.precipitation || [])
    .slice(0, 24)
    .reduce((acc, val) => acc + (val || 0), 0);

  // Compute average and peak CAPE
  const capes = (hourly.cape || []).slice(0, 24);
  const peakCape = capes.length > 0 ? Math.max(...capes) : 0;

  // Compute pressure anomaly (standard sea level is 1013.25 hPa)
  const pressure = current.surface_pressure || 1010;
  const pressureDrop = Math.max(0, 1013.25 - pressure);

  // Temperature and wind
  const temp = current.temperature_2m || 28;
  const windSpeed = current.wind_speed_10m || 10;
  const rh = current.relative_humidity_2m || 65;
  const precipRate = current.precipitation || 0;

  const triggerMetrics = {
    precipRate,
    cape: Math.round(peakCape),
    pressureDrop: Math.round(pressureDrop * 10) / 10,
    windGust: Math.round(windSpeed * 1.3),
    tempAnomaly: Math.round((temp - 29.5) * 10) / 10,
    rh
  };

  // 1. Tropical Cyclone Risk
  if (pressure < 1002 && (windSpeed > 45 || triggerMetrics.windGust > 65) && next24Precip > 35) {
    return {
      type: 'TROPICAL_CYCLONE',
      title: 'Tropical Cyclogenesis / Deep Depression',
      badgeText: 'Cyclone Alert',
      description: 'Marked pressure deficit with high-velocity cyclonic circulation and intense coastal convergence bands.',
      riskLevel: 'VERY_HIGH',
      triggerMetrics
    };
  }

  // 2. Monsoon Depression / Extreme Rainfall
  if ((next24Precip > 25 || precipRate > 4) && rh > 78 && pressure < 1010) {
    return {
      type: 'MONSOON_DEPRESSION',
      title: 'Monsoon Depression & Low-Pressure Trough',
      badgeText: 'Active Monsoon',
      description: 'Persistent moisture incursion, synoptic low-pressure trough, and sustained heavy rainfall signatures.',
      riskLevel: next24Precip > 60 ? 'VERY_HIGH' : 'HIGH',
      triggerMetrics
    };
  }

  // 3. Severe Convective Storm / Squall
  if (peakCape > 2000 || (peakCape > 1400 && triggerMetrics.windGust > 45)) {
    return {
      type: 'SEVERE_CONVECTIVE',
      title: 'Severe Convective Squall & Thunderstorm',
      badgeText: 'Convective Squall',
      description: 'Extreme atmospheric instability (CAPE > 1500 J/kg) indicative of rapid vertical cloud development and sudden cloudburst hazards.',
      riskLevel: 'HIGH',
      triggerMetrics
    };
  }

  // 4. Severe Heatwave
  if (temp >= 38.5 || (temp >= 36.5 && rh > 65)) {
    return {
      type: 'HEATWAVE',
      title: 'Severe Heatwave & High Thermal Stress',
      badgeText: 'Heatwave Alert',
      description: 'Persistent anticyclonic subsidence causing severe daytime heating and dangerously elevated wet-bulb indices.',
      riskLevel: temp >= 42 ? 'VERY_HIGH' : 'HIGH',
      triggerMetrics
    };
  }

  // 5. Normal / Synoptic Baseline
  return {
    type: 'NORMAL_SYNOPTIC',
    title: 'Synoptic Baseline Weather',
    badgeText: 'Stable Regime',
    description: 'Equilibrium atmospheric pattern with nominal pressure gradients and predictable synoptic progression.',
    riskLevel: 'LOW',
    triggerMetrics
  };
}
