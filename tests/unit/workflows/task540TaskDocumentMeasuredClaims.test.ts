import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * TASK-540's documents keep asserting measured values that the code then moves past.
 * Three separate passes have removed instances of this and each missed the rest:
 *
 *   - `task-540-local-orchestrator.mjs (3,966)` survived in the SETTLED SCOPE DECISION
 *     comment while the file reached 3,988;
 *   - the same paragraph, copied into TASK-540-06-L01, kept 3,966 and ~34,500 after
 *     both had been corrected in the .mjs;
 *   - "88 further split commits" was written into three documents and reproduces under
 *     no command (the range holds 111).
 *
 * `task540StaleCountProse.test.ts` already guards the comments inside
 * `task-540-implement.mjs`. It reads that one module and nothing else, which is exactly
 * why the copy in the task document outlived it. This file guards the other side: the
 * `_docs/_TASKS/TASK-540*` documents themselves.
 *
 * The rule that makes this possible at all: MEASURE, NEVER PIN. A previous test asserted
 * `toContain("task-540-local-orchestrator.mjs (3,966)")`, so correcting the stale comment
 * would have turned it red -- the assertion whose job was to keep the reasoning honest
 * was requiring the wrong number to stay. Nothing here contains an expected count. Every
 * expectation is computed from disk or from running the harness, at the moment the test
 * runs.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS TEST CAN SEE
 *
 *   1. A size claim of the form `<path>` [is|at] <number> where <path> resolves to a
 *      real file, and the number disagrees with `wc -l` of that file.
 *   1b. The same claim with the subject written in prose instead of backticks -- "the
 *      executor facade is **976 lines**" -- plus the two tree-wide figures the family
 *      states the same way ("the largest of the 162 child modules ... is 964"). See
 *      PROSE_CLAIMS: the facade's length alone is claimed at six sites across four
 *      documents, of which the backticked pattern above sees exactly one.
 *   2. The smoke modularization described as pending while the tree shows it finished --
 *      or described as finished while the tree shows it pending. Both directions, and
 *      only when the sentence carries no history marker and no completion marker.
 *   3. A `negativeCases: <n>` in the TASK-540-07 family that disagrees with what the
 *      contract/executor self-tests actually return when run.
 *
 * WHAT THIS TEST CANNOT SEE -- stated plainly, because a guard that overstates its reach
 * is how the next drift gets waved through:
 *
 *   - Claims about anything that is not a file's line count: commit counts, test counts,
 *     durations, hashes, dates. The "88 further split commits" defect would NOT be caught
 *     here. It is a git-range fact, and which commits count depends on a filter the prose
 *     has to name; no scanner can infer the intended one.
 *   - Claims about files that do not resolve to a path in this repo.
 *   - A prose subject that PROSE_CLAIMS does not name. Prose has no fixed vocabulary, so
 *     that list can only ever cover the phrasings the family actually uses; a document
 *     that invents a new way to say "the facade" is invisible until the entry is added.
 *     Each entry must still match somewhere, so one that falls out of use fails loudly
 *     instead of quietly guarding nothing.
 *   - Whether a number is the RIGHT KIND of measurement. If a document says
 *     `foo.ts` 240 meaning "240 test cases", and foo.ts happens to be 240 lines, this
 *     test is satisfied and should not be.
 *   - Numbers written as explicit approximations ("~28,000 lines"). They are excluded
 *     deliberately: an approximation has no exact value to compare against, and picking a
 *     tolerance would only move the argument. The right fix for an approximation that
 *     drifts is to delete it, which is what was done to the one this family had.
 *   - Prose that is vague rather than wrong.
 *   - Shape B beyond the one predicate encoded in test 2. A document that invents a new
 *     finished-work-as-blocking sentence about some other step is invisible here.
 *
 * The exclusions in `isMeasurementClaim` are load-bearing and deliberately conservative:
 * the family states budgets (`<=1,000`), planned ranges (`820-930`), source anchors
 * (`:484`), pass ratios (`22/22`), before/after transitions (`266->278`) and frozen
 * pre-split evidence using the same path-then-number shape as a real measurement.
 * Excluding them is what keeps this test quiet enough to be trusted; the cost is that a
 * genuine claim wearing one of those costumes is missed.
 *
 * History is detected per SENTENCE, not per line. These documents are hard-wrapped, so
 * "The historical blocker evidence was the ... `X.tsx` at 1,194 physical lines" puts the
 * marker and the number on different physical lines; a line-scoped check reports it as
 * live drift.
 */

