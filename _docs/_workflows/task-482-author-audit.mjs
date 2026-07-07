export const meta = {
  name: "task-482-author-audit",
  description:
    "TASK-482 drift-audit loop: 5 sequential rounds of per-subtask audits + cross-subtask reconcile + fixers, then residual protocol",
  phases: [
    { title: "Round 1" },
    { title: "Round 2" },
    { title: "Round 3" },
    { title: "Round 4" },
    { title: "Round 5" },
    { title: "Residual" },
  ],
};

const WT = "/home/coder/project/Coderso-task-482";
const TREE = "TASK-482";
const TASKS_DIR = WT + "/_docs/_TASKS";

const GROUPS = [
  { id: "parent", files: ["TASK-482_Setup_And_Onboarding_Wizard.md"] },
  {
    id: "482-01",
    files: [
      "TASK-482-01-Pre-Auth-Installer-Foundation.md",
      "TASK-482-01-L01-FirstRun-Service.md",
      "TASK-482-01-L02-Install-Route-Namespace-And-Status.md",
    ],
  },
  {
    id: "482-02",
    files: [
      "TASK-482-02-First-Admin-Bootstrap.md",
      "TASK-482-02-L01-CreateFirstAdmin-Service.md",
      "TASK-482-02-L02-Install-Admin-Route.md",
    ],
  },
  {
    id: "482-03",
    files: [
      "TASK-482-03-Installer-UI-And-Gate-Ordering.md",
      "TASK-482-03-L01-Installer-Wizard-UI.md",
      "TASK-482-03-L02-AdminApp-Gate-Ordering.md",
    ],
  },
  {
    id: "482-04",
    files: [
      "TASK-482-04-Phase2-Wizard-Shell.md",
      "TASK-482-04-L01-Step-Framework.md",
      "TASK-482-04-L02-Wizard-Shell-Restyle.md",
    ],
  },
  {
    id: "482-05",
    files: [
      "TASK-482-05-Phase2-Basic-Steps-And-Settings-Keys.md",
      "TASK-482-05-L01-Timezone-Settings-Key.md",
      "TASK-482-05-L02-Basic-Steps-UI.md",
    ],
  },
  {
    id: "482-06",
    files: [
      "TASK-482-06-Starter-Content-Via-Kits.md",
      "TASK-482-06-L01-Starter-Content-Service.md",
      "TASK-482-06-L02-Starter-Content-Route.md",
    ],
  },
  {
    id: "482-07",
    files: [
      "TASK-482-07-Advanced-Track-And-TTL-Reconciliation.md",
      "TASK-482-07-L01-Advanced-Steps-Adapters.md",
      "TASK-482-07-L02-Session-TTL-Reconciliation.md",
    ],
  },
  {
    id: "482-08",
    files: [
      "TASK-482-08-Install-Lock-Finalize-Self-Disable.md",
      "TASK-482-08-L01-Finalize-And-Install-Lock.md",
      "TASK-482-08-L02-Self-Disable-Boundary.md",
    ],
  },
  {
    id: "482-09",
    files: [
      "TASK-482-09-E2E-Tests-And-Docs.md",
      "TASK-482-09-L01-E2E-Onboarding-Flow.md",
      "TASK-482-09-L02-Docs-Updates.md",
    ],
  },
];

