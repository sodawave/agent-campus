#!/usr/bin/env bash
# Create GitHub repo "Agent Campus" and push main.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${GH_TOKEN:-}" && -z "${GITHUB_TOKEN:-}" ]]; then
  echo "Set GH_TOKEN (or GITHUB_TOKEN) with repo create + push scope." >&2
  exit 1
fi

export GH_TOKEN="${GH_TOKEN:-$GITHUB_TOKEN}"

if ! command -v gh >/dev/null; then
  echo "GitHub CLI (gh) is required." >&2
  exit 1
fi

gh auth status >/dev/null 2>&1 || echo "$GH_TOKEN" | gh auth login --with-token

REPO_NAME="agent-campus"
VISIBILITY="${REPO_VISIBILITY:-public}"

if gh repo view "$REPO_NAME" >/dev/null 2>&1; then
  echo "Repo already exists locally-named; resolving owner…"
elif gh repo view "$(gh api user --jq .login)/$REPO_NAME" >/dev/null 2>&1; then
  echo "Remote repo already exists."
else
  gh repo create "$REPO_NAME" \
    --"$VISIBILITY" \
    --description "Agent Campus — gamified AI agent harness campus" \
    --source=. \
    --remote=origin \
    --push
  gh repo edit "$(gh api user --jq .login)/$REPO_NAME" --homepage "" >/dev/null 2>&1 || true
  # Display name / description polish
  gh api -X PATCH "repos/$(gh api user --jq .login)/$REPO_NAME" \
    -f name="$REPO_NAME" \
    -f description="Agent Campus — gamified AI agent harness campus" \
    >/dev/null
  echo "Created and pushed: $(gh repo view --json url -q .url)"
  exit 0
fi

OWNER="$(gh api user --jq .login)"
REMOTE="https://github.com/${OWNER}/${REPO_NAME}.git"

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE"
else
  git remote add origin "$REMOTE"
fi

git push -u origin main
echo "Pushed main → $REMOTE"
