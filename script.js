const demo = {
  Lagos: {
    temp: 29,
    condition: "Partly cloudy",
    icon: "🌤️",
    humidity: 78,
    wind: 12,
    rain: 30,
    crops: ["Maize", "Cassava", "Okra", "Tomato"]
  },

  Ibadan: {
    temp: 28,
    condition: "Cloudy",
    icon: "☁️",
    humidity: 81,
    wind: 10,
    rain: 45,
    crops: ["Maize", "Cassava", "Pepper", "Vegetables"]
  },

  Abuja: {
    temp: 27,
    condition: "Sunny",
    icon: "☀️",
    humidity: 52,
    wind: 15,
    rain: 15,
    crops: ["Maize", "Sorghum", "Millet", "Groundnut"]
  },

  Kano: {
    temp: 31,
    condition: "Hot and sunny",
    icon: "☀️",
    humidity: 34,
    wind: 18,
    rain: 10,
    crops: ["Sorghum", "Millet", "Tomato", "Onion"]
  }
};


/* =========================
   WEATHER ENGINE
========================= */

function findWeather(place) {

  const cleanPlace = place.trim();

  const key = Object.keys(demo).find(
    k => cleanPlace.toLowerCase().includes(k.toLowerCase())
  );

  if (key) {
    return {
      ...demo[key],
      place: key
    };
  }

  const seed = [...cleanPlace]
    .reduce((a, c) => a + c.charCodeAt(0), 0);

  return {
    place: cleanPlace || "Lagos",
    temp: 26 + (seed % 8),
    condition: "Variable clouds",
    icon: "🌥️",
    humidity: 55 + (seed % 25),
    wind: 8 + (seed % 14),
    rain: 20 + (seed % 55),
    crops: [
      "Maize",
      "Beans",
      "Cassava",
      "Vegetables"
    ]
  };
}


/* =========================
   AI FARMING ENGINE
========================= */

function generateAIAdvice(w) {

  let advice = "";

  if (w.rain >= 60) {

    advice =
      `🌧️ High rainfall risk detected in ${w.place}. ` +
      `Prioritize drainage, postpone spraying, protect harvested crops ` +
      `and inspect low-lying parts of the farm.`;

  } else if (w.rain >= 40) {

    advice =
      `🌦️ Moderate rain is expected in ${w.place}. ` +
      `Check drainage channels and consider completing outdoor field work ` +
      `before rainfall increases.`;

  } else if (w.temp >= 31 && w.humidity < 50) {

    advice =
      `☀️ Hot and relatively dry conditions detected. ` +
      `Monitor soil moisture closely and irrigate crops when necessary. ` +
      `Avoid unnecessary water loss during the hottest part of the day.`;

  } else if (w.wind >= 18) {

    advice =
      `💨 Stronger winds are being detected. ` +
      `Avoid spraying pesticides or fertilizers during windy periods ` +
      `and secure vulnerable farm materials.`;

  } else {

    advice =
      `🌱 Conditions around ${w.place} look generally suitable for routine ` +
      `field inspection. Check soil moisture, monitor crops for pests ` +
      `and plan irrigation according to field conditions.`;
  }

  return advice;
}


/* =========================
   AI UPDATE
========================= */

function updateAI(w) {

  const advice = document.querySelector("#aiAdvice");
  const status = document.querySelector("#aiStatus");
  const badge = document.querySelector("#aiBadge");

  if (!advice) return;

  status.textContent = "AI is analyzing weather conditions...";

  advice.style.opacity = "0";

  setTimeout(() => {

    advice.textContent = generateAIAdvice(w);

    advice.style.transition = "opacity .5s ease";
    advice.style.opacity = "1";

    status.textContent =
      `AI analysis updated for ${w.place}`;

    if (badge) {
      badge.textContent =
        `✨ AI Assistant: ${w.place} conditions monitored`;
    }

  }, 500);
}


/* =========================
   RENDER WEATHER
========================= */

