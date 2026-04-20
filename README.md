# iniad-gdrive

`iniad-gdrive` は INIAD の Google Drive から課題ファイルや授業資料をローカルへ取り込むための CLI です。  
認証は Google の現行 desktop OAuth loopback flow を使います。

主用途は read-only import です。

- `setup`: config dir を作り、credentials 配置先を案内する
- `auth`: INIAD 用の専用認証を作る
- `doctor`: credentials / token / Drive API 到達性を確認する
- `search`: Drive query で検索する
- `import`: URL / file ID / query で 1 ファイル取り込む
- `browse`: 認証済み Drive を対話で辿って import する

## Requirements

- `gh`
- `node`
- `npm` (`browse` を使う場合)

## Setup

```bash
git clone https://github.com/tenelol/iniad-gdrive.git
cd iniad-gdrive
npm install
./bin/iniad-gdrive setup
```

`gh repo clone tenelol/iniad-gdrive` でも構いません。

## Quick Start For INIAD Students

1. この repo を clone する
2. `npm install`
3. `./bin/iniad-gdrive setup`
4. Google Cloud Console で Desktop app の OAuth credentials を作って `credentials.json` を置く
5. `./bin/iniad-gdrive auth`
6. `./bin/iniad-gdrive doctor`
7. `search` または `import` を使う

## Actual Flow

実際の利用はだいたい次のどれかです。

INIAD 生の実運用では、Drive 全体を曖昧検索するよりも、まず講義資料のルートフォルダを起点にする方が安全です。  
つまり最初にやるべきことは「講義資料フォルダの URL か folder ID を取る」ことです。

### 講義資料フォルダをルートにする理由

- 同名ファイルが複数講義にまたがって存在しやすい
- `ex01.zip` や `stats03.zip` のような名前は衝突しやすい
- `--folder` を使うと対象講義の直下に検索を絞れる

### folder ID の取り方

講義資料フォルダをブラウザで開いたとき、URL が次のようになっていれば:

```text
https://drive.google.com/drive/folders/1KyD2j3o1_IeK7Gum676Ssd0uKDiAybQJ
```

この `1KyD2j3o1_IeK7Gum676Ssd0uKDiAybQJ` が folder ID です。  
`iniad-gdrive` には URL をそのまま渡してもよいし、ID だけを渡しても構いません。

1. 授業フォルダ URL とファイル名が分かっている

```bash
./bin/iniad-gdrive import \
  --query "name = 'ex01.zip'" \
  --folder "https://drive.google.com/drive/folders/FOLDER_ID" \
  --dest ~/Documents/Playground/cs_ex3
```

2. 授業フォルダ URL はあるが、まず候補を見たい

```bash
./bin/iniad-gdrive search \
  "name contains 'ex01'" \
  --folder "https://drive.google.com/drive/folders/FOLDER_ID"
```

3. 共有されたファイル URL がそのままある

```bash
./bin/iniad-gdrive import \
  --url "https://drive.google.com/file/d/FILE_ID/view" \
  --dest ~/Documents/Playground
```

4. Drive 全体から曖昧に探したい

```bash
./bin/iniad-gdrive search "name contains 'stats03'"
```

`import` は成功時に保存先 path を 1 行だけ返します。  
AI エージェントはその出力を受け取り、そのまま unzip や notebook 実行に進む想定です。

## Recommended INIAD Workflow

INIAD 生におすすめなのは次の流れです。

1. manaba や講義資料ページから講義の Google Drive フォルダを開く
2. ブラウザの URL から folder ID を確認する
3. `search --folder ...` で講義フォルダ内だけ検索する
4. `import --folder ...` で必要ファイルだけ取得する

例:

```bash
./bin/iniad-gdrive search \
  "name contains 'ex01'" \
  --folder "https://drive.google.com/drive/folders/FOLDER_ID"

./bin/iniad-gdrive import \
  --query "name = 'ex01.zip'" \
  --folder "https://drive.google.com/drive/folders/FOLDER_ID" \
  --dest ~/Documents/Playground/cs_ex3
```

## Codex Skill

Codex で能動的に使わせたい場合は、この repo の skill を `~/.codex/skills` に入れます。

