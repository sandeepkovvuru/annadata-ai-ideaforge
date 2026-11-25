"use strict";

const $ = (id) => document.getElementById(id);
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const cropProfiles = {
  rice: {
    label: "Rice / Paddy", heat: 34, wet: 100, dry: 12,
    advice: "During flowering, avoid water stress; maintain field moisture and monitor drainage after heavy rain."
  },
  maize: {
    label: "Maize", heat: 35, wet: 65, dry: 8,
    advice: "During flowering and silking, prioritize moisture availability and inspect for waterlogging after intense rain."
  },
  cotton: {
    label: "Cotton", heat: 38, wet: 55, dry: 6,
    advice: "Avoid prolonged waterlogging; monitor soil moisture and pest pressure after humid, wet spells."
  },
  groundnut: {
    label: "Groundnut", heat: 35, wet: 55, dry: 7,
    advice: "Keep soil moisture steady during pegging and pod development; ensure adequate drainage."
  },
  ragi: {
    label: "Ragi (Finger millet)", heat: 38, wet: 45, dry: 4,
    advice: "Check establishment moisture and protect against prolonged dry spells; avoid unnecessary irrigation."
  },
  millet: {
    label: "Bajra (Pearl millet)", heat: 38, wet: 45, dry: 4,
    advice: "Check establishment moisture and protect against prolonged dry spells; avoid unnecessary irrigation."
  }
};

const yieldCropNames = {
  rice: "Rice",
  maize: "Maize",
  cotton: "Cotton(lint)",
  groundnut: "Groundnut",
  ragi: "Ragi",
  millet: "Bajra"
};

