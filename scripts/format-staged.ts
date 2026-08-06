import { existsSync } from "node:fs";

const FORMAT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".mjs",
  ".scss",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);

// Markdown task boards and architecture diagrams are hand-formatted; Prettier
// widens tables and flattens unfenced structural examples.

const repoRoot = import.meta.dir.replace(/\/scripts$/, "");
const prettierBin = `${repoRoot}/node_modules/.bin/prettier`;

const run = async (cmd: string[], options: { inherit?: boolean } = {}) => {
  const proc = Bun.spawn({
    cmd,
    cwd: repoRoot,
    stdout: options.inherit ? "inherit" : "pipe",
    stderr: options.inherit ? "inherit" : "pipe",
    stdin: "inherit",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    options.inherit ? Promise.resolve("") : new Response(proc.stdout).text(),
    options.inherit ? Promise.resolve("") : new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    if (!options.inherit && stdout.trim()) process.stdout.write(stdout);
    if (!options.inherit && stderr.trim()) process.stderr.write(stderr);
    process.exit(exitCode);
  }

  return stdout;
};

const getLines = async (cmd: string[]) => {
  const output = await run(cmd);
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const extensionOf = (filePath: string) => {
  const match = filePath.match(/(\.[^.\/]+)$/);
  return match?.[1]?.toLowerCase() ?? "";
};

const stagedFiles = await getLines([
  "git",
  "diff",
  "--cached",
  "--name-only",
  "--diff-filter=ACMR",
]);

const formatTargets = stagedFiles.filter(
  (filePath) =>
    existsSync(`${repoRoot}/${filePath}`) && FORMAT_EXTENSIONS.has(extensionOf(filePath))
);

if (formatTargets.length === 0) {
  process.stdout.write("[precommit] No staged files need formatting.\n");
  process.exit(0);
}

if (!existsSync(prettierBin)) {
  process.stderr.write("[precommit] Prettier is not installed. Run bun install first.\n");
  process.exit(1);
}

process.stdout.write(`[precommit] Formatting ${formatTargets.length} staged file(s).\n`);
await run([prettierBin, "--write", ...formatTargets], { inherit: true });
// `-f` is required, not a convenience. Some tracked directories are also listed in
// .gitignore (`_docs/_workflows/` is, while all of its files are tracked), and plain
// `git add -- <path>` refuses an explicitly named path under an ignored directory even
// when the file itself is tracked -- which failed the whole hook for any commit
// touching such a path. Forcing is safe here because every target came from
// `git diff --cached`, so it is already staged and therefore already tracked; this
// call only re-stages Prettier's rewrite of bytes git is already carrying and can
// never introduce a previously untracked ignored file.
await run(["git", "add", "-f", "--", ...formatTargets]);
