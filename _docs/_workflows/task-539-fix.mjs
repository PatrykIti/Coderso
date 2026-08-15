export const meta = {
  name: "task-539-fix",
  description:
    "Repair TASK-539 contracts, then run five mandatory sequential per-file drift rounds and a final cross-file reconcile",
  phases: [
    { title: "Research" },
    { title: "Repair" },
    { title: "Round 1" },
    { title: "Round 2" },
    { title: "Round 3" },
    { title: "Round 4" },
    { title: "Round 5" },
    { title: "Final reconcile" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = ROOT + "/_docs/_TASKS";
const TREE = "TASK-539";
const CHANGELOG = 1251;

const TASK_FILES = [
  "TASK-539_Page_V2_Post_Audit_Remediation_II.md",
  "TASK-539-01-Page-Model-Schema-And-Normalization.md",
  "TASK-539-01-L01-Deep-Layer-Merge-Strict-Gallery-And-Effect-Normalization.md",
  "TASK-539-01-L02-Prove-Model-Roundtrip-And-Present-Key-Identity.md",
  "TASK-539-02-Grid-And-Background-Sanitizer-Corrections.md",
  "TASK-539-02-L01-Unitful-Grid-And-Split-Background-Layers.md",
  "TASK-539-02-L02-Prove-Grid-And-Background-Sanitizer-Corpus.md",
  "TASK-539-03-Gallery-Controls-Gating-And-Responsive-Canvas.md",
  "TASK-539-03-L01-Define-Gallery-Controls-Gates-And-Z-Clamp.md",
  "TASK-539-03-L02-Build-Gallery-Items-Media-Control.md",
  "TASK-539-03-L03-Wire-Gallery-And-Responsive-Page-Canvas.md",
  "TASK-539-03-L04-Prove-Gallery-Controls-And-Narrow-Canvas.md",
  "TASK-539-03-L05-Own-Shared-Grid-Placement-Contract.md",
  "TASK-539-04-Independent-Transform-Channels.md",
  "TASK-539-04-L01-Separate-Layer-Reveal-Hover-Tilt-And-Magnetic-Wrappers.md",
  "TASK-539-04-L02-Prove-Independent-Transform-Composition.md",
  "TASK-539-05-Renderer-Behavior-And-Geometry-Corrections.md",
  "TASK-539-05-L01-Stamp-And-Render-All-Page-Effects-Correctly.md",
  "TASK-539-05-L02-Prove-Renderer-Effects-And-Geometry.md",
  "TASK-539-06-Responsive-Css-Parity.md",
  "TASK-539-06-L01-Emit-Typography-Spans-Layers-And-Full-Bleed-Per-Device.md",
  "TASK-539-06-L02-Prove-Responsive-Css-Parity.md",
  "TASK-539-07-Per-Root-Idempotent-Effects-Runtime.md",
  "TASK-539-07-L01-Bind-Each-Page-Root-And-Footer-Exactly-Once.md",
  "TASK-539-07-L02-Prove-Main-And-Footer-Idempotence.md",
  "TASK-539-08-Tests-Docs-Smoke-And-Closure.md",
  "TASK-539-08-L01-Nine-Flow-Page-Parity-Suite-And-Closure.md",
];

const RESEARCH_SCOPES = [
  "PageDocumentV2 model/schema/normalization, gallery route persistence, sanitizer and color-contract handoff.",
  "Page editor registry/UI/control state, shared grid-placement classification, narrow canvas and editor tests.",
  "Composition CSS, renderer structure/geometry/marquee accessibility and renderer test ownership.",
  "Responsive CSS, per-root runtime, docs, aggregate validation, browser smoke and task-graph closure.",
];

const LAND_ORDER = ["539-01", "539-02", "539-03", "539-04", "539-05", "539-06", "539-07", "539-08"];

const LOCKED_CONTRACT = `
TASK-539 remains Page-v2-only, JSONB schema version 2, with no new route, DDL,
dependency, public write, widget surface, or scanner exception. It starts only after
TASK-540 is terminal and never runs in-place beside active TASK-478/TASK-481 or
TASK-542. Existing internal /admin/api/* Page writes use session-cookie-only
authentication: create/update/autosave require content:write, publish requires
content:publish, session writes require X-CSRF-Token, the bucket is admin_write, and
the PageDocumentV2 boundary rejects unknown fields. Public render is read-only;
TASK-539 must not claim a nonexistent API-key path or new public-write anti-abuse
contract. Changelog ${CHANGELOG} remains closure-only.

Every touched human-authored production or test file must finish at <=1000 physical
lines. The task must name cohesive split owners for current oversized Page model,
registry, editor, renderer, responsive-CSS and test files, preserve stable public
imports through explicit facades, forbid export-star facades, and require a
baseline-through-final family line gate.
The pageDocumentV2 facade freezes the grounded 74-type/121-runtime baseline and adds
only the four types/eight runtime values enumerated in TASK-539-01-L01, yielding
exactly 78 types and 129 runtime exports. Its L01 facade suite statically compares
the complete explicit named type/value re-export owner map, rejects direct
declarations/default/export-star/duplicates, type-imports all 78, pins the exact
129-key runtime namespace and proves every runtime facade/direct-owner identity.

Unknown gallery item keys, including legacy aliases on fresh writes, use
page_document_unknown_field at the exact nested path. Invalid types, missing required
keys, unsafe URLs and exceeded bounds use page_document_invalid. Stored reads alone
adapt exact precedence src>url>image>assetUrl, alt>title>empty and
caption>title>label>name>description>empty. PAGE_GALLERY_SRC_MAX is 2048; alt/caption
remain 500/2000; schema, normalizer and UI import their owners. Fresh scalar bytes are
canonical/trimmed and reject overflow; stored reads trim/cap. A canonical empty
{src:"",alt:"",caption:""} authoring placeholder is allowed, persists
deterministically and emits no public media node. Gallery category schema owns the
canonical token-stack syntax plus 48/12/587 bounds; write normalization separately
rejects duplicate tokens. Gallery item/category/layout/filter controls and divider
tone/thickness/gradient/width/align are base-only because public responsive props
support only heading/text align. filterCategories uses a token-list control, never
the link-list control.

Responsive layer.anchor is base-only: write rejects it at the exact path, stored read
drops it, responsive JSON schema permits only x/y/z, and the exported TypeScript
responsive layer/style types exclude anchor with anchor?:never. The layer merge
helper accepts a broad base but only PageBlockResponsiveLayerV2|undefined for its
override, copies only own x/y/z keys, and compile-rejects both an anchor literal and a
broad PageBlockLayer variable. Breakpoint resolution assigns a defined merged layer
only conditionally and otherwise omits the own key. The model owner defines
PageSectionResponsiveStyleV2 and PageBlockResponsiveStyleV2 as exact
Partial<Omit<...>> contracts with every forbidden member restored as optional never;
the Page facade explicitly re-exports them and every responsive editor/CSS consumer
uses them instead of a broad base style. Dedicated responsive schemas and
normalization reject writes/drop stored-read structural no-ops:
section scrollEffect/parallaxIntensity/surfacePreset/composition/fullBleed/
noiseOverlay/columnTemplate/border and block decoration/tilt/tiltGlare/surfacePreset/
hoverEffect/marquee/composition/revealDelay/magnetic. Block column remains the one
intentional schema-valid structural exception with an exact not_css_expressible
diagnostic. One Page-domain helper classifies a block
path as frame, template-wrapper or none for grid placement and accepts the exact
includeHiddenBlocks policy; editor passes true, renderer its real context value and
responsive CSS false. A renderer grid hook exists for legal placement plus any
base/tablet/mobile span, including responsive-only spans, and is absent when all spans
are unauthored.

The background compatibility predicate delegates to the new parsed-paint owner until
all consumers migrate without a second grammar. The parser guards the raw whole value
against C0/C1 controls and non-ASCII whitespace before trimming/walking. The grid
sanitizer applies the same raw-code-point rejection before trim/tokenization. Image-layer
bytes stay outer-trimmed source-identical and the final color is canonicalized by
TASK-541 plus Page's exact seven-token filter. The structured parser accepts one legal
paint layer; the legacy isSafeAuthoringCssBackgroundLayers compatibility predicate
remains true only for 2..PAGE_BG_MAX_LAYERS top-level layers.

Media URL clear emits null and preserves the existing URL-not-ID storage contract.
Its scope identity includes target kind, target id and control id; generation
invalidates on selection, clear, value/scope/callback target change and unmount.
Every base-only registry control uses desktop/base for condition, displayed value,
auxiliary input/default, shell, override badge/reset, commit and writes even when
tablet/mobile is active; it never exposes a breakpoint reset or creates a responsive
override. PageEditor preserves all value/type exports explicitly. It retains normal
narrow padding, has no extra 300px rail at 320/390/480, and uses both
sm:pr-[300px] and lg:pr-[300px] so lg:p-8 cannot reset clearance.
Gallery rows import PAGE_GALLERY_SRC_MAX; a 2049-character manual or selected-media
URL is non-mutating rather than deferred to the persistence boundary.
GalleryItemsControl receives the collision-safe parent target scope and combines it
with an immutable row identity; removal or equal-URL target replacement cannot route
late media completion to another row. Programmatic alt/caption commits above 500/2000
are also non-mutating; HTML maxLength is not the validation boundary.
The editor derives one selected-or-first-root registryBlockPath, confirms that exact
candidate resolves in both base and effective sections, and uses the resulting
non-null path for fields, media scope, placement, reset and mutation. It never passes
nullable selectedBlockPath to resolvePageBlockGridPlacement; a stale or absent path
renders no block field and performs no resolver call or write.

Decoration-orb motion and every transform-bearing float/drift/pulse/orbit animation
use one decoration variable channel; block reveal/decoration/hover/tilt/magnetic
channels compose on the block host and layer anchor uses translate. seamless=true
marquee has one rail and two segments only for a recursively replica-safe child tree.
video/form/collection/filters/embed and any descendant authored marquee are unsafe and
degrade to the ordinary one-segment path, preventing duplicate scripts, nonces,
form/listing runtimes, live media and nested namespaces. A safe replica is aria-hidden
and inert; inert owns focus suppression. Locally resolved id/htmlFor/ARIA
IDREF/hash/SVG url(#)/renderer-hook references are deterministically namespaced.
DOM/SVG IDs eligible as IDREF targets and identifier-bearing data hooks use separate
maps; a fragment matching only a hook stays unchanged. htmlFor is exercised at the
pure identity-transform helper because no current safe real block emits a label. The
composition owner defines the fixed replica attribute/selector, renderer stamps it,
and all seven Page-effects binders reject replica-self/descendants. seamless=false
and unsafe seamless have one segment and no replica.
The replica identity owner also defines exactly
PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE,
PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE with the fixed
data-page-marquee-replica-block-style-scope,
data-page-marquee-replica-tilt-layer-style-scope literals. Approved replica frame and
hoisted tilt/layer wrapper carry the canonical original block ID through these
CSS-only aliases; they never join identity/IDREF/selection/runtime sets and
primary/non-seamless/unsafe output emits none. Responsive CSS direct-imports the
owner and uses one :is(canonical selector, replica alias selector) for frame,
element/text and tilt/layer rules at tablet/mobile. Marquee duplicates only the
outer group owner's slot descendants; those preserved paths are nested and always
resolve grid placement none. The singular legal outer-owner grid target stays
canonical outside both segments, while replicas emit no grid hook/alias/span CSS.
Real marquee integration covers switcher/gallery/tilt/magnetic; fixed-DOM runtime
fixtures cover defensive replica rejection for section-owned reveal/parallax and
root-owned spotlight. Spotlight binds only [data-page-spotlight], writes
--spotlight-x/--spotlight-y on that root, never binds the painted overlay, and gains
no invented leave reset; magnetic retains update/leave-reset.
The renderer-geometry owner pageRendererTimelineGeometry.ts exports the pure
PageTimelineItemGeometry result and
resolvePageTimelineItemGeometry(section,template,index,total) helper for direct
owner tests and renderer consumption. A single-item timeline has no connector;
multi-item connectors use exact 22px default or 18px compact marker centers, zero
interior top, calc(100% - center) final bottom and negative non-final row-gap bleed.
The stable pageRendererV2.tsx facade retains exactly the grounded 41-name pre-task
surface: 12 type exports and 29 runtime values enumerated in TASK-539-05-L01. Its
L01-owned facade suite statically compares the exact 12-name type/owner map and
rejects extra types/direct declarations/default/export-star/duplicates, then pins the
exact 29-key runtime namespace and facade/direct-owner reference identity and proves
the new replica/timeline internals remain direct-owner-only.

Closure includes full targeted gates, build:admin, build:site, bun run test,
bun run test:coverage, bun run precommit:check, gates:coderso, strict security scan,
workflow/line checks, fresh post-audits and at least nine visible-effect browser flows
including deep nesting, light/dark admin, admin/front preflight and publish parity.
LOW deferral is allowed only through an execution-ready TASK-9999 leaf with the
required zero-impact evidence.
The closure Bun suite starts an ephemeral real startHttpServer and exercises Page
mutations through the resolved Admin HTTP prefix with configured Host, uniquely owned
reader/writer/publisher roles, real session cookies and CSRF tokens. It proves
unauthenticated, missing/invalid-CSRF and insufficient-permission rejects plus zero
persistence, authorized create/update/autosave/publish, strict nested-unknown 400/no
write and admin_write selection. It snapshots/restores the exact raw
security.settings row, forces enabled x-csrf-token plus sufficient admin_write
capacity and botProtection disabled with cache resets, creates one exact owned /32
allowlist row, sends its X-Forwarded-For on admin/public requests, and deletes only
that row. The direct Page
handler suite remains route/schema/service proof only and is never middleware
evidence. Footer-template and shell settings setup/cleanup use the existing
direct-service fixture pattern and are not claimed as HTTP coverage; any switch to
their handlers must add content:write/settings:write plus session, CSRF, admin_write
and strict schemas.
The public fixture creates and exactly deletes one published public Form plus field
and one saved users-source listing query filtered to an exact owned actor. Its Page
uses those exact IDs in one Form block plus paired filters/collection blocks under
the unsafe single-segment marquee. The filters block owns the resolved count/filter-form
surface, the collection block owns the visible actor row, and the document emits
exactly one listing-runtime script. A unique nonlogged
FORM_SUBMIT_NONCE_SECRET is restored/deleted unconditionally. DB preflight includes
menus/menu_items, Page/template/revision/preview/SEO, content type/entry,
redirect/theme profile/theme route, audit/access/session/RBAC/settings, IP allowlist,
Form/field and listing-query tables. Playwright exercises only production SSR
main-to-footer plus later-node rescans; the reverse parser order is exclusively the
TASK-539-07-L02 fixed-DOM Vitest proof and is cited rather than fabricated.
`;

const COMMON = `
Repository: ${ROOT}. Resolve and report current HEAD plus complete dirty status before
judging. Existing TASK-548 and shared-index edits belong to another stream: preserve
them and touch only the exact TASK-539 row/statistics delta when the parent owns a
board edit. Explicit TASK-539 forbidden paths are _docs/_TASKS/TASK-548*.md,
_docs/_workflows/task-548-*.mjs, _docs/_CHANGELOG/1261-*, the changelog-1261 index
row, TASK-548 board-row bytes, _docs/SECURITY_SPEC.md and
docs/guide/screens/page-editor-preview-settings-and-history.md. The last two are
future shared writers with TASK-548-07-L01 and TASK-548-06-L01. The board records the
hard reciprocal order TASK-539-08-L01 before both leaves. Immediately before the
shared edits, both TASK-548 statuses must still be To Do; otherwise TASK-539 closure
blocks pending a new explicit coordination contract. TASK-548 then consumes the
landed bytes and owns its compiler/report/coverage sequence; never edit the guide
after either writer starts. Recompute statistics from the complete live graph rather
than a hard-coded delta. Read root
AGENTS.md, _docs/_TASKS/README.md, TASK-539 parent/descendants and parent/child state,
README.md, CONTRIBUTING.md, _docs/ARCHITECTURE.md, _docs/CMS_SPEC.md,
_docs/CMS_API.md, _docs/PAGE_MODEL.md, _docs/SECURITY_SPEC.md,
_docs/TESTING_STRATEGY.md, tests/README.md and every referenced source/test. Ground
symbols against current files; use grep -an/Read for large files that rg may treat as
binary. No production source or test may be edited by this contract-repair workflow.
${LOCKED_CONTRACT}
`;

const RESEARCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "anchors", "risks"],
  properties: {
    summary: { type: "string" },
    anchors: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
  },
};

const AUTHOR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["file", "summary", "anchors", "openQuestions"],
  properties: {
    file: { type: "string" },
    summary: { type: "string" },
    anchors: { type: "array", items: { type: "string" } },
    openQuestions: { type: "array", items: { type: "string" } },
  },
};

