const swisseph = require("swisseph");
const tzLookup = require("tz-lookup");
const { Temporal } = require("@js-temporal/polyfill");

const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces"
];

const RULER_BY_SIGN = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter"
};

const SIGN_STYLE = {
  Aries: "direct and action-first",
  Taurus: "grounded and steady",
  Gemini: "curious and mentally agile",
  Cancer: "protective and emotionally tuned",
  Leo: "expressive and heart-led",
  Virgo: "precise and service-oriented",
  Libra: "balanced and relational",
  Scorpio: "intense and transformational",
  Sagittarius: "expansive and truth-seeking",
  Capricorn: "disciplined and strategic",
  Aquarius: "innovative and community-minded",
  Pisces: "intuitive and compassionate"
};

const HOUSE_TOPICS = {
  1: "identity, body, and first impressions",
  2: "money, values, and self-worth",
  3: "communication, learning, and daily thinking",
  4: "home, roots, and emotional foundation",
  5: "creativity, joy, romance, and play",
  6: "work routines, health habits, and service",
  7: "partnerships, mirrors, and agreements",
  8: "shared resources, intimacy, and transformation",
  9: "beliefs, higher learning, and long-distance vision",
  10: "career, reputation, and visible purpose",
  11: "friends, networks, and future goals",
  12: "rest, healing, and spiritual integration"
};
const STUDY_HINTS = [
  "Journal one real event this week tied to this house and note your first reaction.",
  "Write two choices you can make this week to express this house more consciously.",
  "Track where this theme shows up in conflict, work, and close relationships.",
  "Ask: what pattern here is helpful, and what pattern here needs boundaries?",
  "Rate this area 1-10 today, then pick one tiny action to improve it by 1 point.",
  "Describe this house in one sentence, then test that sentence against your real week.",
  "Notice what triggers this house; then pause 10 seconds before responding next time."
];

const PLANET_IDS = {
  Sun: swisseph.SE_SUN,
  Moon: swisseph.SE_MOON,
  Mercury: swisseph.SE_MERCURY,
  Venus: swisseph.SE_VENUS,
  Mars: swisseph.SE_MARS,
  Jupiter: swisseph.SE_JUPITER,
  Saturn: swisseph.SE_SATURN
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const LAT_LONG_RE = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;
const LAT_LONG_CARDINAL_RE = /^\s*([+-]?\d+(?:\.\d+)?)\s*°?\s*([NnSs])?\s*,\s*([+-]?\d+(?:\.\d+)?)\s*°?\s*([EeWw])?\s*$/;
const LOCAL_LOCATION_FALLBACKS = {
  "fort pierce, fl": { displayName: "Fort Pierce, Florida, United States", latitude: 27.4467, longitude: -80.3256 },
  "fort pierce, florida": { displayName: "Fort Pierce, Florida, United States", latitude: 27.4467, longitude: -80.3256 },
  "ft pierce, fl": { displayName: "Fort Pierce, Florida, United States", latitude: 27.4467, longitude: -80.3256 },
  "ft pierce, florida": { displayName: "Fort Pierce, Florida, United States", latitude: 27.4467, longitude: -80.3256 },
  "fort pierce south, fl": { displayName: "Fort Pierce South, Florida, United States", latitude: 27.3848, longitude: -80.3473 },
  "fort pierce south, florida": { displayName: "Fort Pierce South, Florida, United States", latitude: 27.3848, longitude: -80.3473 },
  "fort pierce south fl": { displayName: "Fort Pierce South, Florida, United States", latitude: 27.3848, longitude: -80.3473 },
  "fort pierce fl": { displayName: "Fort Pierce, Florida, United States", latitude: 27.4467, longitude: -80.3256 }
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeLongitude(value) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function signFromLongitude(longitude) {
  return SIGNS[Math.floor(normalizeLongitude(longitude) / 30)];
}

function toDegreeMinute(longitude) {
  const degreeInSign = normalizeLongitude(longitude) % 30;
  const degree = Math.floor(degreeInSign);
  const minute = Math.round((degreeInSign - degree) * 60);
  const fixedMinute = minute === 60 ? 0 : minute;
  const fixedDegree = minute === 60 ? degree + 1 : degree;
  return `${fixedDegree.toString().padStart(2, "0")}°${fixedMinute.toString().padStart(2, "0")}`;
}

function parseDate(dateText) {
  if (!DATE_RE.test(dateText)) {
    throw new Error("`date` must use YYYY-MM-DD format.");
  }

  const [yearText, monthText, dayText] = dateText.split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);

  const maxDay = new Date(year, month, 0).getDate();
  if (month < 1 || month > 12 || day < 1 || day > maxDay) {
    throw new Error("`date` is invalid for the selected month/year.");
  }

  return { year, month, day };
}

function parseTime(timeText) {
  if (!TIME_RE.test(timeText)) {
    throw new Error("`time` must use HH:MM in 24-hour format.");
  }

  const [hourText, minuteText] = timeText.split(":");
  const hour = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText, 10);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("`time` is out of range. Use 00:00 to 23:59.");
  }

  return { hour, minute };
}

function parseLatLong(locationInput) {
  const match = LAT_LONG_RE.exec(locationInput);
  const cardinalMatch = LAT_LONG_CARDINAL_RE.exec(locationInput);
  if (!match && !cardinalMatch) {
    return null;
  }

  let latitude;
  let longitude;
  if (match) {
    latitude = Number.parseFloat(match[1]);
    longitude = Number.parseFloat(match[2]);
  } else {
    latitude = Number.parseFloat(cardinalMatch[1]);
    longitude = Number.parseFloat(cardinalMatch[3]);
    const latCardinal = (cardinalMatch[2] || "").toUpperCase();
    const lonCardinal = (cardinalMatch[4] || "").toUpperCase();

    if (latCardinal === "N" || latCardinal === "S") {
      latitude = Math.abs(latitude) * (latCardinal === "S" ? -1 : 1);
    }
    if (lonCardinal === "E" || lonCardinal === "W") {
      longitude = Math.abs(longitude) * (lonCardinal === "W" ? -1 : 1);
    }
  }

  if (latitude < -90 || latitude > 90) {
    throw new Error("Latitude must be between -90 and 90.");
  }

  if (longitude < -180 || longitude > 180) {
    throw new Error("Longitude must be between -180 and 180.");
  }

  return { latitude, longitude };
}

function normalizeLocationLookupKey(locationInput) {
  return (locationInput || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .replace(/^ft\b/, "fort")
    .replace(/\s*,\s*/g, ",")
    .replace(/,\s*/g, ", ");
}

function buildLocationQueryVariants(locationInput) {
  const base = (locationInput || "").trim();
  if (!base) {
    return [];
  }

  const variants = new Set([base]);
  const normalized = base.replace(/\s+/g, " ").trim();
  variants.add(normalized);

  const hasCountry = /\b(usa|united states|us)\b/i.test(base);
  const looksLikeUsCityState = /,\s*[A-Za-z]{2}$/.test(base) || /,\s*[A-Za-z\s]+,\s*[A-Za-z]{2}$/.test(base);
  if (!hasCountry && looksLikeUsCityState) {
    variants.add(`${normalized}, USA`);
    variants.add(`${normalized}, United States`);
  }

  if (!hasCountry && !normalized.includes(",")) {
    variants.add(`${normalized}, USA`);
  }

  return [...variants];
}

async function fetchJsonWithRetry(url, options = {}, retries = 2, timeoutMs = 10000) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!response.ok) {
        if (attempt === retries) {
          return null;
        }
        continue;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeout);
      if (attempt === retries) {
        return null;
      }
    }
  }

  return null;
}

