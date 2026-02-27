const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const envPath = path.join(projectRoot, ".env");
const envExamplePath = path.join(projectRoot, ".env.example");

function parseEnv(filePath) {
  const map = new Map();
  if (!fs.existsSync(filePath)) {
    return map;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const idx = line.indexOf("=");
    if (idx <= 0) {
      continue;
    }

    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    map.set(key, value);
  }

  return map;
}

function main() {
  const errors = [];

  if (!fs.existsSync(envPath)) {
    errors.push("Missing .env file. Copy .env.example to .env and fill values.");
  }

  if (!fs.existsSync(envExamplePath)) {
    errors.push("Missing .env.example file.");
  }

  const env = parseEnv(envPath);
  const botToken = env.get("BOT_TOKEN") || "";
  const clientId = env.get("CLIENT_ID") || "";

  if (!botToken) {
    errors.push("BOT_TOKEN is required in .env.");
  }
  if (!clientId || !/^\d{17,20}$/.test(clientId)) {
    errors.push("CLIENT_ID is required and must be a numeric Discord app ID.");
  }

  if (errors.length > 0) {
    console.error("Preflight failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("Preflight passed.");
}

main();
