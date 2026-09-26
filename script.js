/* =========================================================
   AGROSKY - WEATHER & FARMING INTELLIGENCE
   Corrected version based on the original JavaScript
   ========================================================= */

const API_BASE = "https://api.open-meteo.com/v1/forecast";
const GEO_BASE = "https://geocoding-api.open-meteo.com/v1/search";

/* =========================================================
   AUTO WEATHER UPDATE
   Refreshes the selected location automatically every 10 minutes
   ========================================================= */

const AUTO_UPDATE_INTERVAL = 10 * 60 * 1000;
let autoUpdateTimer = null;
let autoUpdateInProgress = false;



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
    latitude,
    longitude,

    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature," +
      "precipitation,weather_code,wind_speed_10m",

    hourly:
      "temperature_2m,precipitation_probability,precipitation," +
      "weather_code,relative_humidity_2m,wind_speed_10m",

    daily:
      "weather_code,temperature_2m_max,temperature_2m_min," +
      "precipitation_sum,precipitation_probability_max," +
      "wind_speed_10m_max",

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
        "Weather request timed out. Please check your internet connection."
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
      "Weather data is currently unavailable."
    );
  }

  return data;
}


/* =========================================================
   WEATHER DATA HELPERS
   ========================================================= */

function getCurrentWeatherData(weather) {
  const current = weather.current || {};

  return {
    temperature: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    apparentTemperature: current.apparent_temperature,
    precipitation: current.precipitation,
    weatherCode: current.weather_code,
    windSpeed: current.wind_speed_10m
  };
}


function getDailyWeatherData(weather) {
  const daily = weather.daily || {};

  const dates = daily.time || [];
  const codes = daily.weather_code || [];
  const maxTemps = daily.temperature_2m_max || [];
  const minTemps = daily.temperature_2m_min || [];
  const precipitation = daily.precipitation_sum || [];
  const rainProbability =
    daily.precipitation_probability_max || [];
  const wind = daily.wind_speed_10m_max || [];

  return dates.map((date, index) => ({
    date,
    weatherCode: codes[index],
    maxTemperature: maxTemps[index],
    minTemperature: minTemps[index],
    precipitation: precipitation[index],
    rainProbability: rainProbability[index],
    windSpeed: wind[index]
  }));
}


function getTodayRainProbability(weather) {
  const daily = weather.daily || {};
  const probabilities =
    daily.precipitation_probability_max || [];

  if (
    probabilities.length === 0 ||
    probabilities[0] === null ||
    probabilities[0] === undefined
  ) {
    return 0;
  }

  return Number(probabilities[0]);
}


/* =========================================================
   RENDER CURRENT WEATHER
   ========================================================= */

function renderCurrentWeather(weather, location) {
  const current = getCurrentWeatherData(weather);
  const description = getWeatherDescription(
    current.weatherCode
  );

  const temperature = formatTemperature(
    current.temperature
  );

  const humidityText =
    current.humidity === null ||
    current.humidity === undefined
      ? "--"
      : `${Math.round(current.humidity)}%`;

  const windText =
    current.windSpeed === null ||
    current.windSpeed === undefined
      ? "--"
      : `${Math.round(current.windSpeed)} km/h`;

  const rainProbability = getTodayRainProbability(weather);

  const placeText = location.country
    ? `${location.name}, ${location.country}`
    : location.name;

  if (elements.heroIcon) {
    elements.heroIcon.textContent = description.icon;
  }

  if (elements.heroTemp) {
    elements.heroTemp.textContent = temperature;
  }

  if (elements.heroCondition) {
    elements.heroCondition.textContent =
      description.text;
  }

  if (elements.heroPlace) {
    elements.heroPlace.textContent = placeText;
  }

  if (elements.heroMetrics) {
    elements.heroMetrics.textContent =
      `Humidity ${humidityText} • Wind ${windText}`;
  }

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
      humidityText;
  }

  if (elements.wind) {
    elements.wind.textContent =
      windText;
  }

  if (elements.rain) {
    elements.rain.textContent =
      `${rainProbability}%`;
  }
}


/* =========================================================
   FORECAST RENDERING
   ========================================================= */

function renderForecast(weather) {
  if (!elements.forecast) {
    return;
  }

  const daily = getDailyWeatherData(weather);

  if (!daily.length) {
    elements.forecast.innerHTML =
      `<div class="loading-card">
        Forecast data is currently unavailable.
      </div>`;

    return;
  }

  elements.forecast.innerHTML = daily
    .map((day, index) => {
      const description =
        getWeatherDescription(day.weatherCode);

      const maxTemp =
        formatTemperature(day.maxTemperature);

      const minTemp =
        formatTemperature(day.minTemperature);

      const rain =
        day.rainProbability === null ||
        day.rainProbability === undefined
          ? "--"
          : `${Math.round(day.rainProbability)}%`;

      const precipitation =
        day.precipitation === null ||
        day.precipitation === undefined
          ? "--"
          : `${Number(day.precipitation).toFixed(1)} mm`;

      const wind =
        day.windSpeed === null ||
        day.windSpeed === undefined
          ? "--"
          : `${Math.round(day.windSpeed)} km/h`;

      const dayName =
        index === 0
          ? "Today"
          : formatDate(day.date);

      return `
        <article class="forecast-card">
          <div class="forecast-day">
            ${dayName}
          </div>

          <div class="forecast-icon">
            ${description.icon}
          </div>

          <div class="forecast-condition">
            ${description.text}
          </div>

          <div class="forecast-temperature">
            <strong>${maxTemp}</strong>
            <span>${minTemp}</span>
          </div>

          <div class="forecast-details">
            <span>🌧️ ${rain}</span>
            <span>💧 ${precipitation}</span>
            <span>💨 ${wind}</span>
          </div>
        </article>
      `;
    })
    .join("");
}


