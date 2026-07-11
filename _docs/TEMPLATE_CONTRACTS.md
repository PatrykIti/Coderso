# Template Contracts

Compatibility reference for legacy hidden template rows still touched by
already shipped Coderso solution kits. Current reusable authoring uses Page
Templates and Page/domain sections/blocks.

## Scope

This document covers only:
- retained `widget_templates` storage,
- the frozen transitional writer in `core/services/templates/templateInstaller.ts`,
- deterministic rollback for existing installed/shipped seeds.

It must not be used to add a new `WidgetBlock[]` seed, widget-template authoring
surface, or generic preset/template contract.

## Widget Template Persistence

`widget_templates` fields:
- `id` (uuid)
- `name`
- `description`
- `category`
- `status` (`draft|published`)
- `blocks` (widget block JSON array)
- `settings` (`WidgetTemplateSettings`, currently layout settings)

TASK-420-03 Ring 2 outcome: the widget-template admin editor, routes, preview
target, and cached clients are deleted (the reusable-template product surface
is Page Templates, Page v2-only, in `page_templates`). The `widget_templates`
and `widget_template_revisions` tables STAY because live consumers remain:
solution-kit seeding below, the `template-section` core widget on custom
screens/detail pages, and existing rows. Kit-seeded templates are no longer
editable through an admin surface; `widgetTemplateService` and the
settings-backed `widgets.templateCategories` registry remain data-layer-only
for the installer. The storage drop is an explicit follow-up task.

## Frozen Legacy Solution Kit Seed Shape

This type documents payloads already present in shipped manifests. New kit
authoring must emit Page Templates or domain-owned sections/blocks and must not
add an explicit or derived seed to this path.

```ts
type TemplateInstallSeed = {
  key: string;
  name: string;
  description?: string | null;
  category?: string | null;
  status?: "draft" | "published";
  blocks?: WidgetBlock[];
  settings?: WidgetTemplateSettings | null;
};
```

Legacy source decoding (existing manifests only): explicit
`resourceBlueprint.templates[]` overrides a row historically derived from
`resourceBlueprint.pages[]`. Do not add either source in new manifests.

## Collision + Idempotency Rules

Ownership marker:
- Installer appends marker to description:
  - `[nextless-kit-template:<kitId>:<templateKey>]`

Compatibility behavior for a frozen shipped seed:
- Existing managed template found by marker:
  - same payload -> `noop`
  - different payload -> `update`
- No managed template for that already shipped ownership marker:
  - create with desired `name`
  - if name already used by unmanaged template, resolve deterministic suffix:
    - `Name`, `Name (2)`, `Name (3)`, ...

Result:
- repeated install is idempotent,
- unmanaged templates are never overwritten silently.

## Rollback Contract

Template install phase stores rollback plan:

```ts
type TemplateInstallRollbackAction = {
  key: string;
  operation: "create" | "update";
  templateId: string;
  beforeSnapshot: TemplateInstallSnapshot | null;
};
```

Rollback semantics:
- `create` -> delete created template by id,
- `update` -> restore `beforeSnapshot` via update (or recreate when row no longer exists).

## API Surface (Internal)

This contract is used only via internal admin endpoints:
- `POST /admin/api/solution-kits/:id/apply`
- `POST /admin/api/solution-kits/:id/rollback`

No public template install endpoint is exposed.
