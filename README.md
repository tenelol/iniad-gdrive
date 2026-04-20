# iniad-gdrive

`iniad-gdrive` は INIAD の Google Drive から AI エージェントや shell で必要なファイルを非対話で取り込める CLI です。  
認証は `gdrive` の古い OOB フローではなく、Google の現行 desktop OAuth loopback flow を使います。

主用途は read-only import です。

- `auth`: INIAD 用の専用認証を作る
- `search`: Drive query で検索する
- `import`: URL / file ID / query で 1 ファイル取り込む
- `browse`: 認証済み Drive を対話で辿って import する

## Requirements

- `gh`
- `node`
- `npm` (`browse` を使う場合)

## Setup

```bash
gh repo clone tenelol/iniad-gdrive
cd iniad-gdrive
npm install
```

## Auth

INIAD 用の認証は専用 config dir に分けます。

既定値:

- `$XDG_CONFIG_HOME/iniad-gdrive`
- `XDG_CONFIG_HOME` が無ければ `~/.config/iniad-gdrive`

最初に Google Cloud で Desktop app の OAuth credentials を作り、その JSON を次のどちらかに置きます。

- `~/.config/iniad-gdrive/credentials.json`
- 任意の場所に置いて `INIAD_GDRIVE_OAUTH_CREDENTIALS=/path/to/credentials.json`

その後に:

```bash
./bin/iniad-gdrive auth
```

`auth` はローカルの loopback server を立ててブラウザを開きます。認証後、token は `~/.config/iniad-gdrive/token.json` に保存されます。

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
./bin/iniad-gdrive browse "https://drive.google.com/drive/u/2/home"
./bin/iniad-gdrive browse "https://drive.google.com/drive/folders/FOLDER_ID"
```

## Import behavior

既定の保存先は `./.imports/iniad-gdrive` です。

Google Workspace native file は Drive export API に切り替えます。

- Docs -> Markdown
- Sheets -> XLSX
- Slides -> PDF
- Drawings -> PDF

それ以外の通常ファイルは `gdrive download` を使います。
それ以外の通常ファイルは Drive download API を使います。

`import` 成功時は保存されたローカル path を stdout に 1 行だけ出します。  
AI エージェントはその path をそのまま開けばよい想定です。

## Notes

- `gdrive` CLI は不要です。
- 以前の `gdrive` / `mygdrive` ベース案は、Google 側で OOB OAuth が廃止されたため現行実装では使っていません。
- `search` / `import` では query に Google Drive API の `q` 断片を渡します。例: `name contains 'stats03'`

## Legacy reference

元案の upstream 確認メモは残してあります。

```bash
gh repo view yossuli/mygdrive
```