/* =========================================================
   FARMING RECOMMENDATIONS
   ========================================================= */

function getFarmingRecommendations(weather) {
  const current = getCurrentWeatherData(weather);
  const daily = getDailyWeatherData(weather);

  const temperature = Number(current.temperature);
  const humidity = Number(current.humidity);
  const wind = Number(current.windSpeed);
  const rainProbability =
    getTodayRainProbability(weather);

  const today = daily[0] || {};

  const recommendations = [];
  const crops = [];
  const tips = [];
  const alerts = [];

  /* -------------------------------------------------------
     Temperature-based guidance
     ------------------------------------------------------- */

  if (temperature >= 32) {
    recommendations.push(
      "High temperatures may increase crop water demand. Check soil moisture and irrigate where necessary."
    );

    tips.push(
      "Inspect crops for heat stress during the hottest part of the day."
    );

    alerts.push({
      title: "Heat watch",
      text:
        "High temperatures are possible. Monitor soil moisture and young plants."
    });
  } else if (temperature <= 20) {
    recommendations.push(
      "Cooler conditions may slow crop growth. Monitor sensitive crops and avoid unnecessary disturbance."
    );

    tips.push(
      "Protect temperature-sensitive seedlings and young crops."
    );
  } else {
    recommendations.push(
      "Current temperatures are within a generally workable range for many field activities."
    );
  }


  /* -------------------------------------------------------
     Rain-based guidance
     ------------------------------------------------------- */

  if (rainProbability >= 70) {
    recommendations.push(
      "Rain is likely. Delay spraying where possible and make sure field drainage is clear."
    );

    tips.push(
      "Check drainage channels before expected rainfall."
    );

    alerts.push({
      title: "Rain watch",
      text:
        `Today's rain probability is ${Math.round(
          rainProbability
        )}%. Plan field activities around rainfall.`
    });
  } else if (rainProbability >= 40) {
    recommendations.push(
      "There is a moderate chance of rain. Check the forecast before spraying, fertilizing, or harvesting."
    );

    tips.push(
      "Keep an eye on changing cloud conditions before beginning outdoor work."
    );
  } else {
    recommendations.push(
      "Rain probability is relatively low. Conditions may be suitable for planned field activities, depending on soil conditions."
    );
  }


  /* -------------------------------------------------------
     Wind-based guidance
     ------------------------------------------------------- */

  if (wind >= 25) {
    recommendations.push(
      "Strong winds may affect spraying and delicate crops. Consider postponing sensitive operations."
    );

    alerts.push({
      title: "Wind watch",
      text:
        `Maximum wind conditions may reach about ${Math.round(
          wind
        )} km/h. Protect vulnerable crops and review spraying plans.`
    });
  } else if (wind >= 15) {
    recommendations.push(
      "Moderate winds are present. Use care when spraying and monitor lightweight plants."
    );
  } else {
    tips.push(
      "Lower wind conditions can be more suitable for careful spraying operations."
    );
  }


  /* -------------------------------------------------------
     Humidity guidance
     ------------------------------------------------------- */

  if (humidity >= 85) {
    recommendations.push(
      "High humidity can keep leaves wet for longer and may increase disease pressure in some crops."
    );

    tips.push(
      "Inspect leaves and stems regularly for signs of fungal or bacterial disease."
    );
  } else if (humidity <= 40) {
    recommendations.push(
      "Lower humidity can increase moisture loss from soil and plants."
    );

    tips.push(
      "Check soil moisture before deciding whether additional irrigation is needed."
    );
  }


  /* -------------------------------------------------------
     Crop suggestions
     ------------------------------------------------------- */

  if (
    temperature >= 24 &&
    temperature <= 34
  ) {
    crops.push(
      "Maize",
      "Cassava",
      "Okra",
      "Tomato"
    );
  } else if (temperature < 24) {
    crops.push(
      "Vegetables",
      "Beans",
      "Leafy greens"
    );
  } else {
    crops.push(
      "Cassava",
      "Sweet potato",
      "Heat-tolerant vegetables"
    );
  }


  /* -------------------------------------------------------
     General tips
     ------------------------------------------------------- */

  tips.push(
    "Check soil moisture before irrigation instead of relying only on air temperature."
  );

  tips.push(
    "Use local field observations together with weather information before making major farm decisions."
  );

  if (
    today.precipitation !== null &&
    today.precipitation !== undefined &&
    Number(today.precipitation) > 10
  ) {
    tips.push(
      "Expected rainfall may provide useful soil moisture, but confirm actual field conditions before reducing irrigation."
    );
  }

  return {
    recommendations,
    crops,
    tips,
    alerts
  };
}


