# TASK-414: Generic CMS Site Assistant Product Completion
# FileName: TASK-414_Generic_CMS_Site_Assistant_Product_Completion.md

**Priority:** High
**Category:** Assistant + Site Builder + Product + Media + Commerce + Runtime QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-407
**Related Tasks:** TASK-404, TASK-405, TASK-406, TASK-410, TASK-412
**Status:** ⏳ To Do

---

## Overview

TASK-403, TASK-404, TASK-405, and TASK-407 turned the assistant into a guided,
reviewed, fail-closed site builder. It can route broad setup intent through
Basic or Advanced intake, normalize answers, derive bounded facts, ask for
explicit review acceptance, execute strict typed actions, validate the public
runtime, use backend-owned curated licensed media for supported profiles, and
scope follow-up edits to trusted resources. TASK-410 then documented how widget
and CMS capability changes must keep assistant registries, mappings, docs, and
tests synchronized.

That is a major foundation, but it is not yet the full business target discussed
for Coderso: a generic WordPress-competitor CMS assistant that helps
nontechnical users build, understand, refine, and operate real websites across
many industries. This umbrella tracks the remaining product gaps before the
assistant can reliably behave like an AI webmaster for ordinary users while
still preserving the current trust model:

`prompt -> bounded guidance -> typed plan -> dry-run -> review acceptance -> execute -> validate`

Provider output must remain operation-draft-only. New behavior must be mapped
through backend-owned schemas, registries, strict action families, RBAC/CSRF,
redaction, idempotency, and fail-closed gates rather than inferred from prompt
text or raw provider actions.

---

## Business Gap Analysis

Current implementation strengths:

- Nontechnical prompts can enter guided Basic intake instead of producing
  immediate unreviewed mutations.
- Advanced users can select controlled design, menu, hero, section, media policy,
  content-engine, and reference-intake options.
- Reviewed intake can compile to existing `site-kit.*` action families without
  exposing browser-owned `context.siteKit`.
- Full-service site generation can create public pages, services/portfolio
  catalogs, route-linked detail templates, sample entries, navigation, footer,
  lead capture, SEO, and launch-readiness metadata for supported paths.
- Curated images can populate supported service-business sites through
  backend-owned profile URLs with source and license metadata.
- Follow-up prompts can resolve active/admin resources or server-derived
  candidates before planning scoped operations.
- Unsupported capabilities return `needs_input` or `gated` instead of silently
  becoming partial unsafe plans.

Remaining product gaps before the assistant can be sold as a generic CMS
co-pilot:

- **Generic vertical coverage:** starter generation is still strongest around
  implemented service-business kits and a small set of curated profiles. Common
  industries need explicit capability packs, content models, sample content,
  public runtime coverage, and negative fail-closed tests.
- **Themed licensed media breadth:** curated media profiles cover images only
  and a limited set of industries. Video, richer galleries, and broader
  industry/theme asset coverage remain gated until renderer, validation, source,
  license, and trust contracts ship together.
- **Brand and theme application:** Advanced design choices currently remain
  bounded facts or token hints in several paths. The assistant still needs a
  safe typed way to apply brand colors, typography, spacing, and theme profile
  choices without accepting arbitrary CSS or unsafe style payloads.
- **Booking and commerce readiness:** booking, checkout/payment, webhook
  automation, and several transactional flows remain gated. A real
  WordPress-competitor assistant needs reviewed typed adapters before it can
  build appointment, shop, payment, or automation-heavy sites.
- **Installed-site refinement:** the assistant can install and rollback
  solution-kit runs, but richer refinement of an already-installed site still
  needs server-derived kit context, resource ownership, conflict previews, and
  rollback-safe mutation plans.
- **Ordinary follow-up editing depth:** prompts such as "add a projects section",
  "create a gallery for interiors", "add a second menu group", or "change these
  cards" need typed nested/slot widget patches, menu-structure patches, entry
  bulk draft/edit actions, and section-level runtime validation.
- **Prompt-bespoke copy and content:** current starter content is deterministic
  and safe, but not yet fully business-specific copy generated from a user's
  actual positioning, tone, offer, and proof. Copy generation must be reviewed,
  redacted, and validated before execution.
- **Assistant-as-helper behavior:** users should be able to ask "how can I add
  X?" and receive a short explanation, a suggested plan, and a reviewable action
  path only after acceptance. The assistant should choose guidance-only,
  inspection, needs-input, or action-plan mode without making users understand
  CMS internals first.
- **Capability drift automation:** TASK-410 documents the checklist, but the repo
  still needs automated checks that fail when widget fields, variants, content
  engines, solution kits, or docs change without corresponding assistant
  capability updates.
- **Acceptance matrix breadth:** live E2E has covered selected Basic, Advanced,
  follow-up, rollback, and second-theme flows. The product still needs a broader
  cross-industry matrix with reset/rebuild, provider-backed planning, public
  runtime, SEO, forms, mobile/desktop, media, and console-error checks.

TASK-406 remains a narrower cross-industry reset E2E follow-up. This umbrella
should coordinate with it or absorb its evidence later, but it should not
duplicate the already-defined destructive/reset test scope.

---

## Security Contract

- **Endpoint visibility:** future assistant write behavior must remain internal
  admin unless a child task explicitly defines a public endpoint contract.
- **Auth model:** existing authenticated admin session for assistant planning,
  dry-run, execute, settings, content, media, page, menu, SEO, form, booking, and
  commerce writes.
