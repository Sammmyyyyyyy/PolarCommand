export function decodeWmoWeatherCode(code) {
    switch (code) {
        case 0: return 'Clear Sky';
        case 1: return 'Mainly Clear';
        case 2: return 'Partly Cloudy';
        case 3: return 'Overcast';
        case 45: return 'Polar Rime Fog';
        case 48: return 'Depositing Ice Fog';
        case 51: return 'Light Drizzle';
        case 53: return 'Moderate Drizzle';
        case 55: return 'Dense Freezing Drizzle';
        case 56:
        case 57: return 'Freezing Drizzle';
        case 61: return 'Slight Rain';
        case 63: return 'Moderate Rain';
        case 65: return 'Heavy Rain';
        case 66:
        case 67: return 'Freezing Rain';
        case 71: return 'Slight Snowfall';
        case 73: return 'Moderate Snowfall';
        case 75: return 'Heavy Blizzard Snowfall';
        case 77: return 'Snow Grains';
        case 80:
        case 81:
        case 82: return 'Rain Showers';
        case 85: return 'Slight Snow Showers';
        case 86: return 'Heavy Snow Showers / Squalls';
        case 95: return 'Severe Polar Front';
        default: return `Polar Weather (Code ${code})`;
    }
}
export class OpenMeteoWeatherProvider {
    providerName = 'Open-Meteo';
    async fetchWeather(lat, lon) {
        const url = new URL('https://api.open-meteo.com/v1/forecast');
        url.searchParams.set('latitude', lat.toFixed(4));
        url.searchParams.set('longitude', lon.toFixed(4));
        url.searchParams.set('current', 'temperature_2m,apparent_temperature,precipitation,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility');
        url.searchParams.set('hourly', 'snow_depth');
        url.searchParams.set('wind_speed_unit', 'kn');
        url.searchParams.set('timezone', 'GMT');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        try {
            const response = await fetch(url.toString(), {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'PolarCommand-OperationsPlatform/2.0',
                },
            });
            if (!response.ok) {
                throw new Error(`Open-Meteo returned HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            const cur = data.current;
            if (!cur) {
                throw new Error('Invalid Open-Meteo payload: missing current object');
            }
            const rawVisibility = typeof cur.visibility === 'number' ? cur.visibility : 10000;
            const visibilityKm = (rawVisibility / 1000).toFixed(1);
            const snowDepth = Array.isArray(data.hourly?.snow_depth) && data.hourly.snow_depth.length > 0
                ? Number(data.hourly.snow_depth[0]) || 0
                : 0;
            const weatherCode = Number(cur.weather_code ?? 0);
            const condition = decodeWmoWeatherCode(weatherCode);
            return {
                provider: this.providerName,
                temperature: Number(cur.temperature_2m ?? -15),
                apparentTemperature: Number(cur.apparent_temperature ?? cur.temperature_2m ?? -20),
                windSpeedKnots: Number(cur.wind_speed_10m ?? 12),
                windDirection: Number(cur.wind_direction_10m ?? 0),
                windGustKnots: Number(cur.wind_gusts_10m ?? cur.wind_speed_10m ?? 15),
                visibility: `${visibilityKm} km (${rawVisibility >= 10000 ? 'Good' : rawVisibility >= 3000 ? 'Moderate' : 'Poor / Whiteout Risk'})`,
                visibilityMeters: rawVisibility,
                precipitationMm: Number(cur.precipitation ?? 0),
                snowfallCm: Number(cur.snowfall ?? 0),
                snowDepthMeters: snowDepth,
                weatherCode,
                cloudCoverPercent: Number(cur.cloud_cover ?? 0),
                condition,
                time: cur.time || new Date().toISOString(),
                rawJson: JSON.stringify(data),
            };
        }
        finally {
            clearTimeout(timeout);
        }
    }
}