/* =========================================================
   RENDER FARMING RECOMMENDATIONS
   ========================================================= */

function renderFarmingRecommendations(weather) {
  const result =
    getFarmingRecommendations(weather);

  if (elements.farmingSummary) {
    elements.farmingSummary.textContent =
      result.recommendations.join(" ");
  }

  if (elements.cropList) {
    elements.cropList.innerHTML =
      result.crops
        .map(
          (crop) =>
            `<li>${crop}</li>`
        )
        .join("");
  }

  if (elements.tipsList) {
    elements.tipsList.innerHTML =
      result.tips
        .map(
          (tip) =>
            `<li>${tip}</li>`
        )
        .join("");
  }

  if (elements.alerts) {
    if (!result.alerts.length) {
      elements.alerts.innerHTML = `
        <div class="alert-card">
          <strong>Field check</strong>
          <p>
            No major weather alerts are currently detected.
            Continue monitoring local field conditions.
          </p>
        </div>
      `;
    } else {
      elements.alerts.innerHTML =
        result.alerts
          .map(
            (alert) => `
              <div class="alert-card">
                <strong>${alert.title}</strong>
                <p>${alert.text}</p>
              </div>
            `
          )
          .join("");
    }
  }
}


/* =========================================================
   MAIN WEATHER RENDER FUNCTION
   ========================================================= */

function renderWeather(weather, location) {
  renderCurrentWeather(
    weather,
    location
  );

  renderForecast(
    weather
  );

  renderFarmingRecommendations(
    weather
  );

  updateAIFromWeather(
    weather,
    location
  );

  window.agroSkyWeather =
    weather;

  window.agroSkyLocation =
    location;
}/* =========================================================
   AI FARMING ASSISTANT
   ========================================================= */

function updateAIFromWeather(weather, location) {
  if (!elements.aiAdvice && !elements.aiStatus) {
    return;
  }

  const current = getCurrentWeatherData(weather);
  const description = getWeatherDescription(
    current.weatherCode
  );

  const rainProbability =
    getTodayRainProbability(weather);

  const temperature =
    Number(current.temperature);

  const humidity =
    Number(current.humidity);

  const wind =
    Number(current.windSpeed);

  const placeText = location.country
    ? `${location.name}, ${location.country}`
    : location.name;

  let advice = "";

  if (rainProbability >= 70) {
    advice =
      `For ${placeText}, ${description.text.toLowerCase()} ` +
      `conditions are currently being monitored. With a ` +
      `${Math.round(rainProbability)}% chance of rain today, ` +
      `check drainage, avoid unnecessary spraying, and plan ` +
      `field activities around rainfall.`;
  } else if (temperature >= 32) {
    advice =
      `For ${placeText}, temperatures are currently high. ` +
      `Monitor soil moisture, check crops for heat stress, ` +
      `and consider irrigation when the soil actually needs it.`;
  } else if (wind >= 25) {
    advice =
      `For ${placeText}, wind conditions may affect outdoor ` +
      `farm operations. Be careful with spraying and monitor ` +
      `young or vulnerable crops.`;
  } else if (humidity >= 85) {
    advice =
      `For ${placeText}, humidity is currently high. ` +
      `Inspect crops for disease symptoms and avoid keeping ` +
      `foliage unnecessarily wet.`;
  } else {
    advice =
      `For ${placeText}, current conditions are ` +
      `${description.text.toLowerCase()} with a temperature ` +
      `of ${Math.round(temperature)}°C. Continue monitoring ` +
      `soil moisture, rainfall, wind, and crop conditions ` +
      `before making field decisions.`;
  }

  if (elements.aiAdvice) {
    elements.aiAdvice.textContent =
      advice;
  }

  if (elements.aiStatus) {
    elements.aiStatus.textContent =
      "AI is monitoring the latest weather conditions";
  }

  if (elements.aiBadge) {
    elements.aiBadge.textContent =
      "✨ AgroSky: Live weather monitoring active";
  }
}


/* =========================================================
   AI QUESTION RESPONSE
   ========================================================= */

