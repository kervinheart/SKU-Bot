# SKU Owl Discord Bot

`SKU Owl` is a `discord.js v14` bot with a `/birthchart` command that generates a self-contained HTML report (astrology + numerology) and returns it as a downloadable file in the interaction response.

## Stack

- Language: Node.js
- Library: discord.js v14
- Astrology engine: Swiss Ephemeris (`swisseph`, local calculations)
- Geocoding: OpenStreetMap Nominatim + Open-Meteo fallback
- Timezone from lat/long: `tz-lookup`
- DST handling: `@js-temporal/polyfill`

## File structure

```text
studyhall-discord-bot/
  src/
    index.js          # bot setup, slash commands, handlers, rate limit, safety lock
    birthchart.js     # astrology math + HTML report generator
    numerology.js     # numerology calculations and meanings
    config.js         # env loader
    policy.js         # safety/use policy text
  .env.example
  package.json
```

## Install

```bash
cd "/Users/shango/Documents/kervinheart llc/projects/studyhall-discord-bot"
npm install
```

## Environment

Copy `.env.example` to `.env`:

```env
BOT_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_client_id
GUILD_ID=optional_test_server_guild_id
NOMINATIM_USER_AGENT=SKUOwlBirthchartBot/1.0 (you@example.com)
SWISSEPH_PATH=
GOOGLE_MAPS_API_KEY=
OPENCAGE_API_KEY=
KERVIN_CALENDLY_URL=https://calendly.com/kervinheart
KERVIN_USER_ID=
ENABLE_MESSAGE_CONTENT_INTENT=false
```

Notes:

- `CLIENT_ID` must be numeric (Discord application ID).
- `GUILD_ID` is optional for fast local command refresh.
- `SWISSEPH_PATH` can stay empty if using built-in ephemeris mode.
- For higher geocoding reliability, set `GOOGLE_MAPS_API_KEY` and/or `OPENCAGE_API_KEY`.
- Provider fallback order is: local fallback -> Google (if key) -> OpenCage (if key) -> Nominatim -> Open-Meteo.
- Location lookups are cached in-memory for 24 hours to reduce repeated lookup failures and rate limits.
- Set `ENABLE_MESSAGE_CONTENT_INTENT=true` only if you enabled Message Content Intent in Discord Developer Portal.

## Run locally

```bash
npm start
```

## One-click launcher (Mac)

- Double-click `start.command` to run preflight + start the bot.
- Double-click `stop.command` to stop the bot process.

## Main command: `/birthchart`

Required inputs:

- `date` (`YYYY-MM-DD`)
- `time` (`HH:MM`, 24h)
- `location` (`city,state` or `lat,long`)

Optional inputs:

- `full_name`
- `system`: `tropical` (default) | `sidereal`
- `house_system`: `whole_sign` (default) | `placidus`
- `language_style`

Additional command:

- `/book` returns the private reading booking link (works without privileged message intents).

## What `/birthchart` computes

- Sun sign + house
- Moon sign + house
- Rising sign
- Mercury / Venus / Mars sign + house
- House cusps 1-12
- Planets in houses list
- Chart ruler with sign + house
- Dominant houses (top 2 by count, tie-broken by personal-planet weight)
- Superpower placement (tight aspect to Asc/MC or strongest angular placement)
- Lesson placement (strong Saturn challenge or Saturn placement)
- Numerology:
  - Life Path
  - Birthday
  - Expression/Destiny (if name provided)
  - Soul Urge (if name provided)
  - Personality (if name provided)
  - Personal Year

## HTML output contract

The first 5 sentences of the report are:

1. Big 3 (Sun/Moon/Rising with houses for Sun/Moon)
2. Chart ruler placement
3. Focus zone (dominant houses + themes)
4. Superpower placement
5. Main lesson placement

Then sections:

- Key placements
- Houses 1-12 breakdown
- Numerology section
- Safety/use disclaimer
- Calendly booking CTA

## Rate limit + validation

- Rate limit: 1 `/birthchart` request per user per 30 seconds
- Friendly errors for:
  - invalid date/time
  - location lookup issues
  - timezone conversion issues
  - DST edge cases

## Sample command

```text
/birthchart date:1994-12-21 time:09:57 location:fort pierce, fl system:tropical house_system:whole_sign full_name:Jane Doe
```

## Sample output (first 5 sentences)

```text
🦉✨ Big 3 check: Sun in Sagittarius House 2, Moon in Aries House 6, and Rising in Scorpio.
Chart ruler check: Mars is in Aquarius House 4.
Focus zone: Houses 2 and 4 are most activated, so themes of money/values and home/foundation are front and center.
Superpower placement: Mercury in Sagittarius House 2 is your leverage point; tight 0° aspect to Asc (orb 1.2°).
Main lesson placement: Saturn in Pisces House 5 is your growth edge; Moon-Saturn 90° challenge (orb 2.1°).
```

## Deployment notes

You can deploy this bot to Render/Railway/VPS:

1. Push repo
2. Set env vars from `.env.example`
3. Start command: `npm start`
4. Ensure outbound network access is allowed for geocoding endpoints

## Auto patching with backup + rollback

This repo now includes an automatic patching flow that:

1. Creates a timestamped backup tar before update.
2. Pulls latest code.
3. Runs dependency security patching (`npm audit fix --omit=dev`).
4. Runs syntax and smoke tests.
5. Restarts the bot service.
6. If any step fails, it auto-rolls back to the previous git commit and writes a failure report.

Files:

- `ops/auto-patch-and-rollback.sh`
- `ops/systemd/sku-owl-autopatch.service`
- `ops/systemd/sku-owl-autopatch.timer`
- `scripts/smoke-test.js`

Manual run:

```bash
npm run autopatch
```

## Create a release zip package

Build a clean downloadable package:

```bash
npm run package:release
```

Output:

- `dist/SKU-Discord-bot-YYYYMMDD-HHMMSS.zip`

### Enable unattended auto patching on Linux (systemd)

On your server (example path `/opt/sku-owl`):

```bash
sudo cp ops/systemd/sku-owl-autopatch.service /etc/systemd/system/
sudo cp ops/systemd/sku-owl-autopatch.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now sku-owl-autopatch.timer
sudo systemctl status sku-owl-autopatch.timer
```

Logs and reports:

- Logs: `logs/autopatch/`
- Backups: `backups/`
- Failure reports: `reports/autopatch/`

### GitHub repo auto patch PRs

Workflow file:

- `.github/workflows/auto-dependency-patch.yml`

It runs daily, applies safe dependency patches, runs checks, and opens an automated PR.
