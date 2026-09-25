#!/usr/bin/env bash
# Install the rgit-web virtual host into Caddy without replacing other sites.
#
#   sudo ./configure-caddy.sh
#
# Env:
#   RGIT_WEB_DOMAIN      hostname (default git.burton.work, or last value in caddy.env)
#   RGIT_WEB_TLS         lan|internal uses Caddy's local CA
#   RGIT_WEB_CADDY_DIR   Caddy config dir (default /etc/caddy)
#   RGIT_WEB_CADDY_ENV   persisted hostname (default /etc/rgit-web/caddy.env)
#   RGIT_WEB_TLS_DIR     custom cert pair (default /etc/rgit-web/tls)
#   CADDY_EMAIL          optional ACME contact
set -euo pipefail

SCRIPT_DIR=""
if [[ -n "${BASH_SOURCE[0]:-}" && -f "${BASH_SOURCE[0]}" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi
if [[ -z "$SCRIPT_DIR" || ! -f "${SCRIPT_DIR}/rgit-web.caddy" ]]; then
  echo "configure-caddy.sh must sit next to rgit-web.caddy" >&2
  exit 1
fi

CADDY_DIR="${RGIT_WEB_CADDY_DIR:-/etc/caddy}"
CADDY_ENV="${RGIT_WEB_CADDY_ENV:-/etc/rgit-web/caddy.env}"
TLS_DIR="${RGIT_WEB_TLS_DIR:-/etc/rgit-web/tls}"
SNIPPET="${CADDY_DIR}/sites-enabled/rgit-web.caddy"
CADDYFILE="${CADDY_DIR}/Caddyfile"
IMPORT_LINE="import ${CADDY_DIR}/sites-enabled/*"

load_caddy_env() {
  if [[ -f "$CADDY_ENV" ]]; then
    # shellcheck disable=SC1090
    source "$CADDY_ENV"
  fi
}

tls_is_lan() {
  local mode="${RGIT_WEB_TLS:-}"
  [[ "${mode,,}" == "lan" || "${mode,,}" == "internal" ]]
}

resolve_persisted() {
  local explicit_domain="${RGIT_WEB_DOMAIN:-}"
  local explicit_tls="${RGIT_WEB_TLS:-}"
  load_caddy_env
  if [[ -n "$explicit_domain" ]]; then
    RGIT_WEB_DOMAIN="$explicit_domain"
  fi
  if [[ -n "$explicit_tls" ]]; then
    RGIT_WEB_TLS="$explicit_tls"
  fi
}

resolve_domain() {
  if [[ -n "${RGIT_WEB_DOMAIN:-}" ]]; then
    printf '%s' "$RGIT_WEB_DOMAIN"
    return
  fi
  printf '%s' "git.burton.work"
}

caddyfile_is_replaceable() {
  local f="$1"
  if [[ ! -s "$f" ]]; then
    return 0
  fi
  if grep -qF "$IMPORT_LINE" "$f"; then
    return 1
  fi
  if grep -qF 'root * /usr/share/caddy' "$f"; then
    return 0
  fi
  return 1
}

inject_tls() {
  local src="$1"
  local dest="$2"
  if [[ -f "${TLS_DIR}/fullchain.pem" && -f "${TLS_DIR}/privkey.pem" ]]; then
    awk -v cert="${TLS_DIR}/fullchain.pem" -v key="${TLS_DIR}/privkey.pem" '
      /tls / { has_tls = 1 }
      $0 ~ /^}/ && !inserted && !has_tls {
        print "\ttls " cert " " key
        inserted = 1
      }
      { print }
    ' "$src" >"$dest"
    return
  fi
  if tls_is_lan; then
    awk '
      /tls / { has_tls = 1 }
      $0 ~ /^}/ && !inserted && !has_tls {
        print "\ttls internal"
        inserted = 1
      }
      { print }
    ' "$src" >"$dest"
    return
  fi
  cat "$src" >"$dest"
}

write_snippet() {
  local domain="$1"
  local tmp
  install -d -m 0755 "${CADDY_DIR}/sites-enabled"
  tmp="$(mktemp)"
  sed "s#placeholder\\.example\\.com#${domain}#" "${SCRIPT_DIR}/rgit-web.caddy" >"$tmp"
  inject_tls "$tmp" "$SNIPPET"
  rm -f "$tmp"
  chmod 0644 "$SNIPPET"
}

write_caddy_env() {
  local domain="$1"
  install -d -m 0755 "$(dirname "$CADDY_ENV")"
  {
    printf 'RGIT_WEB_DOMAIN=%s\n' "$domain"
    if [[ -n "${RGIT_WEB_TLS:-}" ]]; then
      printf 'RGIT_WEB_TLS=%s\n' "$RGIT_WEB_TLS"
    fi
  } >"$CADDY_ENV"
  chmod 0644 "$CADDY_ENV"
}

ensure_caddyfile_import() {
  if [[ -f "$CADDYFILE" ]] && grep -qF "$IMPORT_LINE" "$CADDYFILE"; then
    return
  fi
  if caddyfile_is_replaceable "$CADDYFILE"; then
    if [[ -s "$CADDYFILE" ]]; then
      cp "$CADDYFILE" "${CADDYFILE}.bak-rgit-web"
    fi
    {
      echo "{"
      if [[ -n "${CADDY_EMAIL:-}" ]]; then
        printf '\temail %s\n' "$CADDY_EMAIL"
      fi
      printf '\tkey_type p256\n'
      echo "}"
      echo
      printf '%s\n' "$IMPORT_LINE"
    } >"$CADDYFILE"
  else
    printf '\n%s\n' "$IMPORT_LINE" >>"$CADDYFILE"
  fi
  chmod 0644 "$CADDYFILE"
}

resolve_persisted
DOMAIN="$(resolve_domain)"
if [[ "$DOMAIN" == :* ]]; then
  echo "RGIT_WEB_DOMAIN=${DOMAIN} is a listen address, not a virtual host; not writing ${SNIPPET}" >&2
  write_caddy_env "$DOMAIN"
  exit 0
fi

write_snippet "$DOMAIN"
ensure_caddyfile_import
write_caddy_env "$DOMAIN"

if tls_is_lan; then
  echo "Caddy virtual host ${DOMAIN} → 127.0.0.1:3010 (${SNIPPET}, tls internal)"
else
  echo "Caddy virtual host ${DOMAIN} → 127.0.0.1:3010 (${SNIPPET})"
fi
