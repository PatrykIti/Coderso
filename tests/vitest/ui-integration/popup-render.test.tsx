// @vitest-environment happy-dom

import { describe, expect, test } from "vitest";

import type { PublicPopup } from "../../../core/services/popups/popupPublicContract";
import { isSafeHref, renderPopup, SAFE } from "../../../core/services/popups/runtime/renderPopup";

const makePopup = (overrides: Partial<PublicPopup> = {}): PublicPopup => ({
  id: "pop-1",
  slug: "welcome",
  trigger: { type: "time_delay", delaySeconds: 5 },
  frequency: { strategy: "session_once", cooldownMinutes: null },
  content: {
    title: "Welcome",
    body: "Hello there",
    ctaLabel: "Learn more",
    ctaHref: "/pricing",
  },
  settings: { placement: "center", dismissible: true, showOverlay: true },
  ...overrides,
});

describe("isSafeHref (local IIFE-serializable SAFE rule)", () => {
  test("accepts root-relative hrefs", () => {
    expect(isSafeHref("/pricing")).toBe(true);
    expect(isSafeHref("/")).toBe(true);
    expect(isSafeHref("/blog/post-one")).toBe(true);
  });

  test("accepts http and https, case-insensitively", () => {
    expect(isSafeHref("https://example.com")).toBe(true);
    expect(isSafeHref("http://example.com/a?b=c")).toBe(true);
    expect(isSafeHref("HTTPS://example.com")).toBe(true);
    expect(isSafeHref("Http://example.com")).toBe(true);
  });

  test("trims surrounding whitespace before matching", () => {
    expect(isSafeHref("  /pricing  ")).toBe(true);
    expect(isSafeHref("  https://example.com  ")).toBe(true);
  });

  test("rejects protocol-relative // hrefs", () => {
    expect(isSafeHref("//example.com")).toBe(false);
    expect(isSafeHref("//evil.example/path")).toBe(false);
  });

  test("rejects unsafe schemes", () => {
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref("JaVaScRiPt:alert(1)")).toBe(false);
    expect(isSafeHref("data:text/html,<script>1</script>")).toBe(false);
    expect(isSafeHref("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeHref("mailto:user@example.com")).toBe(false);
    expect(isSafeHref("tel:+123")).toBe(false);
  });

  test("rejects non-string input", () => {
    expect(isSafeHref(null)).toBe(false);
    expect(SAFE.test("")).toBe(false);
  });
});

describe("renderPopup: structure and settings classes", () => {
  test("reflects placement and overlay classes, id, role, and aria-modal", () => {
    const { element } = renderPopup(makePopup(), { document });

    expect(element.tagName).toBe("DIV");
    expect(element.getAttribute("data-coderso-popup")).toBe("pop-1");
    expect(element.classList.contains("coderso-popup")).toBe(true);
    expect(element.classList.contains("coderso-popup--center")).toBe(true);
    expect(element.classList.contains("coderso-popup--overlay")).toBe(true);
    expect(element.getAttribute("role")).toBe("dialog");
    expect(element.getAttribute("aria-modal")).toBe("true");
  });

  test("bottom_right and top_banner placements map to their own classes", () => {
    const bottom = renderPopup(
      makePopup({
        settings: { placement: "bottom_right", dismissible: false, showOverlay: false },
      }),
      { document }
    );
    expect(bottom.element.classList.contains("coderso-popup--bottom_right")).toBe(true);
    expect(bottom.element.classList.contains("coderso-popup--top_banner")).toBe(false);
    expect(bottom.element.classList.contains("coderso-popup--overlay")).toBe(false);
    expect(bottom.element.getAttribute("aria-modal")).toBe("false");

    const top = renderPopup(
      makePopup({ settings: { placement: "top_banner", dismissible: false, showOverlay: false } }),
      { document }
    );
    expect(top.element.classList.contains("coderso-popup--top_banner")).toBe(true);
  });

  test("mounts into document.body by default and returns the attached element", () => {
    const { element } = renderPopup(makePopup(), { document });
    expect(document.body.contains(element)).toBe(true);
    expect(element.querySelector(".coderso-popup__panel")).not.toBeNull();
  });

  test("mounts into the provided mountTo element", () => {
    const mountTo = document.createElement("div");
    document.body.appendChild(mountTo);
    const { element } = renderPopup(makePopup(), { document, mountTo });
    expect(element.parentElement).toBe(mountTo);
    expect(document.body.contains(element)).toBe(true); // descendant of body via mountTo
  });
});

describe("renderPopup: text content is escaped (no markup injection)", () => {
  test("title and body render as text with no child elements created from markup", () => {
    const { element } = renderPopup(
      makePopup({
        content: {
          title: '<img src=x onerror="alert(1)">',
          body: "<script>window.pwned = 1</script>",
          ctaLabel: null,
          ctaHref: null,
        },
      }),
      { document }
    );

    const h2 = element.querySelector("h2");
    const p = element.querySelector("p");
    expect(h2?.textContent).toBe('<img src=x onerror="alert(1)">');
    expect(p?.textContent).toBe("<script>window.pwned = 1</script>");
    expect(h2?.querySelector("img")).toBeNull();
    expect(p?.querySelector("script")).toBeNull();
    expect(element.querySelector("img")).toBeNull();
    expect(element.querySelector("script")).toBeNull();
    expect(element.innerHTML).not.toContain("<img");
    expect(element.innerHTML).not.toContain("<script");
  });

  test("omits title and body nodes when null", () => {
    const { element } = renderPopup(
      makePopup({ content: { title: null, body: null, ctaLabel: null, ctaHref: null } }),
      { document }
    );
    expect(element.querySelector("h2")).toBeNull();
    expect(element.querySelector("p")).toBeNull();
    expect(element.querySelector("a")).toBeNull();
  });
});

describe("renderPopup: CTA href sanitization", () => {
  test("sets href and noopener noreferrer for a safe root-relative href", () => {
    const { element } = renderPopup(makePopup(), { document });
    const cta = element.querySelector("a");
    expect(cta).not.toBeNull();
    expect(cta?.getAttribute("href")).toBe("/pricing");
    expect(cta?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(cta?.textContent).toBe("Learn more");
  });

  test("sets href and rel for an https link", () => {
    const { element } = renderPopup(
      makePopup({
        content: { title: null, body: null, ctaLabel: "Visit", ctaHref: "https://example.com" },
      }),
      { document }
    );
    const cta = element.querySelector("a");
    expect(cta?.getAttribute("href")).toBe("https://example.com");
    expect(cta?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  test("renders the CTA without href for javascript: and data: schemes", () => {
    for (const href of ["javascript:alert(1)", "data:text/html,<script>1</script>"]) {
      const { element } = renderPopup(
        makePopup({ content: { title: null, body: null, ctaLabel: "Click", ctaHref: href } }),
        { document }
      );
      const cta = element.querySelector("a");
      expect(cta).not.toBeNull();
      expect(cta?.textContent).toBe("Click");
      expect(cta?.hasAttribute("href")).toBe(false);
      expect(cta?.getAttribute("rel")).toBeNull();
    }
  });

  test("omits the CTA entirely when there is no label", () => {
    const { element } = renderPopup(
      makePopup({ content: { title: null, body: null, ctaLabel: null, ctaHref: "/x" } }),
      { document }
    );
    expect(element.querySelector("a")).toBeNull();
  });
});

describe("renderPopup: dismiss behavior", () => {
  test("renders a Close button only when dismissible", () => {
    const dismissible = renderPopup(makePopup(), { document });
    const button = dismissible.element.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.getAttribute("aria-label")).toBe("Close");
    expect(button?.getAttribute("type")).toBe("button");
    expect(button?.textContent).toBe("×");

    const locked = renderPopup(
      makePopup({ settings: { placement: "center", dismissible: false, showOverlay: true } }),
      { document }
    );
    expect(locked.element.querySelector("button")).toBeNull();
  });

  test("clicking the Close button removes the root", () => {
    const { element, close } = renderPopup(makePopup(), { document });
    const button = element.querySelector("button");
    expect(document.body.contains(element)).toBe(true);
    button?.click();
    expect(document.body.contains(element)).toBe(false);
    // close() on an already-removed node is a safe no-op.
    close();
  });

  test("close() removes the root and is idempotent", () => {
    const { element, close } = renderPopup(makePopup(), { document });
    expect(document.body.contains(element)).toBe(true);
    close();
    expect(document.body.contains(element)).toBe(false);
    close();
    expect(document.body.contains(element)).toBe(false);
  });

  test("with overlay, clicking the backdrop removes the root but the panel does not", () => {
    const { element } = renderPopup(makePopup(), { document });
    const panel = element.querySelector(".coderso-popup__panel");
    expect(panel).not.toBeNull();
    panel?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(document.body.contains(element)).toBe(true);
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(document.body.contains(element)).toBe(false);
  });

  test("without overlay, clicking the root does not dismiss", () => {
    const { element } = renderPopup(
      makePopup({ settings: { placement: "center", dismissible: true, showOverlay: false } }),
      { document }
    );
    expect(element.querySelector("button")).not.toBeNull();
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(document.body.contains(element)).toBe(true);
  });
});
