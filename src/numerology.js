const MASTER_NUMBERS = new Set([11, 22, 33]);
const KARMIC_DEBT_NUMBERS = new Set([13, 14, 16, 19]);

const NUMBER_MEANINGS = {
  1: "Independent, self-starting, and leadership-oriented.",
  2: "Diplomatic, cooperative, and relationship-focused.",
  3: "Creative, expressive, and socially engaging.",
  4: "Structured, practical, and disciplined.",
  5: "Adaptable, curious, and freedom-seeking.",
  6: "Nurturing, responsible, and service-minded.",
  7: "Analytical, introspective, and truth-seeking.",
  8: "Ambitious, strategic, and results-driven.",
  9: "Compassionate, idealistic, and humanitarian.",
  11: "Master 11: intuitive visionary with inspirational influence.",
  22: "Master 22: practical master builder with large-scale potential.",
  33: "Master 33: compassionate teacher focused on uplift and healing."
};

function getLetterValue(char) {
  const code = char.charCodeAt(0);
  if (code < 65 || code > 90) {
    return 0;
  }

  return ((code - 65) % 9) + 1;
}

function sumDigits(value) {
  return String(Math.abs(value))
    .split("")
    .reduce((sum, digit) => sum + Number.parseInt(digit, 10), 0);
}

function reduceNumber(value, preserveMaster = true) {
  let current = Math.abs(value);

  while (current > 9) {
    if (preserveMaster && MASTER_NUMBERS.has(current)) {
      return current;
    }

    current = sumDigits(current);
  }

  return current;
}

function normalizeName(fullName) {
  const cleaned = fullName.toUpperCase().replace(/[^A-Z]/g, "");
  if (!cleaned) {
    throw new Error("Name must include letters A-Z.");
  }

  return cleaned;
}

function parseBirthDateInput(birthdateInput) {
  const trimmed = birthdateInput.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  if (!match) {
    throw new Error("Birthdate must use YYYY-MM-DD format.");
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);

  if (month < 1 || month > 12) {
    throw new Error("Birth month must be between 01 and 12.");
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    throw new Error("Birth day is invalid for that month/year.");
  }

  return {
    year,
    month,
    day,
    iso: `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
  };
}

function computeNameSums(cleanName, includeYAsVowel) {
  const vowels = new Set(includeYAsVowel ? ["A", "E", "I", "O", "U", "Y"] : ["A", "E", "I", "O", "U"]);

  let destinyRaw = 0;
  let heartRaw = 0;
  let personalityRaw = 0;

  for (const char of cleanName) {
    const value = getLetterValue(char);
    destinyRaw += value;

    if (vowels.has(char)) {
      heartRaw += value;
    } else {
      personalityRaw += value;
    }
  }

  return {
    destinyRaw,
    heartRaw,
    personalityRaw
  };
}

function getCurrentTimingNumbers(month, day, referenceDate) {
  const currentYear = referenceDate.getFullYear();
  const universalYear = reduceNumber(sumDigits(currentYear));
  const birthMonthBase = reduceNumber(month);
  const birthDayBase = reduceNumber(day);
  const personalYear = reduceNumber(universalYear + birthMonthBase + birthDayBase);
  const personalMonth = reduceNumber(personalYear + (referenceDate.getMonth() + 1));
  const personalDay = reduceNumber(personalMonth + referenceDate.getDate());

  return {
    currentYear,
    universalYear,
    personalYear,
    personalMonth,
    personalDay,
    asOf: referenceDate.toISOString().slice(0, 10)
  };
}

function findKarmicDebt(rawValue, label) {
  if (KARMIC_DEBT_NUMBERS.has(rawValue)) {
    return `${label}: ${rawValue}`;
  }

  return null;
}

function calculateNumerologyProfile({ fullName, birthdateInput, includeYAsVowel = false, referenceDate = new Date() }) {
  const cleanName = normalizeName(fullName);
  const birth = parseBirthDateInput(birthdateInput);

  const nameSums = computeNameSums(cleanName, includeYAsVowel);
  const lifePathRaw = sumDigits(`${birth.year}${String(birth.month).padStart(2, "0")}${String(birth.day).padStart(2, "0")}`);

  const lifePath = reduceNumber(lifePathRaw);
  const destiny = reduceNumber(nameSums.destinyRaw);
  const heartDesire = reduceNumber(nameSums.heartRaw);
  const personality = reduceNumber(nameSums.personalityRaw);
  const birthday = reduceNumber(birth.day);
  const maturity = reduceNumber(lifePath + destiny);
  const attitude = reduceNumber(birth.month + birth.day);

  const monthCycle = reduceNumber(birth.month);
  const dayCycle = reduceNumber(birth.day);
  const yearCycle = reduceNumber(birth.year);

  const firstPinnacle = reduceNumber(monthCycle + dayCycle);
  const secondPinnacle = reduceNumber(dayCycle + yearCycle);
  const thirdPinnacle = reduceNumber(firstPinnacle + secondPinnacle);
  const fourthPinnacle = reduceNumber(monthCycle + yearCycle);

  const firstChallenge = Math.abs(dayCycle - monthCycle);
  const secondChallenge = Math.abs(dayCycle - yearCycle);
  const thirdChallenge = Math.abs(firstChallenge - secondChallenge);
  const fourthChallenge = Math.abs(monthCycle - yearCycle);

  const timing = getCurrentTimingNumbers(birth.month, birth.day, referenceDate);

  const karmicDebt = [
    findKarmicDebt(lifePathRaw, "Life Path"),
    findKarmicDebt(nameSums.destinyRaw, "Destiny"),
    findKarmicDebt(nameSums.heartRaw, "Heart Desire"),
    findKarmicDebt(nameSums.personalityRaw, "Personality")
  ].filter(Boolean);

  return {
    fullName,
    cleanName,
    includeYAsVowel,
    birth,
    core: {
      lifePath,
      destiny,
      heartDesire,
      personality,
      birthday,
      maturity,
      attitude
    },
    cycles: {
      periodCycles: [monthCycle, dayCycle, yearCycle],
      pinnacles: [firstPinnacle, secondPinnacle, thirdPinnacle, fourthPinnacle],
      challenges: [firstChallenge, secondChallenge, thirdChallenge, fourthChallenge]
    },
    timing,
    rawTotals: {
      lifePathRaw,
      destinyRaw: nameSums.destinyRaw,
      heartRaw: nameSums.heartRaw,
      personalityRaw: nameSums.personalityRaw
    },
    karmicDebt
  };
}

function getNumberMeaning(number) {
  return NUMBER_MEANINGS[number] || "No specific meaning configured.";
}

module.exports = {
  MASTER_NUMBERS,
  calculateNumerologyProfile,
  getNumberMeaning,
  parseBirthDateInput,
  reduceNumber
};
