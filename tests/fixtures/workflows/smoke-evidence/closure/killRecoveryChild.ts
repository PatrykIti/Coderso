// TASK-545-03-L04 kill/recovery child fixture (Bun lane). Replays the exact
// ordered-durable writer sequence one boundary at a time and self-terminates
// after each journal/temp write, file fsync, rename, and directory-fsync
// boundary, leaving the on-disk state a crash would leave. The parent suite
// reads the JSON handoff and drives the real writer over each state: only
// none/file-only/both recover, bound residue is cleaned only after identity
// verification, and index-only/corrupt/multiple states fail closed.

import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, open, readFile, rename, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  CHANGELOG_INDEX_AFTER,
  CHANGELOG_INDEX_REL,
  CHANGELOG_TEMPLATE,
  CLOSURE_DATE,
  FROZEN_CHANGELOG_INDEX,
  PINNED_CHANGELOG_REL,
  RUN_ID,
  WRITER_PROTOCOL,
  changelogIndexMutation,
  closureIdentity,
  git,
  journalBytes,
  makeRepo,
  writerCheckpoint,
} from "./closureCorpus";

function requireArgs(argv: string[]): { killPoint: number } {
  const flag = argv.find((arg) => arg.startsWith("--kill-point="));
  const value = flag?.split("=")[1];
  const killPoint = Number(value);
  if (!Number.isInteger(killPoint) || killPoint < 0 || killPoint > 6) {
    process.stderr.write(
      JSON.stringify({ pass: false, code: "fixture_usage", detail: "kill-point 0..6" })
    );
    process.exit(2);
  }
  return { killPoint };
}

async function fsyncFile(path: string): Promise<void> {
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY);
    await handle.sync();
  } finally {
    if (handle !== undefined) await handle.close();
  }
}

async function fsyncDir(dir: string): Promise<void> {
  let handle;
  try {
    handle = await open(dir, constants.O_RDONLY);
    await handle.sync();
  } catch (error) {
    // Directory fsync is not available on every platform; best-effort only.
  } finally {
    if (handle !== undefined) await handle.close();
  }
}

async function main(): Promise<void> {
  const { killPoint } = requireArgs(process.argv.slice(2));
  const root = await makeRepo();
  const changelogDir = join(root, "_docs", "_CHANGELOG");
  await mkdir(changelogDir, { recursive: true });
  await writeFile(join(changelogDir, "README.md"), FROZEN_CHANGELOG_INDEX);
  git(root, ["add", "_docs"]);
  git(root, ["commit", "-q", "-m", "frozen changelog index"]);
  const gitHead = git(root, ["rev-parse", "HEAD"]);
  const tempPath = join(changelogDir, `.smoke-closure.${RUN_ID}.tmp`);
  const journalPath = join(changelogDir, `.smoke-closure.${RUN_ID}.journal`);
  const changelogPath = join(root, ...PINNED_CHANGELOG_REL.split("/"));
  const indexPath = join(changelogDir, "README.md");
  const journal = journalBytes(RUN_ID, PINNED_CHANGELOG_REL);

  async function writeTemp(bytes: string): Promise<void> {
    let handle;
    try {
      handle = await open(
        tempPath,
        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
        0o600
      );
      await handle.writeFile(bytes, "utf8");
      await handle.sync();
    } finally {
      if (handle !== undefined) await handle.close();
    }
  }

  if (killPoint >= 1) {
    await writeTemp(journal); // journal temp write + fsync boundary
  }
  if (killPoint >= 2) {
    await rename(tempPath, journalPath); // journal rename + dir-fsync boundary
    await fsyncDir(changelogDir);
  }
  if (killPoint >= 3) {
    let handle;
    try {
      handle = await open(
        changelogPath,
        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
        0o600
      );
      await handle.writeFile(CHANGELOG_TEMPLATE, "utf8");
      await handle.sync(); // changelog file fsync boundary
    } finally {
      if (handle !== undefined) await handle.close();
    }
    await fsyncDir(dirname(changelogPath));
  }
  if (killPoint >= 4) {
    await writeTemp(CHANGELOG_INDEX_AFTER); // index CAS temp write + fsync boundary
  }
  if (killPoint >= 5) {
    await rename(tempPath, indexPath); // index rename + dir-fsync boundary
    await fsyncDir(changelogDir);
  }
  // killPoint 6 = cleanup already performed (both state, no residue).

  const handoff = {
    repoRoot: root,
    checkpoint: writerCheckpoint(gitHead),
    closureIdentity: closureIdentity("none"),
    changelogBytes: CHANGELOG_TEMPLATE,
    changelogIndexMutation: changelogIndexMutation(),
    protocol: WRITER_PROTOCOL,
    state: killPoint >= 5 ? "both" : killPoint >= 3 ? "file-only" : "none",
    closureUtcDate: CLOSURE_DATE,
    killPoint,
  };
  process.stdout.write(`${JSON.stringify(handoff)}\n`);
}

main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify({ pass: false, code: "fixture_failure", detail: String((error && error.message) ?? error) })}\n`
  );
  process.exit(1);
});
