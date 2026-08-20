// TASK-539-05-L01 — `pageRendererV2.tsx` facade identity suite.
// Uses the TypeScript compiler API to parse the facade as TSX and pins the frozen
// 41-name surface (12 types + 29 runtime values). The landed facade is a mixed
// layout: the six composition-root components are declared directly, and the
// remaining surface comes from explicit `ExportDeclaration`s with a string-literal
// direct-owner module specifier and an explicit `NamedExports` clause. The
// classifier rejects every forbidden declaration form and every task-added /
// extra / duplicate name; mutation fixtures prove those rejections.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import ts from "typescript";

import * as facadeModule from "../../../core/services/pages/pageRendererV2";
import * as contractModule from "../../../core/services/pages/pageRendererV2Contract";
import * as blockStylesModule from "../../../core/services/pages/pageBlockRenderStyles";
import * as sectionStylesModule from "../../../core/services/pages/pageSectionRenderStyles";
import * as documentStateModule from "../../../core/services/pages/pageDocumentRenderState";
import type {
  PageBlockDataAttributes,
  PageBlockFrameRenderer,
  PageBlockRenderProps,
  PageBlockStyleProperties,
  PageColumnsSlotTrailingRenderer,
  PageInlineTextRenderer,
  PageRenderMode,
  PageSectionColumnTrailingRenderer,
  PageSectionDataAttributes,
  PageSectionLayoutMode,
  PageSectionRenderProps,
  PageSectionStyleProperties,
} from "../../../core/services/pages/pageRendererV2";

const facadeSource = readFileSync("core/services/pages/pageRendererV2.tsx", "utf8");

// The frozen 12-entry type owner map and the 29-name value manifest.
const EXPECTED_TYPE_SIGNATURES = [
  "type:PageBlockDataAttributes@./pageRendererV2Contract",
  "type:PageBlockFrameRenderer@./pageRendererV2Contract",
  "type:PageBlockRenderProps@./pageRendererV2Contract",
  "type:PageBlockStyleProperties@./pageRendererV2Contract",
  "type:PageColumnsSlotTrailingRenderer@./pageRendererV2Contract",
  "type:PageInlineTextRenderer@./pageRendererV2Contract",
  "type:PageRenderMode@./pageRendererV2Contract",
  "type:PageSectionColumnTrailingRenderer@./pageRendererV2Contract",
  "type:PageSectionDataAttributes@./pageRendererV2Contract",
  "type:PageSectionLayoutMode@./pageRendererV2Contract",
  "type:PageSectionRenderProps@./pageRendererV2Contract",
  "type:PageSectionStyleProperties@./pageRendererV2Contract",
];

const EXPECTED_VALUES = [
  "PageBlockContent",
  "PageBlockFrame",
  "PageDocumentRender",
  "PAGE_REVEAL_MOTION_CSS",
  "PAGE_SPOTLIGHT_CSS",
  "PageSectionContent",
  "PageSectionRender",
  "documentUsesSpotlight",
  "isPageBlockSelfAligned",
  "joinPageRenderClasses",
  "pageBlockAlignmentClass",
  "pageBlockEffectiveWidthClass",
  "pageBlockElementDataAttributes",
  "pageBlockTextDataAttributes",
  "pageBlockWidthClass",
  "pageSectionAlignmentClass",
  "pageSectionCanvasGridClass",
  "pageSectionGridClass",
  "pageSectionJustifyClass",
  "pageTextAlignClass",
  "renderPageBlockContent",
  "resolvePageRenderTree",
  "toPageBlockElementStyle",
  "toPageBlockRenderProps",
  "toPageBlockStyle",
  "toPageBlockTypographyStyle",
  "toPageSectionBleedStyle",
  "toPageSectionRenderProps",
  "toPageSectionStyle",
];

// Task-added direct-owner symbols that MUST stay absent from the stable facade.
const TASK_ADDED_SYMBOLS = [
  "PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE",
  "PAGE_MARQUEE_REPLICA_SAFE_BY_BLOCK_TYPE",
  "PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE",
  "PageReplicaIdentityAttributeName",
  "PageReplicaIdentityContext",
  "PageReplicaIdentitySets",
  "PageTimelineItemGeometry",
  "collectPageReplicaIdentitySets",
  "createPageMarqueeReplicaNamespace",
  "encodePageReplicaNamespacePart",
  "isPageMarqueeReplicaSafeSubtree",
  "namespacePageReplicaDomId",
  "namespacePageReplicaHookIdentifier",
  "namespacePageReplicaIdRef",
  "resolvePageTimelineItemGeometry",
  "transformPageReplicaIdentityAttribute",
];

