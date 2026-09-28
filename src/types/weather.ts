export type WeatherRegimeType = 
  | 'MONSOON_DEPRESSION'
  | 'TROPICAL_CYCLONE'
  | 'SEVERE_CONVECTIVE'
  | 'HEATWAVE'
  | 'NORMAL_SYNOPTIC';

export interface WeatherRegime {
  type: WeatherRegimeType;
  title: string;
  badgeText: string;
  description: string;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  triggerMetrics: {
    precipRate: number; // mm/h
    cape: number; // J/kg
    pressureDrop: number; // hPa
    windGust: number; // km/h
    tempAnomaly: number; // °C
    rh: number; // %
  };
}

export interface DynamicModelWeights {
  nwp: number; // 0 - 100
  ai: number; // 0 - 100
  ensemble: number; // 0 - 100
  breakdown: {
    ecmwf: number;
    gfs: number;
    icon: number;
  };
  accuracyScore: {
    nwp: number; // 0.0 - 1.0 (e.g. 0.72)
    ai: number; // (e.g. 0.86)
    ensemble: number; // (e.g. 0.79)
  };
}

export interface FusedForecast {
  temperature: number;
  feelsLike: number;
  precipitation: number;
  precipProbability: number;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  surfacePressure: number;
  conditionText: string;
  p10Precip: number; // 10th percentile
  p50Precip: number; // median
  p90Precip: number; // 90th percentile (worst-case heavy rainfall risk)
  confidenceLevel: number; // 0 - 100 %
}

export interface HourlyModelPoint {
  time: string;
  hourLabel: string;
  // Models
  ecmwfTemp: number;
  gfsTemp: number;
  iconTemp: number;
  aiTemp: number;
  fusedTemp: number;

  ecmwfRain: number;
  gfsRain: number;
  iconRain: number;
  aiRain: number;
  fusedRain: number;
  p10Rain: number;
  p90Rain: number;

  windSpeed: number;
  humidity: number;
  confidence: number;
}

export interface ModelAccuracyTimelinePoint {
  leadTime: string; // "+6h", "+12h", "+24h", "+48h", "+72h"
  leadHours: number;
  nwpAccuracy: number;
  aiAccuracy: number;
  ensembleAccuracy: number;
  nwpWeight: number;
  aiWeight: number;
  ensembleWeight: number;
}

export interface ExplainabilityData {
  headline: string;
  dominantModel: 'NWP' | 'AI' | 'ENSEMBLE';
  dominantModelPercentage: number;
  confidenceScore: number;
  reasonForAlert: string;
  explainableRationale: string;
  actionableRecommendation: string;
}

export interface DistrictRiskItem {
  id: string;
  district: string;
  state: string;
  lat: number;
  lon: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  hazard: 'Heavy Rainfall' | 'Heatwave' | 'High Wind' | 'Normal';
  expectedRain: string;
  expectedTemp: string;
  expectedWind: string;
  confidence: number;
  validPeriod: string;
}

export interface LocationCoordinates {
  name: string;
  state?: string;
  country: string;
  lat: number;
  lon: number;
}
