import { existsSync } from "node:fs";

const FORMAT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mdx",
  ".mjs",
  ".scss",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);

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
await run(["git", "add", "--", ...formatTargets]);
