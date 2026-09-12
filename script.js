/* =========================================================
   AGROSKY - WEATHER & FARMING INTELLIGENCE
   Corrected version based on the original JavaScript
   ========================================================= */

const API_BASE = "https://api.open-meteo.com/v1/forecast";
const GEO_BASE = "https://geocoding-api.open-meteo.com/v1/search";

/* =========================================================
   ELEMENTS
   ========================================================= */

const elements = {
  locationInput: document.querySelector("#locationInput"),
  searchBtn: document.querySelector("#searchBtn"),
  status: document.querySelector("#status"),

  heroTemp: document.querySelector("#heroTemp"),
  heroCondition: document.querySelector("#heroCondition"),
  heroPlace: document.querySelector("#heroPlace"),
  heroMetrics: document.querySelector("#heroMetrics"),
  heroIcon: document.querySelector("#heroIcon"),

  weatherIcon: document.querySelector("#weatherIcon"),
  currentTemp: document.querySelector("#currentTemp"),
  currentCondition: document.querySelector("#currentCondition"),
  humidity: document.querySelector("#humidity"),
  wind: document.querySelector("#wind"),
  rain: document.querySelector("#rain"),

  forecast: document.querySelector("#forecast"),

  cropList: document.querySelector("#cropList"),
  tipsList: document.querySelector("#tipsList"),

  // Supports either #alertsList or #alerts
  alerts:
    document.querySelector("#alertsList") ||
    document.querySelector("#alerts"),

  aiAdvice: document.querySelector("#aiAdvice"),
  aiStatus: document.querySelector("#aiStatus"),
  aiBadge: document.querySelector("#aiBadge"),

  contactForm: document.querySelector("#contactForm"),
  formMsg: document.querySelector("#formMsg"),

  menuBtn: document.querySelector("#menuBtn"),
  nav: document.querySelector(".nav")
};


/* =========================================================
   WEATHER DESCRIPTIONS
   ========================================================= */

const weatherDescriptions = {
  0: {
    text: "Clear sky",
    icon: "☀️"
  },

  1: {
    text: "Mainly clear",
    icon: "🌤️"
  },

  2: {
    text: "Partly cloudy",
    icon: "⛅"
  },

  3: {
    text: "Overcast",
    icon: "☁️"
  },

  45: {
    text: "Foggy",
    icon: "🌫️"
  },

  48: {
    text: "Rime fog",
    icon: "🌫️"
  },

  51: {
    text: "Light drizzle",
    icon: "🌦️"
  },

  53: {
    text: "Moderate drizzle",
    icon: "🌦️"
  },

  55: {
    text: "Heavy drizzle",
    icon: "🌧️"
  },

  61: {
    text: "Light rain",
    icon: "🌦️"
  },

  63: {
    text: "Moderate rain",
    icon: "🌧️"
  },

  65: {
    text: "Heavy rain",
    icon: "🌧️"
  },

  71: {
    text: "Light snow",
    icon: "🌨️"
  },

  73: {
    text: "Moderate snow",
    icon: "🌨️"
  },

  75: {
    text: "Heavy snow",
    icon: "❄️"
  },

  80: {
    text: "Light rain showers",
    icon: "🌦️"
  },

  81: {
    text: "Moderate rain showers",
    icon: "🌧️"
  },

  82: {
    text: "Heavy rain showers",
    icon: "⛈️"
  },

  95: {
    text: "Thunderstorm",
    icon: "⛈️"
  },

  96: {
    text: "Thunderstorm with hail",
    icon: "⛈️"
  },

  99: {
    text: "Severe thunderstorm",
    icon: "⛈️"
  }
};


/* =========================================================
   HELPER FUNCTIONS
   ========================================================= */

function getWeatherDescription(code) {
  return (
    weatherDescriptions[code] || {
      text: "Unknown conditions",
      icon: "🌤️"
    }
  );
}


function formatTemperature(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return `${Math.round(value)}°C`;
}


function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}


/* =========================================================
   FETCH WITH TIMEOUT
   ========================================================= */

async function fetchWithTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}


/* =========================================================
   GEOCODE LOCATION
   ========================================================= */

async function geocodeLocation(place) {
  const query = String(place || "").trim();

  if (!query) {
    throw new Error("Please enter a city or farming location.");
  }

  const url =
    `${GEO_BASE}?name=${encodeURIComponent(query)}` +
    `&count=1` +
    `&language=en` +
    `&format=json`;

  let response;

  try {
    response = await fetchWithTimeout(url);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "Location search timed out. Please check your internet connection."
      );
    }

    throw new Error(
      "Unable to connect to the location service."
    );
  }

  if (!response.ok) {
    throw new Error(
      `Location service returned error ${response.status}.`
    );
  }

  const data = await response.json();

  if (
    !data ||
    !data.results ||
    data.results.length === 0
  ) {
    throw new Error(
      `We could not find "${query}". Try another city or location.`
    );
  }

  const result = data.results[0];

  return {
    name: result.name,
    latitude: result.latitude,
    longitude: result.longitude,
    country: result.country || "",
    admin1: result.admin1 || ""
  };
}


