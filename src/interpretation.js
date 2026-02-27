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

const HOUSE_THEME_KEYWORDS = {
  1: ["identity", "image", "drive"],
  2: ["values", "money", "self-worth"],
  3: ["learning", "communication", "mindset"],
  4: ["home", "roots", "emotional base"],
  5: ["creativity", "joy", "self-expression"],
  6: ["habits", "work", "well-being"],
  7: ["relationships", "agreements", "mirroring"],
  8: ["intimacy", "shared resources", "transformation"],
  9: ["beliefs", "expansion", "study"],
  10: ["career", "reputation", "impact"],
  11: ["community", "networks", "future vision"],
  12: ["healing", "rest", "inner life"]
};

const HOUSE_MEANINGS = {
  1: "House 1 highlights how you enter spaces and start new chapters. Themes often include identity, visibility, and personal direction.",
  2: "House 2 focuses on values, money patterns, and self-worth. It often invites grounded choices around stability and resources.",
  3: "House 3 relates to communication, learning style, and day-to-day thinking. It may show how you process information and connect ideas.",
  4: "House 4 reflects home, family imprint, and emotional foundations. It often points to what helps you feel safe and rooted.",
  5: "House 5 covers creativity, joy, romance, and play. It may show how you express your heart and take healthy risks.",
  6: "House 6 centers routines, work ethic, and body-mind maintenance. It often invites practical systems and consistent habits.",
  7: "House 7 describes partnership dynamics and relational mirrors. It may reveal how you balance self with shared commitments.",
  8: "House 8 points to depth, trust, shared assets, and transformation. Themes often include boundaries, vulnerability, and renewal.",
  9: "House 9 relates to beliefs, higher learning, and wider perspective. It often invites meaning-making, travel, and philosophical growth.",
  10: "House 10 emphasizes vocation, reputation, and public impact. It may show how responsibility and purpose become visible over time.",
  11: "House 11 focuses on friendships, networks, and future goals. It often highlights collaboration and contribution to community.",
  12: "House 12 reflects rest, subconscious patterns, and spiritual integration. It may invite release, reflection, and compassionate boundaries."
};

const SIGN_TONE = {
  Aries: "direct, initiative-led",
  Taurus: "steady, practical",
  Gemini: "curious, mentally agile",
  Cancer: "protective, emotionally tuned",
  Leo: "expressive, heart-forward",
  Virgo: "precise, improvement-oriented",
  Libra: "relational, harmonizing",
  Scorpio: "intense, depth-seeking",
  Sagittarius: "expansive, truth-seeking",
  Capricorn: "disciplined, strategic",
  Aquarius: "independent, future-focused",
  Pisces: "intuitive, compassionate"
};

const PLANET_FUNCTION = {
  Sun: "identity and purpose",
  Moon: "emotional needs and regulation",
  Rising: "approach and first impression",
  Mercury: "thinking and communication",
  Venus: "relating and attraction style",
  Mars: "motivation and action style"
};

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

const CORE_NUMEROLOGY_MEANINGS = {
  1: "Themes often include initiative, autonomy, and leadership through action.",
  2: "Themes often include cooperation, sensitivity, and diplomacy in relationships.",
  3: "Themes often include communication, creativity, and emotional expression.",
  4: "Themes often include structure, discipline, and long-term consistency.",
  5: "Themes often include freedom, adaptation, and learning through change.",
  6: "Themes often include care, responsibility, and service to loved ones.",
  7: "Themes often include introspection, analysis, and inner truth-seeking.",
  8: "Themes often include ambition, influence, and material stewardship.",
  9: "Themes often include compassion, completion, and broad perspective.",
  11: "Themes often include intuition, inspiration, and heightened sensitivity; grounding helps.",
  22: "Themes often include practical vision and large-scale building through discipline.",
  33: "Themes often include compassionate leadership and service through teaching/healing."
};

const PERSONAL_YEAR_MEANINGS = {
  1: "A reset cycle: initiative and fresh starts often get momentum.",
  2: "A patience cycle: partnerships, timing, and emotional intelligence may be key.",
  3: "An expression cycle: visibility, communication, and creativity are often highlighted.",
  4: "A foundation cycle: systems, planning, and consistency usually matter most.",
  5: "A change cycle: flexibility and experimentation may open useful paths.",
  6: "A responsibility cycle: home, commitments, and relationship repair often come forward.",
  7: "A reflection cycle: study, review, and internal alignment are often favored.",
  8: "An execution cycle: leadership, performance, and measurable results may increase.",
  9: "A completion cycle: closure, release, and mission-level perspective are emphasized."
};

const CRISIS_PATTERNS = [
  /\bi want to (die|kill myself|end my life)\b/i,
  /\bi am going to (kill myself|end my life)\b/i,
  /\bhow do i (kill myself|end my life)\b/i,
  /\bsuicide plan\b/i,
  /\bself[- ]harm\b/i,
  /\bcut myself\b/i,
  /\bi feel suicidal\b/i
];

const CRISIS_RESPONSE = [
  "I can’t help with self-harm content.",
  "If you may be in immediate danger, call or text 988 now.",
  "Please contact a licensed professional or local emergency services."
].join(" ");