const PINS = `
PINNED COORDINATION FACTS for the TASK-482 stream (task files must state these; a missing or contradicting pin is a HIGH finding):
- Pinned changelog number: 1220 (closure creates _docs/_CHANGELOG/1220-*.md). Numbers 1219 (TASK-510, in flight in the shared main tree — may be absent from this worktree's checkout, do NOT reallocate it), 1221 (TASK-483) and 1222 (TASK-484) are RESERVED by parallel streams.
- Parallel streams: TASK-483 (analytics, worktree /home/coder/project/Coderso-task-483) and TASK-484 (backups, /home/coder/project/Coderso-task-484) run concurrently on sibling branches. FORBIDDEN PATHS for TASK-482: core/services/analytics/**, core/services/backups/**, any analytics/backups route modules, core/db/schema.ts, core/db/migrations/**.
- No DB migration in this tree: the parent claims settings/branding/locale keys go through the settings service defaults (rows, not DDL) and first-admin creation uses the existing users table. Verify no 482 file plans DDL/migration artifacts; if one genuinely requires DDL, flag it HIGH for orchestrator decision instead of silently accepting.
- Shared surfaces that all three streams touch ADDITIVELY (contracts must scope edits to their own sections/lines and must not restructure): the server route registration module (verify its real filename in this worktree), the security-gate test expectations under tests/security/, _docs/CMS_API.md, _docs/SECURITY_SPEC.md, _docs/AUTH_SPEC.md.
- Shared REMOTE test database: all three streams and the owner share ONE Postgres (render.com, DATABASE_URL in .env). Any 482 test contract that deletes/truncates users, flips the real DB into a global no-users install state, or resets shared settings rows is a HIGH finding — first-run/no-users gates must be tested via service-level seams, uniquely scoped fixtures, or self-restoring setup/teardown.
- Board/changelog discipline: ONLY the closure subtask (TASK-482-09) edits _docs/_TASKS/README.md and _docs/_CHANGELOG/*; it touches only TASK-482 rows and its own statistics deltas. Implementation subtasks never touch them.
- Land order: 01 -> 02 -> 03 (phase 1), then 04 -> 05 -> 06 -> 07 -> 08 (phase 2), then 09 (closure). Strictly sequential, single writer per source file.
- External dependency: the auth shell restyle from TASK-479-29 is already merged into this worktree's HEAD (fbe93dae). Verify the actual component name/path the 482 files reference exists in source; stale references are MEDIUM.
`;

const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings", "summary"],
  properties: {
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "area", "file", "finding", "evidence", "recommendation"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          area: { type: "string" },
          file: { type: "string", description: "task filename the finding is about" },
          finding: { type: "string" },
          evidence: {
            type: "string",
            description: "file:line references in task file and/or source",
          },
          recommendation: { type: "string" },
        },
      },
    },
  },
};

const FIX_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["fixed", "skipped", "summary"],
  properties: {
    summary: { type: "string" },
    fixed: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["file", "what"],
        properties: { file: { type: "string" }, what: { type: "string" } },
      },
    },
    skipped: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["finding", "reason"],
        properties: { finding: { type: "string" }, reason: { type: "string" } },
      },
    },
  },
};

const COMMON = `
You work EXCLUSIVELY inside the git worktree ${WT} (branch feature/task-482, HEAD fbe93dae). Never read from or write to /home/coder/project/Coderso or the sibling task-483/task-484 worktrees.
The task files were authored 2026-06-28 against an older HEAD; the codebase has since merged the admin redesign, Pages/Screens Editor V2, menu design system and security hardening — expect anchor drift.
Ground EVERY anchor the task files claim (file path, exported symbol, function, line number, route path, schema key, settings key, test path, command) against the real source in ${WT}. Seed hints and pins below are facts to VERIFY are stated, not excuses to skip verification of anchors.
Known trap: rg misdetects some large TS/TSX files as binary and silently returns no matches (e.g. PageEditor.tsx, MenuDesignEditor.tsx, menuDocumentV2.ts, menuDocumentCss.ts). Use grep -an or Read for those; never trust an empty rg result on them.
Contract-quality bar (from AGENTS.md, all mandatory): canonical **Status:** field; parent/child linkage fields; execution-ready implementation pseudocode in every leaf (helper/function shape, data flow, error handling, regression-test shape); an explicit Security Contract subsection in every task touching API routes (internal vs public, auth model, RBAC, CSRF for admin writes, rate-limit bucket, strict reject-unknown validation, anti-abuse incl. nonce/HMAC for public writes); correct test lanes per _docs/TESTING_STRATEGY.md (Bun for runtime/Bun.serve/security/plugin lifecycle, Vitest only for Bun-free layers); every new validated-document schema key consciously joins its reject-unknown allowlist AND ships a round-trip persistence test; new optional config/styling fields are present-only with byte-identity guards where applicable; route modules stay orchestration-only with map*Error at the boundary; admin cache contract followed end-to-end for new admin resources.
${PINS}
Severity: HIGH = would cause wrong implementation, cross-stream collision, security gap, or destructive shared-DB behavior; MEDIUM = wrong/stale anchor, missing mandatory section, contradicting sibling files; LOW = cosmetic.
`;

