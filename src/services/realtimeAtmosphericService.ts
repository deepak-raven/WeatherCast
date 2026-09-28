// Real-Time Atmospheric Telemetry Service
// Fetches live operational multi-station observations from Open-Meteo (ECMWF & GFS)
// and live Doppler radar composites from RainViewer.

export interface LiveStationObservation {
  name: string;
  lat: number;
  lon: number;
  temperature: number; // °C
  humidity: number; // %
  precipitation: number; // mm/h
  windSpeed: number; // km/h
  windDirection: number; // degrees
  windU: number; // m/s
  windV: number; // m/s
  surfacePressure: number; // hPa
  elevation: number; // m
}

export interface LiveRadarMeta {
  host: string;
  latestRadarPath: string;
  pastTimestamps: number[];
  generatedTime: number;
}

export const SYNOPTIC_ANCHOR_STATIONS = [
  // North India
  { name: 'Delhi', lat: 28.6139, lon: 77.2090 },
  { name: 'Shimla', lat: 31.1048, lon: 77.1734 },
  { name: 'Srinagar', lat: 34.0837, lon: 74.7973 },
  { name: 'Jaipur', lat: 26.9124, lon: 75.7873 },
  { name: 'Lucknow', lat: 26.8467, lon: 80.9462 },
  // West India
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
  { name: 'Nagpur', lat: 21.1458, lon: 79.0882 },
  { name: 'Goa', lat: 15.2993, lon: 74.1240 },
  // South India
  { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
  { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
  { name: 'Kochi', lat: 9.9312, lon: 76.2673 },
  { name: 'Kanyakumari', lat: 8.0883, lon: 77.5385 },
  // East & North-East India
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
  { name: 'Bhubaneswar', lat: 20.2961, lon: 85.8245 },
  { name: 'Patna', lat: 25.5941, lon: 85.1376 },
  { name: 'Guwahati', lat: 26.1445, lon: 91.7362 },
  { name: 'Port Blair', lat: 11.6234, lon: 92.7265 },
  // Arabian Peninsula & Gulf
  { name: 'Riyadh', lat: 24.7136, lon: 46.6753 },
  { name: 'Dubai', lat: 25.2048, lon: 55.2708 },
  { name: 'Muscat', lat: 23.5880, lon: 58.3829 },
  { name: 'Kuwait City', lat: 29.3759, lon: 47.9774 },
  { name: 'Salalah', lat: 17.0151, lon: 54.0924 },
  { name: 'Tehran', lat: 35.6892, lon: 51.3890 },
  // South Asian Neighbours & Maritime
  { name: 'Karachi', lat: 24.8607, lon: 67.0011 },
  { name: 'Lahore', lat: 31.5204, lon: 74.3587 },
  { name: 'Dhaka', lat: 23.8103, lon: 90.4125 },
  { name: 'Colombo', lat: 6.9271, lon: 79.8612 },
  { name: 'Male', lat: 4.1755, lon: 73.5093 },
  { name: 'Kabul', lat: 34.5553, lon: 69.2075 },
  { name: 'Tashkent', lat: 41.2995, lon: 69.2401 }
];

class RealTimeAtmosphericService {
  private cachedStations: LiveStationObservation[] = [];
  private lastFetchedTime: number = 0;
  private radarMeta: LiveRadarMeta | null = null;
  private isFetching = false;

  // Fetch real-time operational weather grid from Open-Meteo
  public async fetchRealTimeGrid(): Promise<LiveStationObservation[]> {
    const now = Date.now();
    // Cache for 5 minutes
    if (this.cachedStations.length > 0 && now - this.lastFetchedTime < 300000) {
      return this.cachedStations;
    }

    if (this.isFetching && this.cachedStations.length > 0) {
      return this.cachedStations;
    }

    this.isFetching = true;

    try {
      const lats = SYNOPTIC_ANCHOR_STATIONS.map((s) => s.lat.toFixed(4)).join(',');
      const lons = SYNOPTIC_ANCHOR_STATIONS.map((s) => s.lon.toFixed(4)).join(',');

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure&timezone=auto`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Open-Meteo HTTP error: ${response.status}`);
      }

      const data = await response.json();
      const results: LiveStationObservation[] = [];

      const rawItems = Array.isArray(data) ? data : [data];

      for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i];
        const station = SYNOPTIC_ANCHOR_STATIONS[i] || { name: `Node ${i}`, lat: item.latitude, lon: item.longitude };
        const curr = item.current || {};

        const speedKmh = curr.wind_speed_10m ?? 12;
        const dirDeg = curr.wind_direction_10m ?? 240;
        const speedMps = speedKmh / 3.6;

        // Convert meteorological direction (from which wind is blowing) to u, v vectors
        const rad = (dirDeg * Math.PI) / 180;
        const u = -speedMps * Math.sin(rad); // Eastward
        const v = -speedMps * Math.cos(rad); // Northward

        results.push({
          name: station.name,
          lat: station.lat,
          lon: station.lon,
          temperature: curr.temperature_2m ?? 26.5,
          humidity: curr.relative_humidity_2m ?? 75,
          precipitation: curr.precipitation ?? 0,
          windSpeed: Math.round(speedKmh),
          windDirection: Math.round(dirDeg),
          windU: Math.round(u * 10) / 10,
          windV: Math.round(v * 10) / 10,
          surfacePressure: curr.surface_pressure ?? 1010,
          elevation: item.elevation ?? 50
        });
      }

      this.cachedStations = results;
      this.lastFetchedTime = now;
      return results;
    } catch (err) {
      console.warn('Real-time weather grid fetch failed, keeping fallback:', err);
      return this.cachedStations;
    } finally {
      this.isFetching = false;
    }
  }

  // Fetch live Doppler radar metadata from RainViewer
  public async fetchLiveRadarMeta(): Promise<LiveRadarMeta | null> {
    try {
      const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
      if (!res.ok) return null;
      const data = await res.json();
      const host = data.host || 'https://tilecache.rainviewer.com';
      const past = data.radar?.past || [];
      if (past.length === 0) return null;

      const latest = past[past.length - 1];
      this.radarMeta = {
        host,
        latestRadarPath: latest.path,
        pastTimestamps: past.map((p: any) => p.time),
        generatedTime: data.generated || Date.now() / 1000
      };
      return this.radarMeta;
    } catch (err) {
      console.warn('RainViewer live radar metadata fetch failed:', err);
      return null;
    }
  }

  public getRadarMeta(): LiveRadarMeta | null {
    return this.radarMeta;
  }

  public getCachedStations(): LiveStationObservation[] {
    return this.cachedStations;
  }

  // Inverse Distance Weighting (IDW) interpolation from live real-world stations
  public interpolateRealTimeSample(
    lat: number,
    lon: number,
    pressureHpa: number = 850
  ): {
    temperature: number;
    humidity: number;
    precipitation: number;
    windSpeed: number;
    windDirection: number;
    windU: number;
    windV: number;
    geopotentialHeight: number;
  } {
    const stations = this.cachedStations;
    if (!stations || stations.length === 0) {
      // Fallback if not loaded yet
      return {
        temperature: 27.0,
        humidity: 75,
        precipitation: 0,
        windSpeed: 15,
        windDirection: 240,
        windU: 3.5,
        windV: 1.5,
        geopotentialHeight: 1480
      };
    }

    let totalWeight = 0;
    let sumTemp = 0;
    let sumRh = 0;
    let sumRain = 0;
    let sumU = 0;
    let sumV = 0;
    let sumPressure = 0;

    // Power parameter p for IDW
    const p = 2.0;

    for (let i = 0; i < stations.length; i++) {
      const s = stations[i];
      const dLat = lat - s.lat;
      const dLon = (lon - s.lon) * Math.cos((lat * Math.PI) / 180);
      const dist = Math.hypot(dLat, dLon);

      if (dist < 0.05) {
        // Exact match
        const lapse = this.getLapse(pressureHpa);
        return {
          temperature: Math.round((s.temperature + lapse) * 10) / 10,
          humidity: Math.round(s.humidity),
          precipitation: s.precipitation,
          windSpeed: s.windSpeed,
          windDirection: s.windDirection,
          windU: s.windU,
          windV: s.windV,
          geopotentialHeight: Math.round(1480 + (s.surfacePressure - 1013) * 8)
        };
      }

      const w = 1.0 / Math.pow(dist, p);
      totalWeight += w;
      sumTemp += s.temperature * w;
      sumRh += s.humidity * w;
      sumRain += s.precipitation * w;
      sumU += s.windU * w;
      sumV += s.windV * w;
      sumPressure += s.surfacePressure * w;
    }

    const lapse = this.getLapse(pressureHpa);
    const interpTemp = sumTemp / totalWeight + lapse;
    const interpRh = Math.min(100, Math.max(10, sumRh / totalWeight));
    const interpRain = Math.max(0, sumRain / totalWeight);
    const interpU = sumU / totalWeight;
    const interpV = sumV / totalWeight;
    const interpPressure = sumPressure / totalWeight;

    const windSpeedKmh = Math.round(Math.hypot(interpU, interpV) * 3.6);
    let windDir = Math.round((Math.atan2(-interpU, -interpV) * 180) / Math.PI);
    if (windDir < 0) windDir += 360;

    return {
      temperature: Math.round(interpTemp * 10) / 10,
      humidity: Math.round(interpRh),
      precipitation: Math.round(interpRain * 10) / 10,
      windSpeed: windSpeedKmh,
      windDirection: windDir,
      windU: Math.round(interpU * 10) / 10,
      windV: Math.round(interpV * 10) / 10,
      geopotentialHeight: Math.round(1480 + (interpPressure - 1013) * 8)
    };
  }

  private getLapse(pressureHpa: number): number {
    if (pressureHpa >= 1000) return 0;
    if (pressureHpa >= 850) return -6.5 * (1000 - pressureHpa) / 150;
    if (pressureHpa >= 500) return -6.5 - 20.0 * (850 - pressureHpa) / 350;
    return -26.5 - 25.0 * (500 - pressureHpa) / 300;
  }
}

export const realTimeAtmosphericService = new RealTimeAtmosphericService();