const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "findings"],
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
  required: ["summary", "fixed", "rejected"],
  properties: {
    summary: { type: "string" },
    fixed: { type: "array", items: { type: "string" } },
    rejected: { type: "array", items: { type: "string" } },
  },
};

function requireAllResults(label, expected, results) {
  if (!Array.isArray(results) || results.length !== expected) {
    throw new Error(`${label}: expected ${expected} results, got ${results?.length ?? 0}`);
  }
  const missing = [];
  for (let index = 0; index < results.length; index += 1) {
    if (!results[index]) missing.push(index);
  }
  if (missing.length > 0) {
    throw new Error(`${label}: missing results at indexes ${missing.join(",")}`);
  }
  return results;
}

function highMedium(result) {
  return result.findings.filter(
    (finding) => finding.severity === "HIGH" || finding.severity === "MEDIUM"
  );
}

function taskIdFor(file) {
  const match = file.match(/^TASK-(539(?:-\d{2})?(?:-L\d{2})?)/);
  if (!match) throw new Error("Cannot derive task id for " + file);
  return match[1];
}

function parentFor(file) {
  if (file.startsWith("TASK-539-") && file.includes("-L")) {
    return file.match(/^TASK-(539-\d{2})-/)?.[1] ?? "539";
  }
  return "539";
}

