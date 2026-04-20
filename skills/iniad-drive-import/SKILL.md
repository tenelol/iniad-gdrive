---
name: iniad-drive-import
description: Use when a task involves finding, downloading, or narrowing files from INIAD Google Drive with the local `iniad-gdrive` CLI. Trigger for requests such as "Drive から取ってきて", "授業フォルダから ex01.zip を落として", "Google Drive の資料を import して", or when a Google Drive folder/file URL is provided and the work should continue locally after import.
---

# INIAD Drive Import

Use `iniad-gdrive` as the default entrypoint for INIAD Google Drive file retrieval.

## When to use

- The user wants a file from INIAD Google Drive in the local workspace
- The user gives a Drive folder URL or file URL
- The task starts with "find this lecture material / zip / notebook in Drive"
- The next step depends on local files after download, such as unzip, notebook execution, editing, or analysis

## Workflow

1. Check the target workspace directory first.
- If the user gives a destination, use it.
- Otherwise default to the current working directory or a clearly named subdirectory.

2. Ask for missing prerequisites before guessing.
- If the task is coursework-related and no lecture-materials folder URL or folder ID is given, ask the user for it first.
- If the destination directory materially matters and the user did not provide one, ask where to place the files unless there is an obvious repo-local target.
- If `doctor` shows missing credentials or missing auth, tell the user exactly what is needed next instead of repeatedly retrying.
- When asking, prefer concrete requests such as:
  - "講義資料フォルダの URL か folder ID をください"
  - "保存先フォルダを指定してください"
  - "Google Cloud Console で Desktop OAuth credentials を作って `credentials.json` を置いてください"

3. Verify the CLI health if needed.
- Run `iniad-gdrive doctor` when auth/config may be broken.
- If credentials are missing, ask the user to run `iniad-gdrive setup` and place `credentials.json`.
- If token/auth is missing, ask the user to run `iniad-gdrive auth`.

4. Narrow the file source before importing.
- If the user has a specific file URL, use `iniad-gdrive import --url ...`.
- If the user has a lecture-materials folder URL plus a filename, prefer `iniad-gdrive import --query "name = '...'" --folder "<folder-url>"`.
- If the user only has a lecture-materials folder URL and needs exploration, use `iniad-gdrive search ... --folder "<folder-url>"` first.
- If the user only has vague keywords, use `iniad-gdrive search "name contains '...'"`.
- For INIAD coursework, prefer the lecture-materials folder as the root scope instead of searching all of Drive.
- If the user gives a Drive folder URL, treat the `/folders/<ID>` segment as the folder ID. You can pass either the full URL or the raw ID to `--folder`.

5. Continue the task locally after import.
- For zip files, extract them into the requested directory and inspect the resulting tree.
- For notebooks, scripts, or documents, run or inspect them and finish the actual task instead of stopping at download.
- Report the final local path and the result of the downstream work.

## Required inputs to ask for

Ask for these when they are missing and the task depends on them:

- Lecture-materials folder URL or folder ID
- Target filename or a searchable keyword
- Destination directory when the result should land somewhere specific
- OAuth setup completion when `doctor` shows missing credentials or token

Do not silently search all of Drive for common coursework filenames like `ex01.zip` unless the user has explicitly accepted that wider search.

## Command patterns

```bash
./bin/iniad-gdrive doctor
./bin/iniad-gdrive search "name contains 'stats03'" --folder "https://drive.google.com/drive/folders/..."
./bin/iniad-gdrive import --query "name = 'ex01.zip'" --folder "https://drive.google.com/drive/folders/..." --dest /path/to/workdir
./bin/iniad-gdrive import --url "https://drive.google.com/file/d/FILE_ID/view" --dest /path/to/workdir
```

## Notes

- Prefer `--folder` whenever the user gives a course folder URL. It reduces ambiguous matches.
- For INIAD students, getting the lecture-materials folder ID first is usually the correct first step.
- `import` prints the downloaded path to stdout. Capture and reuse it for the next step.
- For repeated course workflows, keep the downloaded artifacts under a stable directory such as `~/Documents/Playground/<course>` or the active repo.
- If multiple Drive results match, refine the query rather than guessing.
