import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * The repository's pre-commit hook runs `bun run format:staged`, whose last step
 * re-stages the files Prettier rewrote. That step used a plain `git add -- <paths>`.
 *
 * `.gitignore` lists `_docs/_workflows/` while all 171 files under it are tracked, and
 * git refuses an explicitly named pathspec under an ignored directory even when the
 * file itself is tracked. So the hook exited non-zero for ANY commit that staged a
 * formattable file under such a path, and four TASK-540 commits were landed with
 * `--no-verify` as a result -- meaning the lint and three type-check gates the hook
 * exists to run were skipped on exactly the commits that changed workflow code.
 *
 * Two independent checks below:
 *   1. the git behaviour itself, proven hermetically in a throwaway repository under
 *      the OS temp dir, so the claim above is measured rather than asserted;
 *   2. the script actually forces the re-stage, which is what makes the hook usable.
 *
 * Check 2 fails against the unfixed script; check 1 documents why the fix is the right
 * one and would start failing if a future git changed this behaviour.
 */

const root = path.resolve(import.meta.dir, "../../..");
const formatStagedSource = readFileSync(path.join(root, "scripts/format-staged.ts"), "utf8");

type GitAttempt = { readonly ok: boolean; readonly output: string };

function tryGit(cwd: string, args: readonly string[]): GitAttempt {
  try {
    const output = execFileSync("git", [...args], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, output };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, output: message };
  }
}

function git(cwd: string, args: readonly string[]): string {
  const attempt = tryGit(cwd, args);
  if (!attempt.ok) throw new Error("git " + args.join(" ") + " failed: " + attempt.output);
  return attempt.output;
}

test("plain git add refuses a tracked file under an ignored directory, -f accepts it", () => {
  const repo = mkdtempSync(path.join(tmpdir(), "coderso-format-staged-"));
  try {
    git(repo, ["init", "--quiet"]);
    git(repo, ["config", "user.email", "test@example.invalid"]);
    git(repo, ["config", "user.name", "Test"]);
    git(repo, ["config", "commit.gpgsign", "false"]);

    // Reproduce the repository's own shape: a directory named in .gitignore whose
    // files are nevertheless tracked, because they were added before the ignore rule.
    const ignoredDir = path.join(repo, "workflows");
    mkdirSync(ignoredDir);
    const trackedRelative = "workflows/tracked.mjs";
    writeFileSync(path.join(repo, trackedRelative), "export const a = 1;\n");
    git(repo, ["add", "-A"]);
    git(repo, ["commit", "--quiet", "-m", "seed"]);
    writeFileSync(path.join(repo, ".gitignore"), "workflows/\n");
    git(repo, ["add", "-A"]);
    git(repo, ["commit", "--quiet", "-m", "ignore the tracked directory"]);

    expect(git(repo, ["ls-files", "--", trackedRelative]).trim()).toBe(trackedRelative);

    // Stage a change, exactly as a developer's commit would before the hook runs.
    writeFileSync(path.join(repo, trackedRelative), "export const a = 2;\n");
    git(repo, ["add", "-f", "--", trackedRelative]);
    expect(git(repo, ["diff", "--cached", "--name-only"]).trim()).toBe(trackedRelative);

    // This is the hook's old final step. It fails, which failed the whole hook.
    const plainAdd = tryGit(repo, ["add", "--", trackedRelative]);
    expect(plainAdd.ok).toBe(false);
    expect(plainAdd.output).toContain("ignored by one of your .gitignore files");

    // This is the fixed step.
    const forcedAdd = tryGit(repo, ["add", "-f", "--", trackedRelative]);
    expect(forcedAdd.ok).toBe(true);
    expect(git(repo, ["diff", "--cached", "--name-only"]).trim()).toBe(trackedRelative);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("format-staged re-stages formatted files with git add -f", () => {
  const addCalls = formatStagedSource.match(/\[\s*"git",\s*"add",[^\]]*\]/gu) ?? [];
  expect(addCalls.length).toBe(1);
  expect(addCalls[0]).toContain('"-f"');
  expect(addCalls[0]).toContain('"--"');
  expect(addCalls[0]).toContain("...formatTargets");
  // The forcing is only safe because the targets are already staged; keep the
  // justification attached to the call so a later reader cannot drop `-f` as noise.
  expect(formatStagedSource).toContain("already staged and therefore already tracked");
});
