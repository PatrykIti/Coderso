# 1135 - Navigation runtime and page editor canvas

Date: 2026-06-06
Version: unreleased
Tasks: TASK-412, TASK-413

## Key Changes

### Navigation Runtime

- Navigation now shares runtime behavior across admin canvas previews and
  published pages for drawer, submenu, active-link, and collapse-on-scroll
  interactions.
- Sticky/collapse Navigation is applied to the outer widget surface so it can
  stay sticky through the page scroll range instead of being trapped by a short
  inner `<nav>` wrapper.
- Public Navigation output registers through the shared widget runtime script
  registry with a standalone render fallback.
- Runtime preview output offsets sticky Navigation below the preview banner.

### Assistant Capability Sync

- Merge resolution added the controlled Advanced assistant `collapse-on-scroll`
  menu behavior so generated Navigation blocks can opt into the now-functional
  `behavior.collapseOnScroll` path without accepting raw/free-form Navigation
  options.

### Page Editor

- Page editor scrolling is owned by editor regions instead of the entire admin
  page shell.
- The center workspace now has a dedicated canvas scroller, wider responsive
  frame, and desktop controls for hiding/restoring the component library and
  appearance panel.
- The editor canvas supports device frame switching and no longer broadly clips
  full-width or sticky widget output.

### Audit And QA

- Ran Claude `--effort xhigh` plus navigation and page-editor subagent read-only
  audits before implementation. Findings drove the sticky surface, runtime
  bridge, scroll ownership, canvas width, and panel visibility fixes.
- Ran direct `playwright-cli` smoke against `coderso-dev-core-host`, creating and
  publishing temporary page `Codex Navigation QA 20260606` at
  `/codex-navigation-qa-20260606`. The smoke verified admin canvas sticky and
  collapse behavior, public sticky and collapse behavior, one shared Navigation
  runtime script, desktop panel hide/show, mobile canvas frame switching, and no
  browser console errors.
- Merge validation on the assistant branch reran `coderso-dev-core-host` on
  `coderso-b.localhost`, verified the Advanced assistant exposes the
  `collapse-on-scroll` menu behavior, created a temporary QA page through admin
  API, confirmed public Navigation emits `data-navigation-collapse-on-scroll`,
  collapses on window scroll, opens the mobile drawer panel, and then deleted the
  temporary page.
- Runtime preview modal was opened, but the local dev probe produced
  `http://http/preview`; public runtime was therefore validated directly on
  `http://coderso-a.localhost:3000`.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/navigationRuntimeScript.test.ts tests/vitest/widgets/navigation.test.tsx tests/vitest/site/publicRenderer.test.tsx`
- `bun run test:vitest -- tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeAdvancedFlow.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeAdvancedOptions.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/assistantSiteBuilderIntakePlanner.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeStaticActions.test.ts`
- `bun test tests/unit/assistant/siteBuilderExecutor.test.ts tests/unit/assistant/actionExecutorService.test.ts tests/unit/assistant/assistantSiteBuilderIntakeDryRun.test.ts`
- `bun run test:vitest -- tests/vitest/ui/page-editor.test.tsx tests/vitest/ui/page-editor-layout-shell.test.tsx tests/vitest/ui-integration/pageBuilder.test.tsx tests/vitest/ui/page-editor-insert-scroll.test.tsx tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/ui/page-editor-slot-insert-flow.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/ui/device-switcher.test.tsx`
- `set -a && source .env && set +a && bun test tests/integration/routes/pages.test.ts tests/integration/runtime/pages-runtime.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- Direct `playwright-cli` admin/public smoke on
  `coderso-dev-core-host`, `http://coderso-a.localhost:5173/admin`, and
  `http://coderso-a.localhost:3000/codex-navigation-qa-20260606`
- Direct merge smoke with `coderso-dev-core-host` on
  `http://coderso-b.localhost:5175/admin` and
  `http://coderso-b.localhost:3001/codex-assistant-collapse-qa-1780829382221`;
  temporary page was deleted after validation.
