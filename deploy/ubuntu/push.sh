#!/usr/bin/env bash
# Copy a release onto an Ubuntu host over SSH. The host never talks to GitHub.
#
#   ./deploy/ubuntu/push.sh --bootstrap --domain git.example.com user@host
#   ./deploy/ubuntu/push.sh --pack user@host
#   ./deploy/ubuntu/push.sh --archive dist/release/rgit-web-….tar.gz user@host
set -euo pipefail

BOOTSTRAP=0
DOMAIN=""
ARCHIVE=""
PACK=0
EMAIL="${CADDY_EMAIL:-}"
TLS_CERT=""
TLS_KEY=""
TLS_MODE="${RGIT_WEB_TLS:-}"
SSH_PORT="${RGIT_WEB_SSH_PORT:-22}"
REPO="${RGIT_WEB_REPO:-}"

usage() {
  echo "usage: $0 [--bootstrap] [--domain FQDN] [--email ADDR] [--tls lan] [--tls-cert FILE] [--tls-key FILE] [--archive FILE] [--pack] [--port N] user@host [tag]" >&2
  echo "--pack builds a release archive from this checkout (Linux + bun)" >&2
  echo "--archive FILE installs that tarball instead of a GitHub Release" >&2
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bootstrap) BOOTSTRAP=1; shift ;;
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    --email) EMAIL="${2:-}"; shift 2 ;;
    --tls) TLS_MODE="${2:-}"; shift 2 ;;
    --tls-cert) TLS_CERT="${2:-}"; shift 2 ;;
    --tls-key) TLS_KEY="${2:-}"; shift 2 ;;
    --archive) ARCHIVE="${2:-}"; shift 2 ;;
    --pack) PACK=1; shift ;;
    --port) SSH_PORT="${2:-}"; shift 2 ;;
    -h | --help) usage ;;
    --) shift; break ;;
    -*) usage ;;
    *) break ;;
  esac
done

TARGET_HOST="${1:-}"
TAG="${2:-}"
if [[ -z "$TARGET_HOST" ]]; then
  usage
fi
if [[ -n "$TLS_CERT" || -n "$TLS_KEY" ]]; then
  if [[ -z "$TLS_CERT" || -z "$TLS_KEY" || ! -f "$TLS_CERT" || ! -f "$TLS_KEY" ]]; then
    echo "--tls-cert and --tls-key must both be existing files" >&2
    exit 1
  fi
fi
if [[ -n "$TLS_MODE" ]]; then
  TLS_MODE="${TLS_MODE,,}"
  if [[ "$TLS_MODE" != "lan" && "$TLS_MODE" != "internal" ]]; then
    echo "--tls must be lan (Caddy local CA on a private network)" >&2
    exit 1
  fi
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSH_OPTS=(-o Port="$SSH_PORT" -o ServerAliveInterval=15)
if [[ -n "${RGIT_WEB_SSH_KNOWN_HOSTS:-}" ]]; then
  SSH_OPTS+=(-o StrictHostKeyChecking=yes -o UserKnownHostsFile="$RGIT_WEB_SSH_KNOWN_HOSTS")
else
  SSH_OPTS+=(-o StrictHostKeyChecking=accept-new)
fi

remote() {
  ssh "${SSH_OPTS[@]}" "$TARGET_HOST" "$@"
}

remote_sudo() {
  if [[ -t 0 ]]; then
    ssh -t "${SSH_OPTS[@]}" "$TARGET_HOST" "$@"
  else
    ssh "${SSH_OPTS[@]}" "$TARGET_HOST" "$@"
  fi
}

target_triple() {
  case "$(remote uname -m)" in
    x86_64 | amd64) echo "x86_64-unknown-linux-gnu" ;;
    aarch64 | arm64) echo "aarch64-unknown-linux-gnu" ;;
    *)
      echo "unsupported server architecture: $(remote uname -m)" >&2
      exit 1
      ;;
  esac
}

latest_stable_tag() {
  gh release view --repo "$REPO" --json tagName --jq .tagName
}

pack_checkout() {
  local pack_script pack_log packed_tag
  pack_script="${SCRIPT_DIR}/pack.sh"
  if [[ ! -f "$pack_script" ]]; then
    echo "missing ${pack_script}" >&2
    exit 1
  fi
  target_triple >/dev/null
  pack_log="$(mktemp)"
  if ! bash "$pack_script" ${TAG:+"$TAG"} | tee "$pack_log"; then
    rm -f "$pack_log"
    exit 1
  fi
  ARCHIVE="$(sed -n 's/^packed //p' "$pack_log" | tail -n1)"
  packed_tag="$(sed -n 's/^tag //p' "$pack_log" | tail -n1)"
  rm -f "$pack_log"
  if [[ -z "$ARCHIVE" || ! -f "$ARCHIVE" ]]; then
    echo "pack.sh did not produce an archive" >&2
    exit 1
  fi
  if [[ -z "$TAG" && -n "$packed_tag" ]]; then
    TAG="$packed_tag"
  fi
}

if [[ -z "$REPO" ]]; then
  if command -v gh >/dev/null && gh repo view >/dev/null 2>&1; then
    REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
  else
    REPO="rconnelly/rgit-web"
  fi
fi

