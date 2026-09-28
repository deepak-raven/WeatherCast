import type { LocationCoordinates } from '../types/weather';

export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  country: string;
  admin1?: string; // State / Province
  country_code: string;
}

export interface RawMultiModelResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    surface_pressure: number;
  };
  hourly: {
    time: string[];
    // ECMWF
    temperature_2m_ecmwf_ifs025?: number[];
    precipitation_ecmwf_ifs025?: number[];
    // GFS
    temperature_2m_gfs_seamless?: number[];
    precipitation_gfs_seamless?: number[];
    // ICON
    temperature_2m_icon_seamless?: number[];
    precipitation_icon_seamless?: number[];
    // Generic / physics variables
    temperature_2m?: number[];
    precipitation?: number[];
    relative_humidity_2m?: number[];
    wind_speed_10m?: number[];
    surface_pressure?: number[];
    cape?: number[];
    precipitation_probability?: number[];
  };
}

export async function searchLocations(query: string): Promise<LocationCoordinates[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query.trim()
    )}&count=8&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Geocoding search failed');
    const data = await res.json();
    if (!data.results) return [];
    
    return data.results.map((item: GeocodingResult) => ({
      name: item.name,
      state: item.admin1 || item.country,
      country: item.country,
      lat: item.latitude,
      lon: item.longitude,
    }));
  } catch (err) {
    console.error('Location search error:', err);
    return [];
  }
}

export async function fetchLiveMultiModelData(lat: number, lon: number): Promise<RawMultiModelResponse> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure',
    hourly: [
      'temperature_2m',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'relative_humidity_2m',
      'surface_pressure',
      'cape',
      'precipitation_probability'
    ].join(','),
    models: 'ecmwf_ifs025,gfs_seamless,icon_seamless',
    timezone: 'auto',
    forecast_days: '4'
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.statusText}`);
  }
  return await response.json();
}
