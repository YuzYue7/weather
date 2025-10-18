const OPENWEATHER_API_KEY = "4fa44f3012fa18fe64cf070797e4e6bb";
const GEO_BASE = "https://geocoding-api.open-meteo.com/v1/search";
const METEO_BASE = "https://api.open-meteo.com/v1/forecast";

// === Geocode ===
export async function geocodeCity(name) {
  const url = `${GEO_BASE}?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("geocoding failed");
  const data = await res.json();
  if (!data.results || !data.results.length) throw new Error("not found");
  const c = data.results[0];
  return {
    name: `${c.name}${c.admin1 ? `, ${c.admin1}` : ""}${c.country ? `, ${c.country}` : ""}`,
    lat: c.latitude,
    lon: c.longitude
  };
}

// === Open-Meteo (main source) ===
export async function getOpenMeteo(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m",
    hourly: "temperature_2m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto"
  });
  const res = await fetch(`${METEO_BASE}?${params.toString()}`);
  if (!res.ok) throw new Error("openmeteo failed");
  const data = await res.json();
  const current = {
    tempC: data.current?.temperature_2m ?? null,
    code: data.current?.weather_code ?? null,
    wind: data.current?.wind_speed_10m ?? null,
    humidity: data.current?.relative_humidity_2m ?? null,
    time: data.current?.time ?? null
  };
  const hourly = [];
  if (data.hourly?.time && data.hourly?.temperature_2m) {
    for (let i = 0; i < 24 && i < data.hourly.time.length; i++) {
      hourly.push({ time: data.hourly.time[i], tempC: data.hourly.temperature_2m[i] });
    }
  }
  const daily = [];
  if (data.daily?.time) {
    for (let i = 0; i < 7 && i < data.daily.time.length; i++) {
      daily.push({
        date: data.daily.time[i],
        code: data.daily.weather_code?.[i] ?? null,
        tmaxC: data.daily.temperature_2m_max?.[i] ?? null,
        tminC: data.daily.temperature_2m_min?.[i] ?? null
      });
    }
  }
  return { current, hourly, daily };
}

// === OpenWeather (backup source with CORS fix) ===
export async function getOpenWeather(lat, lon) {
  const PROXY = "https://api.allorigins.win/raw?url=";
  const target = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  const url = PROXY + encodeURIComponent(target);

  const res = await fetch(url);
  if (!res.ok) throw new Error("openweather failed");
  const data = await res.json();

  const cur = data.list?.[0];
  if (!cur) throw new Error("no openweather data");

  const current = {
    tempC: cur.main?.temp ?? null,
    code: cur.weather?.[0]?.id ?? 0,
    wind: cur.wind?.speed ?? null,
    humidity: cur.main?.humidity ?? null,
    time: new Date(cur.dt * 1000).toISOString()
  };

  const hourly = data.list.slice(0, 8).map(it => ({
    time: new Date(it.dt * 1000).toISOString(),
    tempC: it.main?.temp
  }));

  const daily = [];
  for (let i = 0; i < data.list.length; i += 8) {
    const it = data.list[i];
    daily.push({
      date: new Date(it.dt * 1000).toISOString(),
      code: it.weather?.[0]?.id ?? 0,
      tmaxC: it.main?.temp_max,
      tminC: it.main?.temp_min
    });
  }
  return { current, hourly, daily };
}
