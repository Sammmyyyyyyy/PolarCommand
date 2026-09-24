export interface RawWeatherData {
  provider: string;
  temperature: number;
  apparentTemperature: number;
  windSpeedKnots: number;
  windDirection: number;
  windGustKnots: number;
  visibility: string;
  visibilityMeters: number;
  precipitationMm: number;
  snowfallCm: number;
  snowDepthMeters: number;
  weatherCode: number;
  cloudCoverPercent: number;
  condition: string;
  time: string;
  rawJson?: string;
}

export interface WeatherConditionReport {
  isSimulated: boolean;
  provider: string;
  providerLabel: string;
  status: 'LIVE' | 'STALE' | 'UNAVAILABLE';
  stationId: string;
  stationName: string;
  latitude: number;
  longitude: number;
  temperature: number;
  apparentTemperature: number;
  windSpeedKnots: number;
  windDirection: number;
  windGustKnots: number;
  visibility: string;
  visibilityMeters: number;
  precipitationMm: number;
  snowfallCm: number;
  snowDepthMeters: number;
  weatherCode: number;
  condition: string;
  cloudCoverPercent: number;
  windChillCelsius: number;
  iceSurfaceFriction: 'Good' | 'Moderate' | 'Severe Glaze' | 'Roughed Ice';
  travelFeasibility: 'OPEN' | 'CAUTION' | 'RESTRICTED' | 'PROHIBITED';
  movementRiskMultiplier: number;
  advisoryNote: string;
  lastUpdated: string;
  fetchedAt: string;
  isStale: boolean;
}

export interface WeatherProvider {
  readonly providerName: string;
  fetchWeather(lat: number, lon: number): Promise<RawWeatherData>;
}
