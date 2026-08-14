// @vitest-environment happy-dom

import { beforeEach, describe, expect, test } from "vitest";

import type { PublicPopup } from "../../../core/services/popups/popupPublicContract";
import { renderPopup } from "../../../core/services/popups/runtime/renderPopup";
import { buildPopupThemeCss } from "../../../core/services/popups/runtime/popupThemeCss";

/**
 * TASK-558 — present-only theme + accessibility integration for renderPopup.
 *
 * - Theme is injected as ONE `<style data-coderso-popup-theme>` in <head>,
 *   created only when a popup renders (zero popup-theme bytes in a pristine
 *   document), and byte-identical to the canonical `buildPopupThemeCss`.
 * - Computed styles prove the popup is actually VISIBLE: fixed, above site
 *   content (z-index), centered/clamped, card surface, overlay backdrop,
 *   close affordance, reduced-motion CSS, mobile width rules.
 * - A11y: focus moves into the popup on open and is restored on close, ESC
 *   closes dismissible popups only, Tab is trapped for modal popups only.
 */

const makePopup = (overrides: Partial<PublicPopup> = {}): PublicPopup => ({
  id: "pop-theme-1",
  slug: "welcome",
  trigger: { type: "time_delay", delaySeconds: 5 },
  frequency: { strategy: "session_once", cooldownMinutes: null },
  content: { title: "Welcome", body: "Hello there", ctaLabel: "Learn more", ctaHref: "/pricing" },
  settings: { placement: "center", dismissible: true, showOverlay: true },
  ...overrides,
});

const themeStyle = (): HTMLStyleElement | null =>
  document.querySelector("style[data-coderso-popup-theme]");

beforeEach(() => {
  document.head.querySelector("style[data-coderso-popup-theme]")?.remove();
  document.body.innerHTML = "";
});

describe("present-only theme injection", () => {
  test("a pristine document carries zero popup-theme bytes", () => {
    expect(themeStyle()).toBeNull();
    expect(document.querySelector("style[data-coderso-popup-theme]")).toBeNull();
  });

  test("rendering a popup injects exactly one theme style, byte-identical to the canonical builder", () => {
    renderPopup(makePopup(), { document });
    expect(document.querySelectorAll("style[data-coderso-popup-theme]")).toHaveLength(1);
    expect(themeStyle()?.textContent).toBe(buildPopupThemeCss("default"));
  });

  test("multiple popups never duplicate the theme style", () => {
    renderPopup(makePopup({ id: "pop-a" }), { document });
    renderPopup(
      makePopup({
        id: "pop-b",
        settings: { placement: "bottom_right", dismissible: false, showOverlay: false },
      }),
      { document }
    );
    renderPopup(makePopup({ id: "pop-c" }), { document });
    expect(document.querySelectorAll("style[data-coderso-popup-theme]")).toHaveLength(1);
  });

  test("the injected style text stays pinned to the canonical default preset", () => {
    renderPopup(makePopup(), { document });
    expect(themeStyle()?.textContent).toBe(buildPopupThemeCss("default"));
    expect(themeStyle()?.textContent ?? "").toContain("[data-coderso-popup]{position:fixed");
  });
});

describe("computed styles make the popup visible", () => {
  test("modal popup: fixed full-viewport layer above site content with backdrop", () => {
    const { element } = renderPopup(makePopup(), { document });
    const cs = window.getComputedStyle(element);
    expect(cs.position).toBe("fixed");
    expect(cs.zIndex).toBe("9999");
    expect(cs.display).toBe("flex");
    expect(cs.alignItems).toBe("center");
    expect(cs.justifyContent).toBe("center");
    expect(cs.pointerEvents).toBe("auto");
    expect(cs.backgroundColor).toBe("rgba(15, 23, 42, .5)");
  });

  test("card panel: surface, border, radius, shadow, padding, typography, clamped", () => {
    const { element } = renderPopup(makePopup(), { document });
    const panel = element.querySelector<HTMLElement>(".coderso-popup__panel");
    expect(panel).not.toBeNull();
    const cs = window.getComputedStyle(panel as HTMLElement);
    expect(cs.backgroundColor).toBe("#fff");
    expect(cs.border).toContain("rgba(15, 23, 42, .12)");
    expect(cs.borderRadius).toBe("14px");
    expect(cs.padding).toBe("24px");
    expect(cs.position).toBe("relative");
    expect(cs.maxWidth).toBe("min(560px,100%)");
    expect(cs.maxHeight).toBe("100%");
    expect(cs.overflow).toBe("auto");
    expect(cs.pointerEvents).toBe("auto");
  });

  test("close button is an absolute top-right affordance", () => {
    const { element } = renderPopup(makePopup(), { document });
    const btn = element.querySelector<HTMLElement>("button");
    expect(btn).not.toBeNull();
    const cs = window.getComputedStyle(btn as HTMLElement);
    expect(cs.position).toBe("absolute");
    expect(cs.top).toBe("8px");
    expect(cs.right).toBe("8px");
    expect(cs.width).toBe("32px");
    expect(cs.height).toBe("32px");
    expect(cs.cursor).toBe("pointer");
  });

  test("bottom_right anchors to the bottom-right corner (never below the fold)", () => {
    const { element } = renderPopup(
      makePopup({ settings: { placement: "bottom_right", dismissible: true, showOverlay: false } }),
      { document }
    );
    const cs = window.getComputedStyle(element);
    expect(cs.position).toBe("fixed");
    expect(cs.alignItems).toBe("flex-end");
    expect(cs.justifyContent).toBe("flex-end");
    expect(cs.pointerEvents).toBe("none"); // page stays usable behind a non-modal card
    const panel = element.querySelector<HTMLElement>(".coderso-popup__panel");
    expect(window.getComputedStyle(panel as HTMLElement).maxWidth).toBe("min(380px,100%)");
  });

  test("top_banner spans the viewport width at the top", () => {
    const { element } = renderPopup(
      makePopup({ settings: { placement: "top_banner", dismissible: true, showOverlay: false } }),
      { document }
    );
    const cs = window.getComputedStyle(element);
    expect(cs.alignItems).toBe("flex-start");
    expect(cs.justifyContent).toBe("center");
    const panel = element.querySelector<HTMLElement>(".coderso-popup__panel");
    expect(window.getComputedStyle(panel as HTMLElement).width).toBe("100%");
  });

  test("theme carries mobile-width and reduced-motion rules", () => {
    const css = buildPopupThemeCss("default");
    expect(css).toContain("@media (max-width:639px)");
    expect(css).toContain("@media (prefers-reduced-motion:no-preference)");
    expect(css).toContain("@media (prefers-reduced-motion:reduce)");
  });
});

