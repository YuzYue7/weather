export const $ = s => document.querySelector(s);

export function formatTemp(c, unit) {
  if (unit === "F") return `${Math.round(c * 9 / 5 + 32)}°F`;
  if (unit === "K") return `${Math.round(c + 273.15)}K`;
  return `${Math.round(c)}°C`;
}

export function fmtHour(t) {
  const d = new Date(t);
  return d.getHours().toString().padStart(2, "0") + ":00";
}

// ✅ 修改部分：英文星期显示
export function fmtWeekday(dateStr) {
  const d = new Date(dateStr);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekday = days[d.getDay()];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}/${day} ${weekday}`;
}

export function codeToDesc(code) {
  const map = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
  };
  return map[code] || "Unknown";
}

export function getWeatherIcon(code) {
  if ([0].includes(code)) return "sun.png";
  if ([1].includes(code)) return "partly_cloudy.png";
  if ([2].includes(code)) return "cloudy.png";
  if ([3].includes(code)) return "dense_fog.png";
  if ([45, 48].includes(code)) return "light_fog.png";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "showers.png";
  if ([66, 67, 56, 57].includes(code)) return "freezing_rain.png";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snowfall.png";
  if ([95, 96, 99].includes(code)) return "thunderstorm.png";
  return "cloudy.png";
}

export function themeHueByTemp(c) {
  const t = Math.max(-10, Math.min(35, c));
  const ratio = (t + 10) / 45;
  return Math.round(220 - 160 * ratio);
}