function generateAIResponse(question) {
  const weather =
    window.agroSkyWeather;

  const location =
    window.agroSkyLocation;

  if (!weather || !location) {
    return (
      "I need live weather information before I can " +
      "give you a weather-based answer. Search for a " +
      "location first."
    );
  }

  const current =
    getCurrentWeatherData(weather);

  const description =
    getWeatherDescription(
      current.weatherCode
    );

  const rainProbability =
    getTodayRainProbability(weather);

  const daily =
    getDailyWeatherData(weather);

  const temperature =
    Number(current.temperature);

  const humidity =
    Number(current.humidity);

  const wind =
    Number(current.windSpeed);

  const lowerQuestion =
    String(question || "")
      .toLowerCase()
      .trim();

  const placeText =
    location.country
      ? `${location.name}, ${location.country}`
      : location.name;


  /* -------------------------------------------------------
     Empty question
     ------------------------------------------------------- */

  if (!lowerQuestion) {
    return (
      "Ask me something about the current weather, " +
      "rain, wind, irrigation, spraying, planting, " +
      "crops, or AgroSky."
    );
  }


  /* -------------------------------------------------------
     Website questions
     ------------------------------------------------------- */

  if (
    lowerQuestion.includes("what is agrosky") ||
    lowerQuestion.includes("what does agrosky do") ||
    lowerQuestion.includes("about agrosky")
  ) {
    return (
      "AgroSky is a weather and farming intelligence " +
      "website designed to connect live weather information " +
      "with practical farming guidance. It can show current " +
      "conditions, forecast information, farming tips, " +
      "weather alerts, and crop-related suggestions."
    );
  }


  if (
    lowerQuestion.includes("how does agrosky work") ||
    lowerQuestion.includes("how do you work")
  ) {
    return (
      "AgroSky searches for the location you enter, retrieves " +
      "weather information for that location, displays the " +
      "current conditions and forecast, and then uses those " +
      "conditions to provide weather-aware farming guidance."
    );
  }


  if (
    lowerQuestion.includes("who made agrosky") ||
    lowerQuestion.includes("who created agrosky")
  ) {
    return (
      "This version of AgroSky is the website you are currently " +
      "working on. The website contains its own weather-aware " +
      "farming assistant and live weather interface."
    );
  }


  /* -------------------------------------------------------
     Current weather questions
     ------------------------------------------------------- */

  if (
    lowerQuestion.includes("weather") ||
    lowerQuestion.includes("temperature") ||
    lowerQuestion.includes("hot") ||
    lowerQuestion.includes("cold") ||
    lowerQuestion.includes("condition")
  ) {
    return (
      `The current weather for ${placeText} is ` +
      `${description.text.toLowerCase()} with a temperature ` +
      `of ${Math.round(temperature)}°C. Humidity is about ` +
      `${Math.round(humidity)}% and wind speed is around ` +
      `${Math.round(wind)} km/h.`
    );
  }


  /* -------------------------------------------------------
     Rain questions
     ------------------------------------------------------- */

  if (
    lowerQuestion.includes("rain") ||
    lowerQuestion.includes("raining")
  ) {
    if (rainProbability >= 70) {
      return (
        `Rain is a significant possibility in ${placeText} ` +
        `today, with about a ${Math.round(rainProbability)}% ` +
        `rain probability. Check drainage and plan outdoor ` +
        `farm activities carefully.`
      );
    }

    if (rainProbability >= 40) {
      return (
        `There is a moderate chance of rain in ${placeText} ` +
        `today, currently around ${Math.round(rainProbability)}%. ` +
        `Check the latest forecast before starting weather-sensitive ` +
        `farm activities.`
      );
    }

    return (
      `The current rain probability for ${placeText} is about ` +
      `${Math.round(rainProbability)}%. Rain is currently less ` +
      `likely than under a high-rain scenario, but local conditions ` +
      `can still change.`
    );
  }


  /* -------------------------------------------------------
     Irrigation questions
     ------------------------------------------------------- */

  if (
    lowerQuestion.includes("irrigat") ||
    lowerQuestion.includes("water my crop") ||
    lowerQuestion.includes("water crops") ||
    lowerQuestion.includes("watering")
  ) {
    if (rainProbability >= 70) {
      return (
        `Because rain is currently likely in ${placeText}, ` +
        `check the soil before irrigating. You may not need ` +
        `additional water if sufficient rainfall occurs.`
      );
    }

    if (temperature >= 32) {
      return (
        `Conditions in ${placeText} are relatively hot. Check ` +
        `soil moisture regularly and irrigate according to the ` +
        `crop's needs rather than using a fixed schedule.`
      );
    }

    return (
      `For ${placeText}, check soil moisture before irrigation. ` +
      `Weather information can help with planning, but the actual ` +
      `soil condition and crop growth stage should guide the decision.`
    );
  }


  /* -------------------------------------------------------
     Spraying questions
     ------------------------------------------------------- */

  if (
    lowerQuestion.includes("spray") ||
    lowerQuestion.includes("spraying") ||
    lowerQuestion.includes("pesticide") ||
    lowerQuestion.includes("herbicide") ||
    lowerQuestion.includes("fungicide")
  ) {
    if (rainProbability >= 60) {
      return (
        `Rain is currently fairly likely in ${placeText}. ` +
        `Weather-sensitive spraying may need to be postponed, ` +
        `because rainfall can affect application performance. ` +
        `Always follow the product label and local agricultural guidance.`
      );
    }

    if (wind >= 20) {
      return (
        `Wind is currently around ${Math.round(wind)} km/h in ` +
        `${placeText}. Consider wind conditions carefully before ` +
        `any spraying operation and follow the product label and ` +
        `local agricultural guidance.`
      );
    }

    return (
      `Current weather conditions in ${placeText} do not show a ` +
      `high rain probability. Still check the latest forecast and ` +
      `wind conditions immediately before spraying, and always follow ` +
      `the product label and applicable agricultural guidance.`
    );
  }


  /* -------------------------------------------------------
     Planting questions
     ------------------------------------------------------- */

  if (
    lowerQuestion.includes("plant") ||
    lowerQuestion.includes("planting") ||
    lowerQuestion.includes("sow") ||
    lowerQuestion.includes("sowing")
  ) {
    if (rainProbability >= 50) {
      return (
        `Rain may provide useful moisture around ${placeText}. ` +
        `Before planting, check that the soil is workable and ` +
        `not excessively waterlogged. Crop-specific planting ` +
        `requirements should also be considered.`
      );
    }

    return (
      `Planting decisions in ${placeText} should consider soil ` +
      `moisture, crop requirements, and the upcoming rainfall pattern. ` +
      `The current weather alone should not determine the planting date.`
    );
  }


  /* -------------------------------------------------------
     Harvest questions
     ------------------------------------------------------- */

  if (
    lowerQuestion.includes("harvest") ||
    lowerQuestion.includes("harvesting")
  ) {
    if (rainProbability >= 60) {
      return (
        `Because rain is fairly likely in ${placeText}, review the ` +
        `forecast before harvesting. If the crop is ready and conditions ` +
        `allow, plan around rainfall to reduce weather-related problems.`
      );
    }

    return (
      `The current rain probability in ${placeText} is about ` +
      `${Math.round(rainProbability)}%. If the crop is mature, ` +
      `check the forecast and field conditions before harvesting.`
    );
  }


  /* -------------------------------------------------------
     Wind questions
     ------------------------------------------------------- */

  if (
    lowerQuestion.includes("wind") ||
    lowerQuestion.includes("windy")
  ) {
    return (
      `The current wind speed in ${placeText} is about ` +
      `${Math.round(wind)} km/h. ` +
      `${
        wind >= 25
          ? "This is strong enough to warrant extra caution with spraying and vulnerable crops."
          : wind >= 15
            ? "This is moderate wind, so use care with spraying and delicate crops."
            : "These are relatively light wind conditions."
      }`
    );
  }


  /* -------------------------------------------------------
     Humidity questions
     ------------------------------------------------------- */

  if (
    lowerQuestion.includes("humidity") ||
    lowerQuestion.includes("humid")
  ) {
    return (
      `Humidity in ${placeText} is currently around ` +
      `${Math.round(humidity)}%. ` +
      `${
        humidity >= 85
          ? "High humidity can increase moisture remaining on plant surfaces and may increase disease pressure for some crops."
          : humidity <= 40
            ? "Lower humidity can increase moisture loss from plants and soil."
            : "Humidity is currently in a moderate range."
      }`
    );
  }


  /* -------------------------------------------------------
     Crop questions
     ------------------------------------------------------- */

  if (
    lowerQuestion.includes("crop") ||
    lowerQuestion.includes("crops") ||
    lowerQuestion.includes("grow")
  ) {
    const recommendations =
      getFarmingRecommendations(weather);

    return (
      `Based on the current weather in ${placeText}, ` +
      `AgroSky's general crop suggestions include ` +
      `${recommendations.crops.join(", ")}. ` +
      `These are weather-aware suggestions, not a guarantee ` +
      `that a crop will perform well. Soil, season, variety, ` +
      `farm location, and management practices also matter.`
    );
  }


  /* -------------------------------------------------------
     Forecast questions
     ------------------------------------------------------- */

  if (
    lowerQuestion.includes("forecast") ||
    lowerQuestion.includes("tomorrow") ||
    lowerQuestion.includes("next week") ||
    lowerQuestion.includes("next few days")
  ) {
    if (daily.length >= 2) {
      const tomorrow =
        daily[1];

      const tomorrowDescription =
        getWeatherDescription(
          tomorrow.weatherCode
        );

      return (
        `The forecast for ${placeText} shows tomorrow as ` +
        `${tomorrowDescription.text.toLowerCase()}, with a high ` +
        `around ${Math.round(
          tomorrow.maxTemperature
        )}°C and a low around ${Math.round(
          tomorrow.minTemperature
        )}°C. Rain probability is about ` +
        `${Math.round(
          tomorrow.rainProbability || 0
        )}%.`
      );
    }

    return (
      "The forecast data is currently unavailable."
    );
  }


  /* -------------------------------------------------------
     Field activity questions
     ------------------------------------------------------- */

  if (
    lowerQuestion.includes("farm today") ||
    lowerQuestion.includes("do today") ||
    lowerQuestion.includes("field today") ||
    lowerQuestion.includes("farm work")
  ) {
    const recommendations =
      getFarmingRecommendations(weather);

    return (
      recommendations.recommendations
        .slice(0, 3)
        .join(" ")
    );
  }


  /* -------------------------------------------------------
     Help questions
     ------------------------------------------------------- */

  if (
    lowerQuestion.includes("help") ||
    lowerQuestion.includes("what can you do") ||
    lowerQuestion.includes("what can i ask")
  ) {
    return (
      "You can ask me about the current weather, temperature, " +
      "rain probability, wind, humidity, irrigation, spraying, " +
      "planting, harvesting, crops, field activities, forecasts, " +
      "or how AgroSky works."
    );
  }


  /* -------------------------------------------------------
     Default response
     ------------------------------------------------------- */

  return (
    `I can help you understand the weather in ${placeText} ` +
    `and connect it with general farming guidance. Try asking ` +
    `"Will it rain?", "Should I irrigate?", "Is it good for spraying?", ` +
    `"What crops can I consider?", or "What is the forecast?"`
  );
}


