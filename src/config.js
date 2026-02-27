const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const botToken = (process.env.BOT_TOKEN || "").trim();
const clientId = (process.env.CLIENT_ID || "").trim();
const guildId = (process.env.GUILD_ID || "").trim();

module.exports = {
  botToken,
  clientId,
  guildId,
  nominatimUserAgent: (process.env.NOMINATIM_USER_AGENT || "SKUOwlBirthchartBot/1.0 (contact@example.com)").trim(),
  swissephPath: (process.env.SWISSEPH_PATH || "").trim(),
  googleMapsApiKey: (process.env.GOOGLE_MAPS_API_KEY || "").trim(),
  openCageApiKey: (process.env.OPENCAGE_API_KEY || "").trim(),
  kervinCalendlyUrl: (process.env.KERVIN_CALENDLY_URL || "https://calendly.com/kervinheart").trim(),
  kervinUserId: (process.env.KERVIN_USER_ID || "").trim(),
  enableMessageContentIntent: (process.env.ENABLE_MESSAGE_CONTENT_INTENT || "false").trim().toLowerCase() === "true"
};
