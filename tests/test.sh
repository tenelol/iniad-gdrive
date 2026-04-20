#!/usr/bin/env bash
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
TMPDIR_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/iniad-gdrive-test.XXXXXX")"
trap 'rm -rf "$TMPDIR_ROOT"' EXIT

HOME_DIR="$TMPDIR_ROOT/home"
mkdir -p "$HOME_DIR"

assert_contains() {
  local haystack="$1"
  local needle="$2"
  case "$haystack" in
    *"$needle"*) ;;
    *)
      printf 'Expected output to contain: %s\n' "$needle" >&2
      printf 'Actual output:\n%s\n' "$haystack" >&2
      exit 1
      ;;
  esac
}

run_cli() {
  HOME="$HOME_DIR" \
    XDG_CONFIG_HOME="$HOME_DIR/.config" \
    INIAD_GDRIVE_MOCK_PATH="$ROOT/tests/fixtures/mock-drive.json" \
    "$ROOT/bin/iniad-gdrive" "$@"
}

help_output="$(run_cli --help)"
assert_contains "$help_output" "iniad-gdrive import"

if run_cli search "name contains 'single-doc'" >"$TMPDIR_ROOT/out" 2>"$TMPDIR_ROOT/err"; then
  echo "search without auth should fail" >&2
  exit 1
fi
assert_contains "$(cat "$TMPDIR_ROOT/err")" "Run: iniad-gdrive auth"

run_cli auth >/dev/null

search_output="$(run_cli search "name contains 'single-doc'")"
assert_contains "$search_output" "single-doc"
assert_contains "$search_output" "application/vnd.google-apps.document"

doc_path="$(run_cli import --url "https://docs.google.com/document/d/doc1/edit")"
[ "$doc_path" = ".imports/iniad-gdrive/single-doc.md" ] || {
  printf 'Unexpected docs import path: %s\n' "$doc_path" >&2
  exit 1
}
[ -f "$doc_path" ] || {
  printf 'Missing imported docs file: %s\n' "$doc_path" >&2
  exit 1
}

file_path="$(run_cli import --url "https://drive.google.com/file/d/file1/view")"
[ "$file_path" = ".imports/iniad-gdrive/archive.pdf" ] || {
  printf 'Unexpected file import path: %s\n' "$file_path" >&2
  exit 1
}
[ -f "$file_path" ] || {
  printf 'Missing imported file: %s\n' "$file_path" >&2
  exit 1
}

if run_cli import --query "name contains 'zero-hit'" >"$TMPDIR_ROOT/out" 2>"$TMPDIR_ROOT/err"; then
  echo "zero-hit query should fail" >&2
  exit 1
fi
assert_contains "$(cat "$TMPDIR_ROOT/err")" "No files matched query"

if run_cli import --query "name contains 'multi-hit'" >"$TMPDIR_ROOT/out" 2>"$TMPDIR_ROOT/err"; then
  echo "multi-hit query should fail" >&2
  exit 1
fi
assert_contains "$(cat "$TMPDIR_ROOT/err")" "Multiple files matched query"

if run_cli import --url "https://drive.google.com/drive/folders/folder1" >"$TMPDIR_ROOT/out" 2>"$TMPDIR_ROOT/err"; then
  echo "folder import should fail" >&2
  exit 1
fi
assert_contains "$(cat "$TMPDIR_ROOT/err")" "Use: iniad-gdrive browse"

folder_search="$(run_cli search "'root' in parents and mimeType = 'application/vnd.google-apps.folder'")"
assert_contains "$folder_search" "folder1"

rm -rf "$ROOT/.imports"
printf 'ok\n'
