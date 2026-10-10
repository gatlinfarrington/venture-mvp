#!/usr/bin/env bash
# Compare production deploy SHA to origin/main and smoke-check key routes.
# Usage: ./scripts/verify-prod.sh [PROD_URL]
set -euo pipefail

PROD_URL="${1:-${PROD_URL:-https://venture-mvp.vercel.app}}"
PROD_URL="${PROD_URL%/}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Fetching origin/main…"
git fetch origin main --quiet

MAIN_SHA="$(git rev-parse origin/main)"
echo "  origin/main  $MAIN_SHA"

echo "→ Reading $PROD_URL/api/version…"
VERSION_JSON="$(curl -fsS "$PROD_URL/api/version")"
PROD_SHA="$(printf '%s' "$VERSION_JSON" | node -e '
  const j = JSON.parse(require("fs").readFileSync(0, "utf8"));
  const sha = String(j.sha || j.commit || "").trim();
  if (!sha) process.exit(2);
  process.stdout.write(sha);
')"

echo "  production   $PROD_SHA"

if [[ "$PROD_SHA" == "unknown" ]]; then
  echo "ERROR: production reported sha=unknown (VERCEL_GIT_COMMIT_SHA missing)." >&2
  exit 1
fi

sha_matches() {
  local a="$1" b="$2"
  [[ "$a" == "$b" ]] && return 0
  [[ "$a" == "$b"* ]] && return 0
  [[ "$b" == "$a"* ]] && return 0
  return 1
}

if ! sha_matches "$PROD_SHA" "$MAIN_SHA"; then
  echo "ERROR: production SHA does not match origin/main." >&2
  echo "  expected (main) $MAIN_SHA" >&2
  echo "  got (prod)      $PROD_SHA" >&2
  exit 1
fi

echo "✓ SHA matches origin/main"

smoke() {
  local path="$1"
  local url="$PROD_URL$path"
  local code
  code="$(curl -sS -o /tmp/verify-prod-body.html -w "%{http_code}" "$url")"
  if [[ "$code" != "200" ]]; then
    echo "ERROR: $path → HTTP $code" >&2
    exit 1
  fi
  echo "✓ $path ($code)"
}

for path in "/" "/pricing" "/success" "/terms"; do
  smoke "$path"
done

curl -fsS "$PROD_URL/terms" -o /tmp/verify-prod-terms.html
if grep -qiE 'ten months' /tmp/verify-prod-terms.html; then
  echo "ERROR: /terms still contains 'ten months' (annual billing copy)." >&2
  exit 1
fi
echo "✓ /terms has no 'ten months'"

echo "All prod checks passed."
