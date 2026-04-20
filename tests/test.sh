#!/usr/bin/env bash
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
TMPDIR_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/iniad-gdrive-test.XXXXXX")"
trap 'rm -rf "$TMPDIR_ROOT"' EXIT

FAKEBIN="$TMPDIR_ROOT/fakebin"
HOME_DIR="$TMPDIR_ROOT/home"
STATE_DIR="$TMPDIR_ROOT/state"
mkdir -p "$FAKEBIN" "$HOME_DIR" "$STATE_DIR"

cat >"$FAKEBIN/gdrive" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

config_dir=""
if [ "${1:-}" = "-c" ]; then
  config_dir="$2"
  shift 2
fi

cmd="${1:-}"
shift || true

token_file="${config_dir}/token_v2.json"
mkdir -p "$config_dir"

query=""
path_arg=""
mime=""
id=""

case "$cmd" in
  about)
    if [ ! -f "$token_file" ]; then
      printf '{"token":"ok"}\n' >"$token_file"
    fi
    echo "Authenticated"
    ;;
  list)
    while [ "$#" -gt 0 ]; do
      case "$1" in
        --query)
          query="$2"
          shift 2
          ;;
        --path|--max|--name-width)
          shift 2
          ;;
        --absolute|--no-header|--bytes)
          shift
          ;;
        *)
          shift
          ;;
      esac
    done

    case "$query" in
      *"single-doc"*)
        echo "doc1  single-doc  file  10  2026-04-20"
        ;;
      *"multi-hit"*)
        echo "doc1  single-doc  file  10  2026-04-20"
        echo "file1  archive.pdf  file  99  2026-04-20"
        ;;
      *"zero-hit"*)
        ;;
      *)
        echo "Id  Name  Type  Size  Created"
        echo "doc1  single-doc  file  10  2026-04-20"
        ;;
    esac
    ;;
  info)
    id="$1"
    case "$id" in
      doc1)
        cat <<INFO
Id: doc1
Name: single-doc
Mime: application/vnd.google-apps.document
INFO
        ;;
      file1)
        cat <<INFO
Id: file1
Name: archive.pdf
Mime: application/pdf
INFO
        ;;
      folder1)
        cat <<INFO
Id: folder1
Name: folder
Mime: application/vnd.google-apps.folder
INFO
        ;;
      *)
        exit 1
        ;;
    esac
    ;;
  export)
    while [ "$#" -gt 0 ]; do
      case "$1" in
        --mime)
          mime="$2"
          shift 2
          ;;
        *)
          id="$1"
          shift
          ;;
      esac
    done

    case "$mime" in
      text/markdown)
        printf '# doc\n' >single-doc.md
        ;;
      application/pdf)
        printf 'pdf\n' >single-doc.pdf
        ;;
      application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
        printf 'xlsx\n' >single-doc.xlsx
        ;;
      *)
        exit 1
        ;;
    esac
    ;;
  download)
    while [ "$#" -gt 0 ]; do
      case "$1" in
        --path)
          path_arg="$2"
          shift 2
          ;;
        --no-progress)
          shift
          ;;
        *)
          id="$1"
          shift
          ;;
      esac
    done
    mkdir -p "$path_arg"
    case "$id" in
      file1)
        printf 'pdf\n' >"${path_arg}/archive.pdf"
        ;;
      *)
        exit 1
        ;;
    esac
    ;;
  version)
    echo "fake"
    ;;
  *)
    exit 1
    ;;
esac
EOF
chmod +x "$FAKEBIN/gdrive"

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
  PATH="$FAKEBIN:$PATH" HOME="$HOME_DIR" XDG_CONFIG_HOME="$HOME_DIR/.config" "$ROOT/bin/iniad-gdrive" "$@"
}

help_output="$(run_cli --help)"
assert_contains "$help_output" "iniad-gdrive import"

if run_cli search "name contains 'single-doc'" >"$TMPDIR_ROOT/out" 2>"$TMPDIR_ROOT/err"; then
  echo "search without auth should fail" >&2
  exit 1
fi
assert_contains "$(cat "$TMPDIR_ROOT/err")" "Run: iniad-gdrive auth"

run_cli auth >"$TMPDIR_ROOT/auth.out"

search_output="$(run_cli search "name contains 'single-doc'")"
assert_contains "$search_output" "single-doc"

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

rm -rf "$ROOT/.imports"
printf 'ok\n'
