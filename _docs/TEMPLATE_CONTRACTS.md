# Template Contracts

Canonical reference for template resources used by Coderso solution kits.

## Scope

This document covers:
- widget templates (`widget_templates` table),
- solution kit template seeds (`core/services/templates/templateInstaller.ts`),
- deterministic install/rollback behavior.

## Widget Template Persistence

`widget_templates` fields:
- `id` (uuid)
- `name`
- `description`
- `category`
- `status` (`draft|published`)
- `blocks` (widget block JSON array)
- `settings` (`WidgetTemplateSettings`, currently layout settings)

Template edits remain available in regular template editor after kit install.

## Solution Kit Template Seed Contract

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

Seed sources:
- explicit `resourceBlueprint.templates[]` (if defined),
- derived from `resourceBlueprint.pages[]` where `page.template` is set.

Explicit blueprint seed overrides page-derived seed for the same key.

## Collision + Idempotency Rules

Ownership marker:
- Installer appends marker to description:
  - `[nextless-kit-template:<kitId>:<templateKey>]`

Install behavior:
- Existing managed template found by marker:
  - same payload -> `noop`
  - different payload -> `update`
- No managed template:
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
