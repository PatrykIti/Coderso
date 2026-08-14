import { describe, expect, it } from "vitest";

import {
  POPUP_DEFAULT_THEME_CSS,
  POPUP_THEME_PRESETS,
  buildPopupThemeCss,
} from "../../../core/services/popups/runtime/popupThemeCss";

/**
 * TASK-558 — present-only theme builder gates, mirroring the
 * `buildSiteShellCss(null)` byte-identity discipline (TASK-533/531):
 *  - unknown/null preset emits ZERO bytes (no-op),
 *  - the bounded "default" preset emits the frozen canonical stylesheet,
 *  - the canonical CSS actually styles the popup (position/z-index/overlay/
 *    close/reduced-motion/mobile), so the runtime smoke has real computed
 *    styles to assert.
 */
describe("buildPopupThemeCss", () => {
  it("emits zero bytes for null (present-only no-op)", () => {
    expect(buildPopupThemeCss(null)).toBe("");
    expect(buildPopupThemeCss(undefined)).toBe("");
  });

  it("emits zero bytes for unknown/out-of-allowlist presets", () => {
    // @ts-expect-error deliberate unknown preset
    expect(buildPopupThemeCss("neon")).toBe("");
  });

  it("exposes exactly the bounded preset allowlist", () => {
    expect(POPUP_THEME_PRESETS).toEqual(["default"]);
  });

  it("emits the frozen canonical stylesheet for the default preset", () => {
    expect(buildPopupThemeCss("default")).toBe(POPUP_DEFAULT_THEME_CSS);
    expect(POPUP_DEFAULT_THEME_CSS.length).toBeGreaterThan(0);
  });
});

describe("POPUP_DEFAULT_THEME_CSS contract", () => {
  it("places the popup fixed above site content with a safe z-index", () => {
    expect(POPUP_DEFAULT_THEME_CSS).toContain("[data-coderso-popup]{position:fixed");
    expect(POPUP_DEFAULT_THEME_CSS).toContain("z-index:9999");
    // Nav/dropdowns use 40-50 and page layers cap below 40; the popup must win.
    expect(POPUP_DEFAULT_THEME_CSS).not.toContain("z-index:40");
  });

  it("styles the card surface, border, shadow, radius, padding, and typography", () => {
    const panel = "[data-coderso-popup] .coderso-popup__panel{";
    const i = POPUP_DEFAULT_THEME_CSS.indexOf(panel);
    expect(i).toBeGreaterThanOrEqual(0);
    const rule = POPUP_DEFAULT_THEME_CSS.slice(i);
    expect(rule).toContain("background:var(--color-bg,#fff)");
    expect(rule).toContain("border:1px solid rgba(15,23,42,.12)");
    expect(rule).toContain("box-shadow:0 12px 32px rgba(15,23,42,.16)");
    expect(rule).toContain("border-radius:14px");
    expect(rule).toContain("padding:24px");
    expect(rule).toContain("font-size:1rem");
  });

  it("provides an overlay backdrop and a close-button affordance", () => {
    expect(POPUP_DEFAULT_THEME_CSS).toContain(
      "[data-coderso-popup].coderso-popup--overlay{pointer-events:auto;background:rgba(15,23,42,.5)}"
    );
    expect(POPUP_DEFAULT_THEME_CSS).toContain(
      "[data-coderso-popup] .coderso-popup__panel button{position:absolute;top:8px;right:8px"
    );
  });

  it("clamps to the viewport (never below the fold, never clipped) and stays visible on mobile", () => {
    expect(POPUP_DEFAULT_THEME_CSS).toContain("max-height:100%");
    expect(POPUP_DEFAULT_THEME_CSS).toContain("overflow:auto");
    expect(POPUP_DEFAULT_THEME_CSS).toContain("max-width:min(560px,100%)");
    expect(POPUP_DEFAULT_THEME_CSS).toContain("@media (max-width:639px)");
  });

  it("respects prefers-reduced-motion", () => {
    expect(POPUP_DEFAULT_THEME_CSS).toContain("@media (prefers-reduced-motion:no-preference)");
    expect(POPUP_DEFAULT_THEME_CSS).toContain("@media (prefers-reduced-motion:reduce)");
  });

  it("keeps non-overlay popups click-through so the page stays usable", () => {
    expect(POPUP_DEFAULT_THEME_CSS).toContain("pointer-events:none");
    expect(POPUP_DEFAULT_THEME_CSS).toContain(
      "[data-coderso-popup] .coderso-popup__panel{pointer-events:auto"
    );
  });
});