const root = path.resolve(import.meta.dir, "../../..");
const tasksDir = path.join(root, "_docs/_TASKS");
const smokeDir = path.join(root, "_docs/_workflows/task-540-smoke");
const LINE_LIMIT = 1000;

function physicalLines(absolutePath: string): number {
  const contents = readFileSync(absolutePath, "utf8");
  return contents.split("\n").length - (contents.endsWith("\n") ? 1 : 0);
}

/** Every module the smoke split produced, discovered from the tree rather than listed. */
function smokeChildModules(): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".mjs")) found.push(full);
    }
  };
  walk(smokeDir);
  return found;
}

const familyDocs = readdirSync(tasksDir)
  .filter((name) => name.startsWith("TASK-540") && name.endsWith(".md"))
  .sort()
  .map((name) => ({ name, lines: readFileSync(path.join(tasksDir, name), "utf8").split("\n") }));

/** Index of real source files, so a claim can be resolved to something measurable. */
const INDEX_ROOTS = ["_docs/_workflows", "core", "tests", "packages", "store", "scripts"];
const byBasename = new Map<string, string[]>();

function indexTree(absoluteDir: string, depth: number): void {
  if (depth > 10) return;
  let entries;
  try {
    entries = readdirSync(absoluteDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
    const full = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      indexTree(full, depth + 1);
      continue;
    }
    if (!/\.(mjs|ts|tsx|js)$/u.test(entry.name)) continue;
    const relative = path.relative(root, full);
    const bucket = byBasename.get(entry.name);
    if (bucket) bucket.push(relative);
    else byBasename.set(entry.name, [relative]);
  }
}
for (const indexRoot of INDEX_ROOTS) {
  const absolute = path.join(root, indexRoot);
  if (existsSync(absolute)) indexTree(absolute, 0);
}

/** Resolve a path as written in prose to a unique real file, or null. */
function resolveClaimedPath(written: string): string | null {
  if (existsSync(path.join(root, written))) return written;
  const candidates = byBasename.get(path.basename(written)) ?? [];
  const suffixMatches = candidates.filter(
    (candidate) => candidate === written || candidate.endsWith("/" + written)
  );
  if (suffixMatches.length === 1) return suffixMatches[0];
  if (candidates.length === 1) return candidates[0];
  return null;
}

/**
 * A scan unit is either one markdown table row or one hard-wrapped paragraph, flattened
 * to a single string so a sentence can be recovered across wrapped lines. `starts` maps
 * each character offset back to a physical line number for the failure message.
 */
type ScanUnit = { text: string; offsets: { at: number; line: number }[] };

function scanUnits(lines: string[]): ScanUnit[] {
  const units: ScanUnit[] = [];
  let current: { parts: string[]; offsets: { at: number; line: number }[]; length: number } | null =
    null;

  const flush = (): void => {
    if (current && current.parts.length > 0)
      units.push({ text: current.parts.join(" "), offsets: current.offsets });
    current = null;
  };

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const isTableRow = /^\s*\|/u.test(line);
    if (line.trim() === "") {
      flush();
      return;
    }
    if (isTableRow) {
      flush();
      units.push({ text: line, offsets: [{ at: 0, line: lineNumber }] });
      return;
    }
    if (current === null) current = { parts: [], offsets: [], length: 0 };
    current.offsets.push({ at: current.length, line: lineNumber });
    current.parts.push(line);
    current.length += line.length + 1;
  });
  flush();
  return units;
}

function lineFor(unit: ScanUnit, offset: number): number {
  let line = unit.offsets[0]?.line ?? 1;
  for (const entry of unit.offsets) {
    if (entry.at <= offset) line = entry.line;
    else break;
  }
  return line;
}

/**
 * A backticked path followed by an optional copula and a number:
 *   `task-540-smoke-executor.mjs` is 976
 *   `executor/self-test/browser-widget-absence-scope.mjs` at 964
 *   `contract/selectors.mjs` 230
 *   `task-540-local-orchestrator.mjs` 3,966      <- the shape that kept going stale
 *
 * The trailing guard rejects "73-test", "22/22" and "1.5" -- a number fused to a word,
 * a ratio, or a decimal is not a line count. It deliberately does NOT reject a trailing
 * "." that ends a sentence: the earlier form excluded any following "." at all, so
 * "the smoke entry point `task-540-smoke-executor.mjs` is 976." -- a claim that happens
 * to close its sentence -- was silently skipped. `\.\d` keeps the decimal out.
 */
