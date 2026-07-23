import {
  ArrowRight,
  Bell,
  Check,
  Heart,
  Loader,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { type AnimatedIconAnimation, type AnimatedIconName } from "./pageDocumentV2";

/**
 * TASK-521-04 — Animated-icon block glyph set.
 *
 * Curated inline-SVG glyphs (reusing the already-installed `lucide-react` marks —
 * NO new npm dependency, no Lottie) keyed EXACTLY by the `animatedIconName`
 * allowlist (521-01). The animation is pure, self-hosted CSS keyframes gated by
 * `prefers-reduced-motion` so reduce users get the static glyph automatically.
 *
 * The map is a compile-time-exhaustive `Record<AnimatedIconName, LucideIcon>`, so a
 * drift between the allowlist and this set fails typecheck (and the L04 key-equality
 * test) rather than crashing at render.
 */
export const animatedIconGlyphs: Record<AnimatedIconName, LucideIcon> = {
  sparkles: Sparkles,
  star: Star,
  heart: Heart,
  zap: Zap,
  check: Check,
  shield: Shield,
  "arrow-right": ArrowRight,
  bell: Bell,
  rocket: Rocket,
  loader: Loader,
};

/**
 * Static keyframe CSS for the four animations. The keyframe rules live INSIDE
 * `@media (prefers-reduced-motion: no-preference)`, so reduce users match no rule
 * and see a static glyph — the reduced-motion guarantee is expressed here, not at
 * runtime. `--anim-speed` (a bounded number from the validated `speed` prop) drives
 * duration. STATIC literal — no interpolation of user data.
 */
export const ANIMATED_ICON_KEYFRAMES_CSS = `
@keyframes ci-spin{to{transform:rotate(360deg)}}
@keyframes ci-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.15);opacity:.75}}
@keyframes ci-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-18%)}}
@keyframes ci-draw{to{stroke-dashoffset:0}}
[data-anim-icon]{display:inline-flex}
@media (prefers-reduced-motion: no-preference){
[data-anim-icon="spin"] svg{animation:ci-spin var(--anim-speed,1600ms) linear infinite}
[data-anim-icon="pulse"] svg{animation:ci-pulse var(--anim-speed,1600ms) ease-in-out infinite}
[data-anim-icon="bounce"] svg{animation:ci-bounce var(--anim-speed,1600ms) ease-in-out infinite}
[data-anim-icon="draw"] svg{stroke-dasharray:64;stroke-dashoffset:64;animation:ci-draw var(--anim-speed,1600ms) ease forwards}
}`;

/**
 * Presentational animated-icon component. Resolves the glyph via the exhaustive map
 * (Set-membership through the typed key; `sparkles` fallback for any drift), applies
 * the animation via a `data-anim-icon` attribute the keyframe CSS targets, and feeds
 * the validated `color`/`speed`/`size` values through bounded inline style / CSS vars
 * only — never a raw declaration. `animation:"none"` omits the attribute → static.
 */
export function AnimatedIcon({
  name,
  animation,
  size,
  color,
  speed,
}: {
  name: AnimatedIconName;
  animation: AnimatedIconAnimation;
  size: number;
  color: string;
  speed: number;
}) {
  const Glyph = animatedIconGlyphs[name] ?? animatedIconGlyphs.sparkles;
  return (
    <span
      data-anim-icon={animation === "none" ? undefined : animation}
      style={{ ["--anim-speed" as string]: `${speed}ms`, color, lineHeight: 0 }}
    >
      <Glyph width={size} height={size} aria-hidden="true" />
    </span>
  );
}
