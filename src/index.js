const {
  AttachmentBuilder,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const {
  botToken,
  clientId,
  guildId,
  kervinCalendlyUrl,
  kervinUserId,
  googleMapsApiKey,
  nominatimUserAgent,
  openCageApiKey,
  swissephPath,
  enableMessageContentIntent
} = require("./config");
const {
  MASTER_NUMBERS,
  calculateNumerologyProfile,
  getNumberMeaning,
  parseBirthDateInput,
  reduceNumber
} = require("./numerology");
const {
  FULL_POLICY_TEXT,
  SHORT_POLICY_TEXT
} = require("./policy");
const {
  buildBirthchartHtmlReport,
  calculateBirthchart,
  formatBirthchartMessage,
  splitDiscordMessage
} = require("./birthchart");

if (!botToken || !clientId) {
  console.error("Missing BOT_TOKEN or CLIENT_ID in your .env file.");
  process.exit(1);
}

if (!/^\d{17,20}$/.test(clientId)) {
  console.error("CLIENT_ID must be a numeric Discord Application ID (snowflake).");
  process.exit(1);
}

const normalizedGuildId = /^\d{17,20}$/.test(guildId) ? guildId : "";
if (guildId && !normalizedGuildId) {
  console.warn("GUILD_ID is not numeric. Ignoring it and registering global commands instead.");
}

const clientIntents = [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages];
if (enableMessageContentIntent) {
  clientIntents.push(GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent);
}

const client = new Client({
  intents: clientIntents,
  partials: [Partials.Channel]
});
const BIRTHCHART_RATE_LIMIT_MS = 30_000;
const CRISIS_LOCK_MS = 48 * 60 * 60 * 1000;
const FALSE_FLAG_CONFIRM_MS = 5 * 60 * 1000;
const birthchartRateLimitByUser = new Map();
const safetyLockByUser = new Map();
const falseFlagConfirmByUser = new Map();

const slashCommands = [
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all SKU Owl bot commands."),

  new SlashCommandBuilder()
    .setName("policy")
    .setDescription("Show SKU Owl Safety & Use Policy.")
    .addBooleanOption((option) =>
      option
        .setName("dm")
        .setDescription("Send as a private response first (default: true).")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("resources")
    .setDescription("Get fact-based mental health and learning resources.")
    .addBooleanOption((option) =>
      option
        .setName("dm")
        .setDescription("Send as a private response first (default: true).")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("book")
    .setDescription("Get the private reading booking link."),

  new SlashCommandBuilder()
    .setName("start")
    .setDescription("Get a basic numerology reading and prompt to book Kervin.")
    .addStringOption((option) =>
      option
        .setName("full_name")
        .setDescription("Full name. Example: Jane Doe")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("birthdate")
        .setDescription("Birthday in YYYY-MM-DD. Example: 1995-08-14")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("dm")
        .setDescription("Send as a private response first (default: true).")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("studyhall")
    .setDescription("Get a step-by-step study hall session plan.")
    .addIntegerOption((option) =>
      option
        .setName("minutes")
        .setDescription("How many minutes is your session?")
        .setRequired(false)
        .setMinValue(20)
        .setMaxValue(180)
    )
    .addBooleanOption((option) =>
      option
        .setName("dm")
        .setDescription("Send as a private response.")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("numerology")
    .setDescription("Calculate full numerology profile (core, cycles, and timing).")
    .addStringOption((option) =>
      option
        .setName("full_name")
        .setDescription("Birth name. Example: Jane Marie Doe")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("birthdate")
        .setDescription("Birthday in YYYY-MM-DD. Example: 1995-08-14")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("include_y_as_vowel")
        .setDescription("Treat Y as a vowel when calculating Heart Desire.")
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("dm")
        .setDescription("Send as a private response first (default: true).")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("birthchart")
    .setDescription("Generate a private HTML birthchart report (auto-DM).")
    .addStringOption((option) =>
      option
        .setName("date")
        .setDescription("Birthday in YYYY-MM-DD. Example: 1995-08-14")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription("Birth time in HH:MM (24-hour). Example: 13:45")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("location")
        .setDescription("Place of birth. Example: Los Angeles, CA or 34.0522,-118.2437")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("full_name")
        .setDescription("Optional full name for numerology name-based numbers.")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("system")
        .setDescription("Astrology zodiac system.")
        .addChoices(
          { name: "tropical", value: "tropical" },
          { name: "sidereal", value: "sidereal" }
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("house_system")
        .setDescription("House calculation style.")
        .addChoices(
          { name: "whole_sign", value: "whole_sign" },
          { name: "placidus", value: "placidus" }
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("language_style")
        .setDescription("Message tone preset.")
        .addChoices({ name: "SKU Owl chill", value: "SKU Owl chill" })
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("share_quick_reading")
        .setDescription("Post a short quick reading in this channel (default: false).")
        .setRequired(false)
    )
];

function withPrivateVisibility(interaction, payload) {
  if (!interaction.inGuild()) {
    return payload;
  }

  return { ...payload, flags: MessageFlags.Ephemeral };
}

async function replyPrivatelyOrDm(interaction, payload, successMessage) {
  await interaction.reply(withPrivateVisibility(interaction, {
    content: successMessage
  }));
  await interaction.followUp(withPrivateVisibility(interaction, payload));
}

async function replyChunked(interaction, chunks) {
  await interaction.reply(withPrivateVisibility(interaction, { content: chunks[0] }));
  for (let index = 1; index < chunks.length; index += 1) {
    await interaction.followUp(withPrivateVisibility(interaction, { content: chunks[index] }));
  }
}

async function replyChunkedPrivatelyOrDm(interaction, chunks, successMessage) {
  await interaction.reply(withPrivateVisibility(interaction, {
    content: successMessage
  }));
  for (const chunk of chunks) {
    await interaction.followUp(withPrivateVisibility(interaction, { content: chunk }));
  }
}

function isBookIntent(content) {
  const normalized = (content || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return (
    normalized === "book" ||
    normalized === "book me" ||
    normalized === "book reading" ||
    normalized === "book private reading" ||
    normalized === "dm" ||
    normalized === "dm kervin" ||
    normalized.startsWith("book ")
  );
}

function buildBookReplyMessage() {
  const dmLine = isSnowflake(kervinUserId)
    ? `You can also DM Kervin directly here: <@${kervinUserId}>`
    : "You can also DM Kervin directly in this server.";

  return [
    "Private reading booking is open.",
    `Book Kervin Heart here: ${kervinCalendlyUrl}`,
    dmLine
  ].join("\n");
}

function detectCrisisSignal(text) {
  const content = (text || "").toLowerCase();
  if (!content.trim()) {
    return { flagged: false, severity: "none", matched: "" };
  }

  const benignPatterns = [
    /\b(kill(ed|ing)?\s+time)\b/,
    /\bdie\s+hard\b/,
    /\bthis\s+phone\s+is\s+dead\b/,
    /\bmy\s+battery\s+is\s+dead\b/,
    /\bthat\s+song\s+kills\s+me\b/
  ];
  if (benignPatterns.some((re) => re.test(content))) {
    return { flagged: false, severity: "none", matched: "" };
  }

  const highRiskPatterns = [
    /\bi want to (die|kill myself|end my life)\b/,
    /\bi am going to (kill myself|end my life)\b/,
    /\bhow do i (kill myself|end my life)\b/,
    /\bi should (kill myself|end my life)\b/,
    /\bsuicide plan\b/,
    /\bself[- ]harm\b/,
    /\bcut myself\b/
  ];
  for (const re of highRiskPatterns) {
    if (re.test(content)) {
      return { flagged: true, severity: "high", matched: re.source };
    }
  }

  const mediumRiskPatterns = [
    /\bi want to die\b/,
    /\bi feel suicidal\b/,
    /\bi hate my life\b/,
    /\bi want to disappear\b/,
    /\bhurt myself\b/
  ];
  for (const re of mediumRiskPatterns) {
    if (re.test(content)) {
      return { flagged: true, severity: "medium", matched: re.source };
    }
  }

  return { flagged: false, severity: "none", matched: "" };
}

function setSafetyLock(userId, detection) {
  safetyLockByUser.set(userId, {
    until: Date.now() + CRISIS_LOCK_MS,
    severity: detection.severity,
    matched: detection.matched,
    createdAt: Date.now()
  });
}

function getSafetyLock(userId) {
  const lock = safetyLockByUser.get(userId);
  if (!lock) {
    return null;
  }

  if (lock.until <= Date.now()) {
    safetyLockByUser.delete(userId);
    return null;
  }

  return lock;
}

function buildLockMessage(lock) {
  const hoursLeft = Math.max(1, Math.ceil((lock.until - Date.now()) / (60 * 60 * 1000)));
  return [
    "Safety check is active on your account.",
    `Access is temporarily limited for ${hoursLeft} more hour(s).`,
    "If this was accidental, DM `false flag` to request an unlock review.",
    "If you are in crisis now, call or text 988 immediately."
  ].join("\n");
}

function buildCrisisDmAlert() {
  return [
    "I detected language related to self-harm or suicide risk.",
    "I cannot continue regular bot features right now.",
    "Please contact real-time support immediately:",
    "US: Call or text 988 (Suicide & Crisis Lifeline, 24/7).",
    "You can also contact local emergency services or a licensed professional.",
    "A temporary 48-hour safety lock is now active."
  ].join("\n");
}

function extractInteractionText(interaction) {
  const parts = [interaction.commandName || ""];
  for (const opt of interaction.options.data || []) {
    if (typeof opt.value === "string") {
      parts.push(opt.value);
    }
  }

  return parts.join(" ").trim();
}

function buildFactResourcesMessage() {
  return [
    "**Fact-based resources (not AI opinions):**",
    "- 988 Lifeline (US crisis support): https://988lifeline.org/",
    "- NIMH (mental health basics): https://www.nimh.nih.gov/health",
    "- SAMHSA (treatment locator): https://findtreatment.gov/",
    "- CDC mental health resources: https://www.cdc.gov/mentalhealth/",
    "- MedlinePlus health encyclopedia: https://medlineplus.gov/",
    "- WHO mental health: https://www.who.int/health-topics/mental-health",
    "",
    "**Hard-question method:**",
    "1. Start with `/resources` links above.",
    "2. Cross-check at least 2 primary sources.",
    "3. For urgent safety concerns, call/text 988 immediately."
  ].join("\n");
}

function isSnowflake(value) {
  return /^\d{17,20}$/.test((value || "").trim());
}

function getBirthchartRateLimitSeconds(userId) {
  const now = Date.now();
  const nextAllowedAt = birthchartRateLimitByUser.get(userId) || 0;
  if (nextAllowedAt > now) {
    return Math.ceil((nextAllowedAt - now) / 1000);
  }

  birthchartRateLimitByUser.set(userId, now + BIRTHCHART_RATE_LIMIT_MS);
  return 0;
}

function buildBasicReadingEmbed(profile) {
  const { core } = profile;
  return new EmbedBuilder()
    .setTitle("Basic Numerology Reading")
    .setColor(0xe67e22)
    .setDescription([
      `Name: **${profile.fullName}**`,
      `Birthdate: **${profile.birth.iso}**`
    ].join("\n"))
    .addFields(
      {
        name: "Your Core Snapshot",
        value: [
          `Life Path: **${formatNumber(core.lifePath)}**`,
          `Destiny: **${formatNumber(core.destiny)}**`,
          `Heart Desire: **${formatNumber(core.heartDesire)}**`,
          `Personality: **${formatNumber(core.personality)}**`
        ].join("\n")
      },
      {
        name: "Basic Reading",
        value: [
          `Life Path ${formatNumber(core.lifePath)}: ${getNumberMeaning(core.lifePath)}`,
          `Destiny ${formatNumber(core.destiny)}: ${getNumberMeaning(core.destiny)}`,
          `Heart Desire ${formatNumber(core.heartDesire)}: ${getNumberMeaning(core.heartDesire)}`
        ].join("\n")
      },
      {
        name: "Book Kervin For A Private 1-on-1 Reading",
        value: "For a deeper personal reading, book Kervin for a private 1-on-1 session. Reply with `BOOK` or DM Kervin to schedule."
      }
    )
    .setFooter({ text: "Use /numerology for a full expanded report." });
}

function buildStudyHallEmbed(minutes) {
  const total = minutes || 60;
  const warmup = 5;
  const learn = Math.max(12, Math.floor(total * 0.4));
  const practice = Math.max(10, Math.floor(total * 0.35));
  const check = Math.max(5, total - warmup - learn - practice);

  return new EmbedBuilder()
    .setTitle(`Study Hall Plan (${total} minutes)`)
    .setColor(0x3498db)
    .setDescription("Use this structure to stay focused and track understanding.")
    .addFields(
      {
        name: `Block 1: Setup (${warmup} min)`,
        value: "Pick one target, gather materials, and remove distractions."
      },
      {
        name: `Block 2: Learn (${learn} min)`,
        value: "Study one concept at a time and explain it back without notes."
      },
      {
        name: `Block 3: Practice (${practice} min)`,
        value: "Attempt questions from memory first, then review and correct."
      },
      {
        name: `Block 4: Check and Reflect (${check} min)`,
        value: "Write one key takeaway and one improvement step for your next session."
      }
    )
    .setFooter({ text: "Consistency beats cramming. Repeat this structure each session." });
}

function formatNumber(value) {
  if (MASTER_NUMBERS.has(value)) {
    return `${value} (Master)`;
  }

  return String(value);
}

function sumDigits(value) {
  return String(Math.abs(value))
    .split("")
    .reduce((sum, digit) => sum + Number.parseInt(digit, 10), 0);
}

function calculatePersonalYear(month, day, now = new Date()) {
  const universalYear = reduceNumber(sumDigits(now.getFullYear()));
  return reduceNumber(universalYear + reduceNumber(month) + reduceNumber(day));
}

function buildNumerologyForReport({ birthdateInput, fullName }) {
  const birth = parseBirthDateInput(birthdateInput);
  const items = [];

  const lifePathRaw = sumDigits(`${birth.year}${String(birth.month).padStart(2, "0")}${String(birth.day).padStart(2, "0")}`);
  const lifePath = reduceNumber(lifePathRaw);
  const birthday = reduceNumber(birth.day);
  const personalYear = calculatePersonalYear(birth.month, birth.day, new Date());

  items.push({
    label: "Life Path",
    value: formatNumber(lifePath),
    meaning: getNumberMeaning(lifePath)
  });
  items.push({
    label: "Birthday Number",
    value: formatNumber(birthday),
    meaning: getNumberMeaning(birthday)
  });
  items.push({
    label: "Personal Year",
    value: formatNumber(personalYear),
    meaning: getNumberMeaning(personalYear)
  });

  if ((fullName || "").trim()) {
    const profile = calculateNumerologyProfile({
      fullName,
      birthdateInput,
      includeYAsVowel: false,
      referenceDate: new Date()
    });
    items.push({
      label: "Expression / Destiny",
      value: formatNumber(profile.core.destiny),
      meaning: getNumberMeaning(profile.core.destiny)
    });
    items.push({
      label: "Soul Urge",
      value: formatNumber(profile.core.heartDesire),
      meaning: getNumberMeaning(profile.core.heartDesire)
    });
    items.push({
      label: "Personality",
      value: formatNumber(profile.core.personality),
      meaning: getNumberMeaning(profile.core.personality)
    });
  }

  return { items };
}

function buildNumerologyEmbeds(profile) {
  const { core, cycles, timing, rawTotals, includeYAsVowel } = profile;

  const coreNumbers = [
    `Life Path: **${formatNumber(core.lifePath)}**`,
    `Destiny / Expression: **${formatNumber(core.destiny)}**`,
    `Heart Desire / Soul Urge: **${formatNumber(core.heartDesire)}**`,
    `Personality: **${formatNumber(core.personality)}**`,
    `Birthday: **${formatNumber(core.birthday)}**`,
    `Maturity: **${formatNumber(core.maturity)}**`,
    `Attitude: **${formatNumber(core.attitude)}**`
  ].join("\n");

  const keyMeanings = [
    `Life Path ${formatNumber(core.lifePath)}: ${getNumberMeaning(core.lifePath)}`,
    `Destiny ${formatNumber(core.destiny)}: ${getNumberMeaning(core.destiny)}`,
    `Heart Desire ${formatNumber(core.heartDesire)}: ${getNumberMeaning(core.heartDesire)}`
  ].join("\n");

  const karmicDebtText = profile.karmicDebt.length > 0
    ? profile.karmicDebt.join("\n")
    : "No 13/14/16/19 karmic debt totals detected in the main raw sums.";

  const cyclesText = [
    `Period Cycles (Month-Day-Year): ${cycles.periodCycles.map(formatNumber).join(" | ")}`,
    `Pinnacles (1-4): ${cycles.pinnacles.map(formatNumber).join(" | ")}`,
    `Challenges (1-4): ${cycles.challenges.join(" | ")}`
  ].join("\n");

  const timingText = [
    `As of **${timing.asOf}**`,
    `Universal Year (${timing.currentYear}): **${formatNumber(timing.universalYear)}**`,
    `Personal Year: **${formatNumber(timing.personalYear)}**`,
    `Personal Month: **${formatNumber(timing.personalMonth)}**`,
    `Personal Day: **${formatNumber(timing.personalDay)}**`
  ].join("\n");

  const rawTotalsText = [
    `Life Path raw: ${rawTotals.lifePathRaw}`,
    `Destiny raw: ${rawTotals.destinyRaw}`,
    `Heart Desire raw: ${rawTotals.heartRaw}`,
    `Personality raw: ${rawTotals.personalityRaw}`
  ].join("\n");

  const profileEmbed = new EmbedBuilder()
    .setTitle("Numerology Profile")
    .setColor(0xf39c12)
    .setDescription([
      `Name: **${profile.fullName}**`,
      `Birthdate: **${profile.birth.iso}**`,
      `Y treated as vowel: **${includeYAsVowel ? "Yes" : "No"}**`
    ].join("\n"))
    .addFields(
      {
        name: "Core Numbers",
        value: coreNumbers
      },
      {
        name: "Core Meanings",
        value: keyMeanings
      },
      {
        name: "Karmic Debt Check",
        value: karmicDebtText
      }
    )
    .setFooter({ text: "Numerology is spiritual guidance, not scientific prediction." });

  const cyclesEmbed = new EmbedBuilder()
    .setTitle("Numerology Cycles and Timing")
    .setColor(0x9b59b6)
    .addFields(
      {
        name: "Cycles",
        value: cyclesText
      },
      {
        name: "Personal Timing",
        value: timingText
      },
      {
        name: "Raw Totals (for transparency)",
        value: rawTotalsText
      }
    );

  return [profileEmbed, cyclesEmbed];
}

async function registerSlashCommands() {
  const rest = new REST({ version: "10" }).setToken(botToken);
  const route = normalizedGuildId
    ? Routes.applicationGuildCommands(clientId, normalizedGuildId)
    : Routes.applicationCommands(clientId);

  await rest.put(route, { body: slashCommands.map((command) => command.toJSON()) });
  console.log(normalizedGuildId
    ? `Registered slash commands for guild ${normalizedGuildId}.`
    : "Registered global slash commands.");
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  if (!enableMessageContentIntent) {
    console.log("Message-content intent is disabled. Use slash commands like /book, /birthchart, /numerology.");
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const activeLock = getSafetyLock(interaction.user.id);
    if (activeLock && !["help", "policy", "resources"].includes(interaction.commandName)) {
      await interaction.reply(withPrivateVisibility(interaction, {
        content: buildLockMessage(activeLock)
      }));
      return;
    }

    const interactionText = extractInteractionText(interaction);
    const crisisDetection = detectCrisisSignal(interactionText);
    if (crisisDetection.flagged && !["policy", "resources"].includes(interaction.commandName)) {
      setSafetyLock(interaction.user.id, crisisDetection);

      await interaction.reply(withPrivateVisibility(interaction, {
        content: `${buildCrisisDmAlert()}\n\nCommands are temporarily locked for 48 hours.`
      }));
      return;
    }

    if (interaction.commandName === "help") {
      const embed = new EmbedBuilder()
        .setTitle("SKU Owl Bot Commands")
        .setColor(0x5865f2)
        .setDescription("Private reflection bot for numerology, astrology, and fact-based safety resources.")
        .addFields(
          {
            name: "/start",
            value: [
              "Input format:",
              "`full_name` (required), `birthdate` YYYY-MM-DD.",
              "Example: `/start full_name:Jane Doe birthdate:1995-08-14`"
            ].join("\n")
          },
          {
            name: "/studyhall",
            value: "Builds a timed study hall structure."
          },
          {
            name: "/numerology",
            value: [
              "Input format:",
              "`full_name` (required), `birthdate` YYYY-MM-DD, `include_y_as_vowel` true/false (optional).",
              "Example: `/numerology full_name:Jane Marie Doe birthdate:1995-08-14 include_y_as_vowel:true`"
            ].join("\n")
          },
          {
            name: "/birthchart",
            value: [
              "Input format:",
              "`full_name` (optional), `date` YYYY-MM-DD, `time` HH:MM (24h), `location` city/state or lat,long.",
              "Example: `/birthchart full_name:Jane Doe date:1995-08-14 time:13:45 location:Los Angeles, CA`",
              "Full report is always auto-sent by DM.",
              "Use `share_quick_reading:true` only if you want a short channel summary."
            ].join("\n")
          },
          {
            name: "/resources",
            value: "Fact-based links for hard questions (NIMH, CDC, SAMHSA, WHO, 988)."
          },
          {
            name: "/policy",
            value: `${SHORT_POLICY_TEXT}\nIf a safety lock is a false trigger, DM \`false flag\` and then \`UNLOCK\` within 5 minutes (medium-risk only).`
          }
        );

      await interaction.reply(withPrivateVisibility(interaction, { embeds: [embed] }));
      return;
    }

    if (interaction.commandName === "policy") {
      const sendDm = interaction.options.getBoolean("dm") !== false;
      const chunks = splitDiscordMessage(FULL_POLICY_TEXT);

      if (sendDm) {
        await replyChunkedPrivatelyOrDm(
          interaction,
          chunks,
          "SKU Owl sent the full Safety & Use Policy as a private response."
        );
        return;
      }

      await replyChunked(interaction, chunks);
      return;
    }

    if (interaction.commandName === "resources") {
      const sendDm = interaction.options.getBoolean("dm") !== false;
      const chunks = splitDiscordMessage(buildFactResourcesMessage());

      if (sendDm) {
        await replyChunkedPrivatelyOrDm(
          interaction,
          chunks,
          "SKU Owl sent fact-based resources as a private response."
        );
        return;
      }

      await replyChunked(interaction, chunks);
      return;
    }

    if (interaction.commandName === "book") {
      await interaction.reply(withPrivateVisibility(interaction, {
        content: buildBookReplyMessage()
      }));
      return;
    }

    if (interaction.commandName === "start") {
      const fullName = interaction.options.getString("full_name", true);
      const birthdateInput = interaction.options.getString("birthdate", true);
      const sendDm = interaction.options.getBoolean("dm") !== false;

      let profile;
      try {
        profile = calculateNumerologyProfile({
          fullName,
          birthdateInput,
          includeYAsVowel: false,
          referenceDate: new Date()
        });
      } catch (error) {
        await interaction.reply(withPrivateVisibility(interaction, {
          content: `Reading input error: ${error.message}`
        }));
        return;
      }

      const payload = { embeds: [buildBasicReadingEmbed(profile)] };

      if (sendDm) {
        await replyPrivatelyOrDm(
          interaction,
          payload,
          "SKU Owl sent your basic reading as a private response."
        );
        return;
      }

      await interaction.reply(withPrivateVisibility(interaction, payload));
      return;
    }

    if (interaction.commandName === "studyhall") {
      const minutes = interaction.options.getInteger("minutes") || 60;
      const sendDm = interaction.options.getBoolean("dm") === true;
      const embed = buildStudyHallEmbed(minutes);

      if (sendDm) {
        await replyPrivatelyOrDm(
          interaction,
          { embeds: [embed] },
          "SKU Owl sent your study hall plan as a private response."
        );
        return;
      }

      await interaction.reply(withPrivateVisibility(interaction, { embeds: [embed] }));
      return;
    }

    if (interaction.commandName === "numerology") {
      const fullName = interaction.options.getString("full_name", true);
      const birthdateInput = interaction.options.getString("birthdate", true);
      const includeYAsVowel = interaction.options.getBoolean("include_y_as_vowel") === true;
      const sendDm = interaction.options.getBoolean("dm") !== false;

      let profile;
      try {
        profile = calculateNumerologyProfile({
          fullName,
          birthdateInput,
          includeYAsVowel,
          referenceDate: new Date()
        });
      } catch (error) {
        await interaction.reply(withPrivateVisibility(interaction, {
          content: `Numerology input error: ${error.message}`
        }));
        return;
      }

      const payload = { embeds: buildNumerologyEmbeds(profile) };

      if (sendDm) {
        await replyPrivatelyOrDm(
          interaction,
          payload,
          "SKU Owl sent your numerology report as a private response."
        );
        return;
      }

      await interaction.reply(withPrivateVisibility(interaction, payload));
      return;
    }

    if (interaction.commandName === "birthchart") {
      const waitSeconds = getBirthchartRateLimitSeconds(interaction.user.id);
      if (waitSeconds > 0) {
        await interaction.reply(withPrivateVisibility(interaction, {
          content: `Please wait ${waitSeconds}s before requesting another birth chart.`
        }));
        return;
      }

      const fullName = interaction.options.getString("full_name");
      const date = interaction.options.getString("date", true);
      const time = interaction.options.getString("time", true);
      const location = interaction.options.getString("location", true);
      const system = interaction.options.getString("system") || "tropical";
      const houseSystem = interaction.options.getString("house_system") || "whole_sign";
      const languageStyle = interaction.options.getString("language_style") || "SKU Owl chill";
      const shareQuickReading = interaction.options.getBoolean("share_quick_reading") === true;

      await interaction.deferReply(withPrivateVisibility(interaction, {}));

      let chart;
      try {
        chart = await calculateBirthchart({
          date,
          time,
          location,
          system,
          houseSystem,
          nominatimUserAgent,
          googleMapsApiKey,
          openCageApiKey,
          swissephPath
        });
      } catch (error) {
        await interaction.editReply(withPrivateVisibility(interaction, {
          content: `Birth chart input issue: ${error.message}`
        }));
        return;
      }

      const report = formatBirthchartMessage(chart, languageStyle, fullName || "");
      const numerology = buildNumerologyForReport({
        birthdateInput: date,
        fullName: fullName || ""
      });
      const htmlReport = buildBirthchartHtmlReport(chart, {
        languageStyle,
        fullName: fullName || "",
        numerology,
        calendlyUrl: kervinCalendlyUrl,
        disclaimer: "SKU Owl is a reflection companion for education and self-awareness. It is not therapy, medical care, or crisis treatment."
      });
      const fileName = `${(fullName || "birthchart").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "birthchart"}-report.html`;
      const htmlAttachment = new AttachmentBuilder(Buffer.from(htmlReport, "utf8"), {
        name: fileName
      });

      try {
        await interaction.user.send({
          content: [
            "Your private SKU Owl birthchart report is ready.",
            "Open the attached HTML file in your browser.",
            "",
            "Input format reminder:",
            "- Full name: optional",
            "- Birthday: YYYY-MM-DD",
            "- Time of birth: HH:MM (24h)",
            "- Place of birth: city/state or lat,long"
          ].join("\n"),
          files: [htmlAttachment]
        });
      } catch (error) {
        await interaction.editReply(withPrivateVisibility(interaction, {
          content: "I couldn't DM your report. Please enable DMs from server members, then run `/birthchart` again."
        }));
        return;
      }

      await interaction.editReply(withPrivateVisibility(interaction, {
        content: "Your full private birthchart report was sent to your DMs."
      }));

      if (shareQuickReading && interaction.inGuild()) {
        await interaction.followUp({
          content: [
            `${interaction.user} asked for a quick reading preview:`,
            report.split("\n\n")[0]
          ].join("\n")
        });
      }
      return;
    }
  } catch (error) {
    console.error("Interaction error:", error);

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply(withPrivateVisibility(interaction, {
        content: "Something went wrong while processing that command."
      }));
      return;
    }

    if (interaction.isRepliable()) {
      await interaction.followUp(withPrivateVisibility(interaction, {
        content: "Something went wrong while processing that command."
      }));
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (!enableMessageContentIntent) {
      return;
    }

    if (message.author.bot) {
      return;
    }

    const content = (message.content || "").trim();
    const contentLower = content.toLowerCase();
    const lock = getSafetyLock(message.author.id);

    const falseFlagWindow = falseFlagConfirmByUser.get(message.author.id);
    if (!message.guildId && falseFlagWindow && contentLower === "unlock") {
      falseFlagConfirmByUser.delete(message.author.id);
      if (falseFlagWindow.until < Date.now()) {
        await message.reply("False-flag unlock window expired. Send `false flag` again to retry.");
        return;
      }

      safetyLockByUser.delete(message.author.id);
      await message.reply("Unlock review completed. Access is restored. Please continue using SKU Owl safely.");
      return;
    }

    if (!message.guildId && ["false flag", "falseflag", "appeal lock"].includes(contentLower)) {
      if (!lock) {
        await message.reply("No active safety lock found on your account.");
        return;
      }

      if (lock.severity === "high") {
        await message.reply([
          "This lock was triggered by high-risk language and cannot be auto-unlocked.",
          "If this was a mistake, wait for the 48-hour reset.",
          "If you are in distress now, call or text 988."
        ].join("\n"));
        return;
      }

      falseFlagConfirmByUser.set(message.author.id, {
        until: Date.now() + FALSE_FLAG_CONFIRM_MS
      });
      await message.reply("False-flag review started. If this was accidental, reply `UNLOCK` within 5 minutes.");
      return;
    }

    const crisisDetection = detectCrisisSignal(content);
    if (crisisDetection.flagged) {
      setSafetyLock(message.author.id, crisisDetection);
      falseFlagConfirmByUser.delete(message.author.id);
      await message.reply("Safety alert triggered. If you are in immediate danger, call or text 988 now. A 48-hour safety lock is active.");
      return;
    }

    const bookingIntent = isBookIntent(content);
    if (lock && bookingIntent) {
      await message.reply(buildLockMessage(lock));
      return;
    }

    if (bookingIntent) {
      await message.reply(buildBookReplyMessage());
    }
  } catch (error) {
    console.error("Message safety/booking flow error:", error);
  }
});

(async () => {
  try {
    await registerSlashCommands();
    await client.login(botToken);
  } catch (error) {
    console.error("Bot startup failed:", error);
    process.exit(1);
  }
})();