function render(place) {

  const w = findWeather(place);

  document.querySelector("#heroTemp").textContent =
    w.temp + "°C";

  document.querySelector("#heroPlace").textContent =
    w.place;

  document.querySelector("#currentTemp").textContent =
    w.temp + "°C";

  document.querySelector("#currentCondition").textContent =
    w.condition;

  document.querySelector("#weatherIcon").textContent =
    w.icon;

  document.querySelector("#humidity").textContent =
    w.humidity + "%";

  document.querySelector("#wind").textContent =
    w.wind + " km/h";

  document.querySelector("#rain").textContent =
    w.rain + "%";

  document.querySelector("#status").textContent =
    `Showing demo conditions for ${w.place}. ` +
    `AI recommendations update automatically.`;

  document.querySelector("#cropList").innerHTML =
    w.crops
      .map(c => `<li>${c}</li>`)
      .join("");


  /* Forecast */

  const days = [
    "Today",
    "Thu",
    "Fri",
    "Sat"
  ];

  document.querySelector("#forecast").innerHTML =
    days.map((d, i) => {

      const icons = [
        w.icon,
        "🌦️",
        "☀️",
        "🌤️"
      ];

      return `
        <article class="forecast-card">

          <div class="day">
            ${d}
          </div>

          <div class="weather">
            ${icons[i]}
          </div>

          <div class="temp">
            ${w.temp + i - 1}°C
          </div>

          <small>
            ${Math.max(10, w.rain + i * 8)}% rain
          </small>

        </article>
      `;

    }).join("");


  /* Alerts */

  document.querySelector("#alerts").innerHTML = `

    <div class="alert">

      <b>
        ${w.rain > 50
          ? "Heavy rain watch"
          : "Rain watch"}
      </b>

      <span>
        ${w.rain}% precipitation probability.
        Plan field work accordingly.
      </span>

    </div>


    <div class="alert">

      <b>Wind check</b>

      <span>
        ${
          w.wind > 18
            ? "Higher winds detected. Avoid spraying."
            : "Conditions suitable for routine field inspection."
        }
      </span>

    </div>

  `;


  /* AI */

  updateAI(w);
}


/* =========================
   SEARCH
========================= */

const searchButton =
  document.querySelector("#searchBtn");

const locationInput =
  document.querySelector("#locationInput");


searchButton.addEventListener("click", () => {

  const location =
    locationInput.value.trim() || "Lagos";

  searchButton.classList.add("loading");

  setTimeout(() => {

    render(location);

    searchButton.classList.remove("loading");

  }, 700);

});


locationInput.addEventListener("keydown", e => {

  if (e.key === "Enter") {
    searchButton.click();
  }

});


/* =========================
   MOBILE MENU
========================= */

document
  .querySelector(".menu")
  .addEventListener("click", () => {

    const nav =
      document.querySelector(".topbar nav");

    nav.style.display =
      nav.style.display === "flex"
        ? "none"
        : "flex";

    nav.style.flexDirection = "column";
    nav.style.position = "absolute";
    nav.style.top = "65px";
    nav.style.right = "6%";
    nav.style.background = "#fff";
    nav.style.padding = "18px";
    nav.style.borderRadius = "12px";
    nav.style.boxShadow =
      "0 15px 40px rgba(0,0,0,.12)";
  });


/* =========================
   CONTACT FORM
========================= */

document
  .querySelector("#contactForm")
  .addEventListener("submit", e => {

    e.preventDefault();

    document.querySelector("#formMsg").textContent =
      "Thanks! Your message has been received in this demo.";

    e.target.reset();

  });


/* =========================
   AUTO UPDATE SYSTEM
========================= */

let currentLocation = "Lagos";

function autoUpdate() {

  const weather =
    findWeather(currentLocation);

  /*
   * Simulate small environmental changes.
   * Replace this function with a real weather API
   * when deploying the production version.
   */

  weather.temp +=
    Math.floor(Math.random() * 3) - 1;

  weather.humidity = Math.max(
    20,
    Math.min(
      95,
      weather.humidity +
      Math.floor(Math.random() * 5) - 2
    )
  );

  weather.wind = Math.max(
    4,
    weather.wind +
    Math.floor(Math.random() * 5) - 2
  );

  weather.rain = Math.max(
    5,
    Math.min(
      95,
      weather.rain +
      Math.floor(Math.random() * 9) - 4
    )
  );

  render(currentLocation);

}


/* Refresh every 60 seconds */

setInterval(autoUpdate, 60000);


/* Initial load */

render("Lagos");