function authorPrompt(file, research) {
  const indexNote =
    file === "TASK-539_Page_V2_Post_Audit_Remediation_II.md"
      ? "You also own only the TASK-539 row/count in _docs/_TASKS/README.md; read that dirty index fresh and preserve every unrelated byte."
      : "Do not edit either shared index.";
  return `You are the fresh-context repair AUTHOR and sole writer for ${file}.
Edit only ${TASKS}/${file}. ${indexNote}
${COMMON}
Research evidence: ${JSON.stringify(research)}
H1 id must be ${taskIdFor(file)}, FileName must equal ${file}, status stays canonical
To Do, and parent must be ${parentFor(file)} where applicable. Preserve agreed scope
while correcting stale anchors and every locked contract. Every executable leaf needs
implementation pseudocode covering exact helper shape, data flow, error handling,
regression tests, single-writer paths, cohesive <=1000-line splits and exact validation.
Any route-related file needs a complete Security Contract. Leave no open question.`;
}

function auditPrompt(file, round) {
  return `You are a fresh-context READ-ONLY per-file TASK-539 drift auditor, round ${round}.
Do not edit. Audit ${TASKS}/${file}. ${COMMON}
Check grounded anchors, complete scope, executable pseudocode, strict gallery/error
semantics, base/responsive reachability, CSS and DOM security, one-writer ownership,
facade/split/test plans, <=1000 line gate, test lanes, dependency order, status,
parent/FileName and that this file neither duplicates nor omits another leaf's work.
Return all findings; an empty list must summarize concrete checks.`;
}