const ALLOWED_DIRECT_VALUES = new Set([
  "PageBlockContent",
  "PageBlockFrame",
  "PageDocumentRender",
  "PageSectionContent",
  "PageSectionRender",
  "renderPageBlockContent",
]);

const ALLOWED_REEXPORT_OWNERS = new Set([
  "./pageRendererV2Contract",
  "./pageBlockRenderStyles",
  "./pageSectionRenderStyles",
  "./pageDocumentRenderState",
]);

type FacadeEntryKind = "type" | "value";

type FacadeAnalysis = {
  directValues: string[];
  typeSignatures: string[];
  valueEntries: Map<string, { owner: string; kind: FacadeEntryKind }>;
  errors: string[];
};

const declarationName = (statement: ts.Statement): string | null => {
  if (ts.isVariableStatement(statement)) {
    const name = statement.declarationList.declarations[0]?.name;
    return name && ts.isIdentifier(name) ? name.text : null;
  }
  if (
    ts.isFunctionDeclaration(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement)
  ) {
    return statement.name?.text ?? null;
  }
  return null;
};

const analyzeFacade = (sourceText: string): FacadeAnalysis => {
  const sourceFile = ts.createSourceFile(
    "pageRendererV2.tsx",
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const analysis: FacadeAnalysis = {
    directValues: [],
    typeSignatures: [],
    valueEntries: new Map(),
    errors: [],
  };
  const seen = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      const specifier = statement.moduleSpecifier;
      if (!specifier || !ts.isStringLiteral(specifier)) {
        analysis.errors.push("re-export without a string-literal module specifier");
        continue;
      }
      const owner = specifier.text;
      if (!ALLOWED_REEXPORT_OWNERS.has(owner)) {
        analysis.errors.push(`re-export from non-landed module: ${owner}`);
        continue;
      }
      const clause = statement.exportClause;
      if (!clause) {
        analysis.errors.push(`export-star re-export is forbidden (${owner})`);
        continue;
      }
      if (!ts.isNamedExports(clause)) {
        analysis.errors.push(`namespace re-export is forbidden (${owner})`);
        continue;
      }
      for (const spec of clause.elements) {
        if (spec.propertyName) {
          analysis.errors.push(
            `alias changes public name: ${spec.propertyName.text} -> ${spec.name.text}`
          );
          continue;
        }
        const publicName = spec.name.text;
        const kind: FacadeEntryKind = spec.isTypeOnly || statement.isTypeOnly ? "type" : "value";
        if (seen.has(publicName)) {
          analysis.errors.push(`duplicate public name: ${publicName}`);
          continue;
        }
        seen.add(publicName);
        if (kind === "type") {
          analysis.typeSignatures.push(`type:${publicName}@${owner}`);
        } else {
          analysis.valueEntries.set(publicName, { owner, kind });
        }
      }
    } else if (ts.isExportAssignment(statement)) {
      analysis.errors.push("export assignment (export = / export default) is forbidden");
    } else if (
      ts.canHaveModifiers(statement) &&
      ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      if (
        ts
          .getModifiers(statement)
          ?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)
      ) {
        analysis.errors.push("default export is forbidden");
      }
      const name = declarationName(statement);
      if (!name) {
        analysis.errors.push("unnamed exported declaration is forbidden");
        continue;
      }
      if (!ALLOWED_DIRECT_VALUES.has(name)) {
        analysis.errors.push(`local export beyond composition roots: ${name}`);
        continue;
      }
      if (seen.has(name)) {
        analysis.errors.push(`duplicate public name: ${name}`);
        continue;
      }
      seen.add(name);
      analysis.directValues.push(name);
    }
  }

  return analysis;
};

const ownerNamespace = (owner: string): Record<string, unknown> => {
  switch (owner) {
    case "./pageRendererV2Contract":
      return contractModule;
    case "./pageBlockRenderStyles":
      return blockStylesModule;
    case "./pageSectionRenderStyles":
      return sectionStylesModule;
    case "./pageDocumentRenderState":
      return documentStateModule;
    default:
      throw new Error(`unexpected direct-owner module: ${owner}`);
  }
};

