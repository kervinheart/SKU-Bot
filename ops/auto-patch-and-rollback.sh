#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
SERVICE_NAME="${SERVICE_NAME:-sku-owl}"
LOG_DIR="${LOG_DIR:-$APP_DIR/logs/autopatch}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
REPORT_DIR="${REPORT_DIR:-$APP_DIR/reports/autopatch}"

mkdir -p "$LOG_DIR" "$BACKUP_DIR" "$REPORT_DIR"

TS="$(date +"%Y%m%d-%H%M%S")"
RUN_LOG="$LOG_DIR/run-$TS.log"
FAIL_REPORT="$REPORT_DIR/failure-$TS.txt"

exec > >(tee -a "$RUN_LOG") 2>&1

echo "== SKU Owl autopatch started at $(date -Is) =="
cd "$APP_DIR"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required for rollback."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required."
  exit 1
fi

PREV_COMMIT="$(git rev-parse HEAD)"
BACKUP_TAR="$BACKUP_DIR/sku-owl-$TS.tar.gz"

echo "Creating backup archive: $BACKUP_TAR"
tar \
  --exclude="./node_modules" \
  --exclude="./.git" \
  --exclude="./backups" \
  --exclude="./logs" \
  --exclude="./reports" \
  -czf "$BACKUP_TAR" .

rollback() {
  local reason="$1"
  echo "Update failed: $reason"
  echo "Rolling back to commit $PREV_COMMIT"

  {
    echo "SKU Owl AutoPatch Failure Report"
    echo "Timestamp: $(date -Is)"
    echo "Reason: $reason"
    echo "Previous commit: $PREV_COMMIT"
    echo "Current commit: $(git rev-parse HEAD || true)"
    echo
    echo "Last 200 lines of run log:"
    tail -n 200 "$RUN_LOG"
  } >"$FAIL_REPORT"

  git reset --hard "$PREV_COMMIT"

  if [[ -f package-lock.json ]]; then
    npm ci || npm install
  else
    npm install
  fi

  if command -v systemctl >/dev/null 2>&1; then
    sudo systemctl restart "$SERVICE_NAME" || true
  fi

  echo "Rollback completed. Failure report saved: $FAIL_REPORT"
  exit 1
}

trap 'rollback "unexpected shell error on line $LINENO"' ERR

echo "Pulling latest source"
git fetch --all --prune
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
git pull --ff-only origin "$CURRENT_BRANCH"

echo "Installing dependencies"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

echo "Applying security patches"
npm audit fix --omit=dev || true

echo "Running syntax + smoke tests"
npm run check
npm run smoke

if command -v systemctl >/dev/null 2>&1; then
  echo "Restarting service: $SERVICE_NAME"
  sudo systemctl restart "$SERVICE_NAME"
  sleep 8
  if ! systemctl is-active --quiet "$SERVICE_NAME"; then
    rollback "service failed after restart"
  fi
fi

echo "Autopatch completed successfully at $(date -Is)"
echo "Previous commit: $PREV_COMMIT"
echo "Current commit: $(git rev-parse HEAD)"
