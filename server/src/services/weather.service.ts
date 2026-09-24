import { prisma } from '../config/database.js';
import { WeatherProvider, WeatherConditionReport, RawWeatherData } from './weather/weather.types.js';
import { OpenMeteoWeatherProvider } from './weather/open-meteo.provider.js';

export type { WeatherConditionReport, WeatherProvider, RawWeatherData } from './weather/weather.types.js';

export class WeatherService {
  private static provider: WeatherProvider = new OpenMeteoWeatherProvider();
  public static readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Set custom weather provider (e.g. for deterministic automated testing).
   */
  public static setProvider(newProvider: WeatherProvider) {
    this.provider = newProvider;
  }

  public static getActiveProviderName(): string {
    return this.provider.providerName;
  }

  /**
   * Calculate operational impact metrics from weather data.
   */
  public static calculateOperationalImpact(data: {
    temperature: number;
    windSpeedKnots: number;
    windGustKnots?: number;
    visibilityMeters?: number;
    snowfallCm?: number;
  }) {
    const temp = data.temperature;
    const wind = data.windSpeedKnots;
    const gusts = data.windGustKnots ?? wind;
    const vis = data.visibilityMeters ?? 10000;
    const snow = data.snowfallCm ?? 0;

    // Wind chill formula: 13.12 + 0.6215*T - 11.37*(V^0.16) + 0.3965*T*(V^0.16)
    const windKmh = wind * 1.852;
    const windChill = Math.round(
      13.12 + 0.6215 * temp - 11.37 * Math.pow(Math.max(1, windKmh), 0.16) + 0.3965 * temp * Math.pow(Math.max(1, windKmh), 0.16)
    );

    let travelFeasibility: 'OPEN' | 'CAUTION' | 'RESTRICTED' | 'PROHIBITED' = 'OPEN';
    let delayHoursAddition = 0;
    let riskPenalty = 0;
    const advisories: string[] = [];

    if (wind > 45 || gusts > 50 || temp < -35 || vis < 1000) {
      travelFeasibility = 'PROHIBITED';
      delayHoursAddition = 8;
      riskPenalty = 30;
      advisories.push('Severe blizzard conditions: All surface traverse and aviation movements strictly prohibited.');
    } else if (wind > 32 || gusts > 38 || temp < -28 || vis < 3000) {
      travelFeasibility = 'RESTRICTED';
      delayHoursAddition = 4;
      riskPenalty = 18;
      advisories.push('Gale-force katabatic winds: Surface movement restricted to tracked snowcats with dual convoy.');
    } else if (wind > 20 || gusts > 28 || temp < -20 || vis < 6000 || snow > 1.0) {
      travelFeasibility = 'CAUTION';
      delayHoursAddition = 2;
      riskPenalty = 8;
      advisories.push('Moderate wind and blowing snow: Crew travel feasibility caution advisory active.');
    }

    if (temp < -30) {
      advisories.push('Extreme deep freeze: Engine block pre-heaters and hydraulic fluid cycling required.');
      riskPenalty += 10;
    }

    const advisoryNote = advisories.length > 0 ? advisories.join(' ') : 'Normal polar operational weather window.';
    const iceSurfaceFriction: 'Good' | 'Moderate' | 'Severe Glaze' | 'Roughed Ice' =
      wind > 35 ? 'Severe Glaze' : wind > 22 ? 'Roughed Ice' : 'Moderate';

    return {
      windChillCelsius: windChill,
      travelFeasibility,
      delayHoursAddition,
      riskPenalty,
      iceSurfaceFriction,
      advisoryNote,
      movementRiskMultiplier: travelFeasibility === 'PROHIBITED' ? 2.5 : travelFeasibility === 'RESTRICTED' ? 1.8 : travelFeasibility === 'CAUTION' ? 1.3 : 1.0,
    };
  }

