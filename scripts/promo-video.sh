#!/usr/bin/env bash
# Records and encodes the 12 s promo for X. Captions and the end card are drawn by the game
# itself in `?record` mode (src/components/Recorder.tsx), so this only captures and encodes.
# usage: scripts/promo-video.sh <out.mp4> [es|en] [link-host] [vertical]
# Needs the dev server: bun run dev --port 5199
set -euo pipefail
OUT=$1
LANG_CODE=${2:-es}
LINK=${3:-minimart-lab.pages.dev}
EXTRA=${4:+&$4}
FRAMES=$(mktemp -d)
trap 'rm -rf "$FRAMES"' EXIT

bun "$(dirname "$0")/record-promo.ts" "$FRAMES" 360 \
  "http://localhost:5199/?reset&unlock=all&sim=300&fill&autoplay&record&lang=$LANG_CODE&link=$LINK$EXTRA"
ffmpeg -y -hide_banner -loglevel error -framerate 30 -i "$FRAMES/f%04d.jpg" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart "$OUT"
echo "wrote $OUT ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s)"
