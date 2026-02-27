#!/bin/bash
set -euo pipefail

echo "Stopping SKU Owl..."

if pgrep -f "node src/index.js" >/dev/null 2>&1; then
  pkill -f "node src/index.js"
  echo "SKU Owl stopped."
else
  echo "No running SKU Owl process found."
fi

read -r -p "Press Enter to close..."
