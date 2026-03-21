#!/usr/bin/env bash

set -euo pipefail

usage() {
  echo "Usage: $0 <worktree-path>"
  echo "Example: $0 \"../snapitnow-model-a\""
}

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "Error: bun is not installed or not in PATH."
  exit 1
fi

input_path="$1"

if [[ "$input_path" = /* ]]; then
  worktree_path="$input_path"
else
  worktree_path="$(cd "$(dirname "$input_path")" && pwd)/$(basename "$input_path")"
fi

if [[ ! -d "$worktree_path" ]]; then
  echo "Error: worktree directory does not exist: $worktree_path"
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_env="$script_dir/.env"
target_env="$worktree_path/.env.local"

if [[ ! -f "$source_env" ]]; then
  echo "Error: source .env.local not found at: $source_env"
  exit 1
fi

echo "Copying .env.local -> $target_env"
cp "$source_env" "$target_env"

echo "Running bun install in $worktree_path"
(
  cd "$worktree_path"
  bun install
)

echo "Starting dev server in $worktree_path"
(
  cd "$worktree_path"
  bun run dev
)