function auditPrompt(g, round) {
  return `You are a fresh-context READ-ONLY drift auditor (round ${round}) for the ${TREE} tree. Do NOT edit, create or delete ANY file — you only read and report.
${COMMON}
Your assigned task files (audit each fully, in ${TASKS_DIR}): ${g.files.join(", ")}.
Also read the parent file TASK-482_Setup_And_Onboarding_Wizard.md for context (report contradictions with it against YOUR files).
Return your findings via structured output. If you verified everything and found nothing, return an empty findings array with a summary of what you checked (name the source files you actually opened).`;
}

function reconcilePrompt(round) {
  return `You are a fresh-context READ-ONLY cross-subtask RECONCILE auditor (round ${round}) for the whole ${TREE} tree. Do NOT edit any file.
${COMMON}
Read ALL TASK-482* files in ${TASKS_DIR} and check ONLY cross-file contradictions: (1) single-writer ownership — every source file has exactly ONE writer subtask across the tree; (2) shared type shapes, enum values, route paths, settings keys, clamp ranges are IDENTICAL wherever repeated; (3) helper/component names consumers import match the names the owning subtask defines; (4) the land order is stated consistently; (5) the pinned changelog number 1220 appears consistently and only in closure scope; (6) forbidden-paths / collision-guard statements are present and consistent; (7) test-file names promised by one file vs delivered by another match; (8) no two files both claim to edit the same shared additive surface line-range. Report each contradiction as a finding naming BOTH files in evidence.`;
}

function fixerPrompt(g, findings, round) {
  return `You are a drift FIXER (round ${round}) for the ${TREE} tree. You may edit ONLY these task files in ${TASKS_DIR}: ${g.files.join(", ")}. Never touch source code, other task files, _docs/_TASKS/README.md, or _docs/_CHANGELOG/*.
${COMMON}
Fix the following HIGH/MEDIUM audit findings. Before writing each correction, verify the corrected anchor/claim against the real source in ${WT} (do not replace one wrong anchor with another unverified one). Preserve agreed scope — never downgrade to a smaller MVP. Keep all pins exactly as pinned.
FINDINGS (JSON): ${JSON.stringify(findings)}
Report what you changed per file, and list any finding you intentionally did not apply with the reason (e.g. finding is factually wrong — cite evidence).`;
}

function crossFixerPrompt(findings, round) {
  return `You are the single CROSS-FILE drift fixer (round ${round}) for the ${TREE} tree. You may edit any TASK-482* file in ${TASKS_DIR} (and nothing else — no source, no board README, no changelog).
${COMMON}
Apply the following cross-subtask RECONCILE findings consistently across the tree. Rule: the OWNING subtask's definition is the source of truth; align consumers to the owner. Verify corrected anchors against real source in ${WT} before writing.
FINDINGS (JSON): ${JSON.stringify(findings)}
Report changes per file and any finding you rejected with evidence.`;
}

function wholeSetPrompt(residual) {
  return `You are a fresh-context READ-ONLY whole-set auditor for the ${TREE} tree (post-loop residual pass). The 5-round loop ended with these unresolved HIGH/MEDIUM findings (possibly oscillating): ${JSON.stringify(residual)}.
${COMMON}
Read ALL TASK-482* files in ${TASKS_DIR} as one set. Name the RESIDUAL contradictions precisely (which file must change, to what exact value, and why that direction is correct given the owning subtask). Ignore anything already consistent. Return only findings that still hold on the current file state.`;
}

const rounds = [];
let residual = [];
let genuinePass = false;

// Retry a single audit up to 3x: a null return means the agent died (e.g. session/API
// limit). Retrying rescues transient single-agent failures; a full outage still yields
// null after 3 tries and is caught by the false-clean guard below.
async function runAudit(prompt, opts) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await agent(prompt, opts);
    if (r) return r;
  }
  return null;
}

