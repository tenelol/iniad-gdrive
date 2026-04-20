#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd)"
TARGET_ROOT="${HOME}/.codex/skills/iniad-drive-import"

mkdir -p "${TARGET_ROOT}"
rsync -a "${REPO_ROOT}/skills/iniad-drive-import/" "${TARGET_ROOT}/"

printf 'Installed Codex skill to %s\n' "${TARGET_ROOT}"
