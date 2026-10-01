#!/bin/sh
set -e

# Platforms change constantly and yt-dlp ships fixes within days, so refresh it
# on every start. A failed update (e.g. no network) falls back to the installed version.
if [ "${YTDLP_AUTO_UPDATE:-true}" = "true" ]; then
  echo "[yoink] updating yt-dlp..."
  timeout 180 /opt/yt-dlp/bin/pip install --no-cache-dir --quiet --upgrade "yt-dlp[default,curl-cffi]" \
    || echo "[yoink] yt-dlp update failed; using installed version"
fi
echo "[yoink] yt-dlp $(/opt/yt-dlp/bin/yt-dlp --version)"

exec node_modules/.bin/next start
