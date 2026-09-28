// Mithuna Numerical Weather Prediction (NWP) Simulation Engine
// Provides high-resolution continuous scalar fields & vector wind telemetry
// replicating NCMRWF Mithuna GLB 12km & global synoptic models.

export type WeatherParameterType = 'temperature' | 'humidity' | 'rainfall' | 'accumulated_rainfall';
export type NWPModelType = 'mithuna_glb' | 'ecmwf_hres' | 'gfs_grib2' | 'ncum_reg';

export interface AtmosphericSample {
  temperature: number; // °C
  humidity: number; // %
  rainfall: number; // mm/h
  accumulatedRainfall: number; // mm (24h)
  windU: number; // m/s eastward
  windV: number; // m/s northward
  windSpeed: number; // km/h
  windDirection: number; // degrees from North
  geopotentialHeight: number; // gpm
  pressureLevel: number; // hPa
}

export interface ColorStop {
  val: number;
  r: number;
  g: number;
  b: number;
  hex: string;
}

// Color scale matching the exact horizontal gradient from the screenshot:
// -15°C (Purple) -> 0°C (Cyan) -> 6-12°C (Green) -> 14-18°C (Yellow/Orange) -> 20-26°C (Red) -> 30°C+ (Dark Maroon/Black)
export const TEMPERATURE_PALETTE: ColorStop[] = [
  { val: -15, r: 124, g: 45, b: 146, hex: '#7c2d92' },
  { val: -10, r: 147, g: 51, b: 234, hex: '#9333ea' },
  { val: -5, r: 79, g: 70, b: 229, hex: '#4f46e5' },
  { val: 0, r: 2, g: 132, b: 199, hex: '#0284c7' },
  { val: 3, r: 6, g: 182, b: 212, hex: '#06b6d4' },
  { val: 6, r: 16, g: 185, b: 129, hex: '#10b981' },
  { val: 9, r: 34, g: 197, b: 94, hex: '#22c55e' },
  { val: 12, r: 132, g: 204, b: 22, hex: '#84cc16' },
  { val: 14, r: 234, g: 179, b: 8, hex: '#eab308' },
  { val: 16, r: 245, g: 158, b: 11, hex: '#f59e0b' },
  { val: 18, r: 249, g: 115, b: 22, hex: '#f97316' },
  { val: 20, r: 234, g: 88, b: 12, hex: '#ea580c' },
  { val: 22, r: 220, g: 38, b: 38, hex: '#dc2626' },
  { val: 24, r: 185, g: 28, b: 28, hex: '#b91c1c' },
  { val: 26, r: 153, g: 27, b: 27, hex: '#991b1b' },
  { val: 28, r: 127, g: 29, b: 29, hex: '#7f1d1d' },
  { val: 30, r: 69, g: 10, b: 10, hex: '#450a0a' },
  { val: 38, r: 35, g: 5, b: 5, hex: '#230505' },
  { val: 45, r: 15, g: 0, b: 0, hex: '#0f0000' }
];

export const HUMIDITY_PALETTE: ColorStop[] = [
  { val: 0, r: 180, g: 83, b: 9, hex: '#b45309' },
  { val: 20, r: 217, g: 119, b: 6, hex: '#d97706' },
  { val: 40, r: 202, g: 138, b: 4, hex: '#ca8a04' },
  { val: 60, r: 13, g: 148, b: 136, hex: '#0d9488' },
  { val: 75, r: 2, g: 132, b: 199, hex: '#0284c7' },
  { val: 85, r: 37, g: 99, b: 235, hex: '#2563eb' },
  { val: 95, r: 79, g: 70, b: 229, hex: '#4f46e5' },
  { val: 100, r: 124, g: 58, b: 237, hex: '#7c3aed' }
];

export const RAINFALL_PALETTE: ColorStop[] = [
  { val: 0, r: 0, g: 0, b: 0, hex: '#000000' },
  { val: 0.5, r: 59, g: 130, b: 246, hex: '#3b82f6' },
  { val: 2.5, r: 16, g: 185, b: 129, hex: '#10b981' },
  { val: 7.5, r: 234, g: 179, b: 8, hex: '#eab308' },
  { val: 15, r: 249, g: 115, b: 22, hex: '#f97316' },
  { val: 35, r: 239, g: 68, b: 68, hex: '#ef4444' },
  { val: 65, r: 168, g: 85, b: 247, hex: '#a855f7' },
  { val: 100, r: 236, g: 72, b: 153, hex: '#ec4899' }
];