/* =========================================================
   GET WEATHER
   ========================================================= */

async function getWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: latitude,
    longitude: longitude,

    current:
      "temperature_2m," +
      "relative_humidity_2m," +
      "apparent_temperature," +
      "precipitation," +
      "rain," +
      "weather_code," +
      "wind_speed_10m",

    hourly:
      "temperature_2m," +
      "precipitation_probability," +
      "weather_code",

    daily:
      "weather_code," +
      "temperature_2m_max," +
      "temperature_2m_min," +
      "precipitation_probability_max," +
      "precipitation_sum",

    timezone: "auto",

    forecast_days: "7"
  });

  const url = `${API_BASE}?${params.toString()}`;

  let response;

  try {
    response = await fetchWithTimeout(url);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "Weather request timed out. Please try again."
      );
    }

    throw new Error(
      "Unable to connect to the weather service."
    );
  }

  if (!response.ok) {
    throw new Error(
      `Weather service returned error ${response.status}.`
    );
  }

  const data = await response.json();

  if (!data || !data.current) {
    throw new Error(
      "The weather service returned incomplete information."
    );
  }

  return data;
}


/* =========================================================
   CROP RECOMMENDATIONS
   ========================================================= */

function getCropSuggestions(weather) {
  const temperature =
    weather?.current?.temperature_2m ?? 0;

  const rainProbability =
    weather?.daily?.precipitation_probability_max?.[0] ?? 0;

  const crops = [];

  if (temperature >= 24 && temperature <= 34) {
    crops.push("🌽 Maize");
  }

  if (temperature >= 22 && temperature <= 35) {
    crops.push("🌱 Cassava");
  }

  if (temperature >= 23 && temperature <= 34) {
    crops.push("🥬 Okra");
  }

  if (temperature >= 20 && temperature <= 32) {
    crops.push("🍅 Tomato");
  }

  if (crops.length === 0) {
    crops.push("🌱 Cassava");
    crops.push("🌽 Maize");
  }

  if (rainProbability > 60) {
    crops.push("🥒 Water-friendly crops");
  }

  return crops.slice(0, 5);
}


/* =========================================================
   FARMING TIPS
   ========================================================= */

function getFarmingTips(weather) {
  const current = weather?.current || {};
  const daily = weather?.daily || {};

  const humidity =
    current.relative_humidity_2m ?? 0;

  const wind =
    current.wind_speed_10m ?? 0;

  const rainProbability =
    daily.precipitation_probability_max?.[0] ?? 0;

  const tips = [];

  if (humidity >= 75) {
    tips.push(
      "Monitor soil moisture closely because humidity is high."
    );
  } else {
    tips.push(
      "Check soil moisture before deciding when to irrigate."
    );
  }

  if (rainProbability >= 50) {
    tips.push(
      "Rain is possible, so consider delaying spraying or fertilizer application."
    );

    tips.push(
      "Check drainage around low-lying parts of the farm."
    );
  } else {
    tips.push(
      "Plan irrigation according to soil moisture and crop needs."
    );
  }

  if (wind >= 20) {
    tips.push(
      "Strong winds are possible. Avoid spraying during windy conditions."
    );
  } else {
    tips.push(
      "Weather conditions are suitable for routine field observation."
    );
  }

  return tips.slice(0, 4);
}


/* =========================================================
   FARM ALERTS
   ========================================================= */

function getFarmAlerts(weather) {
  const current = weather?.current || {};
  const daily = weather?.daily || {};

  const rainProbability =
    daily.precipitation_probability_max?.[0] ?? 0;

  const wind =
    current.wind_speed_10m ?? 0;

  const temperature =
    current.temperature_2m ?? 0;

  const alerts = [];

  if (rainProbability >= 70) {
    alerts.push({
      title: "Rain watch",
      text:
        "High rain probability. Protect harvested produce and check drainage."
    });
  } else if (rainProbability >= 40) {
    alerts.push({
      title: "Rain possible",
      text:
        "Moderate rain probability. Monitor the forecast before major field activities."
    });
  } else {
    alerts.push({
      title: "Low rain risk",
      text:
        "Rain probability is currently low. Continue monitoring soil moisture."
    });
  }

  if (wind >= 25) {
    alerts.push({
      title: "Wind alert",
      text:
        "Strong winds are possible. Take care with spraying and exposed crops."
    });
  } else {
    alerts.push({
      title: "Field check",
      text:
        "Review crops, soil moisture and drainage during your routine field inspection."
    });
  }

  if (temperature >= 35) {
    alerts.push({
      title: "Heat watch",
      text:
        "High temperatures are expected. Monitor crops and water availability."
    });
  }

  return alerts;
}


/* =========================================================
   UPDATE FARMING ASSISTANT
   ========================================================= */