// The type-import probe keeps every facade type usable (compile-time only).
const facadeTypesProbe = (_probe: {
  PageBlockDataAttributes: PageBlockDataAttributes;
  PageBlockFrameRenderer: PageBlockFrameRenderer;
  PageBlockRenderProps: PageBlockRenderProps;
  PageBlockStyleProperties: PageBlockStyleProperties;
  PageColumnsSlotTrailingRenderer: PageColumnsSlotTrailingRenderer;
  PageInlineTextRenderer: PageInlineTextRenderer;
  PageRenderMode: PageRenderMode;
  PageSectionColumnTrailingRenderer: PageSectionColumnTrailingRenderer;
  PageSectionDataAttributes: PageSectionDataAttributes;
  PageSectionLayoutMode: PageSectionLayoutMode;
  PageSectionRenderProps: PageSectionRenderProps;
  PageSectionStyleProperties: PageSectionStyleProperties;
}) => undefined;

describe("pageRendererV2 facade identity (TASK-539-05-L01)", () => {
  test("landed facade: six direct roots + four landed re-export clauses, zero classifier errors", () => {
    const analysis = analyzeFacade(facadeSource);
    expect(analysis.errors).toEqual([]);
    expect([...analysis.directValues].sort()).toEqual([
      "PageBlockContent",
      "PageBlockFrame",
      "PageDocumentRender",
      "PageSectionContent",
      "PageSectionRender",
      "renderPageBlockContent",
    ]);
    expect([...analysis.valueEntries.values()].map((entry) => entry.owner).sort()).toEqual([
      "./pageBlockRenderStyles",
      "./pageBlockRenderStyles",
      "./pageBlockRenderStyles",
      "./pageBlockRenderStyles",
      "./pageBlockRenderStyles",
      "./pageBlockRenderStyles",
      "./pageBlockRenderStyles",
      "./pageBlockRenderStyles",
      "./pageBlockRenderStyles",
      "./pageBlockRenderStyles",
      "./pageBlockRenderStyles",
      "./pageDocumentRenderState",
      "./pageDocumentRenderState",
      "./pageDocumentRenderState",
      "./pageRendererV2Contract",
      "./pageSectionRenderStyles",
      "./pageSectionRenderStyles",
      "./pageSectionRenderStyles",
      "./pageSectionRenderStyles",
      "./pageSectionRenderStyles",
      "./pageSectionRenderStyles",
      "./pageSectionRenderStyles",
      "./pageSectionRenderStyles",
    ]);
    // Types are exactly the 12 contract entries, each exactly once.
    expect(analysis.typeSignatures.sort()).toEqual(EXPECTED_TYPE_SIGNATURES);
  });

  test("value manifest: exact 29 names, no duplicate, matches Object.keys(facade)", () => {
    const analysis = analyzeFacade(facadeSource);
    const manifest = [...analysis.valueEntries.keys(), ...analysis.directValues].sort();
    const expectedSorted = [...EXPECTED_VALUES].sort();
    expect(manifest).toEqual(expectedSorted);
    expect([...analysis.valueEntries.keys()].length + analysis.directValues.length).toBe(29);
    expect(Object.keys(facadeModule).sort()).toEqual(expectedSorted);
  });

  test("strict reference identity: every value is the exact direct-owner binding", () => {
    const analysis = analyzeFacade(facadeSource);
    for (const name of EXPECTED_VALUES) {
      const entry = analysis.valueEntries.get(name);
      if (entry) {
        expect((facadeModule as unknown as Record<string, unknown>)[name], name).toBe(
          (ownerNamespace(entry.owner) as Record<string, unknown>)[name]
        );
      } else {
        // Direct composition-root declaration: still exported from the facade.
        expect((facadeModule as unknown as Record<string, unknown>)[name], name).toBeDefined();
      }
    }
  });

  test("facade types are importable from the facade (type-only imports compile)", () => {
    // The probe references all 12 facade types; a missing/renamed type breaks tsc.
    expect(typeof facadeTypesProbe).toBe("function");
  });

  test("task-added replica/timeline symbols are absent from the facade surface", () => {
    const analysis = analyzeFacade(facadeSource);
    const exported = new Set([
      ...analysis.typeSignatures,
      ...analysis.valueEntries.keys(),
      ...analysis.directValues,
    ]);
    for (const symbol of TASK_ADDED_SYMBOLS) {
      expect(exported.has(symbol), symbol).toBe(false);
      expect(Object.keys(facadeModule), symbol).not.toContain(symbol);
    }
    for (const signature of analysis.typeSignatures) {
      expect(signature.endsWith("@./pageRendererV2Contract")).toBe(true);
    }
  });

  test("mutation fixtures: every forbidden declaration form fails the classifier", () => {
    const fixtures: Array<{ label: string; source: string; expected: string }> = [
      {
        label: "extra local export",
        source: `${facadeSource}\nexport const extraExport = 1;\n`,
        expected: "local export beyond composition roots: extraExport",
      },
      {
        label: "extra local function",
        source: `${facadeSource}\nexport function extraFunction() {}\n`,
        expected: "local export beyond composition roots: extraFunction",
      },
      {
        label: "export assignment (export default)",
        source: `${facadeSource}\nexport default 42;\n`,
        expected: "export assignment",
      },
      {
        label: "export assignment (export =)",
        source: `${facadeSource}\nexport = 42;\n`,
        expected: "export assignment",
      },
      {
        label: "namespace re-export",
        source: `${facadeSource}\nexport * as ns from "./pageBlockRenderStyles";\n`,
        expected: "namespace re-export is forbidden",
      },
      {
        label: "export-star re-export",
        source: `${facadeSource}\nexport * from "./pageBlockRenderStyles";\n`,
        expected: "export-star re-export is forbidden",
      },
      {
        label: "re-export without module specifier",
        source: `${facadeSource}\nexport { someName };\n`,
        expected: "re-export without a string-literal module specifier",
      },
      {
        label: "aliased re-export",
        source: `${facadeSource}\nexport { toPageBlockStyle as aliasName } from "./pageBlockRenderStyles";\n`,
        expected: "alias changes public name: toPageBlockStyle -> aliasName",
      },
      {
        label: "re-export from non-landed module",
        source: `${facadeSource}\nexport { transformPageReplicaIdentityAttribute } from "./pageRendererReplicaIdentity";\n`,
        expected: "re-export from non-landed module: ./pageRendererReplicaIdentity",
      },
      {
        label: "task-added timeline geometry re-export",
        source: `${facadeSource}\nexport { resolvePageTimelineItemGeometry } from "./pageRendererTimelineGeometry";\n`,
        expected: "re-export from non-landed module: ./pageRendererTimelineGeometry",
      },
      {
        label: "duplicate public name",
        source: `${facadeSource}\nexport { joinPageRenderClasses } from "./pageRendererV2Contract";\n`,
        expected: "duplicate public name: joinPageRenderClasses",
      },
    ];
    for (const fixture of fixtures) {
      const analysis = analyzeFacade(fixture.source);
      expect(
        analysis.errors.some((error) => error.includes(fixture.expected)),
        fixture.label
      ).toBe(true);
    }
  });

  test("mutation fixtures: task-added / extra type entries fail the frozen type map", () => {
    const extraTypeSource = `${facadeSource}\nexport type { PageReplicaIdentityContext } from "./pageRendererV2Contract";\n`;
    const analysis = analyzeFacade(extraTypeSource);
    // The classifier structurally accepts the extra type entry, but the frozen
    // 12-entry owner map is the guard: the signature is not in the manifest and
    // the happy-path equality assertion would fail (proven by the count check).
    expect(
      analysis.typeSignatures.some((signature) => signature.includes("PageReplicaIdentityContext"))
    ).toBe(true);
    expect(
      EXPECTED_TYPE_SIGNATURES.some((signature) => signature.includes("PageReplicaIdentityContext"))
    ).toBe(false);
    expect(analysis.typeSignatures.length).not.toBe(EXPECTED_TYPE_SIGNATURES.length);

    // The duplicate direct-root form also fails the classifier outright.
    const duplicateRootSource = `${facadeSource}\nexport function PageBlockFrame() {}\n`;
    expect(analyzeFacade(duplicateRootSource).errors).toContain(
      "duplicate public name: PageBlockFrame"
    );
  });
});
