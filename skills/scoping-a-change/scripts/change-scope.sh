#!/bin/sh
# change-scope — report a change's four dirty layers against an explicit base.
#
# Committed paths are relative to the merge base, so they are what a reviewer
# sees. Staged, unstaged, and untracked paths describe the working tree only.
# Collapsing the four hides the untracked file that is part of the change in
# every practical sense and part of the diff in none.
#
# Takes no default base on purpose: a tool that picks a base silently moves the
# error from the caller to the tool, and the caller is the one who can verify it.
#
# Usage: change-scope.sh <base-ref> [head-ref]

set -eu

if [ $# -lt 1 ]; then
  cat >&2 <<'USAGE'
usage: change-scope.sh <base-ref> [head-ref]

  <base-ref>  The base you verified from remote or dependency-chain state.
              Fetch it first; this script does not fetch.
  [head-ref]  Defaults to HEAD.

There is no default base. Resolve it from observed state, not from a naming
convention: a branch's tracking ref is wrong for a fresh branch, wrong for a
branch targeting another feature branch, and wrong again after any merge.
USAGE
  exit 2
fi

base=$1
head=${2:-HEAD}

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "change-scope: not inside a git repository" >&2
  exit 1
fi

if ! git rev-parse --verify --quiet "$base" >/dev/null; then
  echo "change-scope: base ref '$base' does not resolve. Fetch it first." >&2
  exit 1
fi

if ! git rev-parse --verify --quiet "$head" >/dev/null; then
  echo "change-scope: head ref '$head' does not resolve." >&2
  exit 1
fi

merge_base=$(git merge-base "$base" "$head") || {
  echo "change-scope: '$base' and '$head' have no common ancestor." >&2
  exit 1
}

section() {
  printf '\n== %s ==\n' "$1"
}

printf 'base       %s (%s)\n' "$base" "$(git rev-parse --short "$base")"
printf 'head       %s (%s)\n' "$head" "$(git rev-parse --short "$head")"
printf 'merge-base %s\n' "$(git rev-parse --short "$merge_base")"

section "committed (vs merge-base — what a reviewer sees)"
git diff --name-status "$merge_base" "$head" || true

section "staged"
git diff --name-status --cached || true

section "unstaged"
git diff --name-status || true

section "untracked (in the change, absent from the diff)"
git ls-files --others --exclude-standard || true

printf '\n'
