# Solution Kits

Reference for Coderso `Solution Kits` starter packs, manifest contract, and installer behavior.

## Catalog

Each kit ships with starter resources:
- `content type` with schema + taxonomy defaults,
- `form` with fields + settings defaults,
- `pages` with starter block composition + SEO defaults,
- `menus` with seeded menu items,
- derived `template seeds` (from page templates) for widget template library.

| Kit ID | Pages | Form | Content Type | Menus |
|---|---|---|---|---|
| `automotive-workshop` | `/`, `services`, `contact` | `service-request` | `service` | `primary`, `footer` |
| `medical-clinic` | `/`, `doctors`, `contact` | `appointment-request` | `doctor` | `primary`, `footer` |
| `beauty-salon` | `/`, `offers`, `contact` | `beauty-booking` | `offer` | `primary`, `footer` |
| `services-directory` | `/`, `directory`, `submit` | `directory-inquiry` | `provider` | `primary`, `footer` |
| `small-ecommerce` | `/`, `catalog`, `contact` | `custom-order` | `catalog-page` | `primary`, `footer` |

## Manifest Contract

Every catalog kit exposes normalized `manifest` (`core/services/kits/kitManifest.ts`):

```ts
type SolutionKitManifest = {
  id: string;
  title: string;
  vertical: string;
  includes: {
    contentTypes: string[];
    entries: string[];
    widgets: string[];
    templates: string[];
    forms: string[];
    menus: string[];
  };
  requiredModules: string[];
  optionalModules?: string[];
  postInstallTasks?: string[];
};
```

Normalization rules:
- arrays are deduplicated, trimmed, sorted,
- `vertical` defaults from first business type (`_` -> `-`),
- `widgets` are inferred from page block `type`,
- `templates` are inferred from page `template` and `page.data.settings.template`,
- manifest overrides (if provided by catalog object) merge into generated includes.

## Admin UI Behavior

Selected kit can act as an admin-side focus preference:
- active kit selection is persisted client-side in admin UI,
- `AdminShell` can narrow the `Coderso` sidebar to modules declared by the active kit,
- no active kit means full default `Coderso` navigation remains visible,
- `Solution Kits` stays visible even when kit gating is active so the user can switch kits.

Recommended module scope after audit:

| Kit ID | Recommended Coderso modules |
|---|---|
| `automotive-workshop` | `engine`, `entries`, `widgets`, `forms`, `booking`, `reviews` |
| `medical-clinic` | `engine`, `entries`, `widgets`, `forms`, `booking`, `reviews` |
| `beauty-salon` | `engine`, `entries`, `widgets`, `forms`, `booking`, `reviews` |
| `services-directory` | `engine`, `entries`, `widgets`, `forms`, `listings`, `filters`, `search` |
| `small-ecommerce` | `engine`, `entries`, `widgets`, `forms`, `commerce`, `reviews` |

## Installer Phases

`/solution-kits/:id/apply` uses two phases:
1. Core resource install (`solutionKitsInstallService`): `content_type`, `form`, `page`, `menu`.
2. Template seed install (`templateInstaller`): upsert widget templates with deterministic collision strategy.

Template collision strategy:
- ownership marker is appended to description: `[nextless-kit-template:<kitId>:<key>]`,
- if managed template exists -> `update`/`noop`,
- if name collision on unmanaged template -> deterministic suffix (`Name`, `Name (2)`, `Name (3)`, ...).

Run metadata:
- apply run `options.manifest` stores manifest snapshot,
- `options.kitInstaller.templateInstallSummary` stores template phase summary,
- `options.kitInstaller.templateRollbackPlan` stores rollback actions for template phase.

## Rollback

`/solution-kits/:id/rollback` now executes:
1. template rollback from source run `templateRollbackPlan`,
2. core resource rollback from `solution_kit_install_items` snapshots.

Core rollback behavior (unchanged):
- restore nested snapshots for `update`,
- remove created resources for `create`,
- includes nested content: taxonomies, form fields, page SEO, menu items.

## QA Matrix (2026-02-20)

| Suite | Command | Result |
|---|---|---|
| Core lint | `bun --cwd core lint` | Pass |
| Core types | `bun --cwd core lint:types` | Pass |
| Kits unit set | `bun test tests/unit/kits` | Pass (`9 pass`, `5 skip`) |
| Template installer DB-guarded | `bun test tests/unit/templates/templateInstaller.test.ts` | Skip (`0 pass`, `2 skip`) in current runtime |
| Admin client | `bun test tests/unit/admin/solutionKitsClient.test.ts` | Pass (`6 pass`) |
| UI page + routes | `bun test tests/unit/ui/solution-kits-page.test.tsx tests/integration/routes/solutionKitsRoutes.test.ts` | Pass (`4 pass`) |

Notes:
- DB-dependent kit suites remain skip-guarded when DB prerequisites are unavailable.