function reconcilePrompt(round) {
  return `You are the one fresh-context READ-ONLY cross-file RECONCILE auditor for
TASK-539, round ${round}. Read all ${TASK_FILES.length} files: ${TASK_FILES.join(", ")}.
${COMMON}
Check only cross-file contradictions: single-writer paths; exact helper/type/error/enum/
clamp/selector/attribute names; gallery empty-row and error policy; responsive/base-only
representation; grid-placement classification; raw sanitizer guards;
transform/marquee/timeline contracts including unsafe descendants and global runtimes;
facade and split ownership; promised test files; land order and TASK-548 shared-doc
collisions; exact route security; docs; full gates; pinned changelog ${CHANGELOG}.
Evidence must name both contradictory files.`;
}

function perFileFixPrompt(file, round, findings) {
  return `You are the scoped contract FIXER for ${file}, round ${round}. Edit only
${TASKS}/${file}. ${COMMON}
Verify and fix these HIGH/MEDIUM findings: ${JSON.stringify(findings)}. Do not broaden
scope or touch another file. Report every fix or evidence-backed rejection.`;
}

function crossFixPrompt(round, findings) {
  return `You are the cross-file TASK-539 contract FIXER, round ${round}. Edit only
TASK-539 task files named in each finding and, only if the parent row count is implicated,
the exact TASK-539 board row. Never edit production/tests/changelog or unrelated dirty
TASK-548/index content. ${COMMON}
The owning land-order definition wins; align consumers without stealing ownership.
Findings: ${JSON.stringify(findings)}.`;
}

