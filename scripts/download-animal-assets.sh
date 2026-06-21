#!/usr/bin/env bash
set -euo pipefail

REPO="${PETPET_ASSET_REPO:-zhaotao19860/petpet}"
TAG="${PETPET_ASSET_TAG:-petpet-animal-assets-20260621}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to download petpet animal assets." >&2
  exit 1
fi

echo "Downloading petpet animal assets from ${REPO} release ${TAG}..."
mkdir -p "$ROOT_DIR/web/public/assets/animals"

api_url="https://api.github.com/repos/${REPO}/releases/tags/${TAG}"
assets_json="$TMP_DIR/assets.json"
curl -fsSL "$api_url" -o "$assets_json"

node - "$assets_json" "$TMP_DIR/urls.txt" <<'NODE'
const fs = require('fs');
const releasePath = process.argv[2];
const outPath = process.argv[3];
const release = JSON.parse(fs.readFileSync(releasePath, 'utf8'));
const urls = (release.assets || [])
  .filter((asset) => /^petpet-animal-assets-.+\.tar\.gz$/.test(asset.name))
  .map((asset) => asset.browser_download_url);
if (urls.length === 0) {
  console.error('No petpet animal asset archives found in release.');
  process.exit(1);
}
fs.writeFileSync(outPath, `${urls.join('\n')}\n`);
NODE

count=0
while IFS= read -r url; do
  [ -n "$url" ] || continue
  file="$TMP_DIR/$(basename "$url")"
  echo "Downloading $(basename "$url")..."
  curl -fL --retry 5 --retry-delay 2 --connect-timeout 20 "$url" -o "$file"
  tar -xzf "$file" -C "$ROOT_DIR"
  count=$((count + 1))
done < "$TMP_DIR/urls.txt"

echo "Restored ${count} animal asset archive(s)."