function buildSignHouseMeanings() {
  const out = {};
  for (let house = 1; house <= 12; house += 1) {
    out[house] = {};
    for (const sign of SIGNS) {
      const keys = HOUSE_THEME_KEYWORDS[house].join(", ");
      out[house][sign] = `${sign} in House ${house} tends to express ${keys} in a ${SIGN_TONE[sign]} way. This placement often invites conscious choices so this area stays balanced and useful.`;
    }
  }

  return out;
}

const SIGN_IN_HOUSE_MEANINGS = buildSignHouseMeanings();

function placementMeaning(planetName, sign, house) {
  const tone = SIGN_TONE[sign] || "balanced";
  const houseMeaning = HOUSE_MEANINGS[house] || "core life themes";
  return `${planetName} in ${sign} House ${house} often channels ${PLANET_FUNCTION[planetName]} in a ${tone} style. ${houseMeaning}`;
}

function sunMoonRisingMeaning(placements) {
  return {
    sun: placementMeaning("Sun", placements.sun.sign, placements.sun.house),
    moon: placementMeaning("Moon", placements.moon.sign, placements.moon.house),
    rising: `Rising in ${placements.rising.sign} often shapes your approach as ${SIGN_TONE[placements.rising.sign]}. It may influence first impressions and how quickly you engage new situations.`
  };
}

function mercuryVenusMarsMeaning(placements) {
  return {
    mercury: placementMeaning("Mercury", placements.mercury.sign, placements.mercury.house),
    venus: placementMeaning("Venus", placements.venus.sign, placements.venus.house),
    mars: placementMeaning("Mars", placements.mars.sign, placements.mars.house)
  };
}

function chartRulerMeaning(risingSign, rulerPlacement) {
  const ruler = RULER_BY_SIGN[risingSign] || "Chart ruler";
  return `${ruler} as chart ruler in ${rulerPlacement.sign} House ${rulerPlacement.house} may work like your operating system. It often shows where decisions gain traction when aligned with your values.`;
}

function numerologyMeaning({ type, value }) {
  if (type === "personalYear") {
    return PERSONAL_YEAR_MEANINGS[value] || "This year often invites grounded reflection and practical next steps.";
  }

  return CORE_NUMEROLOGY_MEANINGS[value] || "This number often highlights a developmental theme that evolves over time.";
}

function snapshotFiveSentences(input) {
  const {
    sun,
    moon,
    risingSign,
    chartRuler,
    dominantHouses,
    dominantKeywords,
    superpower,
    lesson
  } = input;
  const [h1, h2] = dominantHouses;
  const keys = (dominantKeywords || []).slice(0, 3).join(", ");

  return [
    `Big 3: Sun in ${sun.sign} House ${sun.house}, Moon in ${moon.sign} House ${moon.house}, Rising in ${risingSign}.`,
    `Operating system: ${chartRuler.planet} in ${chartRuler.sign} House ${chartRuler.house} tends to set your default decision style.`,
    `Focus zone: Houses ${h1} and ${h2} are most active; themes often include ${keys}.`,
    `Superpower: ${superpower.placement} may support ${superpower.benefit}.`,
    `Growth lesson: ${lesson.placement} invites ${lesson.growthPoint}.`
  ];
}

function housesSectionEntries(houseCusps, planetsByHouse) {
  const entries = [];
  for (let house = 1; house <= 12; house += 1) {
    const sign = houseCusps[house - 1];
    const base = SIGN_IN_HOUSE_MEANINGS[house][sign];
    const planets = planetsByHouse[house] || [];
    const planetLine = planets.length > 0
      ? `Planets here: ${planets.join(", ")}. This area may feel more immediate and visible.`
      : "No major planets here at birth; this area often develops through timing, habits, and intentional practice.";
    entries.push({
      house,
      sign,
      text: `${base} ${planetLine}`
    });
  }

  return entries;
}

function numerologySectionShort(numbers) {
  const lines = [];
  lines.push(`Life Path ${numbers.lifePath}: ${numerologyMeaning({ type: "core", value: numbers.lifePath })}`);
  lines.push(`Birthday ${numbers.birthday}: ${numerologyMeaning({ type: "core", value: numbers.birthday })}`);
  if (numbers.expression) {
    lines.push(`Expression ${numbers.expression}: ${numerologyMeaning({ type: "core", value: numbers.expression })}`);
  }
  if (numbers.soulUrge) {
    lines.push(`Soul Urge ${numbers.soulUrge}: ${numerologyMeaning({ type: "core", value: numbers.soulUrge })}`);
  }
  if (numbers.personality) {
    lines.push(`Personality ${numbers.personality}: ${numerologyMeaning({ type: "core", value: numbers.personality })}`);
  }
  lines.push(`Personal Year ${numbers.personalYear}: ${numerologyMeaning({ type: "personalYear", value: numbers.personalYear })}`);

  return lines;
}

function shouldTriggerCrisisStop(userText) {
  return CRISIS_PATTERNS.some((pattern) => pattern.test(userText || ""));
}

module.exports = {
  HOUSE_MEANINGS,
  SIGN_IN_HOUSE_MEANINGS,
  PLANET_FUNCTION,
  RULER_BY_SIGN,
  CORE_NUMEROLOGY_MEANINGS,
  PERSONAL_YEAR_MEANINGS,
  CRISIS_RESPONSE,
  placementMeaning,
  sunMoonRisingMeaning,
  mercuryVenusMarsMeaning,
  chartRulerMeaning,
  numerologyMeaning,
  snapshotFiveSentences,
  housesSectionEntries,
  numerologySectionShort,
  shouldTriggerCrisisStop
};
