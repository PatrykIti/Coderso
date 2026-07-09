import { type ReactElement } from "react";

import { type PageScrollHintGlyph } from "./pageDocumentV2";

/**
 * TASK-534-02-L03 — declarative-interactivity static glyph + CSS assets.
 *
 * 100% STATIC author-free literals (mirrors `animatedIconGlyphs.tsx`): the inline
 * scroll-hint SVGs and the noise-overlay data-URI carry NO stored/user data (no
 * interpolation surface). The scroll-hint block mounts one of these glyphs plus the
 * `@keyframes` CSS below (block-scoped, so it works on BOTH the public front AND the
 * builder canvas). The noise overlay paints a self-generated SVG-turbulence layer —
 * NO asset, NO npm dependency, NO author color (no 531 relaxation).
 *
 * Reduced-motion: the scroll-hint bob is gated by
 * `@media (prefers-reduced-motion: no-preference)` so reduce users get the static
 * glyph; the noise overlay is STATIC (renders identically under reduced-motion).
 */

const dotGlyph: ReactElement = (
  <svg
    viewBox="0 0 24 40"
    width="20"
    height="34"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="6" y="1" width="12" height="22" rx="6" />
    <circle className="cx-hint-dot-mark" cx="12" cy="8" r="2" fill="currentColor" stroke="none" />
    <path d="M9 30l3 4 3-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const chevronGlyph: ReactElement = (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 4l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
  </svg>
);

/** Static scroll-hint glyph set, keyed EXACTLY by the `scrollHintGlyphs` allowlist. */
export const SCROLL_HINT_GLYPHS: Record<PageScrollHintGlyph, ReactElement> = {
  dot: dotGlyph,
  chevron: chevronGlyph,
};

/**
 * Self-generated grain (SVG turbulence data-URI — NO asset, NO author input). Fixed
 * low opacity; a compile-time literal, so there is no color/CSS-injection surface.
 */
export const NOISE_OVERLAY_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")";

/**
 * Static keyframe + overlay CSS for the declarative-interactivity POLISH (scroll-hint
 * bob + noise overlay). The bob is `motion-safe:` only; the noise overlay is STATIC.
 * `[data-noise-host]` makes the host a positioning context so the `inset:0` overlay
 * pins to it (sections/roots are not `position:relative` by default).
 */
export const INTERACTIVITY_KEYFRAMES_CSS =
  "@keyframes cx-scrollhint-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}" +
  "[data-scroll-hint]{display:inline-flex;align-items:center;justify-content:center;color:currentColor}" +
  "@media (prefers-reduced-motion: no-preference){[data-scroll-hint] .cx-hint-dot{animation:cx-scrollhint-bob 1.6s ease-in-out infinite}}" +
  "[data-noise-host]{position:relative}" +
  "[data-noise-overlay]{position:absolute;inset:0;pointer-events:none;background-image:" +
  NOISE_OVERLAY_DATA_URI +
  ";mix-blend-mode:overlay}";
