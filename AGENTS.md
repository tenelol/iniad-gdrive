この repo は `iniad-gdrive` の開発・運用用です。

- INIAD の Google Drive から資料・課題ファイルを探す/取得する必要があるときは、まず `iniad-gdrive` を使う
- 特に `search` / `import` / `browse` / `doctor` を優先し、Google Drive を手で辿る前に CLI で解決できるか試す
- 授業フォルダ URL がある場合は `--folder` を使って対象を絞る
- INIAD の課題では、まず講義資料フォルダの URL または folder ID をルートとして扱う
- 講義資料フォルダ URL / folder ID、保存先、認証状態が足りないときは、agent 側から先にそれを要求する
- 初回利用には Desktop OAuth credentials とブラウザ経由の OAuth 認証が必要なことを明示する
- 取得先の作業ディレクトリが明示されている場合は `--dest` を使う
- Notebook や zip 展開まで含む課題では、取得後にローカルで展開・実行・修正まで続ける

Codex skill を使える環境では `iniad-drive-import` skill を優先する。