const NOT_A_LINE_COUNT = String.raw`(?![\d,]*(?:[-\w%/]|\.\d))`;
/** A literal backtick: `\`` is not a legal escape inside a /u pattern. */
const TICK = "`";
const SIZE_CLAIM = new RegExp(
  TICK +
    String.raw`([\w./-]+\.(?:mjs|ts|tsx|js))` +
    TICK +
    String.raw`(?:\s+(?:is|at|gave|was))?\s+\*{0,2}(\d[\d,]*\d|\d)\*{0,2}` +
    NOT_A_LINE_COUNT,
  "gu"
);

/**
 * The same measurement with the subject named in prose, and the two tree-wide figures the
 * family writes the same way. SIZE_CLAIM needs a backticked path, and five of the six
 * places this family states the executor facade's length do not have one -- they say "the
 * executor facade is **976 lines**". So the one site that did have one was the only site
 * guarded, and correctly updating it while the other five rot passed green: exactly the
 * sibling-copy failure this file exists to close.
 *
 * `measure` runs at test time against the tree. There is no expected number here, in
 * keeping with the rule at the top of this file: a test that pins a literal becomes the
 * reason a wrong literal survives.
 */
type ProseClaim = { label: string; pattern: RegExp; measure: () => number };

const PROSE_CLAIMS: readonly ProseClaim[] = [
  {
    // "the executor facade is **976 lines**", "executor facade 976,", "the facade is 976".
    // "every facade and child owner" cannot match: the subject must be "the"/"executor",
    // and the numeral must follow immediately, at most through one copula.
    label: "_docs/_workflows/task-540-smoke-executor.mjs",
    pattern: new RegExp(
      String.raw`(?:executor|the) facade(?:\s+(?:is|at|was|of))?\s+\*{0,2}(\d[\d,]*\d|\d)\*{0,2}` +
        NOT_A_LINE_COUNT,
      "giu"
    ),
    measure: () => physicalLines(path.join(root, "_docs/_workflows/task-540-smoke-executor.mjs")),
  },
  {
    // "... child modules under `_docs/_workflows/task-540-smoke/**` is 964" and the
    // copula-less "... `_docs/_workflows/task-540-smoke/**` 964". Where the family names
    // the module instead ("the largest is `x.mjs` at 964"), the numeral does not follow
    // the glob and SIZE_CLAIM has it already.
    label: "largest module under _docs/_workflows/task-540-smoke/**",
    pattern: new RegExp(
      TICK +
        String.raw`_docs/_workflows/task-540-smoke/\*\*` +
        TICK +
        String.raw`(?:\s+(?:the\s+)?largest)?(?:\s+(?:is|at))?\s+\*{0,2}(\d[\d,]*\d|\d)\*{0,2}` +
        NOT_A_LINE_COUNT,
      "gu"
    ),
    measure: () => Math.max(...smokeChildModules().map(physicalLines)),
  },
  {
    // "the largest of the 162 child modules".
    label: "child modules under _docs/_workflows/task-540-smoke/**",
    pattern: /\b(\d[\d,]*\d|\d)\s+child modules\b/giu,
    measure: () => smokeChildModules().length,
  },
];

/** Markers that make a number a record of the past rather than a current measurement. */
const HISTORY_MARKER =
  /\b(historical|history|pre-split|pre-edit|presplit|superseded|mid-split|baseline|era|no longer|originally|used to|before the split|blocker evidence)\b/i;

/** The sentence containing `offset`, so a wrapped "historical ..." lead-in is seen. */
function sentenceAround(text: string, offset: number): string {
  let start = 0;
  for (const match of text.slice(0, offset).matchAll(/[.!?]\s+/gu)) {
    start = (match.index ?? 0) + match[0].length;
  }
  const tail = text.slice(offset);
  const end = /[.!?]\s/u.exec(tail);
  return text.slice(start, offset + (end ? (end.index ?? 0) + 1 : tail.length));
}