/* =========================================================
   SEND AI MESSAGE
   ========================================================= */

function sendAIMessage(question) {
  const response =
    generateAIResponse(
      question
    );

  if (elements.aiAdvice) {
    elements.aiAdvice.textContent =
      response;
  }

  if (elements.aiStatus) {
    elements.aiStatus.textContent =
      "AgroSky AI response generated from current weather";
  }

  return response;
}


/* =========================================================
   AI INPUT SUPPORT
   ========================================================= */

function setupAIInteraction() {
  const aiForm =
    document.querySelector("#aiForm");

  const aiInput =
    document.querySelector("#aiInput");

  const aiSendBtn =
    document.querySelector("#aiSendBtn");

  if (!aiForm || !aiInput) {
    return;
  }

  aiForm.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      const question =
        aiInput.value.trim();

      if (!question) {
        if (elements.aiStatus) {
          elements.aiStatus.textContent =
            "Type a question first";
        }

        return;
      }

      sendAIMessage(
        question
      );

      aiInput.value = "";
      aiInput.focus();
    }
  );

  if (aiSendBtn) {
    aiSendBtn.addEventListener(
      "click",
      () => {
        const question =
          aiInput.value.trim();

        if (!question) {
          return;
        }

        sendAIMessage(
          question
        );

        aiInput.value = "";
        aiInput.focus();
      }
    );
  }
}