- **RBAC:** every new executable action must declare read/write/publish
  permissions through the action-family contract before dry-run or execute.
- **CSRF:** required for every admin/internal mutation route.
- **Rate-limit bucket:** assistant planning remains in the `assistant` bucket;
  new admin resource writes use their existing admin buckets unless a child task
  defines a stricter bucket.
- **Validation:** all new payloads must be schema-first, reject unknown fields,
  normalize through owner helpers, and preserve machine-readable domain errors.
- **Anti-abuse controls:** no public assistant write endpoint may be added
  without nonce + signature/HMAC and the applicable public-write anti-abuse
  policy. Existing public lead/booking/form endpoints must keep their current
  nonce/CAPTCHA/session hardening.
- **Secret handling:** provider keys, cookies, CSRF tokens, signed URLs, raw
  provider output, raw uploaded bytes, private media, secrets, and auth material
  must not appear in browser storage, diagnostics, task evidence, changelogs,
  provider packages, or public runtime payloads.
- **Media trust boundary:** arbitrary remote media import, generated media,
  uploads, and video must remain gated until backend-owned profile, renderer,
  validation, source/license, and storage contracts are implemented together.
- **Planner trust boundary:** provider-supplied `actions[]`, ids, target
  locators, and executor payloads remain untrusted and must be rejected or
  rebuilt locally from policy and trusted server context.

---

## Sub-Tasks

Candidate child task families. Promote these to physical
`TASK-414-NN-Title.md` files before implementation, with execution-ready leaves
and pseudocode where needed:

- [ ] Generic themed media coverage and video-kind contract.
- [ ] Safe brand-token and theme-profile application from Advanced intake.
- [ ] Booking capability adapter for reviewed appointment/service sites.
- [ ] Commerce and checkout capability adapter for reviewed shop sites.
- [ ] Installed-site refinement from server-derived solution-kit run context.
- [ ] Follow-up section editing depth: nested/slot widget patches, menu
      structure patches, entry bulk draft/edit actions, and section-level
      validation.
- [ ] Reviewed prompt-bespoke copy generation and redaction-safe content
      application.
- [ ] Assistant helper-mode planning for "how do I add/change X?" prompts,
      including guidance-only, inspection, needs-input, and action-plan
      branching.
- [ ] Automated capability-sync guardrail tests for widget/CMS/solution-kit/docs
      drift.
- [ ] Cross-industry live/provider acceptance matrix that coordinates with or
      supersedes TASK-406.
- [ ] Widget pack matrix advisory-gap closure for assistant-critical Navigation,
      Booking, Search, Media, and Engagement modules.
- [ ] Final product-readiness docs, changelog, release-gate updates, and
      post-implementation Claude/subagent drift loop.

---

## Implementation Order

1. Run a fresh read-only drift audit against the current assistant source of
   truth before creating execution children.
2. Split this umbrella into physical child files in dependency order:
   capability registry and action schemas before UI controls; media/theme
   owners before planner use; adapters before live E2E.
3. Close foundational capability-sync automation before broadening generated
   site scope, so future widget/CMS changes fail fast when assistant mappings
   drift.
4. Implement one vertical/capability slice at a time with negative fail-closed
   tests before adding live Playwright coverage.
5. Run the final public-runtime and provider-backed acceptance matrix only after
   source-of-truth docs and widget pack matrix entries are synchronized.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`
- Targeted Vitest suites for Bun-free assistant planning, intake, schema,
  registry, UI, provider adapter, widget mapping, and capability-sync guard
  changes.
- Targeted Bun suites for route, executor, media, content, solution-kit,
  booking, commerce, and public runtime contracts touched by each child.
- DB-backed tests after loading env when required:
  `set -a && source .env && set +a`.
- Live Playwright CLI E2E through `coderso-dev-core-host` for any generation or
  runtime-output behavior change, including admin, public front, desktop/mobile,
  SEO basics, forms, media, navigation/footer, console errors, cleanup/rollback,
  and reset/rebuild flows.
- OpenAI/OpenRouter live/provider matrix when provider prompt packaging or
  operation-draft behavior changes.
- `bun run gates:coderso` plus release-gate updates when new product readiness
  behavior becomes release-gated.
- Local security scans from `_docs/SECURITY_SPEC.md` for secret-handling,
  provider, public-write, media, scanner-config, booking, commerce, or webhook
  changes when feasible.
- Post-implementation Claude/subagent drift passes until no unresolved drift
  remains or remaining items are split into explicit follow-up tasks.

---

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`: update capability limits, supported
  generation paths, media/theme/copy/refinement contracts, and validation
  evidence.
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`: update supported packs, Known Gaps,
  negative contracts, provider/live coverage, and release gates.
- `_docs/WIDGET_PACK_MATRIX.md`: update assistant-critical module readiness when
  widget pack gaps are closed.
- `_docs/MEDIA_SPEC.md`: update curated media, video, upload/import, source,
  license, renderer, and trust-boundary contracts when media behavior changes.
- `docs/develop/assistant.md`: update contributor capability-sync, testing, and
  assistant workflow rules.
- `docs/guide/`: update user-facing assistant and site-builder corpus pages when
  new guided behavior is supported; reindex evidence must be recorded where
  relevant.
- Relevant `_docs/_WIDGETS/*`, API, security, solution-kit, booking, commerce,
  and content docs for any touched child area.
- `_docs/_TASKS/README.md`: keep parent, child, leaf, and statistics synchronized.
- `_docs/_CHANGELOG/`: add changelog entries for completed children and final
  umbrella closure.
