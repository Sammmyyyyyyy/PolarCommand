export class DeterministicSimulatedWeatherProvider {
    providerName = 'Simulated-Test-Provider';
    mockData;
    constructor(mockData) {
        this.mockData = mockData;
    }
    setMockData(mockData) {
        this.mockData = mockData;
    }
    async fetchWeather(lat, lon) {
        const baseTemp = lat > 0 ? -12 - Math.abs(lat - 70) * 0.5 : -25 - Math.abs(lat + 70) * 0.8;
        return {
            provider: this.providerName,
            temperature: this.mockData?.temperature ?? Number(baseTemp.toFixed(1)),
            apparentTemperature: this.mockData?.apparentTemperature ?? Number((baseTemp - 6).toFixed(1)),
            windSpeedKnots: this.mockData?.windSpeedKnots ?? 22,
            windDirection: this.mockData?.windDirection ?? 180,
            windGustKnots: this.mockData?.windGustKnots ?? 28,
            visibility: this.mockData?.visibility ?? '15 km (Good)',
            visibilityMeters: this.mockData?.visibilityMeters ?? 15000,
            precipitationMm: this.mockData?.precipitationMm ?? 0,
            snowfallCm: this.mockData?.snowfallCm ?? 0.2,
            snowDepthMeters: this.mockData?.snowDepthMeters ?? 0.45,
            weatherCode: this.mockData?.weatherCode ?? 71,
            cloudCoverPercent: this.mockData?.cloudCoverPercent ?? 65,
            condition: this.mockData?.condition ?? 'Polar Katabatic Flow',
            time: new Date().toISOString(),
            rawJson: JSON.stringify({ simulated: true, lat, lon }),
        };
    }
}
export { DeterministicSimulatedWeatherProvider as SimulatedWeatherProvider };