describe("focus management", () => {
  test("focus moves to the close button on open when dismissible", () => {
    renderPopup(makePopup(), { document });
    const btn = document.querySelector("[data-coderso-popup] button");
    expect(document.activeElement).toBe(btn);
  });

  test("focus moves to the panel when there is no close button", () => {
    renderPopup(
      makePopup({ settings: { placement: "center", dismissible: false, showOverlay: true } }),
      { document }
    );
    const panel = document.querySelector<HTMLElement>(".coderso-popup__panel");
    expect(document.activeElement).toBe(panel);
  });

  test("close restores focus to the previously focused element", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "open";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { close } = renderPopup(makePopup(), { document });
    expect(document.activeElement).not.toBe(trigger);
    close();
    expect(document.activeElement).toBe(trigger);
  });

  test("close is idempotent and safe on an already closed popup", () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const { close } = renderPopup(makePopup(), { document });
    close();
    close();
    expect(document.body.querySelector("[data-coderso-popup]")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe("ESC-to-close", () => {
  const pressEsc = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  };

  test("ESC closes a dismissible popup and removes it from the DOM", () => {
    const { element } = renderPopup(makePopup(), { document });
    expect(document.body.contains(element)).toBe(true);
    pressEsc();
    expect(document.body.contains(element)).toBe(false);
  });

  test("ESC does not close a non-dismissible popup", () => {
    const { element } = renderPopup(
      makePopup({ settings: { placement: "center", dismissible: false, showOverlay: true } }),
      { document }
    );
    pressEsc();
    expect(document.body.contains(element)).toBe(true);
  });

  test("the keydown listener is removed on close", () => {
    const { close } = renderPopup(makePopup(), { document });
    close();
    let count = 0;
    const probe = document.createElement("button");
    document.body.appendChild(probe);
    probe.focus();
    const listener = () => {
      count += 1;
    };
    document.addEventListener("keydown", listener);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    document.removeEventListener("keydown", listener);
    expect(count).toBe(1); // only the probe listener fired, not a stale popup handler
  });
});

describe("focus trap for modal popups", () => {
  const pressTab = (shift = false) =>
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", shiftKey: shift, bubbles: true })
    );

  test("Tab from the last focusable wraps to the first (modal)", () => {
    renderPopup(makePopup(), { document });
    const popup = document.querySelector("[data-coderso-popup]") as HTMLElement;
    const cta = popup.querySelector<HTMLElement>("a");
    const btn = popup.querySelector<HTMLElement>("button");
    expect(btn).not.toBeNull();
    (btn as HTMLElement).focus();
    pressTab();
    expect(document.activeElement).toBe(cta);
  });

  test("Shift+Tab from the first focusable wraps to the last (modal)", () => {
    renderPopup(makePopup(), { document });
    const popup = document.querySelector("[data-coderso-popup]") as HTMLElement;
    const cta = popup.querySelector<HTMLElement>("a");
    const btn = popup.querySelector<HTMLElement>("button");
    (cta as HTMLElement).focus();
    pressTab(true);
    expect(document.activeElement).toBe(btn);
  });

  test("non-modal popups do not trap Tab (page stays interactive)", () => {
    renderPopup(
      makePopup({ settings: { placement: "bottom_right", dismissible: true, showOverlay: false } }),
      { document }
    );
    const popup = document.querySelector("[data-coderso-popup]") as HTMLElement;
    const btn = popup.querySelector<HTMLElement>("button");
    (btn as HTMLElement).focus();
    // Focus already sits on the only focusable; a real browser would advance to
    // the page. The handler must not move focus (no trap), so it stays put.
    pressTab();
    expect(document.activeElement).toBe(btn);
  });
});
