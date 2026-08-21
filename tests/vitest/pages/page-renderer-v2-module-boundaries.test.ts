import { readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { PageDocumentError as FacadePageDocumentError } from "../../../core/services/pages/pageDocumentV2";
import { PageDocumentError as OwnerPageDocumentError } from "../../../core/services/pages/pageDocumentV2Types";

const serviceRoot = resolve(process.cwd(), "core/services/pages");
const read = (file: string) => readFileSync(resolve(serviceRoot, file), "utf8");

const documentModules = [
  "pageDocumentV2Types.ts",
  "pageDocumentV2Contract.ts",
  "pageBlockJsonSchemaV2.ts",
  "pageDocumentV2Schema.ts",
  "pageDocumentV2Normalization.ts",
  "pageTextMarksV2.ts",
  "pageSectionNormalizerV2.ts",
  "pageBlockNormalizerV2.ts",
  "pageDocumentV2Normalizer.ts",
] as const;

const rendererModules = [
  "pageRendererV2Contract.ts",
  "pageSectionRenderStyles.ts",
  "pageBlockRenderStyles.ts",
  "pageStaticBlockRenderers.tsx",
  "pageDataBlockRenderers.tsx",
  "pageLayoutBlockRenderer.tsx",
  "pageSectionRendererV2.tsx",
  "pageDocumentRenderState.ts",
  // TASK-539-05-L01 — task-added pure direct owners (stable facade does not
  // re-export their symbols; each stays acyclic and free of server coupling).
  "pageRendererReplicaIdentity.ts",
  "pageRendererTimelineGeometry.ts",
] as const;

const directLocalImports = (file: string): string[] => {
  const source = read(file);
  const extensionByStem = new Map<string, string>(
    [...documentModules, ...rendererModules].map((entry) => [entry.replace(/\.tsx?$/, ""), entry])
  );
  return Array.from(source.matchAll(/from\s+["']\.\/(page[A-Za-z0-9]+)["']/g), (match) =>
    extensionByStem.get(match[1]!)
  ).filter((entry): entry is string => Boolean(entry));
};

describe("Page v2 module boundaries", () => {
  it("keeps explicit compatibility facades and one PageDocumentError identity", () => {
    expect(read("pageDocumentV2.ts")).not.toContain("export *");
    expect(read("pageDocumentV2.ts")).toContain('from "./pageDocumentV2Types"');
    expect(FacadePageDocumentError).toBe(OwnerPageDocumentError);
    for (const file of documentModules.filter((entry) => entry !== "pageDocumentV2Types.ts")) {
      expect(read(file), file).not.toMatch(/class\s+PageDocumentError\b/);
      expect(read(file), file).not.toContain('from "./pageDocumentV2"');
    }
  });

  it("keeps every facade and focused support module within the physical line limit", () => {
    const files = [
      "pageDocumentV2.ts",
      "pageRendererV2.tsx",
      ...documentModules,
      ...rendererModules,
    ];
    for (const file of files) {
      const lines = read(file).split(/\r?\n/).length;
      expect(lines, `${file} has ${lines} physical lines`).toBeLessThanOrEqual(1_000);
    }
  });

  it("keeps the renderer support graph acyclic and independent of its composition root", () => {
    const graph = new Map<string, string[]>(
      rendererModules.map((file) => [file, directLocalImports(file)])
    );
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (file: string) => {
      if (visiting.has(file)) throw new Error(`Renderer import cycle at ${file}`);
      if (visited.has(file)) return;
      visiting.add(file);
      for (const dependency of graph.get(file) ?? []) {
        if (graph.has(dependency)) visit(dependency);
      }
      visiting.delete(file);
      visited.add(file);
    };
    rendererModules.forEach(visit);
    expect(visited.size).toBe(rendererModules.length);
    for (const file of rendererModules) {
      expect(read(file), file).not.toContain('from "./pageRendererV2"');
    }
  });

  it("keeps pure support modules free of server, database and settings coupling", () => {
    for (const file of [...documentModules, ...rendererModules]) {
      const source = read(file);
      expect(source, file).not.toMatch(
        /(?:db\/client|core\/server|\.\.\/server|settingsService|pagesClient|@\/)/
      );
      expect(dirname(resolve(serviceRoot, file))).toBe(serviceRoot);
      expect(basename(file)).toBe(file);
    }
  });

  it("retains audited SVG calls, adjacent cases and trusted sinks in the composition root", () => {
    const source = read("pageRendererV2.tsx");
    expect(source).toMatch(/case "customSvg":\s*\{[\s\S]*?buildSafeSvgTree\(/);
    expect(source).toMatch(/renderSafeSvgNode\([\s\S]*?case "switcher":\s*\{/);
    expect(source).toContain("dangerouslySetInnerHTML={{ __html: ANIMATED_ICON_KEYFRAMES_CSS }}");
    expect(source).toContain("dangerouslySetInnerHTML={{ __html: PAGE_EFFECTS_RUNTIME_SOURCE }}");
    for (const file of rendererModules) {
      expect(read(file), file).not.toContain("PAGE_EFFECTS_RUNTIME_SOURCE");
      expect(read(file), file).not.toContain("ANIMATED_ICON_KEYFRAMES_CSS");
    }
  });
});
