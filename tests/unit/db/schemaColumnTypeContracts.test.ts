import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { expect, test } from "bun:test";
import type { InferSelectModel } from "drizzle-orm";

import { contentEntries, media, posts, previewTokens } from "../../../core/db/schema";

/**
 * `.$type<...>()` is the only thing that gives a `jsonb` column a TypeScript
 * meaning. Without it drizzle infers `unknown`, which every read narrows by hand
 * and every write satisfies, so the column's contract exists ONLY in the
 * annotation.
 *
 * Its sibling `schemaTableFacade.test.ts` cannot see any of that, and this file
 * does not try to make it: that guard compares the drizzle-kit snapshot the facade
 * WOULD generate against the snapshot `db:generate` DID write, and `$type` is
 * erased before either exists -- `jsonb("context").$type<X>()` and
 * `jsonb("context")` serialise to the identical nullable `jsonb` column. Teaching a
 * snapshot comparison to read source text would weaken the one property that makes
 * it trustworthy (both sides are the same kind of object, produced by the same
 * serializer). A compile-time contract needs a compile-time guard, so it lives
 * here instead.
 *
 * Measured on this tree before this file existed: stripping `$type<string[]>()`
 * from all three `tags` columns left `bun --cwd core lint:types`, root
 * `tsc -p tsconfig.json --noEmit` and all 88 facade assertions green. Changing
 * `previewTokens.context`'s `sampleEntryId` from `string` to `number` was caught,
 * but only incidentally -- by one call site in `previewService.ts` that happens to
 * write a typed object. Nothing guarded the annotations themselves, and LOSING one
 * was invisible everywhere.
 *
 * Two independent guards, because they fail on different things:
 *
 *   1. `pinExact` pins each column's inferred type. Changing what the annotation
 *      MEANS -- including through an imported alias -- breaks the type gates. This
 *      is a `tsc` failure, not a `bun test` failure.
 *   2. `PINNED_CONTRACTS` pins each annotation's source text, derived by scanning
 *      `core/db/tables/`. Removing an annotation, adding an unpinned one, or
 *      editing one fails `bun test` with a diff of what moved.
 */

const ROOT = path.resolve(import.meta.dir, "../../..");
const TABLES_DIR = path.join(ROOT, "core/db/tables");

/** True only when `A` and `B` are the same type, not merely mutually assignable. */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/**
 * `true` when the pin holds; otherwise a sentence, so the compile error reads
 * "Argument of type 'true' is not assignable to parameter of type '<that
 * sentence>'" instead of the bare "not assignable to parameter of type 'false'".
 */
type ExactTypeMatch<A, B> =
  Equals<A, B> extends true
    ? true
    : "this jsonb column no longer infers the type its $type<...> annotation promises";

/**
 * Accepts the literal `true` only when the two type arguments are identical, so a
 * drifted column type is a compile error at the call site rather than a silent pass.
 * The runtime half is trivial on purpose -- the assertion that matters happened in
 * the type checker.
 */
const pinExact = <A, B>(pinned: ExactTypeMatch<A, B>): boolean => pinned === true;

type ColumnContract = {
  /** Path relative to the repository root, as the failure message should print it. */
  readonly path: string;
  /** The declared property name, e.g. `tags`. */
  readonly property: string;
  /** The annotation's source text, whitespace collapsed. */
  readonly annotation: string;
};

/**
 * Every `$type` contract in the schema, with the exact text of each annotation.
 *
 * Hand-written, and deliberately so: the point is to state what the contract is
 * supposed to be, then compare that to the tree. Deriving both sides would compare
 * the tree to itself. Each entry has a matching `pinExact` call below.
 */
const PINNED_CONTRACTS: readonly ColumnContract[] = [
  { path: "core/db/tables/content.ts", property: "tags", annotation: "string[]" },
  { path: "core/db/tables/media.ts", property: "tags", annotation: "string[]" },
  {
    path: "core/db/tables/pages.ts",
    property: "context",
    annotation: 'null | { kind: "detail-page"; sampleEntryId: string; }',
  },
  { path: "core/db/tables/posts.ts", property: "tags", annotation: "string[]" },
];