/* =========================================================
   SEARCH FORM
   ========================================================= */

async function searchWeather(place) {
  const searchTerm =
    String(
      place ||
      elements.locationInput?.value ||
      ""
    ).trim();

  if (!searchTerm) {
    if (elements.status) {
      elements.status.textContent =
        "Please enter a location.";
    }

    return;
  }

  if (elements.searchBtn) {
    elements.searchBtn.disabled = true;
    elements.searchBtn.textContent =
      "Checking...";
  }

  if (elements.status) {
    elements.status.textContent =
      `Loading live weather for ${searchTerm}...`;
  }

  try {
    const location =
      await geocodeLocation(
        searchTerm
      );

    const weather =
      await getWeather(
        location.latitude,
        location.longitude
      );

    window.agroSkyLocation =
      location;

    window.agroSkyWeather =
      weather;

    renderWeather(
      weather,
      location
    );

    if (elements.status) {
      const placeText =
        location.country
          ? `${location.name}, ${location.country}`
          : location.name;

      const updatedTime =
        new Date().toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        );

      elements.status.textContent =
        `Live weather loaded for ${placeText} at ${updatedTime}.`;
    }

  } catch (error) {
    console.error(
      "AgroSky weather search error:",
      error
    );

    if (elements.status) {
      elements.status.textContent =
        error.message ||
        "Unable to load weather information.";
    }

    if (elements.heroCondition) {
      elements.heroCondition.textContent =
        "Weather unavailable";
    }

    if (elements.currentCondition) {
      elements.currentCondition.textContent =
        "Unable to load weather";
    }

  } finally {
    if (elements.searchBtn) {
      elements.searchBtn.disabled = false;
      elements.searchBtn.textContent =
        "Check Weather";
    }
  }
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


if (elements.searchBtn) {
  elements.searchBtn.addEventListener(
    "click",
    () => {
      searchWeather(
        elements.locationInput?.value
      );
    }
  );
}


/* =========================================================
   AUTOMATIC WEATHER UPDATE
   ========================================================= */

async function refreshCurrentWeather() {
  const location =
    window.agroSkyLocation;

  if (
    !location ||
    autoUpdateInProgress
  ) {
    return;
  }

  autoUpdateInProgress = true;

  try {
    if (elements.status) {
      elements.status.textContent =
        `Refreshing live weather for ${location.name}...`;
    }

    const weather =
      await getWeather(
        location.latitude,
        location.longitude
      );

    renderWeather(
      weather,
      location
    );

    const updatedTime =
      new Date().toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );

    if (elements.status) {
      const locationText =
        location.country
          ? `${location.name}, ${location.country}`
          : location.name;

      elements.status.textContent =
        `Live weather updated for ${locationText} at ${updatedTime}.`;
    }

  } catch (error) {
    console.error(
      "AgroSky automatic weather update error:",
      error
    );

    /* Keep the last successful weather on screen if refresh fails. */
    if (elements.status) {
      elements.status.textContent =
        "Automatic weather refresh failed. Showing the last available weather.";
    }

  } finally {
    autoUpdateInProgress = false;
  }
}