function isMeasurementClaim(unitText: string, matchIndex: number, numeral: string): boolean {
  if (HISTORY_MARKER.test(sentenceAround(unitText, matchIndex))) return false;

  const numeralAt = unitText.indexOf(numeral, matchIndex);
  const before = unitText.slice(Math.max(0, numeralAt - 40), numeralAt);
  const after = unitText.slice(numeralAt + numeral.length, numeralAt + numeral.length + 8);

  // A budget or ceiling, not a measurement: "<=1000", "at most 1,000", "each <= 1,000".
  if (/(<=|≤|at most|no more than|maximum|under)\s*$/i.test(before)) return false;
  // A planned target range: "820-930", "40-60".
  if (/^\s*[–—-]\s*\d/u.test(after)) return false;
  if (/\d\s*[–—-]\s*$/u.test(before)) return false;
  // A before/after transition: "266->278", "758 → 1,893". Both sides are then history.
  if (/^\s*(→|->)/u.test(after)) return false;
  if (/(→|->)\s*$/u.test(before)) return false;
  // A source anchor rather than a length: ":484", "at `:866`".
  if (/[:`]$/u.test(before)) return false;
  // A markdown table cell holding the shared budget column: "| 1,000 |".
  if (/\|\s*$/u.test(before) && Number(numeral.replace(/,/gu, "")) === LINE_LIMIT) return false;

  return true;
}

test("every current line-count claim in the TASK-540 documents agrees with the file", () => {
  const checked: string[] = [];
  const mismatches: string[] = [];
  const proseSites = new Map<string, string[]>(PROSE_CLAIMS.map(({ label }) => [label, []]));

  for (const doc of familyDocs) {
    for (const unit of scanUnits(doc.lines)) {
      for (const match of unit.text.matchAll(SIZE_CLAIM)) {
        const [, writtenPath, numeral] = match;
        const at = match.index ?? 0;
        if (!isMeasurementClaim(unit.text, at, numeral)) continue;

        const resolved = resolveClaimedPath(writtenPath);
        if (resolved === null) continue;

        const claimed = Number(numeral.replace(/,/gu, ""));
        const actual = physicalLines(path.join(root, resolved));
        const site = `${doc.name}:${lineFor(unit, at)}`;
        checked.push(`${site} ${resolved}=${claimed}`);
        if (claimed !== actual) {
          mismatches.push(
            `${site}: claims \`${writtenPath}\` is ${numeral}, but ${resolved} measures ${actual}`
          );
        }
      }

      for (const claim of PROSE_CLAIMS) {
        for (const match of unit.text.matchAll(claim.pattern)) {
          const numeral = match[1];
          const at = match.index ?? 0;
          if (!isMeasurementClaim(unit.text, at, numeral)) continue;

          const claimed = Number(numeral.replace(/,/gu, ""));
          const actual = claim.measure();
          const site = `${doc.name}:${lineFor(unit, at)}`;
          proseSites.get(claim.label)?.push(site);
          checked.push(`${site} ${claim.label}=${claimed}`);
          if (claimed !== actual) {
            mismatches.push(
              `${site}: claims ${claim.label} is ${numeral}, but it measures ${actual}`
            );
          }
        }
      }
    }
  }

  // Guard the guard: a broken pattern would make the assertion below vacuously true.
  // This is a floor of one, not a pinned population -- it cannot itself go stale.
  expect(checked.length).toBeGreaterThan(0);

  // Same idea, per prose subject: a pattern that matches nothing guards nothing, and does
  // it silently. Listing the empty labels rather than counting them says which one broke.
  expect([...proseSites].filter(([, sites]) => sites.length === 0).map(([label]) => label)).toEqual(
    []
  );

  expect(mismatches).toEqual([]);
});

/**
 * A completion marker. Together with HISTORY_MARKER this is what lets a keyword tripwire
 * tell the three cases apart:
 *
 *   pending  "the remaining prerequisite is the smoke modularization"
 *   done     "the modularization is done as of 2026-07-27"        <- DONE_MARKER
 *   was      "Historically the remaining prerequisite was the ..."  <- HISTORY_MARKER
 *
 * Without them the scan is a bare search for the token `modulariz` in five phrasings, and
 * a document that correctly records the step as finished trips it. That is the inverse
 * failure that makes a test worse than nothing: it reds on the CORRECT edit, so the next
 * author deletes the test instead of the drift.
 */
const DONE_MARKER =
  /\b(?:is|are|was|were)\s+(?:\*\*)?(?:done|complete|completed|finished|satisfied)\b|\b(?:has|have)\s+(?:since\s+)?(?:stabilized|finished|completed)\b|\bstruck from the remaining work\b/i;

