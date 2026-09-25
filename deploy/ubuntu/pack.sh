#!/usr/bin/env bash
# Build a Linux production archive: app sources, node_modules, and the bun binary.
# Run on x86_64 Linux (GitHub Actions ubuntu-latest, laptop, or an Ubuntu pack host).
#
#   ./deploy/ubuntu/pack.sh [tag]
#   RGIT_WEB_PACK_DIR=dist/release ./deploy/ubuntu/pack.sh v0.1.0
#   ./deploy/ubuntu/push.sh --pack user@host
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

TAG="${1:-${RGIT_WEB_TAG:-}}"
if [[ -z "$TAG" ]]; then
  if [[ -d .git ]] && command -v git >/dev/null; then
    TAG="$(git describe --tags --always --dirty 2>/dev/null || true)"
  fi
fi
if [[ -z "$TAG" ]]; then
  TAG="v$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' package.json | head -n1)"
fi
if [[ -z "$TAG" ]]; then
  echo "could not determine a tag; pass one explicitly" >&2
  exit 1
fi

REVISION="${RGIT_WEB_REVISION:-${GITHUB_SHA:-}}"
if [[ -z "$REVISION" && -d .git ]] && command -v git >/dev/null; then
  REVISION="$(git rev-parse HEAD 2>/dev/null || true)"
fi

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64 | amd64) TRIPLE="x86_64-unknown-linux-gnu" ;;
  aarch64 | arm64) TRIPLE="aarch64-unknown-linux-gnu" ;;
  *)
    echo "unsupported architecture: ${ARCH}" >&2
    exit 1
    ;;
esac

if [[ "$(uname -s)" != Linux ]]; then
  echo "pack the release on Linux so bun matches the server (got $(uname -s))" >&2
  exit 1
fi

if ! command -v bun >/dev/null; then
  echo "bun is required to pack a release" >&2
  exit 1
fi

OUT_DIR="${RGIT_WEB_PACK_DIR:-dist/release}"
mkdir -p "$OUT_DIR"
OUT_DIR="$(cd "$OUT_DIR" && pwd)"
ARCHIVE="${OUT_DIR}/rgit-web-${TAG}-${TRIPLE}.tar.gz"

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/bin" "$STAGE/src"

echo "installing dependencies"
bun install --frozen-lockfile

echo "copying application"
cp package.json bun.lock bunfig.toml tsconfig.json LICENSE "$STAGE/"
[[ -f .env.production ]] && cp .env.production "$STAGE/"
tar -C "$ROOT/src" --exclude='*.test.ts' --exclude='*.test.tsx' -cf - . | tar -C "$STAGE/src" -xf -
tar -C "$ROOT" --exclude='styles/generated-preset.css' -cf - styles | tar -C "$STAGE" -xf -
tar -C "$ROOT" -cf - node_modules | tar -C "$STAGE" -xf -
install -m 0755 "$(command -v bun)" "$STAGE/bin/bun"

echo "bundling production server"
"$STAGE/bin/bun" "$ROOT/build.ts" --server --outdir "$STAGE/dist"
if [[ ! -f "${STAGE}/dist/index.js" || ! -f "${STAGE}/dist/index.html" ]]; then
  echo "production bundle is missing dist/index.js or dist/index.html" >&2
  exit 1
fi

copied=0
for f in "$STAGE/dist"/*; do
  name="$(basename "$f")"
  if [[ "$name" == "index.js" ]]; then
    continue
  fi
  cp -a "$f" "$STAGE/"
  copied=$((copied + 1))
done
if [[ "$copied" -lt 2 || ! -f "${STAGE}/index.html" ]]; then
  echo "failed to place HTML assets next to WorkingDirectory" >&2
  exit 1
fi

SHORT_REV="${REVISION:0:7}"
cat >"$STAGE/BUILD" <<EOF
TAG=${TAG}
VERSION=${TAG#v}
REVISION=${REVISION}
REVISION_SHORT=${SHORT_REV}
BUN_VERSION=$("$STAGE/bin/bun" --version)
TRIPLE=${TRIPLE}
EOF

echo "creating ${ARCHIVE}"
tar -C "$STAGE" -czf "$ARCHIVE" .
(cd "$OUT_DIR" && sha256sum "$(basename "$ARCHIVE")" >"$(basename "$ARCHIVE").sha256")

echo "packed ${ARCHIVE}"
echo "checksum ${ARCHIVE}.sha256"
echo "tag ${TAG}"
