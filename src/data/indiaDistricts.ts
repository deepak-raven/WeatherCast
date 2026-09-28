import type { DistrictRiskItem } from '../types/weather';

export interface DistrictStation {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  baseHazard: 'Heavy Rainfall' | 'Heatwave' | 'High Wind' | 'Normal';
  region: 'South' | 'West' | 'North' | 'East' | 'Central' | 'North-East';
}

export const KEY_INDIAN_DISTRICTS: DistrictStation[] = [
  { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707, baseHazard: 'Heavy Rainfall', region: 'South' },
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lon: 72.8777, baseHazard: 'Heavy Rainfall', region: 'West' },
  { id: 'wayanad', name: 'Wayanad', state: 'Kerala', lat: 11.6854, lon: 76.1320, baseHazard: 'Heavy Rainfall', region: 'South' },
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lon: 77.5946, baseHazard: 'Normal', region: 'South' },
  { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lon: 72.5714, baseHazard: 'Heatwave', region: 'West' },
  { id: 'jaipur', name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lon: 75.7873, baseHazard: 'Heatwave', region: 'North' },
  { id: 'delhi', name: 'New Delhi', state: 'Delhi NCR', lat: 28.6139, lon: 77.2090, baseHazard: 'Heatwave', region: 'North' },
  { id: 'bhubaneswar', name: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lon: 85.8245, baseHazard: 'High Wind', region: 'East' },
  { id: 'visakhapatnam', name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lon: 83.2185, baseHazard: 'High Wind', region: 'South' },
  { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lon: 88.3639, baseHazard: 'Heavy Rainfall', region: 'East' },
  { id: 'patna', name: 'Patna', state: 'Bihar', lat: 25.5941, lon: 85.1376, baseHazard: 'Normal', region: 'East' },
  { id: 'guwahati', name: 'Guwahati', state: 'Assam', lat: 26.1445, lon: 91.7362, baseHazard: 'Heavy Rainfall', region: 'North-East' },
  { id: 'bhopal', name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lon: 77.4126, baseHazard: 'Normal', region: 'Central' },
  { id: 'shimla', name: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lon: 77.1734, baseHazard: 'Normal', region: 'North' },
];

export function computeDistrictRisk(
  station: DistrictStation,
  fusedTemp: number,
  fusedRain24h: number,
  windSpeed: number
): DistrictRiskItem {
  let riskLevel: DistrictRiskItem['riskLevel'] = 'LOW';
  let hazard: DistrictRiskItem['hazard'] = 'Normal';
  let confidence = 85;

  // IMD NDMA Criteria
  if (fusedRain24h > 115.5 || (station.baseHazard === 'Heavy Rainfall' && fusedRain24h > 45)) {
    riskLevel = fusedRain24h > 150 ? 'VERY_HIGH' : 'HIGH';
    hazard = 'Heavy Rainfall';
    confidence = 88;
  } else if (fusedTemp >= 40 || (station.baseHazard === 'Heatwave' && fusedTemp >= 37)) {
    riskLevel = fusedTemp >= 42 ? 'VERY_HIGH' : 'HIGH';
    hazard = 'Heatwave';
    confidence = 91;
  } else if (windSpeed > 55 || (station.baseHazard === 'High Wind' && windSpeed > 35)) {
    riskLevel = windSpeed > 65 ? 'VERY_HIGH' : 'MODERATE';
    hazard = 'High Wind';
    confidence = 84;
  } else if (fusedRain24h > 35) {
    riskLevel = 'MODERATE';
    hazard = 'Heavy Rainfall';
    confidence = 82;
  }

  return {
    id: station.id,
    district: station.name,
    state: station.state,
    lat: station.lat,
    lon: station.lon,
    riskLevel,
    hazard,
    expectedRain: fusedRain24h > 0 ? `${Math.round(fusedRain24h * 0.8)}-${Math.round(fusedRain24h * 1.4)} mm` : '0-5 mm',
    expectedTemp: `${Math.round(fusedTemp - 2)}°C - ${Math.round(fusedTemp + 3)}°C`,
    expectedWind: `${Math.round(windSpeed)} - ${Math.round(windSpeed * 1.4)} km/h`,
    confidence,
    validPeriod: 'Next 24-48 Hours',
  };
}
