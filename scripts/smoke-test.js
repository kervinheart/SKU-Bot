const assert = require("node:assert/strict");

const { calculateNumerologyProfile } = require("../src/numerology");
const { buildBirthchartHtmlReport } = require("../src/birthchart");
const { snapshotFiveSentences } = require("../src/interpretation");

const CALENDLY_URL = "https://calendly.com/kervinheart/astrology-soul-blueprint-session?back=1&month=2026-02";

function buildMockChart() {
  return {
    system: "tropical",
    houseSystem: "whole_sign",
    input: { date: "1994-12-21", time: "09:57", location: "Fort Pierce, FL" },
    location: {
      displayName: "Fort Pierce, Florida, United States",
      latitude: 27.4467,
      longitude: -80.3256,
      timezoneName: "America/New_York"
    },
    timezoneNote: null,
    utcIso: "1994-12-21T14:57:00.000Z",
    ascendant: { longitude: 200.5, sign: "Libra", degree: "20°30" },
    mc: { longitude: 120.5, sign: "Cancer", degree: "00°30" },
    houseCusps: Array.from({ length: 12 }, (_, idx) => idx * 30),
    houseCuspSigns: [
      "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
      "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ],
    planets: {
      Sun: { name: "Sun", longitude: 269, sign: "Sagittarius", house: 3, degree: "29°00" },
      Moon: { name: "Moon", longitude: 14, sign: "Aries", house: 7, degree: "14°00" },
      Mercury: { name: "Mercury", longitude: 280, sign: "Capricorn", house: 4, degree: "10°00" },
      Venus: { name: "Venus", longitude: 300, sign: "Aquarius", house: 5, degree: "00°00" },
      Mars: { name: "Mars", longitude: 220, sign: "Scorpio", house: 2, degree: "10°00" },
      Jupiter: { name: "Jupiter", longitude: 240, sign: "Sagittarius", house: 3, degree: "00°00" },
      Saturn: { name: "Saturn", longitude: 330, sign: "Pisces", house: 6, degree: "00°00" }
    },
    planetsByHouse: {
      1: [],
      2: ["Mars"],
      3: ["Jupiter", "Sun"],
      4: ["Mercury"],
      5: ["Venus"],
      6: ["Saturn"],
      7: ["Moon"],
      8: [],
      9: [],
      10: [],
      11: [],
      12: []
    },
    chartRuler: { name: "Venus", sign: "Aquarius", house: 5, degree: "00°00" },
    focusHouses: [3, 5],
    dominantHouses: [3, 5],
    superpower: { name: "Mercury", sign: "Capricorn", house: 4, reason: "tight 60° aspect to MC (orb 1.2°)" },
    mainLesson: { name: "Saturn", sign: "Pisces", house: 6, reason: "Moon-Saturn 90° challenge (orb 2.0°)" }
  };
}

function runSmoke() {
  const chart = buildMockChart();
  const numerologyProfile = calculateNumerologyProfile({
    fullName: "Jane Marie Doe",
    birthdateInput: "1994-12-21",
    includeYAsVowel: false,
    referenceDate: new Date("2026-02-25T00:00:00.000Z")
  });

  const numerology = {
    items: [
      { label: "Life Path", value: numerologyProfile.core.lifePath, meaning: "Core direction themes." },
      { label: "Birthday Number", value: numerologyProfile.core.birthday, meaning: "Natural behavioral style." },
      { label: "Expression / Destiny", value: numerologyProfile.core.destiny, meaning: "Long-term development arc." },
      { label: "Soul Urge", value: numerologyProfile.core.heartDesire, meaning: "Inner motivation pattern." },
      { label: "Personality", value: numerologyProfile.core.personality, meaning: "Outer social style." },
      { label: "Personal Year", value: numerologyProfile.timing.personalYear, meaning: "Current-year focus cycle." }
    ]
  };

  const html = buildBirthchartHtmlReport(chart, {
    fullName: "Jane Marie Doe",
    languageStyle: "SKU Owl chill",
    numerology,
    calendlyUrl: CALENDLY_URL
  });

  assert.ok(html.includes("Your Birth Chart Snapshot"));
  assert.ok(html.includes("Key Placements (Quick)"));
  assert.ok(html.includes("Houses & Life Areas"));
  assert.ok(html.includes("Numerology Insights"));
  assert.ok(html.includes("Book a Session"));
  assert.ok(html.includes("Safety & Use"));
  assert.ok(html.includes("Book Your Astrology Soul Blueprint Session"));
  assert.ok(html.includes("→ Schedule your personal reading"));
  assert.ok(html.includes("Ready to apply your chart to your real life?"));
  assert.ok(html.includes("Book Reading"));
  assert.ok(html.includes(CALENDLY_URL));
  assert.ok(html.includes("© Kervin Heart LLC"));

  const snapshot = snapshotFiveSentences({
    sun: { sign: "Sagittarius", house: 3 },
    moon: { sign: "Aries", house: 7 },
    risingSign: "Libra",
    chartRuler: { planet: "Venus", sign: "Aquarius", house: 5 },
    dominantHouses: [3, 5],
    dominantKeywords: ["learning", "communication", "creativity"],
    superpower: { placement: "Mercury in Capricorn House 4", benefit: "clear planning under pressure" },
    lesson: { placement: "Saturn in Pisces House 6", growthPoint: "steady emotional boundaries in daily routines" }
  });
  assert.equal(snapshot.length, 5);

  console.log("Smoke test passed.");
}

runSmoke();