function updateAssistant(weather) {
  const crops = getCropSuggestions(weather);
  const tips = getFarmingTips(weather);
  const alerts = getFarmAlerts(weather);

  /* ---------- CROPS ---------- */

  if (elements.cropList) {
    elements.cropList.innerHTML = "";

    crops.forEach((crop) => {
      const li = document.createElement("li");
      li.textContent = crop;
      elements.cropList.appendChild(li);
    });
  }

  /* ---------- TIPS ---------- */

  if (elements.tipsList) {
    elements.tipsList.innerHTML = "";

    tips.forEach((tip) => {
      const li = document.createElement("li");
      li.textContent = tip;
      elements.tipsList.appendChild(li);
    });
  }

  /* ---------- ALERTS ---------- */

  if (elements.alerts) {
    elements.alerts.innerHTML = "";

    alerts.forEach((alert) => {
      const item = document.createElement("div");

      item.className = "alert-item";

      item.innerHTML = `
        <strong>${alert.title}</strong>
        <p>${alert.text}</p>
      `;

      elements.alerts.appendChild(item);
    });
  }
}


/* =========================================================
   AI FARMING ADVICE
   ========================================================= */

function updateAIAdvice(weather, location) {
  if (!elements.aiAdvice) {
    return;
  }

  const current = weather?.current || {};
  const daily = weather?.daily || {};

  const temperature =
    Math.round(current.temperature_2m ?? 0);

  const humidity =
    current.relative_humidity_2m ?? 0;

  const wind =
    Math.round(current.wind_speed_10m ?? 0);

  const rainProbability =
    daily.precipitation_probability_max?.[0] ?? 0;

  let advice = "";

  if (rainProbability >= 70) {
    advice =
      `For ${location.name}, rain probability is high today. ` +
      `Prioritize drainage checks, protect harvested crops, ` +
      `and avoid unnecessary spraying before rainfall.`;
  } else if (temperature >= 35) {
    advice =
      `Conditions in ${location.name} are hot. ` +
      `Monitor soil moisture, provide irrigation where needed, ` +
      `and watch crops for heat stress.`;
  } else if (wind >= 25) {
    advice =
      `Wind speeds are elevated around ${location.name}. ` +
      `Avoid spraying during strong winds and inspect exposed crops.`;
  } else {
    advice =
      `Conditions around ${location.name} look suitable for routine ` +
      `farm activities. Check soil moisture, inspect crops, and use ` +
      `the latest forecast before making major field decisions.`;
  }

  elements.aiAdvice.textContent = advice;

  if (elements.aiStatus) {
    elements.aiStatus.textContent =
      "AI farming advice updated from current weather";
  }

  if (elements.aiBadge) {
    elements.aiBadge.textContent =
      "✨ AI Assistant: Monitoring your farm conditions";
  }
}


/* =========================================================
   RENDER FORECAST
   ========================================================= */

function renderForecast(weather) {
  if (!elements.forecast) {
    return;
  }

  const daily = weather?.daily;

  if (
    !daily ||
    !daily.time ||
    daily.time.length === 0
  ) {
    elements.forecast.innerHTML =
      "<p>Forecast information is currently unavailable.</p>";

    return;
  }

  elements.forecast.innerHTML = "";

  daily.time.forEach((date, index) => {
    const weatherCode =
      daily.weather_code?.[index];

    const description =
      getWeatherDescription(weatherCode);

    const max =
      daily.temperature_2m_max?.[index];

    const min =
      daily.temperature_2m_min?.[index];

    const rain =
      daily.precipitation_probability_max?.[index] ?? 0;

    const card = document.createElement("div");

    card.className = "forecast-card";

    card.innerHTML = `
      <div class="forecast-date">
        ${formatDate(date)}
      </div>

      <div class="forecast-icon">
        ${description.icon}
      </div>

      <div class="forecast-condition">
        ${description.text}
      </div>

      <div class="forecast-temp">
        ${formatTemperature(max)}
        /
        ${formatTemperature(min)}
      </div>

      <div class="forecast-rain">
        💧 ${rain}% rain
      </div>
    `;

    elements.forecast.appendChild(card);
  });
}


/* =========================================================
   RENDER CURRENT WEATHER
   ========================================================= */

function renderWeather(weather, location) {
  // Save the latest live weather for AgroSky AI
  window.agroSkyWeather = weather;
  window.agroSkyLocation = location;

  const current = weather?.current;

  if (!current) {
    throw new Error(
      "Current weather data is unavailable."
    );
  }

  const description =
    getWeatherDescription(
      current.weather_code
    );

  const temperature =
    formatTemperature(
      current.temperature_2m
    );

  const humidity =
    current.relative_humidity_2m ?? "--";

  const wind =
    current.wind_speed_10m ?? "--";

  const rain =
    weather?.daily?.precipitation_probability_max?.[0] ?? 0;


  /* =======================================================
     HERO
     ======================================================= */

  if (elements.heroTemp) {
    elements.heroTemp.textContent = temperature;
  }

  if (elements.heroCondition) {
    elements.heroCondition.textContent =
      description.text;
  }

  if (elements.heroPlace) {
    elements.heroPlace.textContent =
      location.name;
  }

  if (elements.heroMetrics) {
    elements.heroMetrics.textContent =
      `Humidity ${humidity}% • Wind ${Math.round(wind)} km/h`;
  }

  if (elements.heroIcon) {
    elements.heroIcon.textContent =
      description.icon;
  }


  /* =======================================================
     DASHBOARD
     ======================================================= */

  if (elements.weatherIcon) {
    elements.weatherIcon.textContent =
      description.icon;
  }

  if (elements.currentTemp) {
    elements.currentTemp.textContent =
      temperature;
  }

  if (elements.currentCondition) {
    elements.currentCondition.textContent =
      description.text;
  }

  if (elements.humidity) {
    elements.humidity.textContent =
      `${humidity}%`;
  }

  if (elements.wind) {
    elements.wind.textContent =
      `${Math.round(wind)} km/h`;
  }

  if (elements.rain) {
    elements.rain.textContent =
      `${rain}%`;
  }


  /* =======================================================
     OTHER SECTIONS
     ======================================================= */

  renderForecast(weather);

  updateAssistant(weather);

  updateAIAdvice(weather, location);
}


