#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
STAGE_DIR="$DIST_DIR/stage"
STAMP="$(date +"%Y%m%d-%H%M%S")"
PKG_NAME="SKU-Discord-bot-$STAMP"
PKG_DIR="$STAGE_DIR/$PKG_NAME"

mkdir -p "$PKG_DIR"
rm -rf "$PKG_DIR"/*

copy_item() {
  local src="$1"
  if [[ -e "$ROOT_DIR/$src" ]]; then
    cp -R "$ROOT_DIR/$src" "$PKG_DIR/"
  fi
}

copy_item "src"
copy_item "scripts"
copy_item "ops"
copy_item ".github"
copy_item "README.md"
copy_item "package.json"
copy_item "package-lock.json"
copy_item ".env.example"
copy_item ".gitignore"
copy_item "start.command"
copy_item "stop.command"

mkdir -p "$DIST_DIR"
ZIP_PATH="$DIST_DIR/$PKG_NAME.zip"
(
  cd "$STAGE_DIR"
  rm -f "$ZIP_PATH"
  zip -r "$ZIP_PATH" "$PKG_NAME" >/dev/null
)

rm -rf "$PKG_DIR"
echo "Release package created: $ZIP_PATH"
