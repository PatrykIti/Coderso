import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { buildDocsIndex, clearDocsIndexCache } from "../../../core/services/assistant/docsIndexService";
import { searchDocsIndex } from "../../../core/services/assistant/docsRetriever";

const tempDirs: string[] = [];

const createRetrieverFixture = async () => {
  const root = await mkdtemp(path.join(tmpdir(), "nextless-assistant-retriever-"));
  tempDirs.push(root);
  const docsDir = path.join(root, "_docs");
  await mkdir(path.join(docsDir, "widgets"), { recursive: true });
  await mkdir(path.join(docsDir, "security"), { recursive: true });

  await writeFile(
    path.join(docsDir, "widgets", "hero.md"),
    [
      "# Hero Widget",
      "",
      "## Visual",
      "Visual options for hero widget include background, border, and typography controls.",
      "",
      "## Wizard",
      "Wizard mode exposes minimum fields for hero content.",
      "",
    ].join("\n")
  );

  await writeFile(
    path.join(docsDir, "security", "sessions.md"),
    [
      "# Session Security",
      "",
      "## TTL",
      "Configure auth session TTL and reset token TTL in security settings.",
      "",
    ].join("\n")
  );

  const index = await buildDocsIndex({
    docPaths: [docsDir],
    cwd: root,
    maxChunkChars: 200,
  });
  return { index };
};

afterEach(async () => {
  clearDocsIndexCache();
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("searchDocsIndex ranks exact hero section above unrelated chunks", async () => {
  const fixture = await createRetrieverFixture();
  const hits = searchDocsIndex(fixture.index, "hero widget visual options", {
    topK: 3,
  });

  expect(hits.length).toBeGreaterThan(0);
  expect(hits[0]?.chunk.docPath).toContain("hero.md");
  expect(hits[0]?.snippet.toLowerCase()).toContain("visual options");
});

test("searchDocsIndex supports synonym-style terms", async () => {
  const fixture = await createRetrieverFixture();
  const hits = searchDocsIndex(fixture.index, "gdzie ustawienia bloku hero", {
    topK: 3,
  });

  expect(hits.length).toBeGreaterThan(0);
  expect(hits.some((hit) => hit.chunk.docPath.includes("hero.md"))).toBe(true);
});

test("searchDocsIndex returns empty hits for unrelated query", async () => {
  const fixture = await createRetrieverFixture();
  const hits = searchDocsIndex(fixture.index, "quantum banana neutron", {
    topK: 3,
  });

  expect(hits).toEqual([]);
});