test("the documents agree with the tree about whether smoke modularization is finished", () => {
  const facade = physicalLines(path.join(root, "_docs/_workflows/task-540-smoke-executor.mjs"));
  const childModules = smokeChildModules();

  // Guard the guard: an empty tree would make "largest" meaningless.
  expect(childModules.length).toBeGreaterThan(0);

  const largestChild = Math.max(...childModules.map(physicalLines));
  // The expectation is DERIVED from the tree, not asserted about it. This test has no
  // opinion on whether the split is done; it only requires the prose to say the same
  // thing the files do.
  const treeSaysFinished = facade <= LINE_LIMIT && largestChild <= LINE_LIMIT;

  const PENDING_PHRASING = [
    /remaining prerequisite is[^.]*modulariz/i,
    /current step is[^.]*modulariz/i,
    /\bfinish[^.]*modulariz/i,
    /only after[^.]*modulariz/i,
    /modulariz[a-z]*[^.]*\bis (?:the )?(?:current|remaining|next|blocking)\b/i,
  ];

  /**
   * WHAT THIS RULE CANNOT SEE, since a marker test cannot read intent:
   *
   *   - A sentence that says the step is done AND names it as the current blocker in the
   *     same breath. The completion marker wins and the contradiction is invisible.
   *   - A pending claim spread over two sentences ("The blocker remains. It is the smoke
   *     modularization."): the patterns match a phrase, not the bare token, so neither
   *     half matches on its own and the claim goes unreported. This errs toward SILENCE,
   *     which is the direction that costs us -- a guard that overstates its reach is how
   *     the next drift gets waved through.
   *   - A completion marker attached to something else in the same sentence ("the audit
   *     is complete; the remaining prerequisite is the smoke modularization") -- real
   *     drift, waved through. Sentence scope is the whole of the resolution here.
   */
  const pendingSites: string[] = [];
  for (const doc of familyDocs) {
    const text = doc.lines.join("\n");
    for (const pattern of PENDING_PHRASING) {
      for (const match of text.matchAll(new RegExp(pattern.source, pattern.flags + "g"))) {
        const sentence = sentenceAround(text, match.index ?? 0);
        if (HISTORY_MARKER.test(sentence) || DONE_MARKER.test(sentence)) continue;
        const line = text.slice(0, match.index ?? 0).split("\n").length;
        pendingSites.push(`${doc.name}:${line}: ${match[0].replace(/\s+/gu, " ").slice(0, 110)}`);
      }
    }
  }

  if (treeSaysFinished) {
    expect({ facade, largestChild, pendingSites }).toEqual({
      facade,
      largestChild,
      pendingSites: [],
    });
  } else {
    // The mirror image: if the tree is genuinely still over the limit, a family that
    // claims the step is done is wrong in the other direction.
    expect(pendingSites.length).toBeGreaterThan(0);
  }
});

test("the TASK-540-07 negativeCases claims equal what the self-tests return", () => {
  // NOT process.execPath: under `bun test` that is the bun binary, and these helpers
  // are node workflow tooling.
  const nodeBinary = process.env.NODE_BINARY ?? "node";
  const runSelfTest = (helper: string): number => {
    const result = spawnSync(
      nodeBinary,
      [path.join(root, "_docs/_workflows", helper), "--self-test"],
      { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
    );
    expect({ helper, status: result.status }).toEqual({ helper, status: 0 });
    const parsed = JSON.parse(result.stdout.trim().split("\n").at(-1) as string);
    expect(parsed.pass).toBe(true);
    return parsed.negativeCases as number;
  };

  const measured = new Set([
    runSelfTest("task-540-smoke-contract.mjs"),
    runSelfTest("task-540-smoke-executor.mjs"),
  ]);

  // The colon form `negativeCases: <n>` is how the family states a required or measured
  // result. Historical figures are written differently -- as JSON transcripts
  // ("negativeCases":109), as "(was `109` pre-L01)", or in the labelled era tables --
  // and are deliberately not matched here, because they SHOULD disagree with today.
  const CURRENT_FORM = /(?<!")negativeCases`?:\s*(\d[\d,]*)/gu;

  const claims: string[] = [];
  const disagreements: string[] = [];
  for (const doc of familyDocs.filter((entry) => entry.name.startsWith("TASK-540-07"))) {
    doc.lines.forEach((line, index) => {
      for (const match of line.matchAll(CURRENT_FORM)) {
        const claimed = Number(match[1].replace(/,/gu, ""));
        claims.push(`${doc.name}:${index + 1}=${claimed}`);
        if (!measured.has(claimed)) {
          disagreements.push(
            `${doc.name}:${index + 1}: states negativeCases: ${match[1]}, but the self-tests ` +
              `return ${[...measured].sort((a, b) => a - b).join(" and ")}`
          );
        }
      }
    });
  }

  // Guard the guard, and specifically guard the parent/leaf split: if only the leaves
  // were scanned, a parent stating floors again would pass unnoticed.
  expect(claims.length).toBeGreaterThan(0);
  expect(claims.some((claim) => claim.startsWith("TASK-540-07-Smoke-Option-Selector"))).toBe(true);
  expect(claims.some((claim) => claim.includes("-L01-"))).toBe(true);
  expect(claims.some((claim) => claim.includes("-L02-"))).toBe(true);

  expect(disagreements).toEqual([]);
}, 120_000);
