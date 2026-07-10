# TASK-545-04-L04: Normalize Historical Statuses and Changelog Evidence

# FileName: TASK-545-04-L04-Normalize-Historical-Statuses-And-Changelog-Evidence.md

**Parent Task:** TASK-545
**Parent Subtask:** TASK-545-04
**Priority:** High
**Category:** Task Metadata / Changelog Evidence / Historical Integrity
**Estimated Effort:** Medium
**Dependencies:** TASK-545-04-L01
**Status:** ⏳ To Do
**Changelog:** 1257 (pinned; closure only)

---

## Exclusive ownership

- exactly these 34 noncanonical-status files: all seven TASK-513 parent/child
  files, all seven TASK-514 parent/child files, all eight TASK-516 parent/child
  files, TASK-525 parent, all three TASK-526 files, all seven TASK-531 files, and
  TASK-535 parent. `TASK-533_Layout_Grid_Span_Asymmetric_Border_Timeline.md` is
  excluded because TASK-545-04-L01 is its sole writer;
- the nine current TASK-532 parent/child/leaf files containing stray `</content>` or
  `</invoke>` transcript tags;
- existing changelog files 1244, 1245, 1246, and 1247.

Do not edit product source, indexes, TASK-533, reconstructed TASK-528–530 parents,
or canonical behavior/validation claims beyond the evidence corrections below.

## Grounded repair contract

- Convert every audited `✅ Done (date/narrative)` status to canonical `✅ Done`.
  Move a trustworthy date to `**Completed:**`; move remaining factual narrative
  to a dedicated completion-notes field. Never reopen or reclassify a family.
- Remove only the literal stray TASK-532 transcript closing tags. Preserve the
  surrounding authored contract and Done state.
- In changelog 1244 replace every `<FILL: ...>` placeholder with results grounded
  in task/changelog/command evidence; if evidence is unavailable, state that
  limitation truthfully instead of inventing a pass.
- Correct changelog 1245's false statement that TASK-534 takes 1244; its actual
  changelog is 1245.
- Replace descendant ellipses in changelogs 1244, 1246, and 1247 with complete,
  explicit physical descendant task-ID lists. Do not renumber any file.

## Implementation Pseudocode

```text
statusFiles = graphAudit.noncanonicalStatuses(taskRange=495..535)
assert statusFiles.length == 35
assert TASK-533 is owned by L01
assert remaining statusFiles exactly match the 34-file ownership groups above
for file in statusFiles excluding TASK-533:
  parse the one Status field
  require it semantically means Done
  move date/narrative into Completed/Completion Notes without losing evidence
  write canonical Status = ✅ Done

for each TASK-532 file reported by exact literal scan:
  remove only stray transcript closing-tag lines

for changelog in 1244..1247:
  derive the exact owning physical descendants from the final task graph
  replace placeholders/wrong allocation/ellipsis only where grounded
  preserve shipped behavior and actual gate outcomes

rerun graph, placeholder, stray-tag, descendant-list, and changelog-uniqueness audits
fail closure on any missing result or unsupported historical claim
```

## Error and compatibility flow

If a noncanonical status does not unambiguously represent Done, stop and report it
instead of normalizing. If historical validation evidence cannot resolve a 1244
placeholder, use an explicit evidence-unavailable statement and keep TASK-545 open
until the owner accepts it; never fabricate output. These are metadata-only edits.

## Regression-test shape

The TASK-545 graph/static audit must assert zero noncanonical statuses in the scoped
TASK-495–535 range, zero TASK-532 transcript tags, zero `<FILL:` placeholders, no
descendant-range shorthand in the changelogs' `Tasks:` metadata, correct TASK-534→1245
allocation text, complete explicit descendant lists, unchanged semantic terminal states,
and unique changelog numbers/task ownership. Parse each `Tasks:` field and compare its exact
task-ID set with the physical graph; do not ban Unicode ellipses in unrelated prose, CSS,
TypeScript, payload examples, or code notation.

## Validation

```bash
rg --files _docs/_TASKS \
  | rg '/TASK-(49[5-9]|5[0-2][0-9]|53[0-5])(?:_|-).*\.md$' \
  | xargs rg -n '^\*\*Status:\*\*'
if rg -n '</?(content|invoke)>' _docs/_TASKS/TASK-532*.md; then exit 1; fi
if rg -n '<FILL:|takes 1244' _docs/_CHANGELOG/124{4,5,6,7}-*.md; then exit 1; fi
node --input-type=module <<'NODE'
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const taskDir = "_docs/_TASKS";
const canonicalStatuses = new Set([
  "⏳ To Do",
  "🚧 In Progress",
  "✅ Done",
  "⏭️ Superseded",
  "❌ Cancelled",
]);
const failures = [];
const taskNames = readdirSync(taskDir).filter((name) =>
  /^TASK-(?:49[5-9]|5[0-2][0-9]|53[0-5])(?:_|-).*\.md$/.test(name)
);
for (const name of taskNames) {
  const source = readFileSync(join(taskDir, name), "utf8");
  const statuses = [...source.matchAll(/^\*\*Status:\*\*\s*(.+)$/gm)];
  if (statuses.length !== 1 || !canonicalStatuses.has(statuses[0]?.[1].trim())) {
    failures.push(`${name}: noncanonical or non-unique Status`);
  }
  const declaredName = source.match(/^# FileName:\s*(.+)$/m)?.[1].trim();
  if (declaredName !== name) failures.push(`${name}: FileName mismatch`);
}
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
NODE
git diff --check
```

This leaf runs only the inline read-only structural check over its landed state. L03
creates and then runs `tests/unit/workflows/taskGraphIntegrity.test.ts` for the full
graph/changelog comparison after L04 has landed. Rerun a named failing audit alone before
classification.
