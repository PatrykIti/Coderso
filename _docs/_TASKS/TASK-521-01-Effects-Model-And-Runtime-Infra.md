# TASK-521-01: Effects MODEL + Shared Runtime-Effects Infra + Normalize / Reject-Unknown

# FileName: TASK-521-01-Effects-Model-And-Runtime-Infra.md

**Parent Task:** TASK-521
**Priority:** High
**Category:** Schema (JSON model) / Site Render (runtime) / Accessibility
**Estimated Effort:** Medium
**Status:** ✅ Done

---

## Scope

Foundation subtask. **Sole writer** of `core/services/pages/pageDocumentV2.ts`
(the effect MODEL: types, enums, clamps, allowlist additions, normalizers,
reject-unknown, JSON-schema mirror) and the NEW dependency-free
`core/services/pages/pageEffectsRuntime.ts` (the shared runtime-effects IIFE
source string + reduced-motion guard). No consumer wiring (that is 521-02..05);
this subtask ONLY defines the vocabulary + validation + the runtime script text,
so every downstream subtask imports read-only.

All additions are **present-only**, join a **reject-unknown allowlist**
(`assertKnownKeys`, `:1624`) and the strict `pageDocumentV2JsonSchema` (`:1342`,
`additionalProperties:false`) in lockstep, and are covered by round-trip tests
(L05). Legacy docs normalize byte-unchanged. NO schemaVersion bump (`:28` stays
`2`), NO migration.

## Leaves

| Leaf | Title | Region / file |
|------|-------|---------------|
| TASK-521-01-L01 | Section-style scroll-effect model | `pageDocumentV2.ts` — `PageSectionStyleV2` (`:380`) + `normalizeSectionStyle` (`:2052`) + schema mirror |
| TASK-521-01-L02 | Page-settings effects model | `pageDocumentV2.ts` — `PageDocumentSettingsV2` (`:346`) + `normalizeSettings` (`:1990`) + schema mirror |
| TASK-521-01-L03 | Animated-icon block model (implement the `icon` block) | `pageDocumentV2.ts` — `pageBlockPropKeys.icon` (`:629`) + icon defaults (`:872`) + block-prop normalize + capability flip (`:691`/`:715`/`:774`) + curated icon/animation vocabulary (NO new `pageBlockTypes` member) |
| TASK-521-01-L04 | Runtime-effects script module | NEW `pageEffectsRuntime.ts` — static reveal/parallax/spotlight IIFE + reduced-motion guard |
| TASK-521-01-L05 | Model + normalize round-trip tests | Vitest — `tests/vitest/pages/page-document-v2.test.ts` + `page-document-v2-block-roundtrip.test.ts` (extend) + NEW `tests/vitest/pages/pageEffectsRuntime.test.ts` (pure-TS round-trips + static-source shape; NOT Bun `tests/unit/pages/*`) |

**Intra-subtask land order (disjoint symbol regions, one file):** L01 → L02 → L03
→ L04 → L05. L01/L02/L03 touch disjoint symbols of `pageDocumentV2.ts`
(section-style, settings, icon-block prop-keys/defaults/capabilities); L04 is a NEW
file; L05 is tests.

## Shared vocabulary defined here (imported read-only by 521-02..05)

```ts
// Enums / clamps (single source of truth):
export const pageSectionScrollEffects = ["none","reveal-fade","reveal-up","parallax"] as const;
export type PageSectionScrollEffect = (typeof pageSectionScrollEffects)[number];
export const PAGE_PARALLAX_INTENSITY_CLAMP = { min: 0, max: 40 } as const;      // px travel
export const PAGE_SPOTLIGHT_SIZE_CLAMP = { min: 120, max: 900 } as const;       // px radius
export const animatedIconAnimations = ["none","spin","pulse","bounce","draw"] as const;
export const ANIMATED_ICON_SIZE_CLAMP = { min: 16, max: 160 } as const;         // px
export const ANIMATED_ICON_SPEED_CLAMP = { min: 400, max: 4000 } as const;      // ms
export const animatedIconNames = [
  "sparkles","star","heart","zap","check","shield","arrow-right","bell","rocket","loader",
] as const;                                                                      // curated set (extendable)
export type AnimatedIconName = (typeof animatedIconNames)[number];
export const ANIMATED_ICON_NAME_PATTERN = /^[a-z0-9-]{1,48}$/;
```

Hero tilt vocabulary (`HeroTilt = "none"|"subtle"|"strong"`) is owned by 521-03 in
`hero.tsx` (self-contained widget) — NOT duplicated here.

## Hard Invariants

1. Every new field present-only; legacy docs byte-identical.
2. Every new key in BOTH `assertKnownKeys` list AND `pageDocumentV2JsonSchema`.
3. `pageEffectsRuntime.ts` = a STATIC string (no template interpolation of any
   caller value); dependency-free; reduced-motion early-return.
4. No schemaVersion bump; no migration.

## Definition of done

Types/enums/clamps/normalizers/schema-mirror added; round-trip tests green
(L05); `bun --cwd core lint:types` + root `tsc` green; no consumer file touched.
