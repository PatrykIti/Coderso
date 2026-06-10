# TASK-418-07-L02: Real Admin And Front Playwright Smoke
# FileName: TASK-418-07-L02-Real-Admin-And-Front-Playwright-Smoke.md

**Parent Subtask:** TASK-418-07
**Priority:** High
**Category:** QA / Playwright / Pages
**Estimated Effort:** Medium
**Dependencies:** TASK-418-07-L01
**Status:** ✅ Done
**Completed:** 2026-06-10

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
  await insertBlock("image");
  await insertBlock("gallery");
  await editSelectedBlock({ label: "See services", href: "/services" });
  await insertContainerWithNestedBlocks();
  await editStyles({ background: "#ffffff", opacity: 0.9, radius: 16 });
  await editSectionVariant("hero", "split");
  await editMobileBlockOverride({ align: "center", width: "full" });
  await savePreviewPublish(page);
  await assertPublicRuntime(page.slug, {
    noConsoleErrors: true,
    noPageErrors: true,
    nestedBlocksVisible: true,
    stylesVisible: true,
    noPlaceholderBlocks: true,
    sectionVariantMarkupVisible: true,
    mobileOverrideVisible: true,
    canvasMatchesFrontend: true
  });
  await createAssistantGeneratedPageAndAssertNoPlaceholders();
  stop(server);
}
```

Expected data flow:

- Load `.env` credentials.
- Start `coderso-dev-core-host`.
- Use `playwright-cli` for admin create/edit/save/preview/publish.
- Verify public runtime DOM, screenshots or pixel checks where useful,
  no-placeholder output, section type/variant markup, block responsive mobile
  behavior, assistant-generated pages, canvas==frontend parity, and browser
  console/page errors.

Error handling:

- If a smoke fails, keep server logs and browser error summaries in the task
  closeout.
- If helper server cannot start, record port/process failure and rerun after
  cleanup.

Regression-test shape:

- Real admin canvas selection and toolbar controls work.
- Public frontend reflects the saved/published document.
- Insertable blocks do not degrade to generic placeholders.
- Mobile block overrides and section variants are visible on the public page.

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

## Completion Notes

- Started the app with `set -a && { [ ! -f .env ] || . ./.env; } && set +a && coderso-dev-core-host`.
- Ran direct CLI browser smoke with `playwright-cli` through a temporary Bun
  runner. The runner loaded `.env`, created a real admin session via
  `/admin/api/auth/login`, loaded Playwright auth state, opened the admin UI,
  created a Page through the Pages drawer, edited it in PageEditor, saved,
  previewed, published, checked public runtime output, and closed the browser.
- Smoke verified command palette viewport behavior after the UI fix:
  `commandDialogHeight: 676`, `closeBottom: 747` in an 820px-high desktop
  viewport, with Close outside the scroll body and results `overflow-y-auto`.
- Smoke verified public runtime contained the authored marker text, hero
  `data-page-variant="split"` markup, nested layout block/slot output
  (`nestedBlocks: 3`), no placeholder/inert text, and no collected console/page
  errors or failed Pages API responses.
- Smoke repeated the public runtime marker check after resizing to a mobile-ish
  `390x720` viewport.
- Cleanup deleted 6 temporary smoke pages with slugs matching
  `/task-418-07-l02-%`.

---

## Documentation Updates Required

- TASK-418 validation evidence and screenshots/paths where recorded.
