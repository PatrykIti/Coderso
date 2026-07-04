# TASK-486-03-L01: Popup Render Component (DOM Builder + Safe CTA Href)
# FileName: TASK-486-03-L01-Popup-Render-Component.md

**Parent Subtask:** TASK-486-03
**Priority:** High
**Category:** Engagement / Popups / Public Site
**Estimated Effort:** Medium
**Dependencies:** TASK-486-01-L01 (PublicPopup DTO)
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Implement `renderPopup(popup, env)` — build and mount the popup DOM
  for the three placements (`center`, `bottom_right`, `top_banner`), with
  optional overlay, a dismiss control (when `dismissible`), and an optional CTA
  whose `href` is sanitized. Returns a `close()` handle. Pure builder with an
  injected `document` so it is jsdom-testable.
- **Owning module(s) to create-or-extend:** create
  `core/services/popups/runtime/renderPopup.ts` (self-contained, imports only
  the DTO type + a shared safe-href helper — serializable into the IIFE).
- **Source-of-truth docs:** `_docs/SECURITY_SPEC.md` (output sanitization /
  no injection), `_docs/ARCHITECTURE.md` (DOM behind adapters). Safe-href
  precedent: the `startsWith("/" | "http://" | "https://")` guard in
  `core/server/publicSite.tsx` (~L759).
- **Out of scope:** trigger/frequency (TASK-486-02), `<script>` assembly +
  page injection (TASK-486-03-L02), CSS theming beyond minimal inline/utility
  styles.

---

## Security Contract

No endpoint or permission model changes. Client render only — but it is the
**XSS gate**, so:

- **Text content** (`title`, `body`, `ctaLabel`) is set via `textContent` /
  created text nodes — **never** `innerHTML` — so authored content cannot inject
  markup/script.
- **CTA href sanitization:** reuse a shared `isSafeHref` allowing only values
  that `startsWith("/")`, `"http://"`, or `"https://"` (mirrors publicSite). Any
  other scheme (e.g. `javascript:`, `data:`) ⇒ render the CTA **without** an
  `href` (or omit the CTA). Add `rel="noopener noreferrer"` for external links.
- **No PII / no secrets** rendered; nothing logged.

> **Shared boundary `core/server/publicSite.tsx`** is also extended by TASK-483/486/491/493 — additive injection only; reuse the existing forms/booking public-write nonce evaluator, do not invent a competing one-off nonce.

---

## Implementation Pseudocode

```ts
// core/services/popups/runtime/renderPopup.ts
import type { PublicPopup } from "../popupPublicContract";

export type RenderEnv = { document: Document; mountTo?: HTMLElement };

const SAFE = /^(\/(?!\/)|https?:\/\/)/i;
export const isSafeHref = (href: string | null): href is string =>
  typeof href === "string" && SAFE.test(href.trim());

export function renderPopup(popup: PublicPopup, env: RenderEnv) {
  const d = env.document;
  const root = d.createElement("div");
  root.setAttribute("data-coderso-popup", popup.id);
  root.className =
    "coderso-popup coderso-popup--" + popup.settings.placement +
    (popup.settings.showOverlay ? " coderso-popup--overlay" : "");
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", popup.settings.showOverlay ? "true" : "false");

  const panel = d.createElement("div");
  panel.className = "coderso-popup__panel";

  if (popup.content.title) {
    const h = d.createElement("h2");
    h.textContent = popup.content.title;          // textContent ⇒ no XSS
    panel.appendChild(h);
  }
  if (popup.content.body) {
    const p = d.createElement("p");
    p.textContent = popup.content.body;
    panel.appendChild(p);
  }
  if (popup.content.ctaLabel) {
    const cta = d.createElement("a");
    cta.textContent = popup.content.ctaLabel;
    if (isSafeHref(popup.content.ctaHref)) {
      cta.setAttribute("href", popup.content.ctaHref);
      cta.setAttribute("rel", "noopener noreferrer");
    }
    panel.appendChild(cta);
  }

  const close = () => { root.remove(); };
  if (popup.settings.dismissible) {
    const x = d.createElement("button");
    x.type = "button"; x.setAttribute("aria-label", "Close");
    x.textContent = "×";
    x.addEventListener("click", close);
    panel.appendChild(x);
    if (popup.settings.showOverlay) {
      root.addEventListener("click", (e) => { if (e.target === root) close(); });
    }
  }

  root.appendChild(panel);
  (env.mountTo ?? d.body).appendChild(root);
  return { close, element: root };
}
```

**Data flow:** orchestrator (TASK-486-02-L03) calls `renderPopup(popup, { document })`
on trigger fire; the returned `close()` is the dismiss path.

**Error handling:** all content via `textContent`; unsafe hrefs dropped;
non-dismissible popups simply omit the close affordance. Builder never throws on
valid `PublicPopup` input.

**Regression-test shape (Vitest / jsdom):**

- Placement class + overlay class reflect `settings`.
- `title`/`body` rendered as text; an HTML-looking title is escaped (no child
  elements created from it).
- Safe href set; `javascript:`/`data:` href omitted.
- Dismiss button present only when `dismissible`; clicking it / the overlay
  removes the root.

---

## Testing Requirements

- **Vitest ui-integration** (`tests/vitest/ui-integration/popup-render.test.tsx`)
  with jsdom `document`.
- Gates: `bun run lint`, `bun run typecheck`, `bun run test:vitest`.