function showError(message) {
  $("error").textContent = message;
  $("error").classList.remove("d-none");
}
function clearError() {
  $("error").textContent = "";
  $("error").classList.add("d-none");
}
function setText(id, value) {
  $(id).textContent = value;
}
function addCell(parent, label, value) {
  const card = document.createElement("div");
  const title = document.createElement("span");
  const output = document.createElement("b");
  title.textContent = label;
  output.textContent = value;
  card.append(title, output);
  parent.append(card);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

async function analyze() {
  const query = $("place").value.trim();
  if (!query) {
    showError("Enter a city, town or district name.");
    return;
  }

  const button = $("analyzeBtn");
  button.disabled = true;
  button.textContent = "Loading…";
  clearError();
  setText("updated", "Fetching live data…");

  try {
    const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geocodeUrl.search = new URLSearchParams({
      name: query, count: "1", language: "en", format: "json"
    }).toString();

    const geocode = await fetchJson(geocodeUrl);
    if (!geocode.results || geocode.results.length === 0) {
      throw new Error("Location not found. Try a nearby city or district name.");
    }

    const location = geocode.results[0];
    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
    weatherUrl.search = new URLSearchParams({
      latitude: location.latitude,
      longitude: location.longitude,
      current: "temperature_2m,relative_humidity_2m,precipitation,weather_code",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
      forecast_days: "7",
      timezone: "auto"
    }).toString();

    const weather = await fetchJson(weatherUrl);
    renderWeather(location, weather);
    try {
      await loadYieldBenchmark(location);
    } catch (modelError) {
      setText("yieldEstimate", "N/A");
      setText("yieldMeta", `${modelError.message} The live weather dashboard is still available.`);
      $("modelSplit").replaceChildren();
      $("modelContext").replaceChildren();
    }
    setText("updated", `Updated ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`);
  } catch (error) {
    showError(error.message || "Analysis could not be completed. Check your connection and try again.");
    setText("updated", "Analysis unavailable");
  } finally {
    button.disabled = false;
    button.textContent = "Analyze";
  }
}

function renderWeather(location, weather) {
  const current = weather.current || {};
  const daily = weather.daily || {};
  const crop = cropProfiles[$("crop").value];
  const stage = $("stage").value;

  const maxTemps = daily.temperature_2m_max || [];
  const minTemps = daily.temperature_2m_min || [];
  const rainValues = daily.precipitation_sum || [];
  const rainChances = daily.precipitation_probability_max || [];

  const totalRain = rainValues.reduce((sum, value) => sum + (Number(value) || 0), 0);
  const peakProbability = Math.max(0, ...rainChances.map(Number));
  const maxTemp = Math.max(0, ...maxTemps.map(Number));

  const heat = clamp((maxTemp - crop.heat + 7) * 11);
  const wet = clamp((totalRain - crop.wet) * 0.65);
  const dry = clamp((crop.dry - totalRain) * 2.8);
  const rainVolatility = clamp((peakProbability - 55) * 1.15);
  const factors = [
    ["Heat stress", Math.round(heat)],
    ["Excess rainfall", Math.round(wet)],
    ["Low rainfall", Math.round(dry)],
    ["Rain probability", Math.round(rainVolatility)]
  ];
  const risk = Math.round(clamp(heat * 0.35 + wet * 0.25 + dry * 0.25 + rainVolatility * 0.15));
  const level = risk < 30 ? "Low" : risk < 60 ? "Moderate" : "High";

  setText("temp", Number.isFinite(Number(current.temperature_2m)) ? `${Math.round(current.temperature_2m)}°C` : "—");
  setText("condition", `Humidity ${current.relative_humidity_2m ?? "—"}% · ${current.precipitation ?? 0} mm current precipitation`);
  setText("rain", `${totalRain.toFixed(1)} mm`);
  setText("chance", `${peakProbability}%`);
  setText("risk", `${risk}/100`);
  setText("riskLabel", `${level} composite risk`);
  setText("gaugeNum", String(risk));
  $("gauge").style.background =
    `conic-gradient(${risk < 30 ? "#6d9b69" : risk < 60 ? "#d2a34c" : "#c66b51"} ${risk * 3.6}deg, #e9eee7 0deg)`;

  setText("riskTitle", `${level} climate stress`);
  setText(
    "riskText",
    `${crop.label} · ${stage} stage. This index combines four weather-derived stress signals; it is not a measured probability of crop loss.`
  );

  const factorBox = $("factors");
  factorBox.replaceChildren();
  for (const [name, score] of factors) {
    const row = document.createElement("div");
    row.className = "factor-row";
    const label = document.createElement("span");
    label.className = "factor-name";
    label.textContent = name;
    const bar = document.createElement("div");
    bar.className = "bar";
    const fill = document.createElement("i");
    fill.style.width = `${score}%`;
    fill.style.background = score > 65 ? "#c77b5e" : "#8eae78";
    bar.append(fill);
    const number = document.createElement("strong");
    number.textContent = String(score);
    row.append(label, bar, number);
    factorBox.append(row);
  }

  renderForecast(daily);
  renderAdvice(crop, stage, heat, wet, dry, peakProbability);

  const placeName = [location.name, location.admin2, location.admin1, location.country]
    .filter(Boolean).join(", ");
  setText("locationName", placeName);
  setText("coords", `${Number(location.latitude).toFixed(3)}°, ${Number(location.longitude).toFixed(3)}°`);
}

function renderForecast(daily) {
  const days = daily.time || [];
  const mins = daily.temperature_2m_min || [];
  const maxes = daily.temperature_2m_max || [];
  const rainfall = daily.precipitation_sum || [];
  const maxRain = Math.max(1, ...rainfall.map(Number));
  const container = $("forecast");
  container.replaceChildren();

  days.forEach((date, index) => {
    const row = document.createElement("div");
    row.className = "forecast-day";

    const name = document.createElement("span");
    name.className = "day-name";
    name.textContent = new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric"
    });

    const bar = document.createElement("div");
    bar.className = "bar";
    const fill = document.createElement("i");
    fill.style.width = `${clamp((Number(rainfall[index]) || 0) / maxRain * 100)}%`;
    bar.append(fill);

    const temperature = document.createElement("span");
    temperature.className = "temp-range";
    temperature.textContent = `${Math.round(mins[index] ?? 0)}–${Math.round(maxes[index] ?? 0)}°`;

    const rain = document.createElement("span");
    rain.className = "rain-value";
    rain.textContent = `${Number(rainfall[index] || 0).toFixed(1)} mm`;

    row.append(name, bar, temperature, rain);
    container.append(row);
  });
}

function renderAdvice(crop, stage, heat, wet, dry, peakProbability) {
  const advice = [];
  if (heat > 45) advice.push("Heat signal is elevated: consider irrigation during cooler hours where water is available, and monitor crop wilting.");
  if (wet > 35) advice.push("Heavy-rainfall signal: clear field drains and avoid field operations on saturated soil.");
  if (dry > 35) advice.push("Low-rainfall signal: check soil moisture before irrigation and prioritize critical growth stages.");
  if (peakProbability > 65) advice.push("Rain probability is high: postpone pesticide or fertilizer spraying if rainfall is expected soon.");
  if (advice.length === 0) advice.push("No strong weather-stress signal in this seven-day snapshot. Continue routine field scouting and follow local advisories.");

  advice.push(crop.advice);
  if (stage === "Sowing") advice.push("Confirm seedbed moisture and local sowing-window guidance before planting.");
  if (stage === "Harvest") advice.push("Track short-term rain updates and plan harvest and drying around safer weather windows.");

  const list = $("advice");
  list.replaceChildren();
  for (const item of advice) {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  }
}

