export const meta = {
  name: "task-511-author-audit",
  description:
    "TASK-511 Backup v2: fresh agents AUTHOR the 7 subtask contracts grounded in code, then a 6-round drift-audit loop (per-file + reconcile + fixers, false-clean guard)",
  phases: [
    { title: "Author" },
    { title: "Round 1" },
    { title: "Round 2" },
    { title: "Round 3" },
    { title: "Round 4" },
    { title: "Round 5" },
    { title: "Round 6" },
    { title: "Residual" },
  ],
};

const WT = "/home/coder/project/Coderso-task-511";
const TREE = "TASK-511";
const TASKS_DIR = WT + "/_docs/_TASKS";
const PARENT = "TASK-511_Backup_V2_Scalable_Compressed_Encrypted_Importable.md";

const SUBTASKS = [
  {
    id: "511-01",
    file: "TASK-511-01-Streaming-Export-Engine-And-Archive-Format.md",
    spec: "Streaming, batched export engine + archive format & manifest. Per-table NDJSON (one entity/line) via keyset pagination (stable id cursor, ~5-10k rows/batch) OR COPY TO STDOUT — never load a whole table into memory. Package as a tar container: manifest.json (artifact+schema version, engine version, per-table row counts + checksums, include flags) + per-table *.ndjson members. Define the archive envelope/types the later subtasks build on (compression + encryption wrap this in 02). Own a NEW module (e.g. core/services/backups/backupArchive.ts) — do NOT rewrite TASK-484's backupService destructive-restore internals here; reuse its FK-safe table set / ordering knowledge. Bun lane (streams/DB).",
  },
  {
    id: "511-02",
    file: "TASK-511-02-Compression-And-Passphrase-Encryption.md",
    spec: "Compression + passphrase encryption. Streaming gzip over the tar from 01 (never buffer whole archive). Then AES-256-GCM with a key derived from the user passphrase via scrypt (random per-archive salt; store salt + IV + KDF params + GCM tag in an archive header). Streaming/chunked so large archives aren't fully buffered. Wrong passphrase → GCM auth failure → fail-closed error code (e.g. backup_decrypt_failed). Final artifact extension e.g. .cbk. Secrets/keys never logged/cached/returned. Own the crypto module; consume 01's archive stream. Bun lane.",
  },
  {
    id: "511-03",
    file: "TASK-511-03-Media-File-Streaming.md",
    spec: "Media FILE (bytes) streaming into and out of the archive — not just media table rows. Stream bytes from the existing media storage adapters (local/S3/Azure via getMediaStorageAdapter) into a media/ area of the tar during export, and back to storage on restore. Handle missing/absent files gracefully. Gate behind the 'media' include option (now meaning files). Bun lane.",
  },
  {
    id: "511-04",
    file: "TASK-511-04-Users-And-RBAC-Matrix-Include.md",
    spec: "Optional, opt-in include of users + the role/RBAC matrix (roles + user_roles assignments). ONLY permitted into an ENCRYPTED archive (reject users export to an unencrypted artifact). Password hashes travel as opaque blobs, never logged/returned/emitted unencrypted. Import of users is opt-in + confirmation-gated and must not escalate privileges (no granting more than the archive states; preserve existing admin lockout safety). Verify the real users/roles/userRoles table + column names in schema.ts. Bun lane.",
  },
  {
    id: "511-05",
    file: "TASK-511-05-Import-File-Pipeline.md",
    spec: "Import-file pipeline: a streamed multipart upload endpoint (size ceiling) → decrypt (passphrase) → gunzip → validate manifest (version, checksums, GCM auth) BEFORE any DB write → batched transactional restore (all-or-nothing, FK-safe, reuse TASK-484 reverse-delete cascade-complete ordering). Confirmation-gated destructive restore. Full Security Contract: internal /admin/api route, backups:write, CSRF, rate-limit, reject-unknown, fail-closed on bad passphrase/manifest. Distinct from restore-by-id (that reads a stored artifact); this accepts an uploaded file. Bun lane (route + Bun.serve + DB).",
  },
  {
    id: "511-06",
    file: "TASK-511-06-Scheduler-Fullbackup-And-Admin-UI.md",
    spec: "Scheduler full-backup wiring + Admin UI. Extend the schedule + createBackup include to cover database+settings+media(files)+optional users; 'full' backup default. Admin Backups page: include-option checkboxes (incl. users/RBAC opt-in with a clear sensitivity warning), a passphrase input (create + import), and an upload-to-import control. Follow existing admin cache/prefetch/SPA patterns + shared canonical helpers; no set-state-in-effect; faithful to the prototype (read _docs/_PROTOTYPE/src/ for the backups screen). Vitest for the UI; Bun for scheduler wiring. Reuse the passphrase contract from 02.",
  },
  {
    id: "511-07",
    file: "TASK-511-07-Docs-Gates-And-Closure.md",
    spec: "Docs, gates & closure. Tests matrix registration; docs updates (DATA_MODEL if schema touched, CMS_API for new import route, SECURITY_SPEC for encryption/passphrase/users-export posture, MEDIA_SPEC for media-in-archive, BACKUP/ops docs, .env.example + getting-started for any new env); changelog 1223; board rows + statistics; flip statuses to Done. This is the ONLY subtask that edits _docs/_TASKS/* and _docs/_CHANGELOG/*.",
  },
];

