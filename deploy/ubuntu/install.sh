#!/usr/bin/env bash
# Install an rgit-web release archive and restart systemd.
#
#   sudo RGIT_WEB_ARCHIVE=/path/to/rgit-web-<tag>-x86_64-unknown-linux-gnu.tar.gz ./install.sh [tag]
set -euo pipefail

SCRIPT_DIR=""
if [[ -n "${BASH_SOURCE[0]:-}" && -f "${BASH_SOURCE[0]}" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

TAG="${1:-${RGIT_WEB_TAG:-}}"
HEALTH_URL="${RGIT_WEB_HEALTH_URL:-http://127.0.0.1:3010/api/health}"
HTML_URL="${RGIT_WEB_HTML_URL:-http://127.0.0.1:3010/}"
ARCHIVE_PATH="${RGIT_WEB_ARCHIVE:-}"
PREFIX="${RGIT_WEB_PREFIX:-/opt/rgit-web}"
KEEP_RELEASES="${RGIT_WEB_KEEP_RELEASES:-5}"
HEALTH_ATTEMPTS="${RGIT_WEB_HEALTH_ATTEMPTS:-60}"

if [[ "$(id -u)" -ne 0 ]]; then
  exec sudo --preserve-env=RGIT_WEB_TAG,RGIT_WEB_HEALTH_URL,RGIT_WEB_HTML_URL,RGIT_WEB_ARCHIVE,RGIT_WEB_PREFIX,RGIT_WEB_KEEP_RELEASES,RGIT_WEB_HEALTH_ATTEMPTS,RGIT_WEB_DOMAIN,RGIT_WEB_CADDY_DIR,RGIT_WEB_CADDY_ENV,RGIT_WEB_TLS_DIR,CADDY_EMAIL "$0" "$@"
fi

if [[ -z "$ARCHIVE_PATH" || ! -f "$ARCHIVE_PATH" ]]; then
  echo "set RGIT_WEB_ARCHIVE to a release tarball on this machine (the server does not fetch GitHub)" >&2
  exit 1
fi

id -u rgit-web >/dev/null 2>&1 || {
  echo "rgit-web user is missing; run bootstrap.sh first" >&2
  exit 1
}

RELEASES="${PREFIX}/releases"
install -d -m 0755 "$PREFIX" "$RELEASES"

SUM="${ARCHIVE_PATH}.sha256"
if [[ -f "$SUM" ]]; then
  expected="$(awk '{print $1}' "$SUM")"
  actual="$(sha256sum "$ARCHIVE_PATH" | awk '{print $1}')"
  if [[ "$expected" != "$actual" ]]; then
    echo "checksum mismatch for ${ARCHIVE_PATH}" >&2
    exit 1
  fi
fi

STAGE="${RELEASES}/.unpack-$$"
rm -rf "$STAGE"
mkdir -p "$STAGE"
cleanup_stage() {
  if [[ -n "${STAGE:-}" && -d "$STAGE" ]]; then
    rm -rf "$STAGE"
  fi
}
trap cleanup_stage EXIT
tar -xzf "$ARCHIVE_PATH" -C "$STAGE"

if [[ ! -x "${STAGE}/bin/bun" || ! -f "${STAGE}/src/index.ts" || ! -d "${STAGE}/node_modules" || ! -f "${STAGE}/dist/index.js" ]]; then
  echo "archive is missing bun, src/index.ts, node_modules, or dist/index.js" >&2
  exit 1
fi

if [[ -z "$TAG" && -f "${STAGE}/BUILD" ]]; then
  # shellcheck disable=SC1091
  TAG="$(awk -F= '/^TAG=/ {print $2}' "${STAGE}/BUILD")"
fi
if [[ -z "$TAG" ]]; then
  TAG="release-$(date -u +%Y%m%dT%H%M%SZ)"
fi

SAFE_TAG="${TAG//\//-}"
TARGET="${RELEASES}/${SAFE_TAG}"
if [[ -e "$TARGET" ]]; then
  rm -rf "$TARGET"
fi
mv "$STAGE" "$TARGET"
STAGE=""
trap - EXIT
chown -R rgit-web:rgit-web "$TARGET"
chmod 0755 "${TARGET}/bin/bun"

if [[ -f "${TARGET}/BUILD" ]]; then
  install -d -m 0750 /etc/rgit-web
  awk -F= '
    /^VERSION=/ { version=$2 }
    /^REVISION_SHORT=/ { revision=$2 }
    END {
      if (version != "") print "RGIT_WEB_VERSION=" version
      if (revision != "") print "RGIT_WEB_REVISION=" revision
    }
  ' "${TARGET}/BUILD" >/etc/rgit-web/version.env
  chmod 0644 /etc/rgit-web/version.env
fi

NEW_LINK="${PREFIX}/current.new"
ln -sfn "$TARGET" "$NEW_LINK"
mv -Tf "$NEW_LINK" "${PREFIX}/current"

mapfile -t dirs < <(find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -printf '%T@\t%p\n' | sort -nr | cut -f2-)
if ((${#dirs[@]} > KEEP_RELEASES)); then
  for ((i = KEEP_RELEASES; i < ${#dirs[@]}; i++)); do
    if [[ "${dirs[i]}" != "$TARGET" ]]; then
      rm -rf "${dirs[i]}"
    fi
  done
fi

should_configure_caddy=0
if [[ -n "$SCRIPT_DIR" && -f "${SCRIPT_DIR}/configure-caddy.sh" ]]; then
  if [[ -n "${RGIT_WEB_CADDY_DIR:-}" ]]; then
    should_configure_caddy=1
  elif [[ "$(id -u)" -eq 0 && -d /etc/caddy ]]; then
    should_configure_caddy=1
  fi
fi
if [[ "$should_configure_caddy" -eq 1 ]]; then
  bash "${SCRIPT_DIR}/configure-caddy.sh"
  if command -v systemctl >/dev/null && systemctl cat caddy.service >/dev/null 2>&1; then
    systemctl reload caddy.service 2>/dev/null || systemctl restart caddy.service
  fi
  if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -qi '^Status: active'; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 443/udp
  fi
fi

if [[ -n "$SCRIPT_DIR" && -f "${SCRIPT_DIR}/rgit-web.service" ]]; then
  cp "${SCRIPT_DIR}/rgit-web.service" /etc/systemd/system/rgit-web.service
  chmod 0644 /etc/systemd/system/rgit-web.service
elif ! systemctl cat rgit-web.service >/dev/null 2>&1; then
  echo "release installed at ${PREFIX}/current; run bootstrap.sh to install the systemd unit"
  exit 0
fi

systemctl daemon-reload
systemctl enable --now rgit-web.service
systemctl restart rgit-web.service

html_ok=0
for _ in $(seq 1 "$HEALTH_ATTEMPTS"); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    html="$(curl -fsS "$HTML_URL" || true)"
    if grep -q 'id="root"' <<<"$html"; then
      curl -fsS "$HEALTH_URL"
      echo
      echo "rgit-web ${TAG} is healthy"
      html_ok=1
      break
    fi
  fi
  sleep 1
done
if [[ "$html_ok" -eq 1 ]]; then
  exit 0
fi

echo "rgit-web installed but ${HEALTH_URL} did not become ready or ${HTML_URL} had no HTML shell" >&2
systemctl status rgit-web.service --no-pager >&2 || true
journalctl -u rgit-web.service -n 80 --no-pager >&2 || true
exit 1