function startAutoWeatherUpdates() {
  if (autoUpdateTimer) {
    clearInterval(
      autoUpdateTimer
    );
  }

  autoUpdateTimer =
    setInterval(
      refreshCurrentWeather,
      AUTO_UPDATE_INTERVAL
    );
}


/* =========================================================
   MOBILE NAVIGATION
   ========================================================= */

function setupMobileNavigation() {
  const menuButton =
    elements.menuBtn;

  const nav =
    elements.nav;

  if (!menuButton || !nav) {
    return;
  }

  menuButton.addEventListener(
    "click",
    () => {
      const isOpen =
        nav.classList.toggle(
          "open"
        );

      menuButton.setAttribute(
        "aria-expanded",
        String(isOpen)
      );
    }
  );

  const navLinks =
    nav.querySelectorAll(
      "a"
    );

  navLinks.forEach(
    (link) => {
      link.addEventListener(
        "click",
        () => {
          nav.classList.remove(
            "open"
          );

          menuButton.setAttribute(
            "aria-expanded",
            "false"
          );
        }
      );
    }
  );
}


/* =========================================================
   SCROLL REVEAL
   ========================================================= */

function setupScrollReveal() {
  const revealElements =
    document.querySelectorAll(
      ".reveal, .feature-card, .forecast-card, " +
      ".about-card, .gallery-card, .alert-card"
    );

  if (!revealElements.length) {
    return;
  }

  if (
    !("IntersectionObserver" in window)
  ) {
    revealElements.forEach(
      (element) => {
        element.classList.add(
          "visible"
        );
      }
    );

    return;
  }

  const observer =
    new IntersectionObserver(
      (entries) => {
        entries.forEach(
          (entry) => {
            if (
              entry.isIntersecting
            ) {
              entry.target.classList.add(
                "visible"
              );

              observer.unobserve(
                entry.target
              );
            }
          }
        );
      },
      {
        threshold: 0.12
      }
    );

  revealElements.forEach(
    (element) => {
      observer.observe(
        element
      );
    }
  );
}


/* =========================================================
   CONTACT FORM
   ========================================================= */

function setupContactForm() {
  const form =
    elements.contactForm;

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const formMsg =
        elements.formMsg;

      const action =
        form.getAttribute(
          "action"
        );

      if (
        !action ||
        action.includes(
          "YOUR_FORM_ID"
        )
      ) {
        if (formMsg) {
          formMsg.textContent =
            "Contact form is not connected yet. Add your Formspree form ID to the form action.";
        }

        return;
      }

      const submitButton =
        form.querySelector(
          'button[type="submit"]'
        );

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent =
          "Sending...";
      }

      if (formMsg) {
        formMsg.textContent =
          "Sending your message...";
      }

      try {
        const formData =
          new FormData(
            form
          );

        const response =
          await fetch(
            action,
            {
              method: "POST",
              body: formData,
              headers: {
                Accept:
                  "application/json"
              }
            }
          );

        if (!response.ok) {
          throw new Error(
            "Unable to send message."
          );
        }

        if (formMsg) {
          formMsg.textContent =
            "Message sent successfully. Thank you for contacting AgroSky.";
        }

        form.reset();

      } catch (error) {
        console.error(
          "AgroSky contact form error:",
          error
        );

        if (formMsg) {
          formMsg.textContent =
            "Your message could not be sent right now. Please try again later.";
        }

      } finally {
        if (submitButton) {
          submitButton.disabled =
            false;

          submitButton.textContent =
            "Send Message";
        }
      }
    }
  );
}


/* =========================================================
   SMOOTH NAVIGATION FALLBACK
   ========================================================= */

function setupSmoothNavigation() {
  const links =
    document.querySelectorAll(
      'a[href^="#"]'
    );

  links.forEach(
    (link) => {
      link.addEventListener(
        "click",
        (event) => {
          const targetId =
            link.getAttribute(
              "href"
            );

          if (
            !targetId ||
            targetId === "#"
          ) {
            return;
          }

          const target =
            document.querySelector(
              targetId
            );

          if (!target) {
            return;
          }

          event.preventDefault();

          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      );
    }
  );
}


/* =========================================================
   HERO CARD FLOAT ANIMATION
   ========================================================= */

function setupHeroAnimation() {
  const heroCard =
    document.querySelector(
      ".hero-card"
    );

  if (!heroCard) {
    return;
  }

  let animationFrame =
    null;

  let targetX = 0;
  let targetY = 0;

  let currentX = 0;
  let currentY = 0;

  function animate() {
    currentX +=
      (targetX - currentX) *
      0.08;

    currentY +=
      (targetY - currentY) *
      0.08;

    heroCard.style.transform =
      `translate3d(${currentX}px, ${currentY}px, 0)`;

    animationFrame =
      requestAnimationFrame(
        animate
      );
  }

  heroCard.addEventListener(
    "mousemove",
    (event) => {
      const rect =
        heroCard.getBoundingClientRect();

      const x =
        event.clientX -
        rect.left -
        rect.width / 2;

      const y =
        event.clientY -
        rect.top -
        rect.height / 2;

      targetX =
        Math.max(
          -6,
          Math.min(
            6,
            x / 30
          )
        );

      targetY =
        Math.max(
          -6,
          Math.min(
            6,
            y / 30
          )
        );
    }
  );

  heroCard.addEventListener(
    "mouseleave",
    () => {
      targetX = 0;
      targetY = 0;
    }
  );

  animate();

  window.addEventListener(
    "beforeunload",
    () => {
      if (animationFrame) {
        cancelAnimationFrame(
          animationFrame
        );
      }
    }
  );
}


/* =========================================================
   PAGE VISIBILITY HANDLING
   ========================================================= */

function setupVisibilityHandling() {
  document.addEventListener(
    "visibilitychange",
    () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        const location =
          window.agroSkyLocation;

        if (
          location &&
          !autoUpdateInProgress
        ) {
          refreshCurrentWeather();
        }
      }
    }
  );
}


