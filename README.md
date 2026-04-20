# iniad-gdrive

`iniad-gdrive` は `gdrive` と [`yossuli/mygdrive`](https://github.com/yossuli/mygdrive) をラップして、INIAD の Google Drive から AI エージェントや shell で必要なファイルを非対話で取り込めるようにする repo です。

主用途は read-only import です。

- `auth`: INIAD 用の専用認証を作る
- `search`: Drive query で検索する
- `import`: URL / file ID / query で 1 ファイル取り込む
- `browse`: `mygdrive` の TUI でフォルダを辿る

## Requirements

- `gh`
- `gdrive`
- `bash`
- `node`
- `npm` (`browse` を使う場合)

## Setup

```bash
gh repo clone tenelol/iniad-gdrive
cd iniad-gdrive
npm install
```

`search` / `import` / `auth` は shell 実装なので `npm install` なしでも動きます。  
`browse` は vendored `mygdrive` を使うため `npm install` が必要です。

## Auth

INIAD 用の認証は default の `~/.gdrive` ではなく、専用 config dir に分けます。

既定値:

- `$XDG_CONFIG_HOME/iniad-gdrive`
- `XDG_CONFIG_HOME` が無ければ `~/.config/iniad-gdrive`

初回だけ:

```bash
./bin/iniad-gdrive auth
```

## Usage

検索:

```bash
./bin/iniad-gdrive search "name contains 'レポート'"
```

共有 URL から import:

```bash
./bin/iniad-gdrive import --url "https://docs.google.com/document/d/FILE_ID/edit"
```

file ID から import:

```bash
./bin/iniad-gdrive import --id FILE_ID
```

query から import:

```bash
./bin/iniad-gdrive import --query "name = 'week7-report'"
```

保存先変更:

```bash
./bin/iniad-gdrive import --url "..." --dest ./downloads
```

folder browse:

```bash
./bin/iniad-gdrive browse
./bin/iniad-gdrive browse "https://drive.google.com/drive/folders/FOLDER_ID"
```

## Import behavior

既定の保存先は `./.imports/iniad-gdrive` です。

Google Workspace native file は `gdrive export` に切り替えます。

- Docs -> Markdown
- Sheets -> XLSX
- Slides -> PDF
- Drawings -> PDF

それ以外の通常ファイルは `gdrive download` を使います。

`import` 成功時は保存されたローカル path を stdout に 1 行だけ出します。  
AI エージェントはその path をそのまま開けばよい想定です。

## Updating vendored mygdrive

upstream 確認:

```bash
gh repo view yossuli/mygdrive
```

更新時の例:

```bash
tmpdir="$(mktemp -d)"
gh repo clone yossuli/mygdrive "$tmpdir/mygdrive"
cd "$tmpdir/mygdrive"
npm install
npm run build
rsync -a --exclude '.git' --exclude 'node_modules' . /path/to/iniad-gdrive/vendor/mygdrive/
rsync -a dist/ /path/to/iniad-gdrive/vendor/mygdrive/dist/
```
