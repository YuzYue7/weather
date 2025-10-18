import { $, formatTemp, fmtHour, fmtWeekday, codeToDesc, getWeatherIcon, themeHueByTemp } from "./utils.js";
import { geocodeCity, getOpenMeteo, getOpenWeather } from "./api.js";

let state = { unit: "C", city: null, weather: null, chart: null, second: null };

const form = $("#search-form");
const searchInput = $("#search-input");
const useLocationBtn = $("#use-location");
const unitSelect = $("#unit-select");
const saveFavBtn = $("#save-favorite");
const favList = $("#favorite-list");
const clearFavBtn = $("#clear-favorites");
const cityTitle = $("#city-title");
const currentTemp = $("#current-temp");
const currentDesc = $("#current-desc");
const currentIcon = $("#current-icon");
const currentWind = $("#current-wind");
const currentHumi = $("#current-humi");
const hourlyCanvas = $("#hourly-chart");
const downloadChartLink = $("#download-chart");
const dailyGrid = $("#daily-grid");

const FAVORITE_KEY = "weatherapp.favorites";
const loadFavorites = () => JSON.parse(localStorage.getItem(FAVORITE_KEY) || "[]");
const saveFavorites = list => localStorage.setItem(FAVORITE_KEY, JSON.stringify(list));

function setThemeByTemp(c) {
  const h = themeHueByTemp(c ?? 15);
  document.body.style.background = `radial-gradient(1200px 600px at 50% -10%, hsl(${h} 70% 45%) 0%, transparent 60%), linear-gradient(180deg, #0b1022 0%, #0f172a 100%)`;
}

function renderFavorites() {
  favList.innerHTML = "";
  const list = loadFavorites();
  list.forEach((item, idx) => {
    const li = document.createElement("li");
    const b1 = document.createElement("button");
    b1.textContent = item.name;
    b1.addEventListener("click", () => loadCityByCoords(item));
    const b2 = document.createElement("button");
    b2.textContent = "Delete";
    b2.addEventListener("click", () => {
      list.splice(idx, 1);
      saveFavorites(list);
      renderFavorites();
    });
    li.appendChild(b1);
    li.appendChild(b2);
    favList.appendChild(li);
  });
}

function renderCurrent() {
  const cur = state.weather.current;
  cityTitle.textContent = state.city?.name || "—";
  currentTemp.textContent = formatTemp(cur.tempC, state.unit);
  currentDesc.textContent = codeToDesc(cur.code);
  currentIcon.src = `./images/${getWeatherIcon(cur.code)}`;
  currentWind.textContent = cur.wind != null ? `${Math.round(cur.wind)} m/s` : "—";
  currentHumi.textContent = cur.humidity != null ? `${Math.round(cur.humidity)}%` : "—";
  setThemeByTemp(cur.tempC);
}

function convertTemp(val) {
  if (state.unit === "F") return val * 9 / 5 + 32;
  if (state.unit === "K") return val + 273.15;
  return val;
}

function renderHourly() {
  const labels = state.weather.hourly.map(h => fmtHour(h.time));
  const data1 = state.weather.hourly.map(h => Math.round(convertTemp(h.tempC)));
  const datasets = [{ label: "Main source", data: data1, borderColor: "#3b82f6", fill: false }];

  if (state.second && state.second.hourly) {
    const data2 = state.second.hourly.map(h => Math.round(convertTemp(h.tempC)));
    const labels2 = state.second.hourly.map(h => fmtHour(h.time));
    const mergedData = new Array(labels.length).fill(null);
    labels2.forEach((t, i) => {
      const idx = labels.indexOf(t);
      if (idx > -1) mergedData[idx] = data2[i];
    });
    datasets.push({
      label: "Second source",
      data: mergedData,
      borderColor: "#f87171",
      fill: false,
      spanGaps: true,
      tension: 0.4
    });
  }

  if (state.chart) {
    state.chart.data.labels = labels;
    state.chart.data.datasets = datasets;
    state.chart.update();
  } else {
    state.chart = new Chart(hourlyCanvas.getContext("2d"), {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: {
          y: { beginAtZero: false, ticks: { color: "#ddd" } },
          x: { ticks: { color: "#ccc" } }
        }
      }
    });
  }

  downloadChartLink.onclick = e => {
    e.preventDefault();
    const a = document.createElement("a");
    a.href = state.chart.toBase64Image("image/png", 1);
    a.download = "hourly_chart.png";
    a.click();
  };
}

function renderDaily() {
  dailyGrid.innerHTML = "";
  state.weather.daily.forEach(d => {
    const div = document.createElement("div");
    div.className = "daily-item";
    div.innerHTML = `
      <div>${fmtWeekday(d.date)}</div>
      <img src="./images/${getWeatherIcon(d.code)}" alt="icon" width="36" height="36">
      <div>${formatTemp(d.tmaxC, state.unit)} / ${formatTemp(d.tminC, state.unit)}</div>
    `;
    dailyGrid.appendChild(div);
  });
}

function renderAll() {
  renderCurrent();
  renderHourly();
  renderDaily();
}

async function loadCityByName(name) {
  cityTitle.textContent = "Loading…";
  try {
    const city = await geocodeCity(name);
    await loadCityByCoords(city);
  } catch {
    cityTitle.textContent = "City not found";
  }
}

async function loadCityByCoords(city) {
  cityTitle.textContent = `${city.name} · Loading…`;
  let meteo = null, owm = null;
  try { meteo = await getOpenMeteo(city.lat, city.lon); } catch {}
  try { owm = await getOpenWeather(city.lat, city.lon); } catch {}

  if (!meteo && !owm) {
    cityTitle.textContent = "No data source available";
    return;
  }

  state.city = city;
  state.weather = meteo || owm;
  state.second = meteo && owm ? owm : null;
  renderAll();
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (q) loadCityByName(q);
});

useLocationBtn.addEventListener("click", () => {
  if (!navigator.geolocation) return alert("Geolocation not supported");
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    const name = `My location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;
    loadCityByCoords({ name, lat: latitude, lon: longitude });
  });
});

unitSelect.addEventListener("change", () => {
  state.unit = unitSelect.value;
  if (state.weather) renderAll();
});

saveFavBtn.addEventListener("click", () => {
  if (!state.city) return alert("Search a city first");
  const list = loadFavorites();
  if (!list.some(x => x.name === state.city.name)) {
    list.push(state.city);
    saveFavorites(list);
    renderFavorites();
  }
});

clearFavBtn.addEventListener("click", () => {
  if (confirm("Clear all favorites?")) {
    localStorage.removeItem(FAVORITE_KEY);
    renderFavorites();
  }
});

renderFavorites();
loadCityByName("Helsinki");
