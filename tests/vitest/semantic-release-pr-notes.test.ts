import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

import { expect, test } from "vitest";

type ReleaseCategory = "Added" | "Changed" | "Fixed" | "Removed" | "Security";
type ReleaseNotes = Record<ReleaseCategory, string[]>;

type ReleaseNotesModule = {
  extractReleaseNotesFromBody: (body: string) => ReleaseNotes;
  formatKeepAChangelogEntry: (
    version: string,
    date: string,
    notes: ReleaseNotes
  ) => string;
  parsePullRequestNumbersFromText: (value: string) => number[];
  updatePackageVersionFile: (filePath: string, version: string) => Promise<void>;
  updateTextVersionFile: (
    filePath: string,
    pattern: string,
    version: string
  ) => Promise<void>;
  upsertChangelogEntry: (existing: string, version: string, entry: string) => string;
};

const require = createRequire(import.meta.url);
const releaseNotes = require("../../scripts/semantic-release-pr-notes.cjs") as ReleaseNotesModule;

test("extractReleaseNotesFromBody reads categorized PR template bullets", () => {
  const notes = releaseNotes.extractReleaseNotesFromBody(`# Pull Request

## Summary
Short description.

[Release Notes]
- [Added] Admin release workflow.
- [Changed] Docker tags now follow semantic versions.
- [Fixed]
- [Removed] None.
- [Security] GHCR publishing uses GITHUB_TOKEN.

## Checklist
- reviewed
`);

  expect(notes.Added).toEqual(["Admin release workflow."]);
  expect(notes.Changed).toEqual(["Docker tags now follow semantic versions."]);
  expect(notes.Fixed).toEqual([]);
  expect(notes.Removed).toEqual([]);
  expect(notes.Security).toEqual(["GHCR publishing uses GITHUB_TOKEN."]);
});

test("formatKeepAChangelogEntry emits Keep a Changelog sections", () => {
  const entry = releaseNotes.formatKeepAChangelogEntry("1.1.0", "2026-04-27", {
    Added: ["Semantic release workflow."],
    Changed: [],
    Fixed: ["Docker image tag now matches the release version."],
    Removed: [],
    Security: [],
  });

  expect(entry).toContain("## [1.1.0] - 2026-04-27");
  expect(entry).toContain("### Added\n- Semantic release workflow.");
  expect(entry).toContain("### Fixed\n- Docker image tag now matches the release version.");
  expect(entry).not.toContain("### Removed");
});

test("upsertChangelogEntry prepends and replaces version entries", () => {
  const initial = `# Changelog

All notable changes to this project will be documented in this file.
The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [1.0.0] - 2026-04-01
### Added
- Initial release.
`;
  const nextEntry = `## [1.1.0] - 2026-04-27
### Added
- Release automation.`;

  const updated = releaseNotes.upsertChangelogEntry(initial, "1.1.0", nextEntry);
  expect(updated.indexOf("## [1.1.0]")).toBeLessThan(updated.indexOf("## [1.0.0]"));

  const replacement = releaseNotes.upsertChangelogEntry(
    updated,
    "1.1.0",
    `## [1.1.0] - 2026-04-28
### Fixed
- Replacement.`
  );
  expect(replacement).toContain("## [1.1.0] - 2026-04-28");
  expect(replacement).not.toContain("Release automation.");
});

test("updatePackageVersionFile keeps version next to package name", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "nextless-release-notes-"));
  const packagePath = path.join(dir, "package.json");
  await writeFile(
    packagePath,
    JSON.stringify(
      {
        name: "@nextless/example",
        private: true,
        scripts: { test: "vitest" },
      },
      null,
      2
    )
  );

  await releaseNotes.updatePackageVersionFile(packagePath, "1.2.3");

  const raw = await readFile(packagePath, "utf8");
  expect(raw).toContain('"name": "@nextless/example",\n  "version": "1.2.3",');
  expect(JSON.parse(raw)).toMatchObject({ version: "1.2.3" });
});

test("parsePullRequestNumbersFromText supports merge and squash messages", () => {
  expect(
    releaseNotes.parsePullRequestNumbersFromText(
      "Merge pull request #123 from team/release\n\nfeat: release workflow (#124)"
    )
  ).toEqual([123, 124]);
});

test("updateTextVersionFile updates CORE_VERSION fallback", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "nextless-core-version-"));
  const compatPath = path.join(dir, "compat.ts");
  await writeFile(
    compatPath,
    'export const CORE_VERSION = process.env.CORE_VERSION ?? "1.0.0";\n'
  );

  await releaseNotes.updateTextVersionFile(
    compatPath,
    '(CORE_VERSION\\s*\\?\\?\\s*")[^"]+(")',
    "1.2.3"
  );

  await expect(readFile(compatPath, "utf8")).resolves.toBe(
    'export const CORE_VERSION = process.env.CORE_VERSION ?? "1.2.3";\n'
  );
});