export const ACCUMULATED_RAIN_PALETTE: ColorStop[] = [
  { val: 0, r: 0, g: 0, b: 0, hex: '#000000' },
  { val: 5, r: 96, g: 165, b: 250, hex: '#60a5fa' },
  { val: 20, r: 34, g: 197, b: 94, hex: '#22c55e' },
  { val: 50, r: 234, g: 179, b: 8, hex: '#eab308' },
  { val: 100, r: 239, g: 68, b: 68, hex: '#ef4444' },
  { val: 150, r: 147, g: 51, b: 234, hex: '#9333ea' },
  { val: 250, r: 244, g: 63, b: 94, hex: '#f43f5e' }
];

export function interpolatePalette(value: number, palette: ColorStop[]): [number, number, number] {
  if (value <= palette[0].val) {
    return [palette[0].r, palette[0].g, palette[0].b];
  }
  const last = palette[palette.length - 1];
  if (value >= last.val) {
    return [last.r, last.g, last.b];
  }

  for (let i = 0; i < palette.length - 1; i++) {
    const s1 = palette[i];
    const s2 = palette[i + 1];
    if (value >= s1.val && value <= s2.val) {
      const t = (value - s1.val) / (s2.val - s1.val);
      const r = Math.round(s1.r + t * (s2.r - s1.r));
      const g = Math.round(s1.g + t * (s2.g - s1.g));
      const b = Math.round(s1.b + t * (s2.b - s1.b));
      return [r, g, b];
    }
  }

  return [last.r, last.g, last.b];
}

// Synoptic thermodynamic cores representing:
// 1. Arabian Peninsula / Rub' al Khali / Persian Gulf Heat Dome (44-48°C peak)
// 2. Thar Desert / Sindh Thermal Low (42-45°C)
// 3. Tibetan Plateau / Himalayan Cold High (-5 to 10°C)
// 4. Maritime Equator / Bay of Bengal & Arabian Sea (27-29°C)
// 5. Central / Peninsular India monsoon regime (26-32°C)
class MithunaSimulationEngine {
  // Temperature lapse rate by pressure level (reference surface = 1000 hPa)
  private getPressureLapseRate(pressureHpa: number): number {
    // Surface (1000 hPa) = 0°C offset
    // 925 hPa (~750m) = -3.5°C
    // 850 hPa (~1500m) = -7.5°C
    // 700 hPa (~3000m) = -16.0°C
    // 500 hPa (~5500m) = -31.0°C
    // 200 hPa (~12000m) = -56.0°C
    if (pressureHpa >= 1000) return 0;
    if (pressureHpa >= 925) return -3.5 * (1000 - pressureHpa) / 75;
    if (pressureHpa >= 850) return -3.5 - 4.0 * (925 - pressureHpa) / 75;
    if (pressureHpa >= 700) return -7.5 - 8.5 * (850 - pressureHpa) / 150;
    if (pressureHpa >= 500) return -16.0 - 15.0 * (700 - pressureHpa) / 200;
    return -31.0 - 25.0 * (500 - pressureHpa) / 300;
  }

  // Model-specific variance adjustments
  private getModelPerturbation(model: NWPModelType, lat: number, lon: number): number {
    switch (model) {
      case 'mithuna_glb':
        // High fidelity regional convective resolution
        return Math.sin(lat * 0.15) * Math.cos(lon * 0.15) * 0.8;
      case 'ecmwf_hres':
        // Smooth synoptic gradient
        return Math.sin(lat * 0.1) * 0.5;
      case 'gfs_grib2':
        // Slightly drier and warmer inland
        return Math.cos(lon * 0.12) * 1.1;
      case 'ncum_reg':
        // Indian subcontinent hyper-localized resolution
        return Math.sin(lat * 0.2 + lon * 0.2) * 0.9;
      default:
        return 0;
    }
  }