async function geocodeCity(locationInput, userAgent, openCageApiKey = "", googleMapsApiKey = "") {
  const localFallback = geocodeFromLocalFallback(locationInput);
  if (localFallback) {
    return localFallback;
  }

  const variants = buildLocationQueryVariants(locationInput);
  for (const query of variants) {
    const nominatimResult = await geocodeWithNominatim(query, userAgent);
    if (nominatimResult) {
      return nominatimResult;
    }

    const mapsCoResult = await geocodeWithMapsCo(query);
    if (mapsCoResult) {
      return mapsCoResult;
    }

    const openCageResult = await geocodeWithOpenCage(query, openCageApiKey);
    if (openCageResult) {
      return openCageResult;
    }

    const googleResult = await geocodeWithGoogle(query, googleMapsApiKey);
    if (googleResult) {
      return googleResult;
    }

    const openMeteoResult = await geocodeWithOpenMeteo(query);
    if (openMeteoResult) {
      return openMeteoResult;
    }
  }

  throw new Error("Unknown location or lookup service unavailable. Try a more specific city/state or use lat,long (example: 27.4467,-80.3256).");
}

async function geocodeWithNominatim(locationInput, userAgent) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", locationInput);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  const results = await fetchJsonWithRetry(url, {
    headers: {
      "User-Agent": userAgent || "SKUOwlBirthchartBot/1.0",
      Accept: "application/json"
    }
  });
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  const first = results[0];
  return {
    displayName: first.display_name,
    latitude: Number.parseFloat(first.lat),
    longitude: Number.parseFloat(first.lon)
  };
}

async function geocodeWithOpenMeteo(locationInput) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", locationInput);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const payload = await fetchJsonWithRetry(url, {
    headers: { Accept: "application/json" }
  });
  if (!payload || !Array.isArray(payload.results) || payload.results.length === 0) {
    return null;
  }

  const first = payload.results[0];
  const segments = [first.name, first.admin1, first.country].filter(Boolean);

  return {
    displayName: segments.join(", "),
    latitude: Number.parseFloat(first.latitude),
    longitude: Number.parseFloat(first.longitude)
  };
}

async function geocodeWithMapsCo(locationInput) {
  const url = new URL("https://geocode.maps.co/search");
  url.searchParams.set("q", locationInput);
  url.searchParams.set("limit", "1");

  const payload = await fetchJsonWithRetry(url, {
    headers: { Accept: "application/json" }
  });
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const first = payload[0];
  if (!first || first.lat == null || first.lon == null) {
    return null;
  }

  return {
    displayName: first.display_name || locationInput,
    latitude: Number.parseFloat(first.lat),
    longitude: Number.parseFloat(first.lon)
  };
}

