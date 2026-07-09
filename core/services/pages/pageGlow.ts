/**
 * TASK-531 — shared PURE glow-compose helpers (Bun-free, import-side-effect-free).
 *
 * Both render boundaries need to compose the structured `PageGlow` spec into a
 * single `box-shadow` string:
 *   1. `pageRendererV2.tsx` — the SSR inline-style path (React-escaped `CSSProperties`).
 *   2. `pageResponsiveCss.ts` — the per-device `@media` RAW `<style>` path
 *      (`dangerouslySetInnerHTML`, NOT React-escaped), which is a Bun-free /
 *      import-side-effect-free Vitest-lane module and MUST NOT import the render
 *      inline path.
 *
 * To avoid duplicating the compose logic across the two files (and to keep the
 * RAW `<style>` boundary exactly as safe as the SSR one), the compose lives here
 * and reads only the `PAGE_GLOW_*_CLAMP` constants (`pageDocumentV2.ts`, Bun-free)
 * and `sanitizeAuthoringCssColor` (`pageAuthoringSanitizers.ts`, Bun-free).
 *
 * SECURITY: `composeGlowBoxShadow` re-sanitizes `glow.color` at render (defence in
 * depth — the write boundary already sanitizes it) and interpolates ONLY the
 * sanitized color + clamped numbers into a FIXED `"<x>px <y>px <blur>px <spread>px
 * <color>"` template. It NEVER interpolates a raw author string, so no arbitrary
 * `box-shadow` value (which could smuggle `url()` via a bogus token) can be emitted
 * at either boundary. A bad color composes to `undefined` (fail-soft, no glow).
 */
import {
  PAGE_GLOW_BLUR_CLAMP,
  PAGE_GLOW_OFFSET_CLAMP,
  PAGE_GLOW_SPREAD_CLAMP,
  type PageGlow,
} from "./pageDocumentV2";
import { sanitizeAuthoringCssColor } from "./pageAuthoringSanitizers";

type GlowClamp = { readonly min: number; readonly max: number };

/**
 * Truncate + clamp a possibly-undefined number into a glow clamp (default 0), so
 * the render helper is defensive even against an unclamped stored value.
 */
export const clampGlowNum = (value: number | undefined, clamp: GlowClamp): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(clamp.max, Math.max(clamp.min, Math.trunc(value)));
};

/**
 * Compose the structured glow spec into ONE `box-shadow` declaration. Returns
 * `undefined` when there is no glow OR its color fails re-sanitization. The
 * emitted value is a FIXED four-part template — never a raw author string.
 */
export const composeGlowBoxShadow = (glow: PageGlow | undefined): string | undefined => {
  if (!glow) return undefined;
  const color = sanitizeAuthoringCssColor(glow.color);
  if (!color) return undefined;
  const x = clampGlowNum(glow.x, PAGE_GLOW_OFFSET_CLAMP);
  const y = clampGlowNum(glow.y, PAGE_GLOW_OFFSET_CLAMP);
  const blur = clampGlowNum(glow.blur ?? 24, PAGE_GLOW_BLUR_CLAMP);
  const spread = clampGlowNum(glow.spread, PAGE_GLOW_SPREAD_CLAMP);
  return `${x}px ${y}px ${blur}px ${spread}px ${color}`;
};

/**
 * Merge an enum `shadow` value with a composed glow: a comma list = two stacked
 * shadows, so the glow AUGMENTS the token drop-shadow rather than replacing it.
 * Returns `undefined` when neither is present.
 */
export const mergeShadows = (
  enumShadow: string | undefined,
  glow: string | undefined
): string | undefined => (enumShadow && glow ? `${enumShadow}, ${glow}` : (glow ?? enumShadow));
