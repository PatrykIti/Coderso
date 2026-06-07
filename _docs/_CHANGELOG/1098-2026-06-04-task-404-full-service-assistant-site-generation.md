# 1098 - TASK-404 full-service assistant site generation

Date: 2026-06-04
Version: Unreleased
Tasks: TASK-404, TASK-404-01, TASK-404-02, TASK-404-03, TASK-404-04, TASK-404-05, TASK-404-06, TASK-404-07, TASK-404-08

## Key Changes

### Assistant full-service generation

- Added an executable `service-business-full-site` assistant path for a real
  service-business website with home, services, portfolio, about, process,
  references, contact, detail routes, public sample content, navigation,
  footer, lead form, and SEO.
- Added public page shell blocks so generated pages render navigation and
  footer links, not just stored menu resources.
- Removed generated footer legal links that pointed at uncreated legal pages;
  full-service footer links now point only at generated public pages unless
  legal pages are explicitly added later.
- Kept media import as an explicit trusted-asset gate instead of accepting raw
  provider media.

### Reliability and execution

- Fixed full-service provider-path routing so stale planning-state inspection
  cannot override the local full-service blueprint.
- Fixed same-plan menu rerun idempotency so repeat execute runs update/noop
  existing links instead of failing on duplicate menu item ids.
- Kept full-service catalog pages compatible with shell blocks and content-list
  composition.
- Surfaced launch-readiness checks in the admin action review and execution
  result UI.

### QA and docs

- Added regression coverage for planner/provider routing, full-service page
  shell content, catalog shell composition, launch readiness, and menu
  idempotency.
- Added `tests/integration/server/assistantFullServiceSitePublicRuntime.test.ts`
  to keep the public-runtime rendering contract physically covered.
- Playwright CLI E2E passed after `coderso-dev-core-host` restart on
  `http://coderso-b.localhost:5175/admin/` and
  `http://coderso-b.localhost:3001/`: 49-action plan, dry-run ready, execute
  failed count zero, public pages/detail pages/navigation/contact/mobile checks
  passed, dead legal footer links were absent, launch-readiness UI was visible,
  and page/console errors were zero.
- Updated TASK-404 task files and board status for parent and all leaves.
