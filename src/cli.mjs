#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import enquirer from "enquirer";

const { Select } = enquirer;

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const DEFAULT_DEST = ".imports/iniad-gdrive";
const CONFIG_DIR =
  process.env.INIAD_GDRIVE_CONFIG_DIR ??
  path.join(process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config"), "iniad-gdrive");
const TOKEN_PATH = path.join(CONFIG_DIR, "token.json");
const CREDENTIALS_PATH =
  process.env.INIAD_GDRIVE_OAUTH_CREDENTIALS ?? path.join(CONFIG_DIR, "credentials.json");
const GOOGLE_AUTH_BASE_URL =
  process.env.INIAD_GDRIVE_AUTH_BASE_URL ?? "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL =
  process.env.INIAD_GDRIVE_TOKEN_URL ?? "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_BASE_URL =
  process.env.INIAD_GDRIVE_DRIVE_BASE_URL ?? "https://www.googleapis.com";
const MOCK_PATH = process.env.INIAD_GDRIVE_MOCK_PATH ?? "";

function usage() {
  process.stdout.write(`Usage:
  iniad-gdrive auth
  iniad-gdrive search <query> [--max N]
  iniad-gdrive import (--id ID | --url URL | --query QUERY) [--dest PATH] [--mime MIME]
  iniad-gdrive browse [folder-id-or-url]

Environment:
  INIAD_GDRIVE_CONFIG_DIR        Override config dir
  INIAD_GDRIVE_OAUTH_CREDENTIALS OAuth credentials JSON path
`);
}

function fail(message, exitCode = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(exitCode);
}

function ensureDir(dirPath) {
  return fsp.mkdir(dirPath, { recursive: true });
}

function parseArgs(argv) {
  const [command = ""] = argv;
  const rest = argv.slice(1);
  return { command, rest };
}

function parseOptions(args, spec) {
  const options = {};
  const positionals = [];

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current.startsWith("--")) {
      positionals.push(current);
      continue;
    }

    const key = current.slice(2);
    const kind = spec[key];
    if (!kind) {
      fail(`Unknown option: ${current}`);
    }

    if (kind === "boolean") {
      options[key] = true;
      continue;
    }

    const next = args[index + 1];
    if (!next) {
      fail(`${current} requires a value`);
    }
    options[key] = next;
    index += 1;
  }

  return { options, positionals };
}