/* =========================================================
   SEARCH WEATHER
   ========================================================= */

async function searchWeather(place) {
  const searchPlace =
    String(place || "").trim();

  if (!searchPlace) {
    if (elements.status) {
      elements.status.textContent =
        "Please enter a city or farming location.";
    }

    return;
  }

  /* ---------- LOADING STATE ---------- */

  if (elements.searchBtn) {
    elements.searchBtn.disabled = true;
    elements.searchBtn.classList.add("loading");
    elements.searchBtn.textContent = "Checking...";
  }

  if (elements.status) {
    elements.status.textContent =
      `Loading live weather for ${searchPlace}...`;
  }

  if (elements.forecast) {
    elements.forecast.innerHTML =
      "<p>Loading live forecast...</p>";
  }

  if (elements.aiStatus) {
    elements.aiStatus.textContent =
      "AI is analyzing weather conditions";
  }

  try {
    /* ---------- FIND LOCATION ---------- */

    const location =
      await geocodeLocation(searchPlace);

    /* ---------- GET WEATHER ---------- */

    const weather =
      await getWeather(
        location.latitude,
        location.longitude
      );

    /* ---------- RENDER ---------- */

    renderWeather(
      weather,
      location
    );

    /* ---------- STATUS ---------- */

    if (elements.status) {
      const locationText =
        location.country
          ? `${location.name}, ${location.country}`
          : location.name;

      elements.status.textContent =
        `Live weather updated for ${locationText}.`;
    }

  } catch (error) {
    console.error(
      "AgroSky weather error:",
      error
    );

    if (elements.status) {
      elements.status.textContent =
        error.message ||
        "Unable to load weather information.";
    }

    if (elements.forecast) {
      elements.forecast.innerHTML = `
        <div class="weather-error">
          <strong>Unable to load forecast.</strong>
          <p>
            Please check your internet connection
            and try searching again.
          </p>
        </div>
      `;
    }

    if (elements.aiAdvice) {
      elements.aiAdvice.textContent =
        "Weather data could not be loaded. Please try the search again.";
    }

    if (elements.aiStatus) {
      elements.aiStatus.textContent =
        "Waiting for live weather data";
    }

  } finally {
    /* ---------- RESTORE BUTTON ---------- */

    if (elements.searchBtn) {
      elements.searchBtn.disabled = false;
      elements.searchBtn.classList.remove("loading");
      elements.searchBtn.textContent = "Check Weather";
    }
  }
}


/* =========================================================
   SEARCH FORM
   ========================================================= */

if (elements.searchBtn) {
  elements.searchBtn.addEventListener(
    "click",
    () => {
      searchWeather(
        elements.locationInput?.value || "Lagos"
      );
    }
  );
}


if (elements.locationInput) {
  elements.locationInput.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        event.preventDefault();

        searchWeather(
          elements.locationInput.value
        );
      }
    }
  );
}


/* =========================================================
   MOBILE MENU
   ========================================================= */

if (elements.menuBtn && elements.nav) {
  elements.menuBtn.addEventListener(
    "click",
    () => {
      elements.nav.classList.toggle("active");
    }
  );
}


/* =========================================================
   CLOSE MOBILE MENU AFTER CLICKING NAV LINK
   ========================================================= */

if (elements.nav) {
  const navLinks =
    elements.nav.querySelectorAll("a");

  navLinks.forEach((link) => {
    link.addEventListener(
      "click",
      () => {
        elements.nav.classList.remove("active");
      }
    );
  });
}


/* =========================================================
   CONTACT FORM
   ========================================================= */

if (elements.contactForm) {
  elements.contactForm.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      if (elements.formMsg) {
        elements.formMsg.textContent =
          "Thank you! Your message has been received.";
      }

      elements.contactForm.reset();
    }
  );
}


/* =========================================================
   INITIAL WEATHER LOAD
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    searchWeather("Lagos");
  }
);

/* =========================================================
   AGROSKY AI - FIRST VERSION
   Weather-aware farming assistant
   ========================================================= */