for (let round = 1; round <= 6 && !genuinePass; round++) {
  const phaseName = "Round " + round;
  const results = await parallel([
    ...GROUPS.map(
      (g) => () =>
        runAudit(auditPrompt(g, round), {
          label: "audit:" + g.id,
          phase: phaseName,
          schema: AUDIT_SCHEMA,
        })
    ),
    () =>
      runAudit(reconcilePrompt(round), {
        label: "audit:reconcile",
        phase: phaseName,
        schema: AUDIT_SCHEMA,
      }),
  ]);
  const groupAudits = results.slice(0, GROUPS.length);
  const recon = results[GROUPS.length];
  const missing = results.filter((r) => !r).length;
  const hmOf = (r) => ((r && r.findings) || []).filter((f) => f.severity !== "LOW");
  const groupHM = groupAudits.flatMap((r) => hmOf(r));
  const reconHM = hmOf(recon);
  const total = groupHM.length + reconHM.length;
  rounds.push({ round, highMed: total, crossFile: reconHM.length, missingAudits: missing });
  // FALSE-CLEAN GUARD: a round with any missing audit result is VOID, never clean —
  // its empty findings prove nothing. Record it and retry on the next round.
  if (missing > 0) {
    log(
      TREE +
        " round " +
        round +
        ": " +
        missing +
        " audit(s) returned null (likely session/API limit) — round VOID, retrying next round"
    );
    residual = [
      {
        severity: "HIGH",
        area: "infra",
        file: "(loop)",
        finding: missing + " audits did not return a result",
        evidence: "missingAudits=" + missing,
        recommendation: "rerun the audit loop after limits reset",
      },
    ];
    continue;
  }
  log(
    TREE +
      " round " +
      round +
      ": " +
      total +
      " HIGH/MED (" +
      reconHM.length +
      " cross-file), all audits returned"
  );
  residual = [...groupHM, ...reconHM];
  if (total === 0) {
    genuinePass = true;
    break;
  }
  const fixThunks = [];
  GROUPS.forEach((g, i) => {
    const f = hmOf(groupAudits[i]);
    if (f.length)
      fixThunks.push(() =>
        agent(fixerPrompt(g, f, round), {
          label: "fix:" + g.id,
          phase: phaseName,
          schema: FIX_SCHEMA,
        })
      );
  });
  if (fixThunks.length) await parallel(fixThunks);
  if (reconHM.length)
    await agent(crossFixerPrompt(reconHM, round), {
      label: "fix:cross",
      phase: phaseName,
      schema: FIX_SCHEMA,
    });
}

phase("Residual");
let extra = 0;
while (!genuinePass && residual.length && extra < 2) {
  extra++;
  const whole = await runAudit(wholeSetPrompt(residual), {
    label: "residual:audit:" + extra,
    phase: "Residual",
    schema: AUDIT_SCHEMA,
  });
  if (!whole) {
    residual = [
      {
        severity: "HIGH",
        area: "infra",
        file: "(residual)",
        finding: "residual whole-set audit returned null",
        evidence: "limit",
        recommendation: "rerun",
      },
    ];
    break;
  }
  const hm = (whole.findings || []).filter((f) => f.severity !== "LOW");
  if (!hm.length) {
    residual = [];
    genuinePass = true;
    break;
  }
  await agent(crossFixerPrompt(hm, "residual-" + extra), {
    label: "residual:fix:" + extra,
    phase: "Residual",
    schema: FIX_SCHEMA,
  });
  const final = await runAudit(reconcilePrompt("final-" + extra), {
    label: "residual:reconcile:" + extra,
    phase: "Residual",
    schema: AUDIT_SCHEMA,
  });
  if (!final) {
    residual = [
      {
        severity: "HIGH",
        area: "infra",
        file: "(residual)",
        finding: "final reconcile returned null",
        evidence: "limit",
        recommendation: "rerun",
      },
    ];
    break;
  }
  residual = (final.findings || []).filter((f) => f.severity !== "LOW");
  if (!residual.length) genuinePass = true;
}

return {
  tree: TREE,
  pass: genuinePass && residual.length === 0,
  rounds,
  residualFindings: residual,
};