  /**
   * Fetch weather for a station coordinates via real provider with database caching & graceful degradation.
   */
  public static async getStationWeather(stationId: string, forceRefresh = false): Promise<WeatherConditionReport> {
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      include: {
        weather: { orderBy: { recordedAt: 'desc' }, take: 1 },
      },
    });

    if (!station) throw new Error(`Station ${stationId} not found`);

    const latest = station.weather[0];
    const now = Date.now();
    const isCacheFresh = latest && (now - new Date(latest.fetchedAt).getTime()) < this.CACHE_TTL_MS;

    // Use cached snapshot if fresh and no force refresh requested
    if (isCacheFresh && !forceRefresh) {
      const impact = this.calculateOperationalImpact({
        temperature: latest.temperature,
        windSpeedKnots: latest.windSpeedKnots,
        windGustKnots: latest.windGustKnots ?? undefined,
        visibilityMeters: latest.visibilityMeters ?? undefined,
        snowfallCm: latest.snowfallCm ?? undefined,
      });

      return {
        isSimulated: latest.provider.toLowerCase().includes('simulat'),
        provider: latest.provider,
        providerLabel: `${latest.provider} Real Telemetry Provider`,
        status: latest.isStale ? 'STALE' : 'LIVE',
        stationId: station.id,
        stationName: station.name,
        latitude: station.latitude,
        longitude: station.longitude,
        temperature: latest.temperature,
        apparentTemperature: latest.apparentTemperature ?? latest.temperature - 5,
        windSpeedKnots: latest.windSpeedKnots,
        windDirection: latest.windDirection ?? 0,
        windGustKnots: latest.windGustKnots ?? latest.windSpeedKnots,
        visibility: latest.visibility,
        visibilityMeters: latest.visibilityMeters ?? 10000,
        precipitationMm: latest.precipitationMm ?? 0,
        snowfallCm: latest.snowfallCm ?? 0,
        snowDepthMeters: latest.snowDepthMeters ?? 0,
        weatherCode: latest.weatherCode ?? 0,
        condition: latest.condition,
        cloudCoverPercent: latest.cloudCoverPercent ?? 0,
        windChillCelsius: impact.windChillCelsius,
        iceSurfaceFriction: impact.iceSurfaceFriction,
        travelFeasibility: impact.travelFeasibility,
        movementRiskMultiplier: impact.movementRiskMultiplier,
        advisoryNote: impact.advisoryNote,
        lastUpdated: latest.fetchedAt.toISOString(),
        fetchedAt: latest.fetchedAt.toISOString(),
        isStale: latest.isStale,
      };
    }

    // Attempt real live provider fetch
    try {
      const raw = await this.provider.fetchWeather(station.latitude, station.longitude);
      const isSim = this.provider.providerName.toLowerCase().includes('simulat');

      const snapshot = await prisma.weatherSnapshot.create({
        data: {
          stationId: station.id,
          temperature: raw.temperature,
          apparentTemperature: raw.apparentTemperature,
          windSpeedKnots: raw.windSpeedKnots,
          windDirection: raw.windDirection,
          windGustKnots: raw.windGustKnots,
          visibility: raw.visibility,
          visibilityMeters: raw.visibilityMeters,
          precipitationMm: raw.precipitationMm,
          snowfallCm: raw.snowfallCm,
          snowDepthMeters: raw.snowDepthMeters,
          weatherCode: raw.weatherCode,
          cloudCoverPercent: raw.cloudCoverPercent,
          condition: raw.condition,
          provider: raw.provider,
          isStale: false,
          fetchedAt: new Date(),
          recordedAt: new Date(),
          rawJson: raw.rawJson,
        },
      });

      const impact = this.calculateOperationalImpact({
        temperature: raw.temperature,
        windSpeedKnots: raw.windSpeedKnots,
        windGustKnots: raw.windGustKnots,
        visibilityMeters: raw.visibilityMeters,
        snowfallCm: raw.snowfallCm,
      });

      return {
        isSimulated: isSim,
        provider: raw.provider,
        providerLabel: `${raw.provider} Real Telemetry Provider`,
        status: 'LIVE',
        stationId: station.id,
        stationName: station.name,
        latitude: station.latitude,
        longitude: station.longitude,
        temperature: raw.temperature,
        apparentTemperature: raw.apparentTemperature,
        windSpeedKnots: raw.windSpeedKnots,
        windDirection: raw.windDirection,
        windGustKnots: raw.windGustKnots,
        visibility: raw.visibility,
        visibilityMeters: raw.visibilityMeters,
        precipitationMm: raw.precipitationMm,
        snowfallCm: raw.snowfallCm,
        snowDepthMeters: raw.snowDepthMeters,
        weatherCode: raw.weatherCode,
        condition: raw.condition,
        cloudCoverPercent: raw.cloudCoverPercent,
        windChillCelsius: impact.windChillCelsius,
        iceSurfaceFriction: impact.iceSurfaceFriction,
        travelFeasibility: impact.travelFeasibility,
        movementRiskMultiplier: impact.movementRiskMultiplier,
        advisoryNote: impact.advisoryNote,
        lastUpdated: snapshot.fetchedAt.toISOString(),
        fetchedAt: snapshot.fetchedAt.toISOString(),
        isStale: false,
      };
    } catch (err: any) {
      // Gracefully handle provider failure: retain last successful snapshot and mark as STALE
      if (latest) {
        // Mark stale in database
        await prisma.weatherSnapshot.update({
          where: { id: latest.id },
          data: { isStale: true },
        }).catch(() => {});

        const impact = this.calculateOperationalImpact({
          temperature: latest.temperature,
          windSpeedKnots: latest.windSpeedKnots,
          windGustKnots: latest.windGustKnots ?? undefined,
          visibilityMeters: latest.visibilityMeters ?? undefined,
          snowfallCm: latest.snowfallCm ?? undefined,
        });

        return {
          isSimulated: latest.provider.toLowerCase().includes('simulat'),
          provider: latest.provider,
          providerLabel: `${latest.provider} (Offline / Stale Telemetry)`,
          status: 'STALE',
          stationId: station.id,
          stationName: station.name,
          latitude: station.latitude,
          longitude: station.longitude,
          temperature: latest.temperature,
          apparentTemperature: latest.apparentTemperature ?? latest.temperature - 5,
          windSpeedKnots: latest.windSpeedKnots,
          windDirection: latest.windDirection ?? 0,
          windGustKnots: latest.windGustKnots ?? latest.windSpeedKnots,
          visibility: latest.visibility,
          visibilityMeters: latest.visibilityMeters ?? 10000,
          precipitationMm: latest.precipitationMm ?? 0,
          snowfallCm: latest.snowfallCm ?? 0,
          snowDepthMeters: latest.snowDepthMeters ?? 0,
          weatherCode: latest.weatherCode ?? 0,
          condition: latest.condition,
          cloudCoverPercent: latest.cloudCoverPercent ?? 0,
          windChillCelsius: impact.windChillCelsius,
          iceSurfaceFriction: impact.iceSurfaceFriction,
          travelFeasibility: impact.travelFeasibility,
          movementRiskMultiplier: impact.movementRiskMultiplier,
          advisoryNote: `Live provider offline (${err.message || 'connection failed'}). Displaying last known telemetry.`,
          lastUpdated: latest.fetchedAt.toISOString(),
          fetchedAt: latest.fetchedAt.toISOString(),
          isStale: true,
        };
      }

      // No previous snapshot exists in DB
      return {
        isSimulated: false,
        provider: 'Open-Meteo',
        providerLabel: 'Open-Meteo (Connection Unavailable)',
        status: 'UNAVAILABLE',
        stationId: station.id,
        stationName: station.name,
        latitude: station.latitude,
        longitude: station.longitude,
        temperature: -15,
        apparentTemperature: -22,
        windSpeedKnots: 20,
        windDirection: 0,
        windGustKnots: 25,
        visibility: 'Data Unavailable',
        visibilityMeters: 5000,
        precipitationMm: 0,
        snowfallCm: 0,
        snowDepthMeters: 0,
        weatherCode: 0,
        condition: 'Telemetry Unavailable',
        cloudCoverPercent: 50,
        windChillCelsius: -25,
        iceSurfaceFriction: 'Moderate',
        travelFeasibility: 'CAUTION',
        movementRiskMultiplier: 1.2,
        advisoryNote: 'Weather service offline and no prior telemetry cached. Exercise operational caution.',
        lastUpdated: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        isStale: true,
      };
    }
  }

  /**
   * For backwards compatibility with existing test runners.
   */
  public static async recordStationWeather(
    stationId: string,
    data: { temperature: number; windSpeedKnots: number; condition: string; visibility: string }
  ) {
    return prisma.weatherSnapshot.create({
      data: {
        stationId,
        temperature: Number(data.temperature),
        windSpeedKnots: Number(data.windSpeedKnots),
        condition: data.condition,
        visibility: data.visibility,
        provider: 'Manual / Test Record',
        fetchedAt: new Date(),
        recordedAt: new Date(),
      },
    });
  }
}