```bash
npm run install-skill
```

インストールされる skill 名は `iniad-drive-import` です。  
新しい Codex セッションでは、Drive URL や「INIAD の Drive から取ってきて」のような依頼でこの skill が自動選択されやすくなります。

skill 本体:

- [skills/iniad-drive-import/SKILL.md](./skills/iniad-drive-import/SKILL.md)

この repo を使う agent 向けの運用メモは [AGENTS.md](./AGENTS.md) にあります。  
ローカル Codex では、たとえば次のような流れになります。

1. ユーザーが Drive URL やファイル名を渡す
2. agent が `iniad-drive-import` skill を使う
3. 可能なら講義資料フォルダ URL / folder ID を起点にする
4. `doctor` で認証状態を確認する
5. `search --folder ...` または `import --folder ...` を実行する
5. zip なら展開、Notebook なら実行、コードなら修正まで続ける

## Auth

INIAD 用の認証は専用 config dir に分けます。

既定値:

- `$XDG_CONFIG_HOME/iniad-gdrive`
- `XDG_CONFIG_HOME` が無ければ `~/.config/iniad-gdrive`

最初に Google Cloud Console 側で Desktop app の OAuth credentials を作ります。

### Google Cloud Console でやること

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. project を選ぶ。無ければ新規作成する
3. [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com) を開いて `Enable` する
4. [Google Auth Platform / Clients](https://console.cloud.google.com/auth/clients) を開く
5. `Create client` を押す
6. `Application type` を `Desktop app` にする
7. client を作成して JSON をダウンロードする

必要なら公式ドキュメント:

- [Create credentials](https://developers.google.com/workspace/guides/create-credentials)
- [OAuth 2.0 for Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app)

ダウンロードした JSON を次のどちらかに置きます。

- `~/.config/iniad-gdrive/credentials.json`
- 任意の場所に置いて `INIAD_GDRIVE_OAUTH_CREDENTIALS=/path/to/credentials.json`

例えば Downloads に落ちた JSON をそのまま使うなら:

```bash
cp ~/Downloads/client_secret_*.json ~/.config/iniad-gdrive/credentials.json
```

その後に:

```bash
./bin/iniad-gdrive auth
```

`auth` はローカルの loopback server を立ててブラウザを開きます。認証後、token は `~/.config/iniad-gdrive/token.json` に保存されます。

つまり初回の実作業は次の順番です。

1. repo を clone して `npm install`
2. Google Cloud Console で Drive API を有効化
3. Google Cloud Console で Desktop OAuth client を作成
4. ダウンロードした `credentials.json` を `~/.config/iniad-gdrive/` に置く
5. `./bin/iniad-gdrive auth`
6. `./bin/iniad-gdrive doctor`

認証状態の確認:

```bash
./bin/iniad-gdrive doctor
```

## Usage

検索:

```bash
./bin/iniad-gdrive search "name contains 'レポート'"
```

特定フォルダ配下だけ検索:

```bash
./bin/iniad-gdrive search "name contains 'stats03'" --folder "https://drive.google.com/drive/folders/FOLDER_ID"
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

授業フォルダ配下だけ import:

```bash
./bin/iniad-gdrive import --query "name = 'stats03.zip'" --folder "https://drive.google.com/drive/folders/FOLDER_ID"
```

skill を使う agent でも、内部的には同じ `iniad-gdrive import --query ... --folder ...` に寄せる想定です。

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

それ以外の通常ファイルは Drive download API を使います。

`import` 成功時は保存されたローカル path を stdout に 1 行だけ出します。  
AI エージェントはその path をそのまま開けばよい想定です。

## Notes

- `gdrive` CLI は不要です。
- `search` / `import` では query に Google Drive API の `q` 断片を渡します。例: `name contains 'stats03'`
- `--folder` を使うと、そのフォルダ直下に検索対象を絞れます。授業資料配布にはこの使い方が扱いやすいです。
- INIAD 生は講義資料フォルダをルートとして扱い、まず folder URL / folder ID を取ってから使うのが基本です。
- `credentials.json` と `token.json` は repo に置かず、`~/.config/iniad-gdrive/` に置く前提です。
