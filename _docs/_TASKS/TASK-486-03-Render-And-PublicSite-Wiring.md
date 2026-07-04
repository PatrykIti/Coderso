# TASK-486-03: Render Component + publicSite Wiring
# FileName: TASK-486-03-Render-And-PublicSite-Wiring.md

**Parent Task:** TASK-486
**Priority:** High
**Category:** Engagement / Popups / Public Site
**Estimated Effort:** Medium
**Dependencies:** TASK-486-02 (orchestrator emits the show decision)
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Turn an emitted "show popup" decision into actual on-page UI and ship it on every
public response.

- **L01 Render component** — a dependency-free DOM builder that renders the
  popup for each placement (`center` / `bottom_right` / `top_banner`), with
  overlay, dismiss control, and a CTA whose `href` is sanitized with the same
  safe-URL rules the public site already uses (no `javascript:` URLs). Authored
  pure (injectable `document`) so it is Vitest/jsdom testable.
- **L02 Runtime injection** — assemble the engine (TASK-486-02) + render (L01)
  into a single IIFE via `buildPopupRuntimeScript()` and inject it before the
  final `</body>` at the `handlePublicRequest` response boundary so it loads on
  pages (v1 + v2), entries, posts, and templates. The script is path-agnostic
  (it fetches `/api/popups?path=<location>` at runtime), so it is **cache-safe**
  and can be injected into HTML that the site cache stores.

---

## Sub-Tasks

| ID | Title | Lane | Status |
| --- | --- | --- | --- |
| TASK-486-03-L01 | Popup render component (DOM builder + safe CTA href) | Vitest | ⏳ To Do |
| TASK-486-03-L02 | Runtime script assembly + publicSite injection | Bun | ⏳ To Do |

---

## Dependencies

- TASK-486-02 engine modules (must be pure/self-contained to serialize).
- `core/server/publicSite.tsx` (`handlePublicRequest`, the response paths for
  page/entry/template/preview), `core/site/renderPublicPage.tsx` &
  `core/site/renderPublicEntry.tsx` (document composers — note `renderPublicEntry`
  has no body-script seam, which is why injection happens at the response
  boundary).
- Safe-href precedent: the `startsWith("/" | "http://" | "https://")` guard
  already in `core/server/publicSite.tsx`.

---

## Testing Requirements

- **L01** → Vitest `ui-integration` (jsdom): placement classes, overlay,
  dismiss, escaped title/body, rejected unsafe CTA href.
- **L02** → Bun (`tests/integration/routes/*`): the served public HTML contains
  exactly one injected runtime script before `</body>`, is well-formed, and the
  injection survives the site cache.