  public sampleAtmosphericPoint(
    lat: number,
    lon: number,
    pressureHpa: number = 850,
    leadHours: number = 0,
    model: NWPModelType = 'mithuna_glb'
  ): AtmosphericSample {
    const lapse = this.getPressureLapseRate(pressureHpa);
    const modelOffset = this.getModelPerturbation(model, lat, lon);
    const diurnalPhase = Math.sin((leadHours % 24) * (Math.PI / 12) - Math.PI / 2);

    // --- 1. TEMPERATURE (°C) ---
    // Primary Heat Dome over Arabia / Persian Gulf / southern Iran (Center: 24°N, 48°E)
    const distArabia = Math.hypot(lat - 24.5, (lon - 48.0) * 0.8);
    const arabiaHeat = Math.max(0, 1 - distArabia / 18.0) * 18.5;

    // Thar Desert / Indus Plains Thermal Low (Center: 27°N, 71°E)
    const distThar = Math.hypot(lat - 27.0, (lon - 71.0) * 0.8);
    const tharHeat = Math.max(0, 1 - distThar / 11.0) * 13.0;

    // Tibetan Plateau & Himalayas Cold Sink (Center: 32°N, 86°E)
    const distTibet = Math.hypot(lat - 32.5, (lon - 86.0) * 0.6);
    const tibetCold = Math.max(0, 1 - distTibet / 14.0) * -18.0;

    // Equatorial & Tropical Maritime Baseline (~26-29°C)
    let sstBase = 27.5 - Math.abs(lat - 12.0) * 0.32;
    if (lat > 32.0) {
      sstBase -= (lat - 32.0) * 0.55; // Northern continental cooling
    }

    // Secondary subscale variations
    const synopticWaves = 
      Math.sin(lon * 0.18 + lat * 0.14) * 2.2 +
      Math.cos(lat * 0.22 - lon * 0.1) * 1.5;

    let temperature = sstBase + arabiaHeat + tharHeat + tibetCold + synopticWaves + (diurnalPhase * 1.8) + modelOffset + lapse;

    // Special clamp matching screenshot:
    // Arabian interior reaches deep maroon (38°C at 850 hPa or up to 48°C at 1000 hPa)
    if (pressureHpa === 850 && distArabia < 8.0) {
      temperature = Math.max(temperature, 31.0 + (8.0 - distArabia) * 1.2);
    }

    // --- 2. HUMIDITY (%) ---
    // Maritime and monsoon trough have high RH; Deserts have low RH
    let baseRh = 72;
    if (distArabia < 15.0) baseRh -= (1 - distArabia / 15.0) * 55;
    if (distThar < 10.0) baseRh -= (1 - distThar / 10.0) * 45;
    // Western Ghats / Bay of Bengal moisture plume
    if (lon > 72 && lon < 92 && lat > 8 && lat < 24) {
      baseRh += 18;
    }
    const rh = Math.min(98, Math.max(12, baseRh + Math.sin(lat * 0.3 + lon * 0.2) * 8 + lapse * -0.4));

    // --- 3. RAINFALL (mm/h) & ACCUMULATED (mm) ---
    // Monsoon trough active rain bands along Western Ghats (lat 9-18, lon 73-76) and Bay of Bengal head (lat 19-24, lon 84-90)
    let rainRate = 0;
    const isWesternGhats = lat >= 9 && lat <= 18 && lon >= 73 && lon <= 77.5;
    const isBayDepression = lat >= 18 && lat <= 23 && lon >= 83 && lon <= 89;
    const isFoothills = lat >= 26 && lat <= 30 && lon >= 78 && lon <= 94;

    if (isWesternGhats) {
      rainRate += 6.5 + Math.sin(lat * 1.5) * 5.5;
    }
    if (isBayDepression) {
      rainRate += 12.0 + Math.cos(lon * 1.2) * 8.0;
    }
    if (isFoothills) {
      rainRate += 4.0 + Math.sin(lon * 0.8) * 3.0;
    }
    // Arabian desert zero rain
    if (distArabia < 12.0) rainRate = 0;

    const accumulatedRainfall = Math.round(rainRate * 14.5 + (isWesternGhats ? 65 : 0) + (isBayDepression ? 110 : 0));

    // --- 4. WIND VECTOR (u, v) & STREAMLINES ---
    // Southwest Monsoon circulation (Somali Jet / Low-Level Jet)
    // Low level jet flows from SW over Arabian Sea towards Indian coast: u > 0 (eastward), v > 0 (northward)
    let u = 0;
    let v = 0;

    if (pressureHpa >= 700) {
      // Somali Jet in Arabian Sea (lat 5-18, lon 45-72)
      if (lat >= 5 && lat <= 20 && lon >= 45 && lon <= 75) {
        u = 12.0 + (20 - Math.abs(lat - 12)) * 0.8;
        v = 6.0 + Math.cos(lon * 0.1) * 3.0;
      } else if (lat >= 12 && lat <= 25 && lon >= 72 && lon <= 90) {
        // Westerly / south-westerly onshore flow across India
        u = 9.0 + Math.sin(lat * 0.3) * 3.5;
        v = 2.5 + Math.sin(lon * 0.2) * 2.0;
      } else if (distArabia < 16.0) {
        // Anticyclonic (clockwise) circulation around Arabian ridge
        const angle = Math.atan2(lat - 24.5, lon - 48.0);
        const radSpeed = 6.5;
        u = Math.sin(angle) * radSpeed; // Clockwise
        v = -Math.cos(angle) * radSpeed;
      } else if (lat > 28) {
        // Mid-latitude westerlies
        u = 14.0 + (lat - 28) * 0.6;
        v = Math.sin(lon * 0.15) * 3.0;
      } else {
        u = 4.0 + Math.sin(lat * 0.2) * 2.0;
        v = 1.0;
      }
    } else {
      // Upper levels (500 - 200 hPa): Tropical Easterly Jet (TEJ) south of 20°N, Strong Westerly Jet north of 28°N
      if (lat <= 20) {
        u = -16.0 - Math.cos(lat * 0.1) * 8.0; // Strong Easterlies
        v = -2.0;
      } else {
        u = 24.0 + (lat - 20) * 1.2; // Subtropical Westerly Jet stream
        v = Math.sin(lon * 0.2) * 4.0;
      }
    }

    const windSpeedMps = Math.hypot(u, v);
    const windSpeedKmh = Math.round(windSpeedMps * 3.6);
    let windDir = Math.round((Math.atan2(-u, -v) * 180) / Math.PI);
    if (windDir < 0) windDir += 360;

    // --- 5. GEOPOTENTIAL HEIGHT (gpm) ---
    // Reference 850 hPa geopotential height ~ 1440 - 1560 gpm
    let baseGpm = 1480;
    if (pressureHpa === 1000) baseGpm = 110;
    else if (pressureHpa === 925) baseGpm = 760;
    else if (pressureHpa === 850) baseGpm = 1480;
    else if (pressureHpa === 700) baseGpm = 3120;
    else if (pressureHpa === 500) baseGpm = 5820;
    else if (pressureHpa === 200) baseGpm = 12200;

    // Heat ridge increases height at upper levels / creates thermal low at surface
    const thermalAnomalyGpm = (arabiaHeat + tharHeat) * 2.5 - tibetCold * 1.5;
    const geopotentialHeight = Math.round(baseGpm + thermalAnomalyGpm + Math.sin(lon * 0.12) * 15);

    return {
      temperature: Math.round(temperature * 10) / 10,
      humidity: Math.round(rh),
      rainfall: Math.round(rainRate * 10) / 10,
      accumulatedRainfall,
      windU: Math.round(u * 10) / 10,
      windV: Math.round(v * 10) / 10,
      windSpeed: windSpeedKmh,
      windDirection: windDir,
      geopotentialHeight,
      pressureLevel: pressureHpa
    };
  }

  // Generates contour lines for geopotential isolines
  public getGeopotentialIsolines(
    pressureHpa: number = 850,
    bounds: { south: number; north: number; west: number; east: number }
  ): { level: number; points: [number, number][] }[] {
    const isolines: { level: number; points: [number, number][] }[] = [];
    const step = pressureHpa === 850 ? 20 : 40;
    const base = pressureHpa === 850 ? 1440 : 5760;

    for (let level = base - step * 2; level <= base + step * 4; level += step) {
      const points: [number, number][] = [];
      for (let lon = bounds.west; lon <= bounds.east; lon += 2.0) {
        // Solve for approximate lat where gpm equals level
        for (let lat = bounds.south; lat <= bounds.north; lat += 0.5) {
          const sample = this.sampleAtmosphericPoint(lat, lon, pressureHpa, 0);
          if (Math.abs(sample.geopotentialHeight - level) < step * 0.25) {
            points.push([lat, lon]);
            break;
          }
        }
      }
      if (points.length > 3) {
        isolines.push({ level, points });
      }
    }
    return isolines;
  }
}

export const mithunaEngine = new MithunaSimulationEngine();
