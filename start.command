#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "Starting SKU Owl from: $ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install Node 20 first."
  read -r -p "Press Enter to close..."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not installed."
  read -r -p "Press Enter to close..."
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "node_modules not found. Running npm install..."
  npm install
fi

echo "Running preflight checks..."
npm run preflight

echo "Starting bot..."
npm start