phase("Research");
const research = requireAllResults(
  "research",
  RESEARCH_SCOPES.length,
  await parallel(
    RESEARCH_SCOPES.map(
      (scope, index) => () =>
        agent(`Fresh-context read-only TASK-539 research ${index + 1}. ${scope}\n${COMMON}`, {
          label: `research:${index + 1}`,
          phase: "Research",
          schema: RESEARCH_SCHEMA,
        })
    )
  )
);

phase("Repair");
const authored = requireAllResults(
  "repair",
  TASK_FILES.length,
  await parallel(
    TASK_FILES.map(
      (file) => () =>
        agent(authorPrompt(file, research), {
          label: "repair:" + taskIdFor(file),
          phase: "Repair",
          schema: AUTHOR_SCHEMA,
        })
    )
  )
);
const openQuestions = authored.flatMap((result) => result.openQuestions);
if (openQuestions.length > 0) {
  throw new Error("TASK-539 repair left open questions: " + JSON.stringify(openQuestions));
}

const roundEvidence = [];
for (let round = 1; round <= 5; round += 1) {
  const phaseName = "Round " + round;
  phase(phaseName);
  const perFile = requireAllResults(
    `round-${round}-per-file`,
    TASK_FILES.length,
    await parallel(
      TASK_FILES.map(
        (file) => () =>
          agent(auditPrompt(file, round), {
            label: `audit:${taskIdFor(file)}:${round}`,
            phase: phaseName,
            schema: AUDIT_SCHEMA,
          })
      )
    )
  );
  const reconcile = requireAllResults(
    `round-${round}-reconcile`,
    1,
    await parallel([
      () =>
        agent(reconcilePrompt(round), {
          label: `audit:reconcile:${round}`,
          phase: phaseName,
          schema: AUDIT_SCHEMA,
        }),
    ])
  )[0];

  const perFileFindings = perFile.map((result) => highMedium(result));
  const crossFindings = highMedium(reconcile);
  const perFileFixJobs = [];
  for (let index = 0; index < TASK_FILES.length; index += 1) {
    if (perFileFindings[index].length === 0) continue;
    perFileFixJobs.push(() =>
      agent(perFileFixPrompt(TASK_FILES[index], round, perFileFindings[index]), {
        label: `fix:${taskIdFor(TASK_FILES[index])}:${round}`,
        phase: phaseName,
        schema: FIX_SCHEMA,
      })
    );
  }
  const perFileFixed =
    perFileFixJobs.length === 0
      ? []
      : requireAllResults(
          `per-file-fix-round-${round}`,
          perFileFixJobs.length,
          await parallel(perFileFixJobs)
        );
  const crossFixed =
    crossFindings.length === 0
      ? []
      : requireAllResults(
          `cross-fix-round-${round}`,
          1,
          await parallel([
            () =>
              agent(crossFixPrompt(round, crossFindings), {
                label: `fix:reconcile:${round}`,
                phase: phaseName,
                schema: FIX_SCHEMA,
              }),
          ])
        );
  roundEvidence.push({
    round,
    perFileHighMedium: perFileFindings.reduce((sum, findings) => sum + findings.length, 0),
    crossHighMedium: crossFindings.length,
    fixerResults: perFileFixed.length + crossFixed.length,
  });
}

phase("Final reconcile");
const finalResult = requireAllResults(
  "final-reconcile",
  1,
  await parallel([
    () =>
      agent(
        `${reconcilePrompt("final")}
This is a fresh final pass after all mutations. Verify all ${TASK_FILES.length} files
exist, the TASK-539 board row reports 8 children + 18 leaves, the fix workflow
passes node --check, all five rounds returned every result, and no HIGH/MEDIUM or
execution-blocking LOW remains. Do not edit.`,
        {
          label: "audit:final-reconcile",
          phase: "Final reconcile",
          schema: AUDIT_SCHEMA,
        }
      ),
  ])
)[0];
if (finalResult.findings.length > 0) {
  throw new Error("TASK-539 final reconcile has findings: " + JSON.stringify(finalResult.findings));
}

log(
  JSON.stringify({
    pass: true,
    tree: TREE,
    expectedFiles: TASK_FILES.length,
    changelog: CHANGELOG,
    landOrder: LAND_ORDER,
    rounds: roundEvidence,
    finalSummary: finalResult.summary,
  })
);
