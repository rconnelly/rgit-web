#!/usr/bin/env bash
# First-time Ubuntu host setup for rgit-web.
# Must run from a copy of deploy/ubuntu on the server (scp from push.sh).
#
#   sudo RGIT_WEB_ARCHIVE=/path/to/rgit-web-<tag>-<target>.tar.gz ./bootstrap.sh [tag]
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "run as root" >&2
  exit 1
fi

TAG="${1:-}"
DOMAIN="${RGIT_WEB_DOMAIN:-}"
CADDY_EMAIL="${CADDY_EMAIL:-}"
ARCHIVE_PATH="${RGIT_WEB_ARCHIVE:-}"
ENABLE_UFW="${RGIT_WEB_ENABLE_UFW:-}"
TLS_CERT_SRC="${RGIT_WEB_TLS_CERT:-}"
TLS_KEY_SRC="${RGIT_WEB_TLS_KEY:-}"
TLS_MODE="${RGIT_WEB_TLS:-}"
if [[ -n "$TLS_MODE" ]]; then
  TLS_MODE="${TLS_MODE,,}"
  if [[ "$TLS_MODE" != "lan" && "$TLS_MODE" != "internal" ]]; then
    echo "RGIT_WEB_TLS must be lan (Caddy local CA on a private network)" >&2
    exit 1
  fi
fi

SCRIPT_DIR=""
if [[ -n "${BASH_SOURCE[0]:-}" && -f "${BASH_SOURCE[0]}" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi
if [[ -z "$SCRIPT_DIR" ]]; then
  echo "bootstrap must be run from a file path (do not pipe from curl on a private repo)." >&2
  exit 1
fi

need() {
  local name="$1"
  if [[ ! -f "${SCRIPT_DIR}/${name}" ]]; then
    echo "missing ${SCRIPT_DIR}/${name}" >&2
    exit 1
  fi
}

need rgit-web.service
need rgit-web.env.example
need rgit-web.caddy
need install.sh
need configure-caddy.sh

export DEBIAN_FRONTEND=noninteractive
apt-get update || echo "warning: apt-get update failed; continuing from existing package lists" >&2
apt-get install -y --no-install-recommends ca-certificates curl tar caddy

id -u rgit-web >/dev/null 2>&1 || useradd --system --home /var/lib/rgit-web --shell /usr/sbin/nologin rgit-web
install -d -m 0755 -o rgit-web -g rgit-web /var/lib/rgit-web /var/cache/rgit-web
install -d -m 0750 /etc/rgit-web

if id -u rabun-git >/dev/null 2>&1; then
  usermod -aG rabun-git rgit-web
  chmod -R g+rX /var/lib/rabun-git 2>/dev/null || true
  chmod g+rwX /var/lib/rabun-git 2>/dev/null || true
  if [[ -f /etc/rabun-git/rabun-git.env ]]; then
    chgrp rabun-git /etc/rabun-git/rabun-git.env || true
    chmod 0640 /etc/rabun-git/rabun-git.env || true
  fi
else
  echo "warning: rabun-git user is missing; install the forge before browsing repos" >&2
fi

if [[ ! -f /etc/rgit-web/rgit-web.env ]]; then
  cp "${SCRIPT_DIR}/rgit-web.env.example" /etc/rgit-web/rgit-web.env
  chmod 0640 /etc/rgit-web/rgit-web.env
  chown root:rgit-web /etc/rgit-web/rgit-web.env
fi

cp "${SCRIPT_DIR}/rgit-web.service" /etc/systemd/system/rgit-web.service
chmod 0644 /etc/systemd/system/rgit-web.service

if [[ -n "$TLS_CERT_SRC" && -f "$TLS_CERT_SRC" && -n "$TLS_KEY_SRC" && -f "$TLS_KEY_SRC" ]]; then
  install -d -m 0750 /etc/rgit-web/tls
  install -m 0640 "$TLS_CERT_SRC" /etc/rgit-web/tls/fullchain.pem
  install -m 0640 "$TLS_KEY_SRC" /etc/rgit-web/tls/privkey.pem
  chown -R root:caddy /etc/rgit-web/tls 2>/dev/null || chown -R root:root /etc/rgit-web/tls
fi

if [[ -n "$DOMAIN" ]]; then
  export RGIT_WEB_DOMAIN="$DOMAIN"
  export RGIT_WEB_TLS="$TLS_MODE"
  export CADDY_EMAIL
  bash "${SCRIPT_DIR}/configure-caddy.sh"
  if command -v systemctl >/dev/null && systemctl cat caddy.service >/dev/null 2>&1; then
    systemctl enable --now caddy.service
    systemctl reload caddy.service 2>/dev/null || systemctl restart caddy.service
  fi
fi

systemctl daemon-reload
systemctl enable rgit-web.service

if command -v ufw >/dev/null 2>&1; then
  if ufw status 2>/dev/null | grep -q "Status: active"; then
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
    ufw allow 443/udp || true
  elif [[ "$ENABLE_UFW" == "1" || "$ENABLE_UFW" == "true" ]]; then
    ufw allow OpenSSH || ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 443/udp
    ufw --force enable
  fi
fi

if [[ -z "$ARCHIVE_PATH" ]]; then
  echo "bootstrap finished without a binary; copy a release tarball and run:" >&2
  echo "  sudo RGIT_WEB_ARCHIVE=/path/to/rgit-web-<tag>-<target>.tar.gz ${SCRIPT_DIR}/install.sh ${TAG:-vX.Y.Z}" >&2
  exit 0
fi

RGIT_WEB_ARCHIVE="$ARCHIVE_PATH" bash "${SCRIPT_DIR}/install.sh" ${TAG:+"$TAG"}

echo
echo "bootstrap complete."
echo "  unit: systemctl status rgit-web"
echo "  Set a web password on the forge: rgit user passwd USER --password …"