/* =========================================================
   ERROR HANDLING
   ========================================================= */

window.addEventListener(
  "error",
  (event) => {
    console.error(
      "AgroSky JavaScript error:",
      event.error ||
      event.message
    );
  }
);


window.addEventListener(
  "unhandledrejection",
  (event) => {
    console.error(
      "AgroSky promise error:",
      event.reason
    );
  }
);


/* =========================================================
   INITIALIZE APPLICATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    setupAIInteraction();

    setupMobileNavigation();

    setupScrollReveal();

    setupContactForm();

    setupSmoothNavigation();

    setupHeroAnimation();

    setupVisibilityHandling();

    searchWeather(
      "Lagos"
    );

    startAutoWeatherUpdates();
  }
);```css
/* ============================================================
   AGROSKY LOGO
============================================================ */

.brand {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  flex-shrink: 0;
}

.brand img {
  width: 135px;
  height: 58px;
  object-fit: contain;
  display: block;
}

.footer-brand img {
  width: 145px;
  height: 65px;
}


/* ============================================================
   AGROSKY AI
============================================================ */

.ai-panel {
  position: relative;
  overflow: hidden;
}

.ai-header {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 25px;
  align-items: center;
  margin-bottom: 28px;
}

.ai-icon {
  width: 70px;
  height: 70px;
  display: grid;
  place-items: center;
  border-radius: 20px;
  background: #1d6d43;
  font-size: 2rem;
  box-shadow: 0 10px 25px #00000022;
}

.ai-chat {
  background: #ffffff12;
  border: 1px solid #ffffff18;
  border-radius: 20px;
  padding: 20px;
}

.ai-messages {
  max-height: 360px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 5px;
  margin-bottom: 15px;
}

.ai-message {
  max-width: 85%;
  padding: 13px 16px;
  border-radius: 15px;
  line-height: 1.5;
}

.ai-message p {
  margin: 5px 0 0;
}

.ai-message.bot {
  align-self: flex-start;
  background: #ffffff;
  color: #173225;
  border-bottom-left-radius: 5px;
}

.ai-message.user {
  align-self: flex-end;
  background: #197344;
  color: #ffffff;
  border-bottom-right-radius: 5px;
}

.ai-message strong {
  font-size: .85rem;
}

.ai-message.user strong {
  color: #ffffff;
}

.ai-quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.ai-quick-actions button {
  border: 1px solid #ffffff30;
  background: #ffffff12;
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: background .2s ease, transform .2s ease;
}

.ai-quick-actions button:hover {
  background: #ffffff22;
  transform: translateY(-1px);
}

.ai-input {
  display: flex;
  gap: 8px;
}

.ai-input input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  padding: 14px 16px;
  border-radius: 10px;
  background: #ffffff;
  color: #173225;
}

.ai-input button {
  background: #72cf91;
  color: #123b28;
  padding: 12px 20px;
  border-radius: 10px;
  font-weight: 800;
  cursor: pointer;
  transition: .2s ease;
}

.ai-input button:hover {
  background: #8bdca5;
}

.ai-input button:disabled {
  opacity: .6;
  cursor: wait;
}

.ai-typing {
  opacity: .7;
}

.ai-typing span {
  display: inline-block;
  animation: aiDot 1.2s infinite;
}

.ai-typing span:nth-child(2) {
  animation-delay: .15s;
}

.ai-typing span:nth-child(3) {
  animation-delay: .3s;
}

@keyframes aiDot {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }

  30% {
    transform: translateY(-4px);
  }
}


/* ============================================================
   MOBILE
============================================================ */

@media (max-width: 560px) {

  .brand img {
    width: 110px;
    height: 50px;
  }

  .footer-brand img {
    width: 125px;
    height: 55px;
  }

  .ai-header {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .ai-icon {
    width: 58px;
    height: 58px;
    font-size: 1.6rem;
  }

  .ai-message {
    max-width: 95%;
  }

  .ai-input {
    flex-direction: column;
  }

  .ai-input input,
  .ai-input button {
    width: 100%;
  }

  .ai-quick-actions button {
    font-size: .82rem;
  }
}
```