async function geocodeWithOpenCage(locationInput, openCageApiKey) {
  if (!openCageApiKey) {
    return null;
  }

  const url = new URL("https://api.opencagedata.com/geocode/v1/json");
  url.searchParams.set("q", locationInput);
  url.searchParams.set("key", openCageApiKey);
  url.searchParams.set("limit", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("no_annotations", "1");

  const payload = await fetchJsonWithRetry(url, {
    headers: { Accept: "application/json" }
  });
  if (!payload || !Array.isArray(payload.results) || payload.results.length === 0) {
    return null;
  }

  const first = payload.results[0];
  if (!first.geometry) {
    return null;
  }

  return {
    displayName: first.formatted || locationInput,
    latitude: Number.parseFloat(first.geometry.lat),
    longitude: Number.parseFloat(first.geometry.lng)
  };
}

async function geocodeWithGoogle(locationInput, googleMapsApiKey) {
  if (!googleMapsApiKey) {
    return null;
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", locationInput);
  url.searchParams.set("key", googleMapsApiKey);

  const payload = await fetchJsonWithRetry(url, {
    headers: { Accept: "application/json" }
  });
  if (!payload || !Array.isArray(payload.results) || payload.results.length === 0) {
    return null;
  }

  const first = payload.results[0];
  if (!first.geometry || !first.geometry.location) {
    return null;
  }

  return {
    displayName: first.formatted_address || locationInput,
    latitude: Number.parseFloat(first.geometry.location.lat),
    longitude: Number.parseFloat(first.geometry.location.lng)
  };
}

function geocodeFromLocalFallback(locationInput) {
  const key = normalizeLocationLookupKey(locationInput);
  return LOCAL_LOCATION_FALLBACKS[key] || LOCAL_LOCATION_FALLBACKS[key.replace(",", "")] || null;
}

async function resolveLocation(locationInput, userAgent, openCageApiKey = "", googleMapsApiKey = "") {
  const trimmed = (locationInput || "").trim();
  if (!trimmed) {
    throw new Error("`location` is required. Use city/state or lat,long.");
  }

  const latLong = parseLatLong(trimmed);
  if (latLong) {
    return {
      displayName: `${latLong.latitude.toFixed(4)}, ${latLong.longitude.toFixed(4)}`,
      latitude: latLong.latitude,
      longitude: latLong.longitude
    };
  }

  return geocodeCity(trimmed, userAgent, openCageApiKey, googleMapsApiKey);
}

function resolveTimezone(latitude, longitude) {
  try {
    const timezoneName = tzLookup(latitude, longitude);
    if (!timezoneName) {
      throw new Error("missing timezone");
    }

    return timezoneName;
  } catch (error) {
    throw new Error("Could not determine timezone for that location. Try a nearby city or lat,long.");
  }
}

function resolveTimezoneOverride(timezoneOverride, latitude, longitude) {
  const override = (timezoneOverride || "").trim();
  if (!override) {
    return {
      timezoneName: resolveTimezone(latitude, longitude),
      warning: null
    };
  }

  try {
    Temporal.ZonedDateTime.from({
      year: 2026,
      month: 1,
      day: 1,
      hour: 12,
      minute: 0,
      second: 0,
      millisecond: 0,
      microsecond: 0,
      nanosecond: 0,
      timeZone: override
    }, { disambiguation: "compatible" });
  } catch (error) {
    return {
      timezoneName: resolveTimezone(latitude, longitude),
      warning: "`timezone` override was invalid, so I used timezone from location."
    };
  }

  return {
    timezoneName: override,
    warning: null
  };
}

function resolveUtcDate(dateText, timeText, timezoneName) {
  const { year, month, day } = parseDate(dateText);
  const { hour, minute } = parseTime(timeText);

  let plainDateTime;
  try {
    plainDateTime = new Temporal.PlainDateTime(year, month, day, hour, minute, 0, 0, 0, 0);
  } catch (error) {
    throw new Error("Date/time parsing failed. Please verify values.");
  }

  if (Temporal.TimeZone && typeof Temporal.TimeZone.from === "function") {
    let zone;
    try {
      zone = Temporal.TimeZone.from(timezoneName);
    } catch (error) {
      throw new Error("Timezone conversion failed for this location.");
    }

    const possibleInstants = zone.getPossibleInstantsFor(plainDateTime);
    if (possibleInstants.length === 0) {
      throw new Error("That local time does not exist due to DST. Choose a nearby valid time.");
    }

    const ambiguous = possibleInstants.length > 1;
    const chosenInstant = possibleInstants[0];
    const utcDate = new Date(chosenInstant.epochMilliseconds);

    return {
      utcDate,
      timezoneNote: ambiguous
        ? "DST note: this local time is ambiguous; I used the earlier occurrence."
        : null
    };
  }

  return resolveUtcDateWithZonedDateTime({ year, month, day, hour, minute, timezoneName });
}

function resolveUtcDateWithZonedDateTime({ year, month, day, hour, minute, timezoneName }) {
  const fields = { year, month, day, hour, minute, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0, timeZone: timezoneName };

  try {
    const exact = Temporal.ZonedDateTime.from(fields, { disambiguation: "reject" });
    return {
      utcDate: new Date(exact.epochMilliseconds),
      timezoneNote: null
    };
  } catch (error) {
    let earlier;
    let later;
    let compatible;

    try {
      earlier = Temporal.ZonedDateTime.from(fields, { disambiguation: "earlier" });
      later = Temporal.ZonedDateTime.from(fields, { disambiguation: "later" });
      compatible = Temporal.ZonedDateTime.from(fields, { disambiguation: "compatible" });
    } catch (fallbackError) {
      throw new Error("Timezone conversion failed for this location.");
    }

    const sameWallClock = (
      compatible.year === year &&
      compatible.month === month &&
      compatible.day === day &&
      compatible.hour === hour &&
      compatible.minute === minute
    );

    if (!sameWallClock) {
      throw new Error("That local time does not exist due to DST. Choose a nearby valid time.");
    }

    const ambiguous = earlier.epochMilliseconds !== later.epochMilliseconds;
    if (!ambiguous) {
      return {
        utcDate: new Date(compatible.epochMilliseconds),
        timezoneNote: null
      };
    }

    return {
      utcDate: new Date(earlier.epochMilliseconds),
      timezoneNote: "DST note: this local time is ambiguous; I used the earlier occurrence."
    };
  }
}

function extractHouseCusps(houseData) {
  if (!houseData || houseData.error) {
    throw new Error(houseData && houseData.error
      ? `House calculation failed: ${houseData.error}`
      : "House calculation failed.");
  }

  if (!Array.isArray(houseData.house)) {
    throw new Error("House calculation returned unexpected data.");
  }

  const list = houseData.house;
  const cusps = list.length >= 13 ? list.slice(1, 13) : list.slice(0, 12);
  if (cusps.length !== 12) {
    throw new Error("House calculation returned incomplete cusp data.");
  }

  return cusps.map(normalizeLongitude);
}

function angleDistance(start, end) {
  return (normalizeLongitude(end) - normalizeLongitude(start) + 360) % 360;
}

function houseForPlacidus(longitude, cusps) {
  const lon = normalizeLongitude(longitude);

  for (let idx = 0; idx < 12; idx += 1) {
    const start = cusps[idx];
    const end = cusps[(idx + 1) % 12];

    const arcTotal = angleDistance(start, end);
    const arcToPoint = angleDistance(start, lon);

    if (arcToPoint < arcTotal || Math.abs(arcToPoint - arcTotal) < 1e-9) {
      return idx + 1;
    }
  }

  return 12;
}

function houseForWholeSign(longitude, ascendantLongitude) {
  const planetSign = Math.floor(normalizeLongitude(longitude) / 30);
  const ascSign = Math.floor(normalizeLongitude(ascendantLongitude) / 30);
  return ((planetSign - ascSign + 12) % 12) + 1;
}

function getPlanetLongitude(julianDayUT, planetId, flags) {
  const result = swisseph.swe_calc_ut(julianDayUT, planetId, flags);
  if (result && !result.error) {
    return normalizeLongitude(result.longitude);
  }

  // Fallback if Swiss ephemeris files are missing on host.
  const fallbackFlags = (flags | swisseph.SEFLG_MOSEPH) & ~swisseph.SEFLG_SWIEPH;
  const fallback = swisseph.swe_calc_ut(julianDayUT, planetId, fallbackFlags);
  if (!fallback || fallback.error) {
    throw new Error(result && result.error
      ? `Planet calculation failed: ${result.error}`
      : "Planet calculation failed.");
  }

  return normalizeLongitude(fallback.longitude);
}

function getHouseData(julianDayUT, latitude, longitude, system) {
  if (system === "sidereal") {
    return swisseph.swe_houses_ex(
      julianDayUT,
      swisseph.SEFLG_SIDEREAL,
      latitude,
      longitude,
      "P"
    );
  }

  return swisseph.swe_houses(julianDayUT, latitude, longitude, "P");
}

function normalizeSystem(system) {
  const normalized = (system || "tropical").trim().toLowerCase();
  if (normalized !== "tropical" && normalized !== "sidereal") {
    throw new Error("`system` must be `tropical` or `sidereal`.");
  }

  return normalized;
}

function normalizeHouseSystem(houseSystem) {
  const normalized = (houseSystem || "placidus").trim().toLowerCase();
  if (normalized !== "whole_sign" && normalized !== "placidus") {
    throw new Error("`house_system` must be `whole_sign` or `placidus`.");
  }

  return normalized;
}

function buildWholeSignCusps(ascendantLongitude) {
  const firstCusp = Math.floor(normalizeLongitude(ascendantLongitude) / 30) * 30;
  const cusps = [];
  for (let i = 0; i < 12; i += 1) {
    cusps.push(normalizeLongitude(firstCusp + (i * 30)));
  }

  return cusps;
}

async function calculateBirthchart({
  date,
  time,
  location,
  system = "tropical",
  houseSystem = "placidus",
  timezoneOverride = "",
  nominatimUserAgent = "SKUOwlBirthchartBot/1.0",
  googleMapsApiKey = "",
  openCageApiKey = "",
  swissephPath = ""
}) {
  const normalizedSystem = normalizeSystem(system);
  const normalizedHouseSystem = normalizeHouseSystem(houseSystem);

  const resolvedLocation = await resolveLocation(
    location,
    nominatimUserAgent,
    openCageApiKey,
    googleMapsApiKey
  );
  const timezoneResolved = resolveTimezoneOverride(
    timezoneOverride,
    resolvedLocation.latitude,
    resolvedLocation.longitude
  );
  const timezoneName = timezoneResolved.timezoneName;
  const { utcDate, timezoneNote } = resolveUtcDate(date, time, timezoneName);
  const finalTimezoneNote = [timezoneResolved.warning, timezoneNote].filter(Boolean).join(" ") || null;

  if (swissephPath) {
    swisseph.swe_set_ephe_path(swissephPath);
  }

  if (normalizedSystem === "sidereal") {
    swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);
  }

  let flags = swisseph.SEFLG_SPEED | swisseph.SEFLG_SWIEPH;
  if (normalizedSystem === "sidereal") {
    flags |= swisseph.SEFLG_SIDEREAL;
  }

  const decimalHour = utcDate.getUTCHours() + (utcDate.getUTCMinutes() / 60) + (utcDate.getUTCSeconds() / 3600);
  const julianDayUT = swisseph.swe_julday(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth() + 1,
    utcDate.getUTCDate(),
    decimalHour,
    swisseph.SE_GREG_CAL
  );

  const baseHouseData = getHouseData(
    julianDayUT,
    resolvedLocation.latitude,
    resolvedLocation.longitude,
    normalizedSystem
  );
  const placidusCusps = extractHouseCusps(baseHouseData);
  const ascendantLongitude = normalizeLongitude(baseHouseData.ascendant);
  const mcLongitude = normalizeLongitude(baseHouseData.mc || baseHouseData.midheaven || 0);

  const houseCusps = normalizedHouseSystem === "whole_sign"
    ? buildWholeSignCusps(ascendantLongitude)
    : placidusCusps;

  const houseCuspSigns = houseCusps.map(signFromLongitude);
  const ascendantSign = signFromLongitude(ascendantLongitude);

  const planets = {};
  for (const [name, planetId] of Object.entries(PLANET_IDS)) {
    const longitude = getPlanetLongitude(julianDayUT, planetId, flags);
    const sign = signFromLongitude(longitude);
    const house = normalizedHouseSystem === "whole_sign"
      ? houseForWholeSign(longitude, ascendantLongitude)
      : houseForPlacidus(longitude, houseCusps);

    planets[name] = {
      name,
      longitude,
      sign,
      house,
      degree: toDegreeMinute(longitude)
    };
  }

  const planetsByHouse = {};
  for (let house = 1; house <= 12; house += 1) {
    planetsByHouse[house] = [];
  }

  for (const placement of Object.values(planets)) {
    planetsByHouse[placement.house].push(placement.name);
  }

  for (const names of Object.values(planetsByHouse)) {
    names.sort();
  }

  const chartRulerName = RULER_BY_SIGN[ascendantSign];
  const chartRuler = planets[chartRulerName];

  const personalPlanets = new Set(["Sun", "Moon", "Mercury", "Venus", "Mars"]);
  const dominantHouseStats = new Map();
  for (const placement of Object.values(planets)) {
    const existing = dominantHouseStats.get(placement.house) || { count: 0, weight: 0 };
    existing.count += 1;
    existing.weight += personalPlanets.has(placement.name) ? 2 : 1;
    dominantHouseStats.set(placement.house, existing);
  }

  const dominantHouses = [...dominantHouseStats.entries()]
    .sort((a, b) => {
      if (b[1].count !== a[1].count) {
        return b[1].count - a[1].count;
      }
      if (b[1].weight !== a[1].weight) {
        return b[1].weight - a[1].weight;
      }
      return a[0] - b[0];
    })
    .slice(0, 2)
    .map((entry) => entry[0]);

  const majorAspects = [0, 60, 90, 120, 180];
  const angularDistance = (a, b) => {
    const raw = Math.abs(normalizeLongitude(a) - normalizeLongitude(b));
    return raw > 180 ? 360 - raw : raw;
  };

  const superpowerCandidates = [];
  for (const planetName of ["Sun", "Moon", "Mercury", "Venus", "Mars"]) {
    const placement = planets[planetName];
    for (const target of [
      { key: "Asc", longitude: ascendantLongitude },
      { key: "MC", longitude: mcLongitude }
    ]) {
      for (const aspect of majorAspects) {
        const orb = Math.abs(angularDistance(placement.longitude, target.longitude) - aspect);
        if (orb <= 3) {
          superpowerCandidates.push({
            placement,
            target: target.key,
            aspect,
            orb
          });
        }
      }
    }
  }

  superpowerCandidates.sort((a, b) => a.orb - b.orb);
  const angularHouses = new Set([1, 4, 7, 10]);
  const fallbackSuperpower = ["Sun", "Moon", "Mercury", "Venus", "Mars"]
    .map((name) => planets[name])
    .find((placement) => angularHouses.has(placement.house)) || planets.Sun;
  const superpower = superpowerCandidates.length > 0
    ? {
      ...superpowerCandidates[0].placement,
      reason: `tight ${superpowerCandidates[0].aspect}° aspect to ${superpowerCandidates[0].target} (orb ${superpowerCandidates[0].orb.toFixed(1)}°)`
    }
    : {
      ...fallbackSuperpower,
      reason: "strongest angular personal placement"
    };

  const challenging = [];
  for (const planetName of ["Sun", "Moon", "Mercury", "Venus", "Mars"]) {
    const placement = planets[planetName];
    const saturnDiff = angularDistance(placement.longitude, planets.Saturn.longitude);
    for (const aspect of [90, 180]) {
      const orb = Math.abs(saturnDiff - aspect);
      if (orb <= 4) {
        challenging.push({
          planetName,
          aspect,
          orb
        });
      }
    }
  }

  challenging.sort((a, b) => a.orb - b.orb);
  const mainLesson = challenging.length > 0
    ? {
      ...planets.Saturn,
      reason: `${challenging[0].planetName}-Saturn ${challenging[0].aspect}° challenge (orb ${challenging[0].orb.toFixed(1)}°)`
    }
    : {
      ...planets.Saturn,
      reason: "Saturn placement shows core growth lessons"
    };

  return {
    system: normalizedSystem,
    houseSystem: normalizedHouseSystem,
    input: { date, time, location },
    location: {
      displayName: resolvedLocation.displayName,
      latitude: resolvedLocation.latitude,
      longitude: resolvedLocation.longitude,
      timezoneName
    },
    timezoneNote: finalTimezoneNote,
    utcIso: utcDate.toISOString(),
    julianDayUT,
    ascendant: {
      longitude: ascendantLongitude,
      sign: ascendantSign,
      degree: toDegreeMinute(ascendantLongitude)
    },
    mc: {
      longitude: mcLongitude,
      sign: signFromLongitude(mcLongitude),
      degree: toDegreeMinute(mcLongitude)
    },
    houseCusps,
    houseCuspSigns,
    planets,
    planetsByHouse,
    chartRuler,
    focusHouses: dominantHouses,
    dominantHouses,
    superpower,
    mainLesson
  };
}

function focusZoneText(focusHouses) {
  if (!focusHouses || focusHouses.length === 0) {
    return "House 1";
  }

  if (focusHouses.length === 1) {
    return `House ${focusHouses[0]}`;
  }

  return `Houses ${focusHouses[0]} and ${focusHouses[1]}`;
}

function buildMainFiveItems(chart) {
  const sun = chart.planets.Sun;
  const moon = chart.planets.Moon;
  const focusZone = focusZoneText(chart.focusHouses);
  const focusVerb = chart.focusHouses.length === 1 ? "is" : "are";

  return [
    `🦉✨ Big 3 check: Sun in ${sun.sign} House ${sun.house}, Moon in ${moon.sign} House ${moon.house}, and Rising in ${chart.ascendant.sign}.`,
    `Chart ruler check: ${chart.chartRuler.name} is in ${chart.chartRuler.sign} House ${chart.chartRuler.house}.`,
    `Focus zone: ${focusZone} ${focusVerb} most activated, so themes of ${chart.focusHouses.map((house) => HOUSE_TOPICS[house]).join(", ")} are front and center.`,
    `Superpower placement: ${chart.superpower.name} in ${chart.superpower.sign} House ${chart.superpower.house} is your leverage point; ${chart.superpower.reason}.`,
    `Main lesson placement: ${chart.mainLesson.name} in ${chart.mainLesson.sign} House ${chart.mainLesson.house} is your growth edge; ${chart.mainLesson.reason}.`
  ];
}

function buildMainFiveSentences(chart) {
  return buildMainFiveItems(chart).join(" ");
}

function buildKeyPlacementsQuick(chart) {
  const sun = chart.planets.Sun;
  const moon = chart.planets.Moon;
  const mercury = chart.planets.Mercury;
  const venus = chart.planets.Venus;
  const mars = chart.planets.Mars;

  return [
    "**Key placements (quick)**",
    `- Sun: ${sun.sign} ${sun.degree} (House ${sun.house})`,
    `- Moon: ${moon.sign} ${moon.degree} (House ${moon.house})`,
    `- Rising: ${chart.ascendant.sign} ${chart.ascendant.degree}`,
    `- Mercury: ${mercury.sign} ${mercury.degree} (House ${mercury.house})`,
    `- Venus: ${venus.sign} ${venus.degree} (House ${venus.house})`,
    `- Mars: ${mars.sign} ${mars.degree} (House ${mars.house})`,
    `- Chart ruler: ${chart.chartRuler.name} in ${chart.chartRuler.sign} ${chart.chartRuler.degree} (House ${chart.chartRuler.house})`
  ].join("\n");
}

function buildHouseCuspsSection(chart) {
  const lines = ["**House cusps (1-12)**"];
  for (let i = 0; i < chart.houseCuspSigns.length; i += 1) {
    lines.push(`- House ${i + 1}: ${chart.houseCuspSigns[i]}`);
  }

  return lines.join("\n");
}

function buildPlanetsInHousesSection(chart) {
  const lines = ["**Planets in houses**"];
  for (let house = 1; house <= 12; house += 1) {
    const names = chart.planetsByHouse[house];
    lines.push(`- House ${house}: ${names && names.length > 0 ? names.join(", ") : "None"}`);
  }

  return lines.join("\n");
}

function buildHousesMeaningSection(chart) {
  const lines = ["**Houses**"];

  for (let house = 1; house <= 12; house += 1) {
    const sign = chart.houseCuspSigns[house - 1];
    const planets = chart.planetsByHouse[house];
    lines.push(`${house}. ${sign} on the cusp brings ${SIGN_STYLE[sign]} energy to ${HOUSE_TOPICS[house]}.`);

    if (planets && planets.length > 0) {
      lines.push(`Planets here: ${planets.join(", ")}. This house is active, so those themes are amplified in your day-to-day life.`);
    } else {
      lines.push("No major planets here at birth, so this house develops more through timing, choices, and life practice.");
    }

    lines.push("");
  }

  return lines.join("\n").trim();
}

function styleIntro(languageStyle) {
  if ((languageStyle || "").trim().toLowerCase() === "sku owl chill") {
    return "SKU Owl chill mode is on: calm, clear, supportive, and practical.";
  }

  return "SKU Owl mode is on: calm, clear, supportive, and practical.";
}

function normalizeReadingTier(tier) {
  const normalized = (tier || "").trim().toLowerCase();
  if (normalized === "tier1" || normalized === "newbie") {
    return "tier1";
  }
  if (normalized === "tier2") {
    return "tier2";
  }
  if (normalized === "tier3" || normalized === "seasoned") {
    return "tier3";
  }
  if (normalized === "astrologist" || normalized === "junior astrologist") {
    return "tier3";
  }

  return "tier3";
}

function formatBirthchartMessage(chart, languageStyle = "SKU Owl chill", fullName = "") {
  const mainInfo = buildMainFiveSentences(chart);
  const readingForLine = (fullName || "").trim()
    ? `Reading for: ${fullName.trim()}.`
    : null;

  const locationLine = [
    `Location used: ${chart.location.displayName}`,
    `Timezone: ${chart.location.timezoneName}`,
    `System: ${chart.system}`,
    `House system: ${chart.houseSystem}`
  ].join(" | ") + ".";

  const sections = [
    mainInfo,
    styleIntro(languageStyle),
    readingForLine,
    chart.timezoneNote ? `${locationLine}\n${chart.timezoneNote}` : locationLine,
    buildKeyPlacementsQuick(chart),
    buildHouseCuspsSection(chart),
    buildPlanetsInHousesSection(chart),
    buildHousesMeaningSection(chart),
    "Disclaimer: This reading is for educational and self-reflection use only, not medical or mental health care. If you are in crisis or thinking about self-harm, call or text 988 (US/Canada) or your local emergency services right now."
  ];

  return sections.filter(Boolean).join("\n\n");
}

function buildPersonalReadingSummary(chart, fullName = "") {
  const studentName = (fullName || "").trim() || "Not provided";
  const focusZone = focusZoneText(chart.focusHouses);
  const focusThemes = (chart.focusHouses || [])
    .map((house) => HOUSE_TOPICS[house])
    .filter(Boolean)
    .join(" | ");

  return [
    `Student: ${studentName}`,
    `Birth input: ${chart.input.date} ${chart.input.time}`,
    `Birth location: ${chart.location.displayName} (${chart.location.timezoneName})`,
    `System: ${chart.system} | House system: ${chart.houseSystem}`,
    `Big 3: Sun ${chart.planets.Sun.sign} H${chart.planets.Sun.house}, Moon ${chart.planets.Moon.sign} H${chart.planets.Moon.house}, Rising ${chart.ascendant.sign}`,
    `Chart ruler: ${chart.chartRuler.name} in ${chart.chartRuler.sign} H${chart.chartRuler.house}`,
    `Focus zone: ${focusZone}${focusThemes ? ` (${focusThemes})` : ""}`,
    `Superpower: ${chart.superpower.name} in ${chart.superpower.sign} H${chart.superpower.house}`,
    `Main lesson: ${chart.mainLesson.name} in ${chart.mainLesson.sign} H${chart.mainLesson.house}`,
    `Chart generated (UTC): ${chart.utcIso}`
  ].join("\n");
}

function buildBirthchartHtmlReport(
  chart,
  {
    languageStyle = "SKU Owl chill",
    tier = "tier3",
    fullName = "",
    numerology = null,
    disclaimer = "",
    brandLogoUrl = "",
    calendlyUrl = ""
  } = {}
) {
  const reportTier = normalizeReadingTier(tier);
  const isNewbie = reportTier === "tier1";
  const isTier2 = reportTier === "tier2";
  const isSeasoned = reportTier === "tier3";
  const bookingUrl = "https://calendly.com/kervinheart/astrology-soul-blueprint-session?back=1&month=2026-02";
  const displayName = (fullName || "").trim() || "Student";
  const mainFive = buildMainFiveItems(chart);
  const toneLabel = (languageStyle || "").trim().toLowerCase() === "sku owl chill"
    ? "SKU Owl chill"
    : "SKU Owl";
  const logoUrl = (brandLogoUrl || "").trim();
  const allKeyPlacements = [
    ["Sun", chart.planets.Sun],
    ["Moon", chart.planets.Moon],
    ["Rising", chart.ascendant],
    ["Mercury", chart.planets.Mercury],
    ["Venus", chart.planets.Venus],
    ["Mars", chart.planets.Mars],
    ["Chart Ruler", chart.chartRuler]
  ];
  const keyPlacements = isNewbie
    ? allKeyPlacements.slice(0, 3)
    : allKeyPlacements;

  const keyPlacementCards = keyPlacements.map(([label, placement]) => `
    <article class="card">
      <h3>${escapeHtml(label)}</h3>
      <p><strong>${escapeHtml(placement.sign)}</strong> ${escapeHtml(placement.degree)}</p>
      <p>${Number.isFinite(placement.house) ? `House ${placement.house}` : "Angle"}</p>
    </article>
  `).join("");

  const houseData = Array.from({ length: 12 }, (_, i) => {
    const house = i + 1;
    const sign = chart.houseCuspSigns[i];
    const planets = chart.planetsByHouse[house] || [];
    const topic = HOUSE_TOPICS[house];
    return { house, sign, planets, topic };
  });

  const houseKeyButtons = houseData.map((item) => `
    <button type="button" class="house-key-btn" data-house="${item.house}">
      H${item.house}: ${escapeHtml(item.sign)}
    </button>
  `).join("");

  const housesBlocks = Array.from({ length: 12 }, (_, i) => {
    const house = i + 1;
    const sign = chart.houseCuspSigns[i];
    const planets = chart.planetsByHouse[house] || [];
    const planetsText = planets.length > 0 ? planets.join(", ") : "None";
    const blend = planets.length > 0
      ? `${sign} on House ${house} adds a ${SIGN_STYLE[sign]} tone to ${HOUSE_TOPICS[house]}. With ${planets.join(", ")} here, this area is active and visible in daily choices.`
      : `${sign} on House ${house} adds a ${SIGN_STYLE[sign]} tone to ${HOUSE_TOPICS[house]}. No major natal planets here means this area grows through steady attention and life timing.`;
    const tip = STUDY_HINTS[(house + chart.mainLesson.house) % STUDY_HINTS.length];
    const researchQuery = encodeURIComponent(`${sign} in house ${house} astrology meaning`);
    const applyQuery = encodeURIComponent(`how to apply house ${house} ${sign} astrology in daily life`);

    return `
      <article class="house-card" id="house-card-${house}" data-house-card="${house}">
        <h3>House ${house}: ${escapeHtml(sign)}</h3>
        <p>${escapeHtml(blend)}</p>
        <p><strong>Planets:</strong> ${escapeHtml(planetsText)}</p>
        <p class="tip"><strong>Hint:</strong> ${escapeHtml(tip)}</p>
        <p class="research-links">
          <a href="https://www.google.com/search?q=${researchQuery}" target="_blank" rel="noopener noreferrer">Research this house meaning</a>
          <span> | </span>
          <a href="https://www.google.com/search?q=${applyQuery}" target="_blank" rel="noopener noreferrer">Apply this in daily life</a>
        </p>
      </article>
    `;
  }).join("");

  const numerologySection = numerology && Array.isArray(numerology.items) && numerology.items.length > 0
    ? numerology.items.map((item) => `
      <article class="card">
        <h3>${escapeHtml(item.label)}</h3>
        <p><strong>${escapeHtml(String(item.value))}</strong></p>
        <p>${escapeHtml(item.meaning)}</p>
      </article>
    `).join("")
    : `
      <article class="card">
        <h3>Numerology Preview</h3>
        <p><strong>{{lifePathNumber}}</strong></p>
        <p>{{lifePathMeaning}}</p>
      </article>
    `;

  const locationLine = [
    `Location: ${chart.location.displayName}`,
    `Timezone: ${chart.location.timezoneName}`,
    `System: ${chart.system}`,
    `House system: ${chart.houseSystem}`
  ].join(" | ");

  const timezoneNoteBlock = chart.timezoneNote
    ? `<p class="note">${escapeHtml(chart.timezoneNote)}</p>`
    : "";

  const tierLabel = isNewbie
    ? "tier1 newbie"
    : (isTier2 ? "tier2 junior astrologist" : "tier3 astrologist");

  const newbieGuideSection = isNewbie ? `
    <section class="panel">
      <h2>How To Read Your Big 3 (Newbie Guide)</h2>
      <p><strong>Step 1: Sun</strong> shows how you build confidence and purpose. Track where your Sun sign themes show up in work and goals this week.</p>
      <p><strong>Step 2: Moon</strong> shows emotional needs and regulation patterns. Track your Moon house during stress and recovery moments.</p>
      <p><strong>Step 3: Rising</strong> shows first style and approach. Notice how people read you before you explain yourself.</p>
      <p><strong>Apply it daily:</strong> Pick one Big-3 placement per day and write one behavior change you can test in real life.</p>
    </section>
  ` : "";

  const housesGuideSection = (isTier2 || isSeasoned) ? `
    <section class="panel">
      <h2>How To Read The Houses (Apply To Self)</h2>
      <p>Each house shows a life area. Read in this order: cusp sign → planets in house → one behavior to test this week.</p>
      <p>Use the wheel/key to jump by house, then use “Research” and “Apply” links under each house card.</p>
    </section>
  ` : "";

  const advancedSection = isSeasoned ? `
    <section class="panel">
      <h2>Seasoned Practitioner Layer</h2>
      <p><strong>Chart ruler protocol:</strong> Start with Asc sign ruler (${escapeHtml(chart.chartRuler.name)}), then track that planet’s sign (${escapeHtml(chart.chartRuler.sign)}) and house (${chart.chartRuler.house}) as the core operating thread.</p>
      <p><strong>Dominant houses:</strong> ${escapeHtml(focusZoneText(chart.focusHouses))}. Use these as your priority training zones for decisions, timing, and mentoring others.</p>
      <p><strong>Integration:</strong> Pair superpower (${escapeHtml(chart.superpower.name)} H${chart.superpower.house}) with lesson (${escapeHtml(chart.mainLesson.name)} H${chart.mainLesson.house}) to avoid blind spots while guiding others.</p>
    </section>
  ` : "";

  const reflectionPrompts = isNewbie
    ? [
      "Where did I act most like my Rising sign today, and what was the outcome?",
      "What emotion did my Moon house highlight this week, and how did I respond?",
      "What one Sun-sign behavior can I practice tomorrow with intention?"
    ]
    : (isTier2
      ? [
        "Which house is most activated right now, and what real-life pattern proves it?",
        "Where am I over-identifying with one placement and ignoring balance?",
        "What boundary or routine would align this chart theme with healthier action?"
      ]
      : [
        "How does my chart ruler strategy appear in leadership, conflict, and service?",
        "Which superpower placement can I teach responsibly without overpromising outcomes?",
        "What is the clearest Saturn-based growth edge I can operationalize this month?"
      ]);
  const reflectionPromptsSection = `
    <section class="panel">
      <h2>Owl Reflection Prompts</h2>
      <p>Use one prompt daily for internal dialogue, then write one concrete action step.</p>
      <ul class="prompt-list">
        ${reflectionPrompts.map((prompt) => `<li>${escapeHtml(prompt)}</li>`).join("")}
      </ul>
    </section>
  `;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SKU Owl Astrology + Numerology Report</title>
  <style>
    :root {
      --bg: #f5f7fb;
      --surface: #ffffff;
      --ink: #1f2937;
      --muted: #4b5563;
      --line: #dbe3ef;
      --accent: #1f6feb;
      --accent-ink: #ffffff;
      --cta-bg: #fff5e9;
      --safe-bg: #f8fafc;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.55;
    }
    a { color: var(--accent); }
    .container {
      width: min(980px, 100%);
      margin: 0 auto;
      padding: 18px 14px 110px;
    }
    .panel {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 14px;
      margin-bottom: 12px;
    }
    h1, h2, h3 {
      margin: 0 0 8px;
    }
    h1 { font-size: clamp(1.3rem, 1.8vw, 1.75rem); }
    h2 { font-size: clamp(1.05rem, 1.4vw, 1.25rem); margin-top: 2px; }
    h3 { font-size: 1rem; }
    p { margin: 6px 0; color: var(--muted); }
    .expectation {
      font-size: 0.95rem;
      color: var(--ink);
      background: #eef6ff;
      border-left: 4px solid var(--accent);
      padding: 10px 12px;
      border-radius: 8px;
    }
    .snapshot-list {
      margin: 8px 0 0 20px;
      padding: 0;
    }
    .snapshot-list li {
      margin: 8px 0;
      color: var(--ink);
    }
    .note {
      color: #7c2d12;
      font-size: 0.92rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 10px;
      margin-top: 8px;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 10px;
      background: #fff;
    }
    .wheel-wrap {
      display: grid;
      gap: 12px;
      grid-template-columns: 1fr;
      margin-top: 10px;
    }
    .wheel-canvas {
      display: flex;
      justify-content: center;
      align-items: center;
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 10px;
    }
    .wheel-canvas svg {
      width: min(560px, 100%);
      height: auto;
    }
    .house-segment {
      cursor: pointer;
      transition: opacity 0.15s ease, stroke-width 0.15s ease;
      opacity: 0.88;
    }
    .house-segment:hover { opacity: 1; }
    .house-segment.active {
      stroke: #111827 !important;
      stroke-width: 2;
      opacity: 1;
    }
    .house-key {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .house-key-btn {
      border: 1px solid var(--line);
      background: #f8fbff;
      border-radius: 999px;
      padding: 6px 10px;
      cursor: pointer;
      color: var(--ink);
      font-size: 0.9rem;
    }
    .house-key-btn.active {
      background: #e5f0ff;
      border-color: #9fc2ff;
    }
    .cta-priority {
      background: var(--cta-bg);
      border: 1px solid #f7d8b0;
      border-radius: 12px;
      padding: 12px;
      margin-top: 10px;
    }
    .btn {
      display: inline-block;
      text-decoration: none;
      background: var(--accent);
      color: var(--accent-ink);
      padding: 10px 14px;
      border-radius: 10px;
      font-weight: 600;
      margin-top: 8px;
    }
    .house-card {
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 10px;
      margin-top: 8px;
      background: #fff;
      scroll-margin-top: 24px;
    }
    .house-card.active {
      border-color: #8bb3ff;
      box-shadow: 0 0 0 2px rgba(31, 111, 235, 0.12);
    }
    .tip {
      font-size: 0.93rem;
      padding: 8px;
      border-left: 3px solid var(--accent);
      background: #f8fbff;
      border-radius: 6px;
    }
    .research-links {
      margin-top: 8px;
      font-size: 0.9rem;
    }
    .cta-link {
      margin-top: 10px;
      font-weight: 600;
    }
    .book-section {
      background: #eef8f0;
      border: 1px solid #cde6d2;
    }
    .safety {
      background: var(--safe-bg);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 12px;
    }
    .safety ul {
      margin: 8px 0 0 20px;
      padding: 0;
    }
    .report-end {
      margin-top: 14px;
      font-size: 0.9rem;
      color: var(--muted);
    }
    .brand-notice {
      margin-top: 8px;
      font-size: 0.88rem;
      color: #374151;
      background: #fff8e8;
      border: 1px solid #f3dfb7;
      border-radius: 8px;
      padding: 8px 10px;
    }
    .brand-head {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }
    .brand-logo {
      width: clamp(64px, 10vw, 90px);
      height: clamp(64px, 10vw, 90px);
      object-fit: contain;
      border-radius: 12px;
      border: 1px solid var(--line);
      background: #fff;
      padding: 4px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
    }
    .prompt-list {
      margin: 8px 0 0 20px;
      padding: 0;
      display: grid;
      gap: 8px;
    }
    .prompt-list li {
      color: var(--ink);
      background: #f8fbff;
      border: 1px solid #d8e9ff;
      border-radius: 8px;
      padding: 8px 10px;
      list-style-position: outside;
    }
    .sticky-footer {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      background: #0f172a;
      color: #e5e7eb;
      border-top: 1px solid #334155;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      z-index: 999;
    }
    .sticky-footer .btn {
      margin: 0;
      background: #22c55e;
      color: #0b1220;
    }
    @media (max-width: 640px) {
      .container {
        padding: 12px 10px 120px;
      }
      .panel {
        padding: 12px;
      }
      .btn {
        width: 100%;
        text-align: center;
      }
      .sticky-footer {
        flex-direction: column;
        align-items: stretch;
      }
      .sticky-footer .btn {
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <main class="container">
    <section class="panel">
      <div class="brand-head">
        ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Kervin Heart brand logo" class="brand-logo">` : ""}
        <h1>SKU Owl Astrology + Numerology Report 🦉✨</h1>
      </div>
      <p><strong>Brand:</strong> SKU Owl™ by Kervin Heart LLC</p>
      <p><strong>Report tier:</strong> ${escapeHtml(tierLabel)}</p>
      <p><strong>Reading for:</strong> ${escapeHtml(displayName)} <!-- {{fullName}} --></p>
      <p><strong>Tone:</strong> ${escapeHtml(toneLabel)} <!-- {{languageStyle}} --></p>
      <p class="expectation">This report is designed to give you insight without back-and-forth messages. If you want personal guidance, use the booking link included in this report.</p>
      <p class="brand-notice">Trademark Notice: SKU Owl™, Self Knowledge University™, and related SKU marks are proprietary brand assets of Kervin Heart LLC. Unauthorized commercial use, copying, or resale is prohibited.</p>
      <p>${escapeHtml(locationLine)} <!-- {{locationDisplay}} {{timezoneName}} {{system}} {{houseSystem}} --></p>
      ${timezoneNoteBlock}
    </section>

    <section class="panel">
      <h2>Your Birth Chart Snapshot</h2>
      <ol class="snapshot-list">
        <li>${escapeHtml(mainFive[0])} <!-- {{sunSign}} {{sunHouse}} {{moonSign}} {{moonHouse}} {{risingSign}} --></li>
        <li>${escapeHtml(mainFive[1])} <!-- {{chartRulerPlanet}} {{chartRulerSign}} {{chartRulerHouse}} --></li>
        <li>${escapeHtml(mainFive[2])} <!-- {{dominantHouse1}} {{dominantHouse2}} --></li>
        <li>${escapeHtml(mainFive[3])} <!-- {{superpowerPlacement}} --></li>
        <li>${escapeHtml(mainFive[4])} <!-- {{lessonPlacement}} --></li>
      </ol>

      <div class="cta-priority">
        <p>If you want this chart translated into a practical, personal plan, book your session and we will walk through it together calmly and clearly.</p>
        <a class="btn" href="${escapeHtml(bookingUrl)}" target="_blank" rel="noopener noreferrer">Book Your Astrology Soul Blueprint Session</a>
      </div>
    </section>

    <section class="panel">
      <h2>Key Placements (Quick)</h2>
      <div class="grid">${keyPlacementCards}</div>
    </section>

    ${newbieGuideSection}

    ${(isTier2 || isSeasoned) ? `<section class="panel">
      <h2>Interactive House Wheel & Key</h2>
      <p>Tap a house on the wheel or key to highlight it, jump to your meaning, and use linked research/application resources.</p>
      <div class="wheel-wrap">
        <div class="wheel-canvas">
          <svg id="house-wheel" viewBox="-170 -170 340 340" role="img" aria-label="Interactive 12-house chart wheel"></svg>
        </div>
        <div class="house-key">
          ${houseKeyButtons}
        </div>
      </div>
    </section>` : ""}

    ${housesGuideSection}

    ${(isTier2 || isSeasoned) ? `<section class="panel">
      <h2>Houses & Life Areas</h2>
      ${housesBlocks}
      <p class="cta-link"><a href="${escapeHtml(bookingUrl)}" target="_blank" rel="noopener noreferrer">→ Schedule your personal reading</a></p>
    </section>` : ""}

    ${(isTier2 || isSeasoned) ? `<section class="panel">
      <h2>Numerology Insights</h2>
      <div class="grid">
        ${numerologySection}
      </div>
    </section>` : ""}

    ${reflectionPromptsSection}

    ${advancedSection}

    <section class="panel book-section">
      <h2>Book a Session</h2>
      <p>Your chart becomes most useful when applied to real decisions, timing, boundaries, and relationship patterns.</p>
      <p>If you want direct guidance, use one of the booking links in this report for your Astrology Soul Blueprint session.</p>
    </section>

    <section class="panel safety">
      <h2>Safety & Use</h2>
      <ul>
        <li>SKU Owl is a self-reflection/educational tool, not therapy, medical care, diagnosis, or crisis support.</li>
        <li>Users are responsible for their own choices and actions.</li>
        <li>If in emotional distress or crisis: contact a licensed professional or local emergency services.</li>
        <li>U.S. crisis support: Call/Text 988.</li>
      </ul>
      <p>${escapeHtml(disclaimer || "This report supports self-awareness and education. It is not a substitute for licensed care.")}</p>
    </section>

    <p class="report-end">Generated by SKU Owl™ on ${escapeHtml(new Date().toISOString())}.<br>© Kervin Heart LLC. All rights reserved.<br>SKU Owl™ and Self Knowledge University™ are trademarks of Kervin Heart LLC.</p>
  </main>
  <footer class="sticky-footer">
    <span>Ready to apply your chart to your real life?</span>
    <a class="btn" href="${escapeHtml(bookingUrl)}" target="_blank" rel="noopener noreferrer">Book Reading</a>
  </footer>
  <script>
    const houseData = ${JSON.stringify(houseData).replace(/</g, "\\u003c")};
    const palette = ["#fcd34d","#fde68a","#bbf7d0","#a7f3d0","#bfdbfe","#c7d2fe","#ddd6fe","#fecdd3","#fdba74","#fecaca","#bae6fd","#d9f99d"];
    const wheel = document.getElementById("house-wheel");
    const keyButtons = Array.from(document.querySelectorAll(".house-key-btn"));
    const houseCards = Array.from(document.querySelectorAll("[data-house-card]"));

    function polar(r, deg) {
      const rad = (deg - 90) * (Math.PI / 180);
      return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
    }

    function arcPath(innerR, outerR, startDeg, endDeg) {
      const p1 = polar(outerR, startDeg);
      const p2 = polar(outerR, endDeg);
      const p3 = polar(innerR, endDeg);
      const p4 = polar(innerR, startDeg);
      return [
        "M", p1.x, p1.y,
        "A", outerR, outerR, 0, 0, 1, p2.x, p2.y,
        "L", p3.x, p3.y,
        "A", innerR, innerR, 0, 0, 0, p4.x, p4.y,
        "Z"
      ].join(" ");
    }

    function setActive(house) {
      document.querySelectorAll(".house-segment").forEach((el) => {
        el.classList.toggle("active", Number(el.dataset.house) === house);
      });
      keyButtons.forEach((btn) => {
        btn.classList.toggle("active", Number(btn.dataset.house) === house);
      });
      houseCards.forEach((card) => {
        card.classList.toggle("active", Number(card.dataset.houseCard) === house);
      });
    }

    function jumpToHouse(house) {
      setActive(house);
      const target = document.getElementById("house-card-" + house);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    function drawWheel() {
      const NS = "http://www.w3.org/2000/svg";
      const innerR = 70;
      const outerR = 150;
      for (let i = 0; i < 12; i += 1) {
        const house = i + 1;
        const start = -120 + (i * 30);
        const end = start + 30;
        const path = document.createElementNS(NS, "path");
        path.setAttribute("d", arcPath(innerR, outerR, start, end));
        path.setAttribute("fill", palette[i % palette.length]);
        path.setAttribute("stroke", "#ffffff");
        path.setAttribute("stroke-width", "1");
        path.setAttribute("class", "house-segment");
        path.dataset.house = house;
        path.addEventListener("click", () => jumpToHouse(house));
        wheel.appendChild(path);

        const label = document.createElementNS(NS, "text");
        const mid = start + 15;
        const pos = polar(110, mid);
        label.setAttribute("x", pos.x);
        label.setAttribute("y", pos.y);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("dominant-baseline", "middle");
        label.setAttribute("font-size", "11");
        label.setAttribute("fill", "#0f172a");
        label.textContent = "H" + house;
        wheel.appendChild(label);
      }

      const center = document.createElementNS(NS, "circle");
      center.setAttribute("cx", "0");
      center.setAttribute("cy", "0");
      center.setAttribute("r", String(65));
      center.setAttribute("fill", "#ffffff");
      center.setAttribute("stroke", "#dbe3ef");
      wheel.appendChild(center);
    }

    if (wheel && keyButtons.length > 0) {
      drawWheel();
      keyButtons.forEach((btn) => {
        btn.addEventListener("click", () => jumpToHouse(Number(btn.dataset.house)));
      });
      setActive(1);
    }
  </script>
</body>
</html>`;
}

function splitDiscordMessage(content, limit = 1900) {
  if (content.length <= limit) {
    return [content];
  }

  const chunks = [];
  let current = "";

  for (const line of content.split(/\n/)) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length <= limit) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (line.length <= limit) {
      current = line;
      continue;
    }

    let start = 0;
    while (start < line.length) {
      chunks.push(line.slice(start, start + limit));
      start += limit;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

module.exports = {
  buildPersonalReadingSummary,
  calculateBirthchart,
  buildBirthchartHtmlReport,
  formatBirthchartMessage,
  splitDiscordMessage
};