const SPEC = `
TASK-511 = Backup v2 (scalable/compressed/encrypted/importable). Read the parent contract ${PARENT} in ${TASKS_DIR} — it holds the owner-confirmed scope + design decisions; every subtask MUST stay consistent with it.
Confirmed decisions (do not re-litigate): archive = AES-256-GCM(gzip(tar(manifest + per-table NDJSON + media))) → .cbk; key = scrypt(passphrase, per-archive salt); batched keyset/COPY streaming (no whole-table/whole-archive in memory); include options database|settings|media(FILES)|users(RBAC matrix, opt-in, encrypted-only); preserve TASK-484 fail-closed restore (confirm-gated, RBAC backups:write/read, CSRF, reject-unknown, transactional FK-safe reverse-delete cascade-complete).
`;

const COMMON = `
You work EXCLUSIVELY inside the git worktree ${WT} (branch feature/task-511, HEAD 6f1dee36). Never read/write /home/coder/project/Coderso or sibling worktrees.
Ground EVERY anchor against the REAL source in ${WT}: the current backup code (core/services/backups/*, core/server/routes/backupRoutes.ts, core/server/jobs/backupScheduler.ts, core/server/validation/backupSchemas.ts, core/admin/services/backupsClient.ts, core/admin/ui backups page, core/services/tools/importExportService.ts, core/services/media/storage/*, core/db/schema.ts users/roles/userRoles + all snapshot tables). Verify names/paths/columns/route shapes before writing them into a contract; correct any wrong assumption explicitly.
Known trap: rg misdetects some large TS/TSX as binary (empty results) — use grep -an or Read.
Contract-quality bar (AGENTS.md): canonical **Status:** field; parent linkage (**Parent Task:** TASK-511); execution-ready implementation pseudocode (helper/function shape, data flow, error handling, regression-test shape); explicit **Security Contract** subsection for any route-touching subtask; correct test lanes (Bun for runtime/route/Bun.serve/crypto/streaming/DB, Vitest only for genuinely Bun-free pure logic + admin/UI); schema-first reject-unknown + normalize*; every new validated key joins its allowlist + ships a round-trip test; DB changes ship full migration artifacts; secrets stay backend-only; single-writer file ownership; strictly sequential land order 01→02→03→04→05→06→07.
${SPEC}
`;

const AUTHOR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["file", "summary", "groundedAnchors", "openQuestions"],
  properties: {
    file: { type: "string" },
    summary: { type: "string" },
    groundedAnchors: {
      type: "array",
      items: { type: "string" },
      description: "real file:symbol anchors verified while authoring",
    },
    openQuestions: {
      type: "array",
      items: { type: "string" },
      description: "unresolved contract questions for the orchestrator (empty if none)",
    },
  },
};

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
          file: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string" },
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

async function runAudit(prompt, opts) {
  for (let i = 0; i < 3; i++) {
    const r = await agent(prompt, opts);
    if (r) return r;
  }
  return null;
}

function authorPrompt(st) {
  return `You are a fresh-context AUTHOR for the ${TREE} tree. Create the task contract file ${st.file} in ${TASKS_DIR} (write it). You may create ONLY that file.
${COMMON}
Your subtask ${st.id} scope: ${st.spec}
Author a complete, execution-ready subtask contract: Overview/Goal, owning module(s) to create-or-extend (single-writer; name the real files), Security Contract (if it touches routes), Implementation Pseudocode (real helper/function shapes grounded in the actual code, data flow, error handling), Testing Requirements (correct lane + regression-test shape + shared-DB safety), and a Coordination note (changelog 1223 only in closure 511-07; strictly sequential land order). Keep it consistent with the parent ${PARENT} and the confirmed decisions. Report grounded anchors + any open questions.`;
}

