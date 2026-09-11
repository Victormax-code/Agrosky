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
