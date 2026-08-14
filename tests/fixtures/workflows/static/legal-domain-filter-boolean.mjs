// Legal unrelated-domain collection filtering. The static gate must permit
// filtering of git/path/URL/port/process data and never confuse it with an
// unguarded agent-result consumer: these arrays are never agent results and
// never feed a false-clean classification.
function parseNul(bytes) {
  return bytes.toString("utf8").split("\0").filter(Boolean);
}

function parseUrls(input) {
  return input
    .split("\n")
    .filter(Boolean)
    .map((line) => line.trim());
}

const authoredFiles = [
  "_docs/_TASKS/TASK-777.md",
  ...["_docs/_TASKS/TASK-777-01.md", null].filter(Boolean),
].filter(Boolean);

const dirtyContext = parseNul(Buffer.from("a.ts\0b.ts\0")).filter(Boolean);

export { authoredFiles, dirtyContext, parseNul, parseUrls };
