// @vitest-environment happy-dom
import React from "react";
import { expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import {
  AnimatedIcon,
  ANIMATED_ICON_KEYFRAMES_CSS,
} from "../../../core/services/pages/animatedIconGlyphs";
import { animatedIconAnimations } from "../../../core/services/pages/pageDocumentV2";

// happy-dom/jsdom do NOT apply <style> @keyframes to getComputedStyle, so a
// `computed animationName none` assertion is NOT observable. We instead assert the
// DOM/inline-state the render actually sets, and the @media guard on the CSS string.

function mountIcon(props: React.ComponentProps<typeof AnimatedIcon>): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(<AnimatedIcon {...props} />);
  document.body.appendChild(host);
  return host;
}

test("reduce ⇒ data-anim-icon still present but keyframes are @media-guarded (no motion for reduce users)", () => {
  const host = mountIcon({
    name: "star",
    animation: "spin",
    size: 48,
    color: "#0ea5e9",
    speed: 1600,
  });
  const span = host.querySelector("[data-anim-icon]");
  expect(span).not.toBeNull();
  // The reduced-motion guarantee lives on the emitted CSS string: the keyframe
  // rules are wrapped in @media (prefers-reduced-motion: no-preference), so a
  // reduce user matches no animation rule and gets a static glyph.
  expect(ANIMATED_ICON_KEYFRAMES_CSS).toContain("@media (prefers-reduced-motion: no-preference)");
  // The animation rules are INSIDE the media block (not before it) — assert the
  // first keyframe-application rule appears after the media open brace.
  const mediaIndex = ANIMATED_ICON_KEYFRAMES_CSS.indexOf(
    "@media (prefers-reduced-motion: no-preference)"
  );
  const spinRuleIndex = ANIMATED_ICON_KEYFRAMES_CSS.indexOf('[data-anim-icon="spin"] svg');
  expect(spinRuleIndex).toBeGreaterThan(mediaIndex);
});

test("no-preference marker ⇒ [data-anim-icon] carries the animation NAME attr + --anim-speed var for spin/pulse/bounce/draw", () => {
  for (const animation of animatedIconAnimations) {
    const host = mountIcon({
      name: "sparkles",
      animation,
      size: 40,
      color: "var(--primary)",
      speed: 1200,
    });
    const span = host.querySelector("span") as HTMLElement;
    expect(span).not.toBeNull();
    // --anim-speed rides on every icon (bounded ms) regardless of animation.
    expect(span.getAttribute("style") ?? "").toContain("--anim-speed:1200ms");
    if (animation === "none") {
      expect(span.hasAttribute("data-anim-icon")).toBe(false);
    } else {
      expect(span.getAttribute("data-anim-icon")).toBe(animation);
    }
    // An inline <svg> is always present (static or animated).
    expect(host.querySelector("svg")).not.toBeNull();
  }
});
