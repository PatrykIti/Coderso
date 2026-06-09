# TASK-418-07-L02: Real Admin And Front Playwright Smoke
# FileName: TASK-418-07-L02-Real-Admin-And-Front-Playwright-Smoke.md

**Parent Subtask:** TASK-418-07
**Priority:** High
**Category:** QA / Playwright / Pages
**Estimated Effort:** Medium
**Dependencies:** TASK-418-07-L01
**Status:** ⏳ To Do

---

## Overview

Run real browser validation with the helper server and `playwright-cli`. This
must prove that the admin Page editor and the public frontend work together
after the task, not just that unit tests pass.

---

## Implementation Pseudocode

```ts
async function runTask418PlaywrightSmoke() {
  const server = start("coderso-dev-core-host");
  const browser = launchPlaywrightCli({ envFromDotEnv: true });
  await loginToAdmin(browser);
  const page = await createPage("task-418-playwright-smoke");
  await insertSection("hero");
  await insertBlock("heading");
  await insertBlock("button");
  await editSelectedBlock({ label: "See services", href: "/services" });
  await insertContainerWithNestedBlocks();
  await editStyles({ background: "#ffffff", opacity: 0.9, radius: 16 });
  await savePreviewPublish(page);
  await assertPublicRuntime(page.slug, {
    noConsoleErrors: true,
    noPageErrors: true,
    nestedBlocksVisible: true,
    stylesVisible: true
  });
  stop(server);
}
```

Expected data flow:

- Load `.env` credentials.
- Start `coderso-dev-core-host`.
- Use `playwright-cli` for admin create/edit/save/preview/publish.
- Verify public runtime DOM, screenshots or pixel checks where useful, and
  browser console/page errors.

Error handling:

- If a smoke fails, keep server logs and browser error summaries in the task
  closeout.
- If helper server cannot start, record port/process failure and rerun after
  cleanup.

Regression-test shape:

- Real admin canvas selection and toolbar controls work.
- Public frontend reflects the saved/published document.

---

## Security Contract

- **Endpoint visibility:** smoke uses normal admin internal routes and public
  read-only routes only.
- **Auth model:** login through real admin session using `.env` credentials.
- **RBAC:** smoke user must have normal Pages permissions.
- **CSRF:** admin writes use the real browser/admin client CSRF flow.
- **Rate-limit bucket:** use normal dev buckets; do not bypass route middleware.
- **Validation:** publish must persist a normalized v2 document.
- **Anti-abuse controls:** do not log credentials or secrets from `.env`.

---

## Testing Requirements

- `coderso-dev-core-host`
- `playwright-cli`
- Verify admin edit/save/publish and public frontend parity.

---

## Documentation Updates Required

- TASK-418 validation evidence and screenshots/paths where recorded.