function renderModelMetrics(evaluation) {
  const test = evaluation?.metricsOnHoldoutTest2013to2014;
  if (!test) {
    $("modelMetrics").textContent = "Evaluation metrics are unavailable.";
    return;
  }

  const rows = [
    ["Crop-season baseline", test.cropSeasonMeanBaseline],
    ["Random Forest", test.randomForest],
    ["XGBoost-style GBDT", test.xgboostStyle],
    ["Weighted hybrid", test.validationWeightedBlend]
  ];

  const table = document.createElement("table");
  table.className = "table table-sm align-middle mb-2";
  const thead = document.createElement("thead");
  const header = document.createElement("tr");
  ["Model", "MAE ↓", "RMSE ↓", "R² ↑"].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    header.append(th);
  });
  thead.append(header);
  const tbody = document.createElement("tbody");

  rows.forEach(([name, metrics]) => {
    if (!metrics) return;
    const tr = document.createElement("tr");
    [name, Number(metrics.mae).toFixed(2), Number(metrics.rmse).toFixed(2), Number(metrics.r2).toFixed(3)]
      .forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.append(td);
      });
    tbody.append(tr);
  });

  table.append(thead, tbody);
  const wrapper = $("modelMetrics");
  wrapper.replaceChildren(table);
  const footnote = document.createElement("p");
  footnote.className = "muted-copy";
  footnote.textContent =
    `Macro crop MAE: ${Number(evaluation.macroCropMae_t_ha || 0).toFixed(2)} t/ha across ${Number(evaluation.testCropClasses || 0)} crop classes.`;
  wrapper.append(footnote);
}

async function loadYieldBenchmark(location) {
  setText("yieldEstimate", "…");
  setText("yieldMeta", "Running historical crop-yield model…");
  $("modelSplit").replaceChildren();
  $("modelContext").replaceChildren();

  const payload = await fetchJson("/api/hybrid-predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      state: location.admin1 || "",
      district: location.admin2 || location.name,
      crop: yieldCropNames[$("crop").value],
      season: $("season").value
    })
  });

  setText("yieldEstimate", Number(payload.prediction_t_ha).toFixed(2));
  setText(
    "yieldMeta",
    `${payload.crop} · ${payload.season} · ${payload.state}, ${payload.district} · Reference year ${payload.referenceYear} · ${payload.coverage}`
  );

  const split = $("modelSplit");
  addCell(split, "Random Forest", `${Number(payload.models.randomForest_t_ha).toFixed(2)} t/ha`);
  addCell(split, "XGBoost-style GBDT", `${Number(payload.models.xgboostStyle_t_ha).toFixed(2)} t/ha`);

  const context = payload.inputContext || {};
  [
    ["Seasonal rainfall", `${Number(context.seasonalRainfallMm).toFixed(0)} mm`],
    ["Mean temperature", `${Number(context.temperatureMeanC).toFixed(1)} °C`],
    ["Soil pH · 0–30 cm", Number(context.soilPh0to30cm).toFixed(2)],
    ["Soil organic carbon", `${Number(context.soilOrganicCarbon0to30gKg).toFixed(1)} g/kg`],
    ["Soil nitrogen", `${Number(context.soilNitrogen0to30gKg).toFixed(1)} g/kg`],
    ["Soil clay", `${Number(context.soilClay0to30Pct).toFixed(1)}%`]
  ].forEach(([label, value]) => addCell(context, label, value));

  renderModelMetrics(payload.evaluation);
}

async function refreshAnalysis() {
  try {
    await analyze();
  } catch (error) {
    showError(error.message || "An unexpected error occurred.");
  }
}

$("analyzeBtn").addEventListener("click", refreshAnalysis);
$("place").addEventListener("keydown", (event) => {
  if (event.key === "Enter") refreshAnalysis();
});
["crop", "stage", "season"].forEach((id) => {
  $(id).addEventListener("change", () => {
    if (!$("updated").textContent.includes("Loading")) refreshAnalysis();
  });
});

refreshAnalysis();