if [[ "$PACK" -eq 1 ]]; then
  if [[ -n "$ARCHIVE" ]]; then
    echo "use --pack or --archive, not both" >&2
    exit 1
  fi
  pack_checkout
fi

if [[ -z "$ARCHIVE" ]]; then
  if ! command -v gh >/dev/null; then
    echo "install GitHub CLI (gh) or pass --archive / --pack" >&2
    exit 1
  fi
  if [[ -z "$TAG" ]]; then
    TAG="$(latest_stable_tag)"
    echo "using latest stable release ${TAG}"
  fi
  TRIPLE="$(target_triple)"
  STAGE="$(mktemp -d)"
  trap 'rm -rf "$STAGE"' EXIT
  echo "downloading rgit-web-${TAG}-${TRIPLE}.tar.gz from ${REPO}"
  gh release download "$TAG" --repo "$REPO" --dir "$STAGE" \
    --pattern "rgit-web-${TAG}-${TRIPLE}.tar.gz*"
  ARCHIVE="$(find "$STAGE" -name "rgit-web-${TAG}-${TRIPLE}.tar.gz" | head -n1)"
  if [[ -z "$ARCHIVE" ]]; then
    echo "release ${TAG} has no ${TRIPLE} tarball" >&2
    exit 1
  fi
fi

REMOTE_DIR="${RGIT_WEB_REMOTE_DIR:-/var/tmp/rgit-web-push-$$}"
ARCHIVE_BYTES=$(wc -c <"$ARCHIVE" | tr -d ' ')
avail="$(remote "df -B1 --output=avail /var/tmp 2>/dev/null | tail -n1 | tr -d ' '" || true)"
if [[ "$avail" =~ ^[0-9]+$ ]] && ((avail < ARCHIVE_BYTES + 1048576)); then
  echo "host does not have enough space for $(basename "$ARCHIVE")" >&2
  exit 1
fi
echo "uploading $(basename "$ARCHIVE") (${ARCHIVE_BYTES} bytes) to ${TARGET_HOST}:${REMOTE_DIR}"
remote "mkdir -p $(printf '%q' "$REMOTE_DIR")/deploy"
scp "${SSH_OPTS[@]}" "$ARCHIVE" "${TARGET_HOST}:${REMOTE_DIR}/rgit-web.tar.gz"
if [[ -f "${ARCHIVE}.sha256" ]]; then
  scp "${SSH_OPTS[@]}" -q "${ARCHIVE}.sha256" "${TARGET_HOST}:${REMOTE_DIR}/rgit-web.tar.gz.sha256"
fi
scp "${SSH_OPTS[@]}" -q -r "${SCRIPT_DIR}/." "${TARGET_HOST}:${REMOTE_DIR}/deploy/"
REMOTE_TLS_CERT=""
REMOTE_TLS_KEY=""
if [[ -n "$TLS_CERT" ]]; then
  remote "mkdir -p $(printf '%q' "$REMOTE_DIR")/tls"
  scp "${SSH_OPTS[@]}" -q "$TLS_CERT" "${TARGET_HOST}:${REMOTE_DIR}/tls/fullchain.pem"
  scp "${SSH_OPTS[@]}" -q "$TLS_KEY" "${TARGET_HOST}:${REMOTE_DIR}/tls/privkey.pem"
  REMOTE_TLS_CERT="${REMOTE_DIR}/tls/fullchain.pem"
  REMOTE_TLS_KEY="${REMOTE_DIR}/tls/privkey.pem"
fi
remote "chmod +x $(printf '%q' "$REMOTE_DIR")/deploy/bootstrap.sh $(printf '%q' "$REMOTE_DIR")/deploy/install.sh $(printf '%q' "$REMOTE_DIR")/deploy/configure-caddy.sh"

REMOTE_ARCHIVE="${REMOTE_DIR}/rgit-web.tar.gz"
if [[ "$BOOTSTRAP" -eq 1 ]]; then
  if [[ -z "$DOMAIN" ]]; then
    DOMAIN="git.burton.work"
  fi
  echo "bootstrapping ${TARGET_HOST} (Caddy vhost ${DOMAIN})"
  remote_sudo "sudo env RGIT_WEB_ARCHIVE=$(printf '%q' "$REMOTE_ARCHIVE") RGIT_WEB_DOMAIN=$(printf '%q' "$DOMAIN") RGIT_WEB_ENABLE_UFW=$(printf '%q' "${RGIT_WEB_ENABLE_UFW:-}") RGIT_WEB_TLS=$(printf '%q' "$TLS_MODE") CADDY_EMAIL=$(printf '%q' "$EMAIL") RGIT_WEB_TLS_CERT=$(printf '%q' "$REMOTE_TLS_CERT") RGIT_WEB_TLS_KEY=$(printf '%q' "$REMOTE_TLS_KEY") bash $(printf '%q' "$REMOTE_DIR")/deploy/bootstrap.sh $(printf '%q' "${TAG:-}")"
else
  echo "installing ${TAG:-archive} on ${TARGET_HOST}"
  remote_sudo "sudo env RGIT_WEB_ARCHIVE=$(printf '%q' "$REMOTE_ARCHIVE") bash $(printf '%q' "$REMOTE_DIR")/deploy/install.sh $(printf '%q' "${TAG:-}")"
fi
remote "rm -rf $(printf '%q' "$REMOTE_DIR")"
echo "done"
