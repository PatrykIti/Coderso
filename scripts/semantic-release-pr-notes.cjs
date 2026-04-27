const { spawnSync } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");

const RELEASE_CATEGORIES = ["Added", "Changed", "Fixed", "Removed", "Security"];
const CHANGELOG_HEADER = `# Changelog

All notable changes to this project will be documented in this file.
The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.
`;

const DEFAULT_VERSION_FILES = [
  "package.json",
  "core/package.json",
  "store/package.json",
  "packages/sdk/package.json",
];

const DEFAULT_TEXT_VERSION_FILES = [
  {
    path: "core/plugins/compat.ts",
    pattern: '(CORE_VERSION\\s*\\?\\?\\s*")[^"]+(")',
  },
];

function createEmptyReleaseNotes() {
  return Object.fromEntries(RELEASE_CATEGORIES.map((category) => [category, []]));
}

function normalizeCategory(value) {
  const match = RELEASE_CATEGORIES.find(
    (category) => category.toLowerCase() === String(value).trim().toLowerCase()
  );
  return match ?? null;
}

function normalizeReleaseNoteText(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (/^(none|n\/a|na|not applicable|tbd|todo)\.?$/i.test(text)) return null;
  if (/^[-_]+$/.test(text)) return null;
  return text;
}

function isReleaseNotesHeader(line) {
  return /^\s*(?:#{1,6}\s*)?\[?\s*Release Notes\s*\]?\s*:?\s*$/i.test(line);
}

function isNextMarkdownSection(line) {
  return /^\s*##\s+/.test(line) && !isReleaseNotesHeader(line);
}

function extractReleaseNotesFromBody(body) {
  const notes = createEmptyReleaseNotes();
  const lines = String(body ?? "").split(/\r?\n/);
  let inReleaseNotes = false;
  let currentCategory = null;

  for (const line of lines) {
    if (isReleaseNotesHeader(line)) {
      inReleaseNotes = true;
      currentCategory = null;
      continue;
    }

    if (!inReleaseNotes) continue;
    if (isNextMarkdownSection(line)) break;

    const bracketMatch = line.match(
      /^\s*[-*]\s*\[(Added|Changed|Fixed|Removed|Security)\]\s*(.*)$/i
    );
    if (bracketMatch) {
      const category = normalizeCategory(bracketMatch[1]);
      currentCategory = category;
      const text = normalizeReleaseNoteText(bracketMatch[2]);
      if (category && text) notes[category].push(text);
      continue;
    }

    const headingMatch = line.match(/^\s*#{1,6}\s+(Added|Changed|Fixed|Removed|Security)\s*$/i);
    if (headingMatch) {
      currentCategory = normalizeCategory(headingMatch[1]);
      continue;
    }

    const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (currentCategory && bulletMatch) {
      const text = normalizeReleaseNoteText(bulletMatch[1]);
      if (text) notes[currentCategory].push(text);
    }
  }

  return notes;
}

function mergeReleaseNotes(notesList) {
  const merged = createEmptyReleaseNotes();
  const seen = new Set();

  for (const notes of notesList) {
    for (const category of RELEASE_CATEGORIES) {
      for (const item of notes[category] ?? []) {
        const key = `${category}:${item}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged[category].push(item);
      }
    }
  }

  return merged;
}

function hasReleaseNotes(notes) {
  return RELEASE_CATEGORIES.some((category) => (notes[category] ?? []).length > 0);
}

function formatReleaseNotesSections(notes) {
  const sections = [];

  for (const category of RELEASE_CATEGORIES) {
    const items = notes[category] ?? [];
    if (items.length === 0) continue;
    sections.push(`### ${category}\n${items.map((item) => `- ${item}`).join("\n")}`);
  }

  if (sections.length > 0) return sections.join("\n\n");
  return "### Changed\n- No categorized release notes were provided.";
}

function formatKeepAChangelogEntry(version, date, notes) {
  return `## [${version}] - ${date}\n${formatReleaseNotesSections(notes)}`;
}

function parsePullRequestNumbersFromText(value) {
  const numbers = new Set();
  const text = String(value ?? "");
  const matches = text.matchAll(/(?:pull request\s*)?#(\d+)|\(#(\d+)\)/gi);
  for (const match of matches) {
    const raw = match[1] ?? match[2];
    const valueAsNumber = Number(raw);
    if (Number.isInteger(valueAsNumber) && valueAsNumber > 0) numbers.add(valueAsNumber);
  }
  return [...numbers];
}

function parseGitHubRepository(repositoryUrl, env = process.env) {
  if (env.GITHUB_REPOSITORY) {
    const [owner, repo] = env.GITHUB_REPOSITORY.split("/");
    if (owner && repo) return { owner, repo };
  }

  const match = String(repositoryUrl ?? "").match(/github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/.]+)(?:\.git)?$/);
  if (!match?.groups) return null;
  return { owner: match.groups.owner, repo: match.groups.repo };
}

async function githubRequest(apiPath, token, fetchImpl = globalThis.fetch) {
  if (!token || typeof fetchImpl !== "function") return null;
  const response = await fetchImpl(`https://api.github.com${apiPath}`, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`github_request_failed:${response.status}:${apiPath}`);
  }
  return response.json();
}

async function discoverPullRequestNumbers(context, options = {}) {
  const commits = context.commits ?? [];
  const repository = parseGitHubRepository(context.options?.repositoryUrl, context.env);
  const token = context.env?.GITHUB_TOKEN ?? context.env?.GH_TOKEN ?? "";
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const numbers = new Set();

  for (const commit of commits) {
    for (const number of parsePullRequestNumbersFromText(commit.message ?? commit.subject ?? "")) {
      numbers.add(number);
    }

    if (!repository || !token || !commit.hash) continue;
    try {
      const associatedPulls = await githubRequest(
        `/repos/${repository.owner}/${repository.repo}/commits/${commit.hash}/pulls`,
        token,
        fetchImpl
      );
      if (Array.isArray(associatedPulls)) {
        for (const pull of associatedPulls) {
          if (typeof pull.number === "number") numbers.add(pull.number);
        }
      }
    } catch (error) {
      context.logger?.warn?.(`Unable to discover PR for commit ${commit.hash}: ${error.message}`);
    }
  }

  return [...numbers].sort((left, right) => left - right);
}

async function fetchPullRequestDetails(context, numbers, options = {}) {
  const repository = parseGitHubRepository(context.options?.repositoryUrl, context.env);
  const token = context.env?.GITHUB_TOKEN ?? context.env?.GH_TOKEN ?? "";
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (!repository || !token) return [];

  const results = [];
  for (const number of numbers) {
    try {
      const pull = await githubRequest(
        `/repos/${repository.owner}/${repository.repo}/pulls/${number}`,
        token,
        fetchImpl
      );
      if (pull) results.push(pull);
    } catch (error) {
      context.logger?.warn?.(`Unable to fetch PR #${number}: ${error.message}`);
    }
  }
  return results;
}

async function collectReleaseNotes(context, options = {}) {
  const numbers = await discoverPullRequestNumbers(context, options);
  const pulls = await fetchPullRequestDetails(context, numbers, options);
  const notes = mergeReleaseNotes(pulls.map((pull) => extractReleaseNotesFromBody(pull.body ?? "")));

  if (!hasReleaseNotes(notes)) {
    context.logger?.warn?.("No categorized PR release notes found for this release.");
  }

  return notes;
}

function insertVersionAfterName(packageJson, version) {
  const result = {};
  let inserted = false;

  for (const [key, value] of Object.entries(packageJson)) {
    result[key] = value;
    if (key === "name") {
      result.version = version;
      inserted = true;
    }
  }

  if (!inserted) result.version = version;
  return result;
}

async function updatePackageVersionFile(filePath, version) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  const next = insertVersionAfterName(parsed, version);
  await fs.writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`);
}

async function updateTextVersionFile(filePath, pattern, version) {
  const raw = await fs.readFile(filePath, "utf8");
  const regex = new RegExp(pattern);
  if (!regex.test(raw)) {
    throw new Error(`version_pattern_not_found:${filePath}`);
  }
  const next = raw.replace(regex, `$1${version}$2`);
  await fs.writeFile(filePath, next);
}

function upsertChangelogEntry(existing, version, entry) {
  const normalizedExisting = existing.trim().length > 0 ? existing : CHANGELOG_HEADER;
  const versionMarker = `## [${version}]`;
  const currentEntryStart = normalizedExisting.indexOf(versionMarker);

  if (currentEntryStart !== -1) {
    const nextEntryMatch = normalizedExisting.slice(currentEntryStart + 1).match(/\n## \[/);
    const currentEntryEnd =
      nextEntryMatch && typeof nextEntryMatch.index === "number"
        ? currentEntryStart + 1 + nextEntryMatch.index + 1
        : normalizedExisting.length;
    return [
      normalizedExisting.slice(0, currentEntryStart).trimEnd(),
      entry.trim(),
      normalizedExisting.slice(currentEntryEnd).trimStart(),
    ]
      .filter(Boolean)
      .join("\n\n")
      .concat("\n");
  }

  const firstReleaseIndex = normalizedExisting.search(/^## \[/m);
  if (firstReleaseIndex === -1) {
    return `${normalizedExisting.trim()}\n\n${entry.trim()}\n`;
  }

  return `${normalizedExisting.slice(0, firstReleaseIndex).trim()}\n\n${entry.trim()}\n${normalizedExisting.slice(firstReleaseIndex)}`;
}

async function writeChangelogEntry(filePath, version, entry) {
  let existing = "";
  try {
    existing = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await fs.writeFile(filePath, upsertChangelogEntry(existing, version, entry));
}

function runLockfileCommand(cwd, command) {
  if (command === false) return;
  const commandParts = Array.isArray(command)
    ? command
    : ["bun", "install", "--lockfile-only", "--ignore-scripts"];
  const result = spawnSync(commandParts[0], commandParts.slice(1), {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`lockfile_update_failed:${commandParts.join(" ")}`);
  }
}

async function writeReleaseOutput(filePath, version, gitTag) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(
    filePath,
    [`released=true`, `version=${version}`, `git_tag=${gitTag || version}`, ""].join("\n")
  );
}

async function generateNotes(pluginConfig, context) {
  const notes = await collectReleaseNotes(context, pluginConfig);
  const date = new Date().toISOString().slice(0, 10);
  return formatKeepAChangelogEntry(context.nextRelease.version, date, notes);
}

async function prepare(pluginConfig, context) {
  const cwd = context.cwd ?? process.cwd();
  const version = context.nextRelease.version;
  const gitTag = context.nextRelease.gitTag ?? version;
  const changelogFile = path.resolve(cwd, pluginConfig.changelogFile ?? "CHANGELOG.md");
  const versionFiles = pluginConfig.versionFiles ?? DEFAULT_VERSION_FILES;
  const textVersionFiles = pluginConfig.textVersionFiles ?? DEFAULT_TEXT_VERSION_FILES;
  const releaseEntry =
    context.nextRelease.notes ??
    formatKeepAChangelogEntry(version, new Date().toISOString().slice(0, 10), createEmptyReleaseNotes());

  await writeChangelogEntry(changelogFile, version, releaseEntry);

  for (const versionFile of versionFiles) {
    await updatePackageVersionFile(path.resolve(cwd, versionFile), version);
  }

  for (const textVersionFile of textVersionFiles) {
    await updateTextVersionFile(
      path.resolve(cwd, textVersionFile.path),
      textVersionFile.pattern,
      version
    );
  }

  runLockfileCommand(cwd, pluginConfig.lockfileCommand);

  if (pluginConfig.outputFile) {
    await writeReleaseOutput(path.resolve(cwd, pluginConfig.outputFile), version, gitTag);
  }

  context.logger?.success?.(`Prepared release ${version} files.`);
}

module.exports = {
  RELEASE_CATEGORIES,
  collectReleaseNotes,
  createEmptyReleaseNotes,
  discoverPullRequestNumbers,
  extractReleaseNotesFromBody,
  formatKeepAChangelogEntry,
  formatReleaseNotesSections,
  generateNotes,
  hasReleaseNotes,
  mergeReleaseNotes,
  parseGitHubRepository,
  parsePullRequestNumbersFromText,
  prepare,
  updatePackageVersionFile,
  updateTextVersionFile,
  upsertChangelogEntry,
  writeChangelogEntry,
};
