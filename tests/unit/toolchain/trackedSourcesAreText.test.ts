import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * A single NUL byte anywhere in a file makes the whole file binary to the tools a
 * reviewer and a scanner reach for first:
 *
 *   - `file(1)` reports `data` instead of `... text`.
 *   - `git diff` prints `Binary files a/x and b/x differ` and shows no hunks, and
 *     `git ls-files --eol` classifies the blob `i/-text w/-text`.
 *   - `grep`/`rg` stop after the first match ("binary file matches") or skip the
 *     file, so a repository-wide search silently misses everything in it.
 *
 * Nothing else in this repository notices. The type gates read the file through
 * TypeScript, which is perfectly happy with a NUL inside a string literal, and
 * `prettier --check` preserves it. So the byte lands, and the file quietly leaves
 * the searchable, reviewable part of the tree.
 *
 * It has landed twice in the TASK-540 family: once in a task document, and then --
 * after that one was fixed -- in `tests/unit/workflows/task540ForbiddenSchemaPaths.test.ts`,
 * the test that guards which repository paths a mutation agent may touch, where a
 * two-pass glob translation parked `**` on a literal NUL byte as its placeholder.
 * A reviewer diffing that guard would have been shown "Binary files differ".
 *
 * Hence this: the scan is over EVERY tracked path except the extensions declared
 * binary below, so a text extension nobody thought of is covered by default and a
 * new binary extension has to be classified deliberately.
 */

const ROOT = path.resolve(import.meta.dir, "../../..");

/**
 * Extensions whose tracked files are legitimately binary. Inverted on purpose: an
 * allowlist of text extensions would silently stop covering the next kind of source
 * added to the tree, which is exactly how a guard rots.
 */
const BINARY_EXTENSIONS: readonly string[] = [
  ".avif",
  ".eot",
  ".gif",
  ".gz",
  ".ico",
  ".jpeg",
  ".jpg",
  ".mp3",
  ".mp4",
  ".node",
  ".otf",
  ".pdf",
  ".png",
  ".tar",
  ".ttf",
  ".wasm",
  ".wav",
  ".webm",
  ".webp",
  ".woff",
  ".woff2",
  ".zip",
];

type NulException = {
  /** Tracked path, exactly as `git ls-files` prints it. */
  readonly path: string;
  /** How many NUL bytes the file is known to carry. A third one fails. */
  readonly nulBytes: number;
  readonly reason: string;
};

/**
 * The one tracked source still carrying NUL bytes, recorded with the reason it is
 * not fixed in this commit rather than quietly muted.
 *
 * `core/admin/ui/pages/PageEditor.tsx` joins the form ids a document references
 * into one `useMemo` dependency string and splits it again, using a literal NUL as
 * the separator (2 bytes, around lines 785 and 790). The fix is to write it as the
 * `\u0000` escape, which is the same string at runtime and leaves the source text.
 *
 * It is not applied here for two independent reasons, either of which is
 * sufficient. First, `core/admin/ui/pages/**` is in this task family's
 * FORBIDDEN_PATHS (`_docs/_workflows/task-540-implement.mjs`), so the family is not
 * permitted to edit that file at all. Second, TASK-540's own physical-line gate
 * (`node _docs/_workflows/task-540-implement.mjs --check-task-family-line-limit`)
 * rejects any TOUCHED module over 1,000 physical lines, and this file is 5,205 --
 * so even a one-character fix would turn the family gate red until the file is
 * split. Fixing it belongs to whoever owns the page editor, not to a NUL-byte
 * cleanup that would have to break two of the family's own rules to reach it.
 *
 * The entry pins the COUNT, not the offsets: offsets move under every unrelated
 * edit to an actively-developed file, while the count only moves when someone adds
 * or removes a NUL. Fixing the file makes this test fail too -- deliberately: the
 * failure message says to delete the entry, so the exception cannot outlive the
 * defect it describes.
 */