function extractUrlKindAndId(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  const pathname = parsed.pathname;

  if (/^\/drive\/(?:u\/\d+\/)?home$/.test(pathname) || pathname === "/drive/my-drive") {
    return { kind: "folder", id: "root" };
  }

  let match = pathname.match(/\/drive\/folders\/([^/?#]+)/);
  if (match) {
    return { kind: "folder", id: match[1] };
  }

  match = pathname.match(/\/file\/d\/([^/?#]+)/);
  if (match) {
    return { kind: "file", id: match[1] };
  }

  match = pathname.match(/\/document\/d\/([^/?#]+)/);
  if (match) {
    return { kind: "file", id: match[1] };
  }

  match = pathname.match(/\/spreadsheets\/d\/([^/?#]+)/);
  if (match) {
    return { kind: "file", id: match[1] };
  }

  match = pathname.match(/\/presentation\/d\/([^/?#]+)/);
  if (match) {
    return { kind: "file", id: match[1] };
  }

  const fileId = parsed.searchParams.get("id");
  if (fileId) {
    return { kind: "file", id: fileId };
  }

  return null;
}

function defaultExportMime(mimeType) {
  switch (mimeType) {
    case "application/vnd.google-apps.document":
      return "text/markdown";
    case "application/vnd.google-apps.spreadsheet":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "application/vnd.google-apps.presentation":
    case "application/vnd.google-apps.drawing":
      return "application/pdf";
    default:
      return null;
  }
}

function extensionForExportMime(mimeType) {
  switch (mimeType) {
    case "text/markdown":
      return ".md";
    case "text/plain":
      return ".txt";
    case "text/csv":
      return ".csv";
    case "application/pdf":
      return ".pdf";
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return ".xlsx";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return ".docx";
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return ".pptx";
    default:
      return "";
  }
}

function withExportExtension(name, exportMime) {
  const ext = extensionForExportMime(exportMime);
  if (!ext || name.toLowerCase().endsWith(ext.toLowerCase())) {
    return name;
  }
  return `${name}${ext}`;
}

function queryWithDefaults(query) {
  return `trashed = false and (${query})`;
}

async function readJson(filePath) {
  const content = await fsp.readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fsp.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function stripOuterParens(text) {
  let result = text.trim();
  while (result.startsWith("(") && result.endsWith(")")) {
    result = result.slice(1, -1).trim();
  }
  return result;
}

function stripBoundaryParens(text) {
  return text.trim().replace(/^\(+/, "").replace(/\)+$/, "").trim();
}

function splitQueryTerms(query) {
  return stripOuterParens(query)
    .split(/\s+and\s+/i)
    .map((term) => stripBoundaryParens(stripOuterParens(term)))
    .filter(Boolean);
}

function mockMatchesQuery(file, rawQuery) {
  const terms = splitQueryTerms(rawQuery);
  return terms.every((term) => {
    if (/^trashed\s*=\s*false$/i.test(term)) {
      return true;
    }

    let match = term.match(/^name\s+contains\s+'([^']+)'$/i);
    if (match) {
      return file.name.includes(match[1]);
    }

    match = term.match(/^name\s*=\s*'([^']+)'$/i);
    if (match) {
      return file.name === match[1];
    }

    match = term.match(/^mimeType\s*!=\s*'([^']+)'$/i);
    if (match) {
      return file.mimeType !== match[1];
    }

    match = term.match(/^mimeType\s*=\s*'([^']+)'$/i);
    if (match) {
      return file.mimeType === match[1];
    }

    match = term.match(/^'([^']+)'\s+in\s+parents$/i);
    if (match) {
      return (file.parents ?? []).includes(match[1]);
    }

    return false;
  });
}

class MockDriveProvider {
  constructor(fixturePath) {
    this.fixturePath = fixturePath;
    this.fixture = null;
  }

  async loadFixture() {
    if (!this.fixture) {
      this.fixture = await readJson(this.fixturePath);
    }
    return this.fixture;
  }

  async auth() {
    await ensureDir(CONFIG_DIR);
    await writeJson(TOKEN_PATH, {
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      expiry_date: Date.now() + 60_000,
    });
  }

  async requireAuth() {
    try {
      await fsp.access(TOKEN_PATH, fs.constants.F_OK);
    } catch {
      fail("Authentication required. Run: iniad-gdrive auth");
    }
  }

  async search(query, pageSize) {
    const fixture = await this.loadFixture();
    const files = (fixture.files ?? []).filter((file) => mockMatchesQuery(file, query));
    return files.slice(0, pageSize);
  }

  async getFile(fileId) {
    const fixture = await this.loadFixture();
    const target = (fixture.files ?? []).find((file) => file.id === fileId);
    if (!target) {
      fail(`File not found: ${fileId}`);
    }
    return target;
  }

  async listFolder(folderId, pageSize) {
    const fixture = await this.loadFixture();
    const current = folderId === "root" ? { id: "root", name: "My Drive", parents: [] } : await this.getFile(folderId);
    const items = (fixture.files ?? [])
      .filter((file) => (file.parents ?? []).includes(folderId))
      .slice(0, pageSize);
    return { current, items };
  }

  async download(fileId) {
    const file = await this.getFile(fileId);
    return Buffer.from(file.content ?? "", "utf8");
  }

  async export(fileId, mimeType) {
    const file = await this.getFile(fileId);
    const content = file.exports?.[mimeType];
    if (typeof content !== "string") {
      fail(`Unsupported export mime type in mock: ${mimeType}`);
    }
    return Buffer.from(content, "utf8");
  }
}

class GoogleDriveProvider {
  async loadCredentials() {
    try {
      const raw = await readJson(CREDENTIALS_PATH);
      const data = raw.installed ?? raw.web;
      if (!data?.client_id) {
        throw new Error("Missing installed.client_id");
      }
      return data;
    } catch {
      fail(
        [
          "OAuth credentials not found.",
          `Create a Google Cloud Desktop OAuth client and save the JSON to: ${CREDENTIALS_PATH}`,
          "You can also point INIAD_GDRIVE_OAUTH_CREDENTIALS at that JSON file.",
        ].join("\n"),
      );
    }
  }

  async loadToken() {
    try {
      return await readJson(TOKEN_PATH);
    } catch {
      fail("Authentication required. Run: iniad-gdrive auth");
    }
  }

  async saveToken(token) {
    await writeJson(TOKEN_PATH, token);
  }

  async auth() {
    const credentials = await this.loadCredentials();
    await ensureDir(CONFIG_DIR);

    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

    const server = http.createServer();
    const authCodePromise = new Promise((resolve, reject) => {
      server.on("request", (req, res) => {
        const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
        const code = requestUrl.searchParams.get("code");
        const error = requestUrl.searchParams.get("error");
        if (error) {
          res.writeHead(400, { "content-type": "text/html; charset=utf-8" });
          res.end("<h1>Authorization failed</h1><p>You can close this window.</p>");
          reject(new Error(`Authorization failed: ${error}`));
          return;
        }
        if (!code) {
          res.writeHead(400, { "content-type": "text/html; charset=utf-8" });
          res.end("<h1>Missing code</h1><p>You can close this window.</p>");
          return;
        }
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end("<h1>Authorized</h1><p>You can close this window and return to the terminal.</p>");
        resolve(code);
      });
      server.on("error", reject);
    });

    await new Promise((resolve, reject) => {
      server.listen(0, "127.0.0.1", (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    const { port } = server.address();
    const redirectUri = `http://127.0.0.1:${port}`;
    const authUrl = new URL(GOOGLE_AUTH_BASE_URL);
    authUrl.searchParams.set("client_id", credentials.client_id);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", SCOPES.join(" "));
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    process.stderr.write(`Open the following URL in your browser if it does not open automatically:\n${authUrl}\n`);
    this.openBrowser(authUrl.toString());

    let code;
    try {
      code = await Promise.race([
        authCodePromise,
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Timed out waiting for OAuth callback.")), 300_000);
        }),
      ]);
    } finally {
      server.close();
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret ?? "",
        code,
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text();
      fail(`OAuth token exchange failed: ${body}`);
    }

    const token = await tokenResponse.json();
    await this.saveToken({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      scope: token.scope,
      token_type: token.token_type,
      expiry_date: Date.now() + (token.expires_in ?? 0) * 1000,
    });
  }

  openBrowser(url) {
    const openers =
      process.platform === "darwin"
        ? [["open", [url]]]
        : process.platform === "win32"
          ? [["cmd", ["/c", "start", "", url]]]
          : [["xdg-open", [url]]];

    for (const [command, args] of openers) {
      try {
        const child = spawn(command, args, {
          detached: true,
          stdio: "ignore",
        });
        child.unref();
        return;
      } catch {
        continue;
      }
    }
  }

  async requireAuth() {
    await this.getAccessToken();
  }

  async getAccessToken() {
    const credentials = await this.loadCredentials();
    const token = await this.loadToken();

    if (token.access_token && token.expiry_date && Date.now() < token.expiry_date - 60_000) {
      return token.access_token;
    }

    if (!token.refresh_token) {
      fail("Stored token is missing refresh_token. Run: iniad-gdrive auth");
    }

    const refreshResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret ?? "",
        grant_type: "refresh_token",
        refresh_token: token.refresh_token,
      }),
    });

    if (!refreshResponse.ok) {
      const body = await refreshResponse.text();
      fail(`OAuth token refresh failed: ${body}`);
    }

    const refreshed = await refreshResponse.json();
    const nextToken = {
      ...token,
      access_token: refreshed.access_token,
      scope: refreshed.scope ?? token.scope,
      token_type: refreshed.token_type ?? token.token_type,
      expiry_date: Date.now() + (refreshed.expires_in ?? 0) * 1000,
    };
    await this.saveToken(nextToken);
    return nextToken.access_token;
  }

  async driveRequest(endpoint, { query = {}, method = "GET", body } = {}) {
    const accessToken = await this.getAccessToken();
    const url = new URL(`/drive/v3${endpoint}`, GOOGLE_DRIVE_BASE_URL);
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${accessToken}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      fail(`Google Drive API request failed (${response.status}): ${text}`);
    }
    return response;
  }

  async search(query, pageSize) {
    const response = await this.driveRequest("/files", {
      query: {
        q: query,
        pageSize,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        fields: "files(id,name,mimeType,parents,webViewLink)",
      },
    });
    const payload = await response.json();
    return payload.files ?? [];
  }

  async getFile(fileId) {
    const response = await this.driveRequest(`/files/${encodeURIComponent(fileId)}`, {
      query: {
        supportsAllDrives: true,
        fields: "id,name,mimeType,parents,webViewLink",
      },
    });
    return response.json();
  }

  async listFolder(folderId, pageSize) {
    const current =
      folderId === "root"
        ? { id: "root", name: "My Drive", parents: [] }
        : await this.getFile(folderId);
    const items = await this.search(`trashed = false and '${folderId}' in parents`, pageSize);
    return { current, items };
  }

  async download(fileId) {
    const accessToken = await this.getAccessToken();
    const url = new URL(`/drive/v3/files/${encodeURIComponent(fileId)}`, GOOGLE_DRIVE_BASE_URL);
    url.searchParams.set("alt", "media");
    url.searchParams.set("supportsAllDrives", "true");
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const text = await response.text();
      fail(`Google Drive download failed (${response.status}): ${text}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  async export(fileId, mimeType) {
    const accessToken = await this.getAccessToken();
    const url = new URL(`/drive/v3/files/${encodeURIComponent(fileId)}/export`, GOOGLE_DRIVE_BASE_URL);
    url.searchParams.set("mimeType", mimeType);
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const text = await response.text();
      fail(`Google Drive export failed (${response.status}): ${text}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
}

function createProvider() {
  if (MOCK_PATH) {
    return new MockDriveProvider(MOCK_PATH);
  }
  return new GoogleDriveProvider();
}

function formatFileLine(file) {
  return `${file.id}\t${file.mimeType}\t${file.name}`;
}

async function moveBufferToDestination(buffer, destDir, fileName) {
  await ensureDir(destDir);
  const outputPath = path.join(destDir, fileName);
  await fsp.writeFile(outputPath, buffer);
  return outputPath;
}

async function resolveQueryToSingleFile(provider, query) {
  const files = await provider.search(queryWithDefaults(query), 30);
  if (files.length === 0) {
    fail(`No files matched query: ${query}`);
  }
  if (files.length > 1) {
    process.stderr.write("Multiple files matched query. Narrow the query or use --id/--url.\n");
    for (const file of files) {
      process.stderr.write(`${formatFileLine(file)}\n`);
    }
    process.exit(1);
  }
  return files[0];
}

async function importFileById(provider, fileId, { dest = DEFAULT_DEST, exportMime = "" } = {}) {
  const file = await provider.getFile(fileId);
  if (file.mimeType === "application/vnd.google-apps.folder") {
    fail("Folders cannot be imported directly. Use: iniad-gdrive browse <folder-id-or-url>");
  }

  if (file.mimeType.startsWith("application/vnd.google-apps.")) {
    const targetMime = exportMime || defaultExportMime(file.mimeType);
    if (!targetMime) {
      fail(`Unsupported Google Workspace mime type: ${file.mimeType}. Pass --mime explicitly.`);
    }
    const buffer = await provider.export(file.id, targetMime);
    const outputPath = await moveBufferToDestination(
      buffer,
      dest,
      withExportExtension(file.name, targetMime),
    );
    process.stdout.write(`${outputPath}\n`);
    return outputPath;
  }

  const buffer = await provider.download(file.id);
  const outputPath = await moveBufferToDestination(buffer, dest, file.name);
  process.stdout.write(`${outputPath}\n`);
  return outputPath;
}

async function cmdAuth(provider) {
  await provider.auth();
}

async function cmdSearch(provider, args) {
  const { options, positionals } = parseOptions(args, { max: "string" });
  if (positionals.length < 1) {
    fail("search requires a query");
  }
  await provider.requireAuth();
  const query = positionals[0];
  const pageSize = Number.parseInt(options.max ?? "30", 10);
  const files = await provider.search(queryWithDefaults(query), pageSize);
  for (const file of files) {
    process.stdout.write(`${formatFileLine(file)}\n`);
  }
}

async function cmdImport(provider, args) {
  const { options } = parseOptions(args, {
    id: "string",
    url: "string",
    query: "string",
    dest: "string",
    mime: "string",
  });

  const modes = ["id", "url", "query"].filter((key) => options[key]);
  if (modes.length !== 1) {
    fail("import requires exactly one of --id, --url, or --query");
  }

  await provider.requireAuth();

  if (options.id) {
    await importFileById(provider, options.id, {
      dest: options.dest ?? DEFAULT_DEST,
      exportMime: options.mime ?? "",
    });
    return;
  }

  if (options.url) {
    const parsed = extractUrlKindAndId(options.url);
    if (!parsed) {
      fail(`Unsupported Google Drive URL: ${options.url}`);
    }
    if (parsed.kind === "folder") {
      fail("Folder URLs cannot be imported directly. Use: iniad-gdrive browse <folder-url>");
    }
    await importFileById(provider, parsed.id, {
      dest: options.dest ?? DEFAULT_DEST,
      exportMime: options.mime ?? "",
    });
    return;
  }

  const file = await resolveQueryToSingleFile(provider, options.query);
  await importFileById(provider, file.id, {
    dest: options.dest ?? DEFAULT_DEST,
    exportMime: options.mime ?? "",
  });
}

async function cmdBrowse(provider, args) {
  const initial = args[0] ?? "root";
  const parsed = initial.startsWith("http")
    ? extractUrlKindAndId(initial)
    : { kind: "folder", id: initial };

  if (!parsed) {
    fail(`Unsupported Google Drive URL: ${initial}`);
  }
  if (parsed.kind !== "folder") {
    fail("browse expects a folder URL or folder ID");
  }

  await provider.requireAuth();

  let currentId = parsed.id;
  while (true) {
    const { current, items } = await provider.listFolder(currentId, 200);
    const sortedItems = [...items].sort((left, right) => {
      const leftFolder = left.mimeType === "application/vnd.google-apps.folder";
      const rightFolder = right.mimeType === "application/vnd.google-apps.folder";
      if (leftFolder !== rightFolder) {
        return leftFolder ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });

    const choices = [];
    if ((current.parents ?? []).length > 0) {
      choices.push({ name: "__up", message: "../ (up)", value: "__up" });
    }
    for (const item of sortedItems) {
      const icon = item.mimeType === "application/vnd.google-apps.folder" ? "📁" : "📄";
      choices.push({
        name: item.id,
        message: `${icon} ${item.name}`,
        value: item.id,
      });
    }
    choices.push({ name: "__quit", message: "Quit", value: "__quit" });

    const selection = await new Select({
      name: "browse",
      message: `Folder: ${current.name}`,
      choices,
    }).run();

    if (selection === "__quit") {
      return;
    }
    if (selection === "__up") {
      currentId = current.parents[0];
      continue;
    }

    const selected = sortedItems.find((item) => item.id === selection);
    if (!selected) {
      continue;
    }

    if (selected.mimeType === "application/vnd.google-apps.folder") {
      currentId = selected.id;
      continue;
    }

    const action = await new Select({
      name: "fileAction",
      message: `File: ${selected.name}`,
      choices: [
        { name: "import", message: "Import to local ./.imports/iniad-gdrive", value: "import" },
        { name: "back", message: "Back", value: "back" },
      ],
    }).run();

    if (action === "import") {
      await importFileById(provider, selected.id, { dest: DEFAULT_DEST });
      return;
    }
  }
}

async function main() {
  const provider = createProvider();
  const { command, rest } = parseArgs(process.argv.slice(2));

  switch (command) {
    case "":
    case "help":
    case "-h":
    case "--help":
      usage();
      break;
    case "auth":
      await cmdAuth(provider);
      break;
    case "search":
      await cmdSearch(provider, rest);
      break;
    case "import":
      await cmdImport(provider, rest);
      break;
    case "browse":
      await cmdBrowse(provider, rest);
      break;
    default:
      fail(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
