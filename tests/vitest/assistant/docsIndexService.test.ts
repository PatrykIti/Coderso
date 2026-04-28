import { afterEach, expect, test } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  buildDocsIndex,
  clearDocsIndexCache,
  ensureDocsIndex,
  getDocsIndexStatus,
  reindexDocsIndex,
} from "../../../core/services/assistant/docsIndexService";

const tempDirs: string[] = [];

const createDocsFixture = async () => {
  const root = await mkdtemp(path.join(tmpdir(), "coderso-assistant-docs-"));
  tempDirs.push(root);
  const docsDir = path.join(root, "_docs");
  await mkdir(path.join(docsDir, "widgets"), { recursive: true });
  await mkdir(path.join(docsDir, "settings"), { recursive: true });

  await writeFile(
    path.join(docsDir, "widgets", "hero.md"),
    [
      "# Hero Widget",
      "",
      "## Ustawienia Hero",
      "Hero widget supports centered and media layouts.",
      "",
      "## Visual",
      "Use visual tab to change colors and spacing.",
      "",
      "## Advanced",
      "Advanced tab controls margins and visibility.",
      "",
    ].join("\n")
  );

  await writeFile(
    path.join(docsDir, "settings", "site.md"),
    [
      "# Site Settings",
      "",
      "## Base URL",
      "Use site public base URL for preview links.",
      "",
      "## Security TTL",
      "Auth session TTL and reset TTL can be changed in settings.",
      "",
    ].join("\n")
  );

  return { root, docsDir };
};

afterEach(async () => {
  clearDocsIndexCache();
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("buildDocsIndex parses markdown headings and creates chunks", async () => {
  const fixture = await createDocsFixture();
  const index = await buildDocsIndex({
    docPaths: [fixture.docsDir],
    cwd: fixture.root,
    maxChunkChars: 180,
  });

  expect(index.docCount).toBe(2);
  expect(index.chunkCount).toBeGreaterThan(2);
  expect(index.configuredPaths).toEqual([fixture.docsDir]);

  const heroChunk = index.chunks.find((chunk) => chunk.docPath.includes("hero.md"));
  expect(heroChunk).toBeDefined();
  expect(heroChunk?.headingPath.join(" > ")).toContain("Ustawienia Hero");
  expect(heroChunk?.lineStart).toBeGreaterThan(0);
  expect(heroChunk?.lineEnd).toBeGreaterThanOrEqual(heroChunk?.lineStart ?? 0);
  expect(index.tokenDocumentFrequency.hero).toBeGreaterThan(0);
});

test("reindexDocsIndex updates cache and getDocsIndexStatus", async () => {
  const fixture = await createDocsFixture();
  const initialStatus = getDocsIndexStatus();
  expect(initialStatus.ready).toBe(false);

  const reindexed = await reindexDocsIndex({
    docPaths: [fixture.docsDir],
    cwd: fixture.root,
  });
  const ensured = await ensureDocsIndex({
    docPaths: [fixture.docsDir],
    cwd: fixture.root,
  });
  const status = getDocsIndexStatus();

  expect(reindexed.docCount).toBe(2);
  expect(ensured).toBe(reindexed);
  expect(status.ready).toBe(true);
  expect(status.chunkCount).toBe(reindexed.chunkCount);
  expect(status.error).toBeNull();
});

test("reindexDocsIndex reflects documentation updates", async () => {
  const fixture = await createDocsFixture();

  const firstIndex = await reindexDocsIndex({
    docPaths: [fixture.docsDir],
    cwd: fixture.root,
  });
  expect(firstIndex.chunks.some((chunk) => chunk.content.includes("Brand new guidance"))).toBe(
    false
  );

  await writeFile(
    path.join(fixture.docsDir, "widgets", "hero.md"),
    [
      "# Hero Widget",
      "",
      "## Ustawienia Hero",
      "Hero widget supports centered and media layouts.",
      "",
      "## Visual",
      "Brand new guidance for visual tab.",
      "",
    ].join("\n")
  );

  const secondIndex = await reindexDocsIndex({
    docPaths: [fixture.docsDir],
    cwd: fixture.root,
  });

  expect(secondIndex.chunks.some((chunk) => chunk.content.includes("Brand new guidance"))).toBe(
    true
  );
});