function auditPrompt(st, round) {
  return `You are a fresh-context READ-ONLY drift auditor (round ${round}) for ${TREE}. Do NOT edit any file.
${COMMON}
Audit the task file ${st.file} in ${TASKS_DIR} against the real source: are all anchors real, is the pseudocode execution-ready and consistent with the parent + confirmed decisions, is the Security Contract present/correct for route-touching work, are test lanes right, is single-writer ownership respected, is shared-DB safety honored? Report findings via structured output; empty findings + a summary of what you checked if clean.`;
}

function reconcilePrompt(round) {
  return `You are a fresh-context READ-ONLY cross-subtask RECONCILE auditor (round ${round}) for ${TREE}. Do NOT edit.
${COMMON}
Read ALL TASK-511* files in ${TASKS_DIR}. Check ONLY cross-file contradictions: shared type/manifest shapes, archive envelope + header fields, error codes, route paths + methods, include-option enum values, encryption/KDF params, helper names consumers reference vs owners define, single-writer ownership (no file claimed by two subtasks), land order consistency, the pinned changelog 1223 only in closure scope, test-file names promised vs delivered. Report each contradiction naming BOTH files in evidence.`;
}

function fixerPrompt(st, findings, round) {
  return `You are a drift FIXER (round ${round}) for ${TREE}. You may edit ONLY ${st.file} in ${TASKS_DIR}. Never touch source, other task files, README, changelog.
${COMMON}
Fix these HIGH/MEDIUM findings, verifying corrected anchors against real source first: ${JSON.stringify(findings)}. Report fixed + any rejected (with evidence).`;
}

function crossFixerPrompt(findings, round) {
  return `You are the CROSS-FILE fixer (round ${round}) for ${TREE}. You may edit any TASK-511* file in ${TASKS_DIR} (nothing else). Owner subtask's definition is source of truth; align consumers. Verify against real source. Findings: ${JSON.stringify(findings)}. Report changes + rejections.`;
}

function wholeSetPrompt(residual) {
  return `Fresh-context READ-ONLY whole-set auditor for ${TREE} (residual). Unresolved: ${JSON.stringify(residual)}.
${COMMON}
Read ALL TASK-511* files as one set; name residual contradictions precisely (which file, to what value, why). Return only findings that still hold.`;
}

// ---- AUTHOR ----
phase("Author");
const authored = await parallel(
  SUBTASKS.map(
    (st) => () =>
      agent(authorPrompt(st), { label: "author:" + st.id, phase: "Author", schema: AUTHOR_SCHEMA })
  )
);
const authorMissing = authored.filter((r) => !r).length;
const openQs = authored
  .filter(Boolean)
  .flatMap((r) => (r.openQuestions || []).map((q) => ({ file: r.file, q })));
log(
  TREE +
    " authored " +
    authored.filter(Boolean).length +
    "/" +
    SUBTASKS.length +
    " subtasks; " +
    authorMissing +
    " missing; " +
    openQs.length +
    " open questions"
);

// ---- DRIFT-AUDIT LOOP ----
const GROUPS = [
  { id: "parent", file: PARENT },
  ...SUBTASKS.map((s) => ({ id: s.id, file: s.file })),
];
const rounds = [];
let residual = [];
let genuinePass = false;

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
  if (missing > 0) {
    log(TREE + " round " + round + ": " + missing + " audit(s) null — VOID, retry next round");
    residual = [
      {
        severity: "HIGH",
        area: "infra",
        file: "(loop)",
        finding: missing + " audits missing",
        evidence: "missing=" + missing,
        recommendation: "rerun",
      },
    ];
    continue;
  }
  log(TREE + " round " + round + ": " + total + " HIGH/MED (" + reconHM.length + " cross-file)");
  residual = [...groupHM, ...reconHM];
  if (total === 0) {
    genuinePass = true;
    break;
  }
  const fixThunks = [];
  GROUPS.forEach((g, i) => {
    const f = hmOf(groupAudits[i]);
    if (f.length && g.file !== PARENT)
      fixThunks.push(() =>
        agent(fixerPrompt(g, f, round), {
          label: "fix:" + g.id,
          phase: phaseName,
          schema: FIX_SCHEMA,
        })
      );
  });
  // parent findings go to the cross-file fixer (parent is co-owned context)
  const parentHM = hmOf(groupAudits[0]);
  if (fixThunks.length) await parallel(fixThunks);
  const crossAll = [...reconHM, ...parentHM];
  if (crossAll.length)
    await agent(crossFixerPrompt(crossAll, round), {
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
        finding: "null",
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
        finding: "null",
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
  authored: authored.filter(Boolean).length,
  authorMissing,
  openQuestions: openQs,
  rounds,
  residualFindings: residual,
};