(function createAgroSkyAI() {

  /* -------------------------------------------------------
     AI STATE
     ------------------------------------------------------- */

  let aiMessages = [
    {
      role: "ai",
      text:
        "Hello! 🌱 I'm AgroSky AI. I can help you understand your current weather conditions and make practical farming decisions."
    }
  ];


  /* -------------------------------------------------------
     CREATE AI STYLES
     ------------------------------------------------------- */

  const aiStyle = document.createElement("style");

  aiStyle.textContent = `
    .agrosky-ai-button {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 9999;
      border: none;
      border-radius: 50px;
      padding: 15px 20px;
      background: #17653c;
      color: white;
      font-size: 15px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 12px 35px rgba(0,0,0,.18);
      transition: .25s ease;
    }

    .agrosky-ai-button:hover {
      transform: translateY(-3px);
    }

    .agrosky-ai-window {
      position: fixed;
      right: 24px;
      bottom: 88px;
      width: min(390px, calc(100vw - 30px));
      height: 560px;
      z-index: 9998;
      background: white;
      border-radius: 22px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,.22);
      display: none;
      flex-direction: column;
      border: 1px solid #e2ebe4;
    }

    .agrosky-ai-window.open {
      display: flex;
      animation: agroAIIn .25s ease;
    }

    @keyframes agroAIIn {
      from {
        opacity: 0;
        transform: translateY(15px) scale(.97);
      }

      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .agrosky-ai-header {
      background: #123b28;
      color: white;
      padding: 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .agrosky-ai-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .agrosky-ai-title-icon {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: rgba(255,255,255,.13);
      display: grid;
      place-items: center;
      font-size: 20px;
    }

    .agrosky-ai-title strong {
      display: block;
      font-size: 16px;
    }

    .agrosky-ai-title small {
      display: block;
      opacity: .75;
      margin-top: 2px;
    }

    .agrosky-ai-close {
      border: none;
      background: transparent;
      color: white;
      font-size: 23px;
      cursor: pointer;
    }

    .agrosky-ai-messages {
      flex: 1;
      overflow-y: auto;
      padding: 18px;
      background: #f7faf7;
    }

    .agrosky-ai-message {
      display: flex;
      margin-bottom: 14px;
    }

    .agrosky-ai-message.user {
      justify-content: flex-end;
    }

    .agrosky-ai-bubble {
      max-width: 85%;
      padding: 11px 14px;
      border-radius: 15px;
      font-size: 14px;
      line-height: 1.55;
      white-space: pre-line;
    }

    .agrosky-ai-message.ai .agrosky-ai-bubble {
      background: white;
      color: #173225;
      border: 1px solid #e3ebe5;
      border-bottom-left-radius: 4px;
    }

    .agrosky-ai-message.user .agrosky-ai-bubble {
      background: #17653c;
      color: white;
      border-bottom-right-radius: 4px;
    }

    .agrosky-ai-suggestions {
      display: flex;
      gap: 7px;
      padding: 10px 14px;
      overflow-x: auto;
      border-top: 1px solid #edf1ed;
      background: white;
    }

    .agrosky-ai-suggestion {
      flex: 0 0 auto;
      border: 1px solid #d8e5dc;
      background: #f8fbf8;
      color: #17653c;
      border-radius: 30px;
      padding: 7px 11px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
    }

    .agrosky-ai-input {
      display: flex;
      gap: 8px;
      padding: 12px;
      background: white;
      border-top: 1px solid #e5ebe6;
    }

    .agrosky-ai-input input {
      flex: 1;
      min-width: 0;
      border: 1px solid #d8e2da;
      border-radius: 12px;
      padding: 11px 12px;
      outline: none;
      font: inherit;
    }

    .agrosky-ai-input input:focus {
      border-color: #17653c;
    }

    .agrosky-ai-send {
      width: 44px;
      border: none;
      border-radius: 12px;
      background: #17653c;
      color: white;
      font-size: 18px;
      cursor: pointer;
    }

    .agrosky-ai-typing {
      font-size: 12px;
      color: #6b7c71;
      font-style: italic;
      margin-bottom: 12px;
    }

    @media (max-width: 560px) {

      .agrosky-ai-button {
        right: 15px;
        bottom: 15px;
      }

      .agrosky-ai-window {
        right: 10px;
        bottom: 75px;
        width: calc(100vw - 20px);
        height: 70vh;
        max-height: 600px;
      }
    }
  `;

  document.head.appendChild(aiStyle);


  /* -------------------------------------------------------
     CREATE AI BUTTON
     ------------------------------------------------------- */

  const aiButton = document.createElement("button");

  aiButton.className = "agrosky-ai-button";
  aiButton.innerHTML = "✨ Ask AgroSky AI";

  document.body.appendChild(aiButton);


  /* -------------------------------------------------------
     CREATE AI WINDOW
     ------------------------------------------------------- */

  const aiWindow = document.createElement("div");

  aiWindow.className = "agrosky-ai-window";

  aiWindow.innerHTML = `
    <div class="agrosky-ai-header">

      <div class="agrosky-ai-title">

        <div class="agrosky-ai-title-icon">
          🌱
        </div>

        <div>
          <strong>AgroSky AI</strong>
          <small>Weather & Farming Assistant</small>
        </div>

      </div>

      <button
        class="agrosky-ai-close"
        aria-label="Close AgroSky AI"
      >
        ×
      </button>

    </div>

    <div
      class="agrosky-ai-messages"
      id="agroskyAiMessages"
    ></div>

    <div class="agrosky-ai-suggestions">

      <button class="agrosky-ai-suggestion">
        Will it rain?
      </button>

      <button class="agrosky-ai-suggestion">
        Should I spray?
      </button>

      <button class="agrosky-ai-suggestion">
        What crops can I grow?
      </button>

      <button class="agrosky-ai-suggestion">
        What should I do today?
      </button>

    </div>

    <form class="agrosky-ai-input" id="agroskyAiForm">

      <input
        id="agroskyAiInput"
        type="text"
        autocomplete="off"
        placeholder="Ask AgroSky AI..."
      >

      <button
        class="agrosky-ai-send"
        type="submit"
        aria-label="Send message"
      >
        ➤
      </button>

    </form>
  `;

  document.body.appendChild(aiWindow);


  /* -------------------------------------------------------
     GET AI ELEMENTS
     ------------------------------------------------------- */

  const messagesContainer =
    document.querySelector("#agroskyAiMessages");

  const aiForm =
    document.querySelector("#agroskyAiForm");

  const aiInput =
    document.querySelector("#agroskyAiInput");

  const closeButton =
    aiWindow.querySelector(".agrosky-ai-close");

  const suggestionButtons =
    aiWindow.querySelectorAll(
      ".agrosky-ai-suggestion"
    );


  /* -------------------------------------------------------
     DISPLAY MESSAGE
     ------------------------------------------------------- */

  function addMessage(role, text) {

    const wrapper =
      document.createElement("div");

    wrapper.className =
      `agrosky-ai-message ${role}`;

    const bubble =
      document.createElement("div");

    bubble.className =
      "agrosky-ai-bubble";

    bubble.textContent = text;

    wrapper.appendChild(bubble);

    messagesContainer.appendChild(wrapper);

    messagesContainer.scrollTop =
      messagesContainer.scrollHeight;

    aiMessages.push({
      role,
      text
    });
  }


  /* -------------------------------------------------------
     GET CURRENT WEATHER
     ------------------------------------------------------- */

  function getCurrentWeatherData() {

    const weather =
      window.agroSkyWeather;

    const location =
      window.agroSkyLocation;

    if (!weather || !weather.current) {
      return null;
    }

    const current =
      weather.current;

    const daily =
      weather.daily || {};

    return {
      location:
        location?.name || "your location",

      temperature:
        current.temperature_2m,

      humidity:
        current.relative_humidity_2m,

      wind:
        current.wind_speed_10m,

      rain:
        daily.precipitation_probability_max?.[0] ?? 0,

      weatherCode:
        current.weather_code
    };
  }


  /* -------------------------------------------------------
     WEATHER DESCRIPTION
     ------------------------------------------------------- */

  function getAIWeatherDescription(code) {

    const descriptions = {

      0: "clear skies",

      1: "mainly clear skies",

      2: "partly cloudy conditions",

      3: "overcast conditions",

      45: "foggy conditions",

      48: "foggy conditions",

      51: "light drizzle",

      53: "moderate drizzle",

      55: "heavy drizzle",

      61: "light rain",

      63: "moderate rain",

      65: "heavy rain",

      71: "light snow",

      73: "moderate snow",

      75: "heavy snow",

      80: "light rain showers",

      81: "moderate rain showers",

      82: "heavy rain showers",

      95: "thunderstorm",

      96: "thunderstorm",

      99: "severe thunderstorm"
    };

    return descriptions[code] ||
      "changing weather conditions";
  }


  /* -------------------------------------------------------
     GENERATE FARMING AI RESPONSE
     ------------------------------------------------------- */

  function generateAIResponse(question) {

    const text =
      question.toLowerCase().trim();

    const data =
      getCurrentWeatherData();


    /* -----------------------------------------------------
       NO WEATHER DATA
       ----------------------------------------------------- */

    if (!data) {

      return (
        "I don't have live weather data yet. 🌦️\n\n" +
        "Please search for a location using the weather " +
        "search box first. Once AgroSky loads the weather, " +
        "I can use it to give you farming guidance."
      );
    }


    const {
      location,
      temperature,
      humidity,
      wind,
      rain,
      weatherCode
    } = data;


    /* -----------------------------------------------------
       WEATHER QUESTION
       ----------------------------------------------------- */

    if (
      text.includes("weather") ||
      text.includes("temperature") ||
      text.includes("hot") ||
      text.includes("cold")
    ) {

      return (
        `Current conditions for ${location}:\n\n` +

        `🌡️ Temperature: ${Math.round(temperature)}°C\n` +

        `☁️ Conditions: ` +
        `${getAIWeatherDescription(weatherCode)}\n` +

        `💧 Humidity: ${humidity}%\n` +

        `💨 Wind: ${Math.round(wind)} km/h\n` +

        `🌧️ Rain probability: ${rain}%`
      );
    }


    /* -----------------------------------------------------
       RAIN QUESTION
       ----------------------------------------------------- */

    if (
      text.includes("rain") ||
      text.includes("rainfall")
    ) {

      if (rain >= 70) {

        return (
          `Yes, rain is quite likely around ${location}. 🌧️\n\n` +

          `The current forecast gives about ${rain}% ` +
          `rain probability.\n\n` +

          `🌱 Farming advice:\n` +
          `• Check drainage channels.\n` +
          `• Protect harvested produce.\n` +
          `• Avoid unnecessary spraying before rainfall.\n` +
          `• Monitor low-lying areas of the farm.`
        );
      }

      if (rain >= 40) {

        return (
          `There is a moderate chance of rain around ` +
          `${location}: about ${rain}%.\n\n` +

          `Keep an eye on the forecast before spraying, ` +
          `fertilizing or harvesting.`
        );
      }

      return (
        `The current rain probability around ${location} ` +
        `is relatively low at ${rain}%.\n\n` +

        `You should still monitor soil moisture before ` +
        `deciding whether irrigation is necessary.`
      );
    }


    /* -----------------------------------------------------
       SPRAYING QUESTION
       ----------------------------------------------------- */

    if (
      text.includes("spray") ||
      text.includes("spraying") ||
      text.includes("pesticide")
    ) {

      if (rain >= 60) {

        return (
          "I would be cautious about spraying right now. ⚠️\n\n" +

          `Rain probability is around ${rain}%, ` +
          "so rainfall could reduce the effectiveness of " +
          "some applications.\n\n" +

          `Wind is around ${Math.round(wind)} km/h.\n\n` +

          "Check the product label and local agronomic " +
          "guidance, and choose a suitable weather window."
        );
      }

      if (wind >= 20) {

        return (
          "Wind conditions deserve caution before spraying. 💨\n\n" +

          `Current wind speed is about ${Math.round(wind)} km/h.\n\n` +

          "Strong wind can increase spray drift. Wait for " +
          "a safer window and follow the product label."
        );
      }

      return (
        "Current weather conditions do not show a major " +
        "rain or wind warning for spraying. 🌱\n\n" +

        `Rain probability: ${rain}%\n` +
        `Wind: ${Math.round(wind)} km/h\n\n` +

        "However, always follow the pesticide label and " +
        "local agricultural safety guidance."
      );
    }


    /* -----------------------------------------------------
       IRRIGATION QUESTION
       ----------------------------------------------------- */

    if (
      text.includes("irrigat") ||
      text.includes("water my farm") ||
      text.includes("watering")
    ) {

      if (rain >= 60) {

        return (
          "You may not need to irrigate immediately. 💧\n\n" +

          `Rain probability is around ${rain}%.\n\n` +

          "Check the soil first. If the soil already has " +
          "adequate moisture, avoid unnecessary irrigation."
        );
      }

      if (humidity < 55) {

        return (
          "Your conditions may require closer attention to " +
          "soil moisture. 💧\n\n" +

          `Humidity is around ${humidity}% and rain probability ` +
          `is ${rain}%.\n\n` +

          "Check the soil and crop needs before irrigating."
        );
      }

      return (
        "Check soil moisture before irrigation. 🌱\n\n" +

        `Humidity: ${humidity}%\n` +
        `Rain probability: ${rain}%\n\n` +

        "The best irrigation decision should also consider " +
        "crop type, soil type and growth stage."
      );
    }


    /* -----------------------------------------------------
       CROP QUESTION
       ----------------------------------------------------- */

    if (
      text.includes("crop") ||
      text.includes("plant") ||
      text.includes("grow") ||
      text.includes("maize") ||
      text.includes("cassava") ||
      text.includes("okra") ||
      text.includes("tomato")
    ) {

      if (
        temperature >= 27 &&
        humidity >= 70
      ) {

        return (
          `The current conditions around ${location} are ` +
          "warm and humid. 🌱\n\n" +

          "Some crops commonly suited to tropical conditions " +
          "include:\n\n" +

          "🌽 Maize\n" +
          "🌱 Cassava\n" +
          "🥬 Okra\n" +
          "🌶️ Pepper\n\n" +

          "Before planting, also consider soil type, season, " +
          "crop variety and local agronomic recommendations."
        );
      }

      if (
        temperature >= 25 &&
        rain >= 50
      ) {

        return (
          "The current conditions are warm with a useful " +
          "chance of rainfall. 🌦️\n\n" +

          "Possible crop options include:\n\n" +

          "🌽 Maize\n" +
          "🌱 Cassava\n" +
          "🫘 Beans\n" +
          "🥬 Vegetables\n\n" +

          "Good drainage is especially important when rainfall " +
          "is frequent."
        );
      }

      return (
        "Some broad crop options to consider are:\n\n" +

        "🌽 Maize\n" +
        "🌱 Cassava\n" +
        "🫘 Beans\n" +
        "🥬 Vegetables\n\n" +

        "For a reliable planting decision, consider your soil, " +
        "season, crop variety and local agricultural guidance."
      );
    }


    /* -----------------------------------------------------
       FARM TODAY QUESTION
       ----------------------------------------------------- */

    if (
      text.includes("today") ||
      text.includes("do today") ||
      text.includes("farm today") ||
      text.includes("advice")
    ) {

      let advice =
        `Here's my farming assessment for ${location} today:\n\n`;

      if (rain >= 60) {

        advice +=
          "🌧️ Rain: Prioritize drainage and protect harvested produce.\n";
      } else {

        advice +=
          "🌤️ Rain: Rain risk is not currently high, but keep monitoring the forecast.\n";
      }

      if (wind >= 20) {

        advice +=
          "💨 Wind: Be cautious with spraying because of elevated wind.\n";
      } else {

        advice +=
          "💨 Wind: Wind conditions are relatively moderate.\n";
      }

      if (temperature >= 32) {

        advice +=
          "🌡️ Heat: Plan demanding field work for cooler periods and monitor soil moisture.\n";
      } else {

        advice +=
          "🌡️ Temperature: Conditions are not showing a major heat warning.\n";
      }

      if (humidity >= 80) {

        advice +=
          "💧 Humidity: High humidity means crops should be monitored regularly for disease pressure.";
      } else {

        advice +=
          "🌱 Crops: Continue routine crop scouting and field observations.";
      }

      return advice;
    }


    /* -----------------------------------------------------
       HELP QUESTION
       ----------------------------------------------------- */

    if (
      text.includes("help") ||
      text.includes("what can you do") ||
      text.includes("who are you")
    ) {

      return (
        "I'm AgroSky AI. 🌱🤖\n\n" +

        "I can currently help you with:\n\n" +

        "🌦️ Weather conditions\n" +
        "🌧️ Rain probability\n" +
        "💧 Irrigation decisions\n" +
        "🌱 Crop suggestions\n" +
        "🧴 Spraying weather conditions\n" +
        "🚜 Daily farm activities\n" +
        "⚠️ Weather-related farm alerts\n\n" +

        "Try asking me something like " +
        "\"Should I spray today?\""
      );
    }


    /* -----------------------------------------------------
       GREETINGS
       ----------------------------------------------------- */

    if (
      text === "hi" ||
      text === "hello" ||
      text.includes("good morning") ||
      text.includes("good afternoon") ||
      text.includes("good evening")
    ) {

      return (
        `Hello! 🌱\n\n` +

        `I'm ready to help with your farm in ${location}.\n\n` +

        "Ask me about today's weather, rain, irrigation, " +
        "spraying, crops or farm activities."
      );
    }


    /* -----------------------------------------------------
       DEFAULT RESPONSE
       ----------------------------------------------------- */

    return (
      "I can help you make sense of the weather for farming. 🌱\n\n" +

      "Try asking:\n\n" +

      "• Will it rain today?\n" +
      "• Should I spray today?\n" +
      "• Should I irrigate?\n" +
      "• What crops can I grow?\n" +
      "• What should I do on my farm today?\n" +
      "• What is the current weather?"
    );
  }


  /* -------------------------------------------------------
     SEND MESSAGE
     ------------------------------------------------------- */

  function sendAIMessage(question) {

    const cleanQuestion =
      String(question || "").trim();

    if (!cleanQuestion) {
      return;
    }

    addMessage(
      "user",
      cleanQuestion
    );

    aiInput.value = "";


    /* Show thinking indicator */

    const typing =
      document.createElement("div");

    typing.className =
      "agrosky-ai-typing";

    typing.textContent =
      "AgroSky AI is thinking...";

    messagesContainer.appendChild(typing);

    messagesContainer.scrollTop =
      messagesContainer.scrollHeight;


    /* Small natural response delay */

    setTimeout(() => {

      typing.remove();

      const response =
        generateAIResponse(
          cleanQuestion
        );

      addMessage(
        "ai",
        response
      );

    }, 450);
  }


  /* -------------------------------------------------------
     OPEN AI
     ------------------------------------------------------- */

  aiButton.addEventListener(
    "click",
    () => {

      aiWindow.classList.toggle("open");

      if (
        aiWindow.classList.contains("open")
      ) {
        aiInput.focus();
      }
    }
  );


  /* -------------------------------------------------------
     CLOSE AI
     ------------------------------------------------------- */

  closeButton.addEventListener(
    "click",
    () => {
      aiWindow.classList.remove("open");
    }
  );


  /* -------------------------------------------------------
     FORM SUBMIT
     ------------------------------------------------------- */

  aiForm.addEventListener(
    "submit",
    (event) => {

      event.preventDefault();

      sendAIMessage(
        aiInput.value
      );
    }
  );


  /* -------------------------------------------------------
     SUGGESTION BUTTONS
     ------------------------------------------------------- */

  suggestionButtons.forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          sendAIMessage(
            button.textContent
          );
        }
      );

    }
  );


  /* -------------------------------------------------------
     INITIAL AI MESSAGE
     ------------------------------------------------------- */

  messagesContainer.innerHTML = "";

  addMessage(
    "ai",
    aiMessages[0].text
  );


  /* -------------------------------------------------------
     UPDATE ORIGINAL AI PANEL
     ------------------------------------------------------- */

  if (typeof window.updateAIAdvice === "function") {

    const originalUpdateAI =
      window.updateAIAdvice;

    window.updateAIAdvice =
      function(weather, location) {

        originalUpdateAI(
          weather,
          location
        );

        window.agroSkyWeather =
          weather;

        window.agroSkyLocation =
          location;
      };
  }

})();
