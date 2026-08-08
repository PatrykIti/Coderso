# Solution Kits

Reference for Coderso `Solution Kits` starter packs, manifest contract, and installer behavior.

## Catalog

Each kit ships with starter resources:
- `content type` with schema + taxonomy defaults,
- `form` with fields + settings defaults,
- `pages` with starter block composition + SEO defaults,
- `menus` with seeded menu items,
- for previously shipped kits only, frozen hidden legacy template seeds consumed
  by the transitional compatibility writer. New kits use Page Templates and
  domain-owned sections/blocks and must not add `WidgetBlock[]` seeds.

| Kit ID | Pages | Form | Content Type | Menus |
|---|---|---|---|---|
| `automotive-workshop` | `/`, `services`, `contact` | `service-request` | `service` | `primary`, `footer` |
| `medical-clinic` | `/`, `doctors`, `contact` | `appointment-request` | `doctor` | `primary`, `footer` |
| `beauty-salon` | `/`, `offers`, `contact` | `beauty-booking` | `offer` | `primary`, `footer` |
| `local-service-business` | `/`, `services`, `portfolio`, `testimonials`, `faq`, `about`, `contact` | `service-inquiry` | `service-offer`, `service-project` | `primary`, `footer` |
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
    widgets: string[];   // retained manifest alias; historical block ids only
    templates: string[]; // retained manifest alias; frozen legacy seed ids only
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
- legacy `widgets`/`templates` summaries are inferred only to decode and roll
  back already shipped manifests; they do not enable a module or authoring UI,
- manifest overrides (if provided by catalog object) merge into generated includes.

## Admin UI Behavior

Selected kit can act as an admin-side focus preference:
- active kit selection is persisted client-side in admin UI,
- `AdminShell` can narrow the `Coderso` sidebar to modules declared by the active kit,
- active kit focus expands module dependencies from the Advanced module registry,
- content kits keep `Screens` visible from their current `engine` + `entries` /
  `custom-screens` domain dependencies; the legacy `widgets` id is not an
  authoring dependency,
- no active kit means full default `Coderso` navigation remains visible,
- `Solution Kits` stays visible even when kit gating is active so the user can switch kits.

Recommended module scope after audit:

| Kit ID | Recommended Advanced modules |
|---|---|
| `automotive-workshop` | `engine`, `entries`, `custom-screens`, `forms`, `listings`, `booking`, `reviews` |
| `medical-clinic` | `engine`, `entries`, `custom-screens`, `forms`, `listings`, `booking`, `reviews` |
| `beauty-salon` | `engine`, `entries`, `custom-screens`, `forms`, `listings`, `booking`, `reviews` |
| `local-service-business` | `engine`, `entries`, `custom-screens`, `forms`, `listings`, `reviews` |
| `services-directory` | `engine`, `entries`, `custom-screens`, `forms`, `listings`, `filters`, `search` |
| `small-ecommerce` | `engine`, `entries`, `custom-screens`, `forms`, `listings`, `filters`, `commerce`, `reviews` |

## Installer Phases

`/solution-kits/:id/apply` uses two phases:
1. Core resource install (`solutionKitsInstallService`): `content_type`, `form`, `page`, `menu`.
2. Transitional legacy phase (`templateInstaller`): maintain only the frozen
   hidden seeds already present in shipped kit manifests, with deterministic
   rollback. It is migration debt, not a current template-authoring contract;
   no new seed definitions may enter it.

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

## Full-site package executor

TASK-547 adds a strict file-driven executor alongside the catalog installer. It
reuses the exported Solution Kit run ledger but does not add a catalog entry or
admin/public endpoint. `FullSitePackageV1` supports ten native resource kinds,
closed `{ ref, key }` references, bounded DAG validation, deterministic
create/update/no-op/conflict planning, and saga compensation.

Natural-key equality alone never proves ownership. Update and rollback require a
successful, non-rolled-back run whose snapshot carries the same native ID.
Pages, entries, detail pages, and menus publish only after their draft state is
complete; shell settings apply last. Exact CLI usage and limits are documented
in `docs/develop/full-site-packages.md`.

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