const NUL_EXCEPTIONS: readonly NulException[] = [
  {
    path: "core/admin/ui/pages/PageEditor.tsx",
    nulBytes: 2,
    reason:
      "form-id useMemo key separator; core/admin/ui/pages/** is in this family's " +
      "FORBIDDEN_PATHS, and at 5,205 lines the file is also outside the 1,000-line " +
      "physical-line gate that governs every module this family touches",
  },
];

/**
 * The record separator `git ls-files -z` writes between paths. Built from a char
 * code rather than typed as a byte, so this guard can never fail itself -- which is
 * also the escape hatch it recommends when NUL semantics really are required.
 */
const GIT_RECORD_SEPARATOR = String.fromCharCode(0);

/** Tracked paths, straight from git so nothing untracked or ignored is scanned. */
function trackedPaths(): readonly string[] {
  const stdout = execFileSync("git", ["ls-files", "-z"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  return stdout.split(GIT_RECORD_SEPARATOR).filter((entry) => entry.length > 0);
}

const isBinaryExtension = (relativePath: string): boolean =>
  BINARY_EXTENSIONS.includes(path.extname(relativePath).toLowerCase());

/** Byte offsets of every NUL in the file, so a failure can name where to look. */
function nulOffsets(relativePath: string): readonly number[] {
  const bytes = readFileSync(path.join(ROOT, relativePath));
  const offsets: number[] = [];
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] === 0) offsets.push(index);
  }
  return offsets;
}

test("no tracked text source carries a NUL byte", () => {
  const scanned = trackedPaths().filter((relativePath) => !isBinaryExtension(relativePath));

  // Guard the guard: a broken enumeration or an over-eager filter would make every
  // assertion below pass over nothing at all.
  expect(scanned.length).toBeGreaterThan(5_000);
  expect(scanned).toContain("tests/unit/workflows/task540ForbiddenSchemaPaths.test.ts");
  expect(scanned).toContain("core/admin/ui/pages/PageEditor.tsx");

  const excepted = new Map(NUL_EXCEPTIONS.map((entry) => [entry.path, entry.nulBytes]));
  const unexpected: string[] = [];

  for (const relativePath of scanned) {
    const offsets = nulOffsets(relativePath);
    const allowed = excepted.get(relativePath) ?? 0;
    if (offsets.length === allowed) continue;
    unexpected.push(
      relativePath +
        " carries " +
        String(offsets.length) +
        " NUL byte(s) at offset(s) " +
        offsets.join(", ") +
        (allowed === 0
          ? " -- write it as the \\u0000 escape, or use a placeholder that is not a control byte"
          : " -- NUL_EXCEPTIONS records " +
            String(allowed) +
            "; update or delete that entry in this commit")
    );
  }

  expect(unexpected).toEqual([]);
});

test("every recorded NUL exception still describes a tracked file that needs it", () => {
  const tracked = new Set(trackedPaths());

  expect(NUL_EXCEPTIONS.length).toBe(new Set(NUL_EXCEPTIONS.map((entry) => entry.path)).size);

  for (const entry of NUL_EXCEPTIONS) {
    expect(tracked.has(entry.path)).toBe(true);
    expect(isBinaryExtension(entry.path)).toBe(false);
    // An exception with no reason is a mute, so require a substantive one.
    expect(entry.reason.length).toBeGreaterThan(40);
    // An exception for zero bytes would be a permanent hole for a fixed file.
    expect(entry.nulBytes).toBeGreaterThan(0);
  }
});

test("the scan reads bytes, so it sees a NUL wherever it sits in the file", () => {
  // The detector is a byte scan rather than git's own `-text` classification
  // because git decides binary-ness from a leading sniff window; a NUL past that
  // window can escape it. Both NULs found in this repository sat around byte
  // 30,000 of a 200KB file, so the difference is not theoretical.
  const withTrailingNul = Buffer.concat([Buffer.from("a".repeat(64_000)), Buffer.from([0])]);
  const found: number[] = [];
  for (let index = 0; index < withTrailingNul.length; index += 1) {
    if (withTrailingNul[index] === 0) found.push(index);
  }
  expect(found).toEqual([64_000]);
});