/**
 * The text between `.$type<` and its matching `>`, whitespace collapsed.
 *
 * Depth-counted so a nested generic (`$type<Array<string>>`) is read whole. A `>`
 * that closes a `=>` is skipped; a function type is the one shape this would
 * otherwise mis-read, and none is declared today.
 */
function readAnnotation(source: string, openIndex: number): string {
  let depth = 1;
  let index = openIndex + 1;
  while (index < source.length && depth > 0) {
    const character = source[index];
    if (character === "<") depth += 1;
    else if (character === ">" && source[index - 1] !== "=") depth -= 1;
    if (depth === 0) break;
    index += 1;
  }
  if (depth !== 0) throw new Error("unterminated $type<...> at offset " + String(openIndex));
  return source
    .slice(openIndex + 1, index)
    .replace(/\s+/gu, " ")
    .trim();
}

/** Every `$type` contract the schema modules actually declare, read off disk. */
function declaredContracts(): readonly ColumnContract[] {
  const contracts: ColumnContract[] = [];
  for (const name of readdirSync(TABLES_DIR)
    .filter((entry) => entry.endsWith(".ts"))
    .sort()) {
    const relativePath = "core/db/tables/" + name;
    const source = readFileSync(path.join(TABLES_DIR, name), "utf8");
    // The property a `$type` belongs to is the last one declared before it, which
    // holds whether the annotation sits on the property's line or continues below.
    let property: string | null = null;
    let lineStart = 0;
    for (const line of source.split("\n")) {
      const declaration = /^\s{2,}([A-Za-z_][A-Za-z0-9_]*):\s*\S/u.exec(line);
      if (declaration) property = declaration[1];
      const marker = line.indexOf(".$type<");
      if (marker >= 0) {
        if (property === null) throw new Error("$type outside a property in " + relativePath);
        contracts.push({
          path: relativePath,
          property,
          // Offset of the `<` itself, counted from the start of the file so a
          // repeated line cannot be mistaken for an earlier one.
          annotation: readAnnotation(source, lineStart + marker + ".$type<".length - 1),
        });
      }
      lineStart += line.length + 1;
    }
  }
  return contracts;
}

test("every jsonb column contract in the schema is pinned, and no other exists", () => {
  const declared = declaredContracts();

  // Guard the guard: an empty scan or an empty pin list makes the comparison vacuous.
  expect(PINNED_CONTRACTS.length).toBeGreaterThan(0);
  expect(declared.length).toBeGreaterThan(0);

  const asText = (contracts: readonly ColumnContract[]): string[] =>
    contracts
      .map((contract) => contract.path + "#" + contract.property + " => " + contract.annotation)
      .sort();

  expect(asText(declared)).toEqual(asText(PINNED_CONTRACTS));
});

test("the annotation reader sees a whole nested generic, not the first closing angle", () => {
  const source = 'x: jsonb("x").$type<Array<Record<string, string>>>(),';
  expect(readAnnotation(source, source.indexOf(".$type<") + ".$type<".length - 1)).toBe(
    "Array<Record<string, string>>"
  );
});

test("each pinned jsonb column still infers exactly the type its annotation promises", () => {
  // `tags` is `.notNull()`, so the select type carries no `null`. If any of these
  // annotations is removed the inferred type becomes `unknown` and the pin below
  // stops compiling -- which is the failure this file exists to produce.
  expect(pinExact<InferSelectModel<typeof contentEntries>["tags"], string[]>(true)).toBe(true);
  expect(pinExact<InferSelectModel<typeof media>["tags"], string[]>(true)).toBe(true);
  expect(pinExact<InferSelectModel<typeof posts>["tags"], string[]>(true)).toBe(true);

  // `context` is nullable in the DDL and its annotation already admits `null`, so
  // the select type is the object or `null` -- pinned as declared, so widening the
  // union (or dropping the annotation) is a compile error.
  expect(
    pinExact<
      InferSelectModel<typeof previewTokens>["context"],
      { kind: "detail-page"; sampleEntryId: string } | null
    >(true)
  ).toBe(true);
});
