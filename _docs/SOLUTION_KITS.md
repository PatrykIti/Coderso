# Solution Kits

Reference for Coderso `Solution Kits` starter packs and installer behavior.

## Catalog

Each kit ships with a complete starter pack:
- `content type` with schema + taxonomy defaults,
- `form` with fields + settings defaults,
- `pages` with starter block composition + SEO defaults,
- `menus` with seeded menu items.

| Kit ID | Pages | Form | Content Type | Menus |
|---|---|---|---|---|
| `automotive-workshop` | `/`, `services`, `contact` | `service-request` | `service` | `primary`, `footer` |
| `medical-clinic` | `/`, `doctors`, `contact` | `appointment-request` | `doctor` | `primary`, `footer` |
| `beauty-salon` | `/`, `offers`, `contact` | `beauty-booking` | `offer` | `primary`, `footer` |
| `services-directory` | `/`, `directory`, `submit` | `directory-inquiry` | `provider` | `primary`, `footer` |
| `small-ecommerce` | `/`, `catalog`, `contact` | `custom-order` | `catalog-page` | `primary`, `footer` |

## Blueprint Contract

`resourceBlueprint` uses typed nested resources:

```ts
type SolutionKitResourceBlueprint = {
  contentTypes: Array<{
    slug: string;
    name: string;
    schema?: Record<string, unknown>;
    taxonomy?: {
      categories?: Array<{ name: string; slug?: string }>;
      tags?: Array<{ name: string; slug?: string }>;
    };
  }>;
  forms: Array<{
    slug: string;
    name: string;
    status?: "draft" | "published";
    description?: string;
    successMessage?: string;
    successRedirectUrl?: string;
    submissionAccess?: "public" | "internal";
    settings?: Record<string, unknown>;
    fields?: Array<{
      id?: string;
      type: string;
      label: string;
      name: string;
      required?: boolean;
      orderIndex?: number;
      settings?: Record<string, unknown>;
    }>;
  }>;
  pages: Array<{
    slug: string;
    title: string;
    status?: "draft" | "published";
    template?: string;
    data?: Record<string, unknown>;
    seo?: {
      title?: string;
      description?: string;
      canonicalUrl?: string;
      robots?: string;
    };
  }>;
  menus: Array<{
    location?: string;
    name: string;
    items?: Array<{
      key: string;
      label: string;
      href?: string;
      pageSlug?: string;
      parentKey?: string;
      orderIndex?: number;
      settings?: Record<string, unknown>;
    }>;
  }>;
};
```

## Installer Strategy

`apply`/`dry-run`/`rollback` is implemented by `solutionKitsInstallService` with per-resource snapshots.

- `content_type`:
  - key: `slug`,
  - syncs schema + taxonomy (`content_taxonomies`, `content_terms`).
- `form`:
  - key: `slug`,
  - syncs base metadata + replaces `form_fields` set.
- `page`:
  - key: normalized `slug`,
  - syncs page payload + upserts page SEO (`seo_documents`, `targetType=page`).
- `menu`:
  - key: `location` (fallback `name`),
  - resolves `pageSlug -> pageId`, replaces `menu_items` set.

### Idempotency

Reapplying the same kit does not create duplicates. If effective state is unchanged, operation is stored as `noop`.

### Rollback

Rollback reads `beforeSnapshot` and:
- restores nested resources for `update`,
- deletes created resources for `create`,
- restores/deletes linked page SEO as part of page rollback path.

## QA Matrix (2026-02-20)

| Suite | Command | Result |
|---|---|---|
| Core lint | `bun --cwd core lint` | Pass |
| Core types | `bun --cwd core lint:types` | Pass |
| Kits unit set | `bun test tests/unit/kits` | Pass (`5 pass`, `5 skip`) |
| Kits DB-dependent subset | `set -a; source .env; set +a; bun test tests/unit/kits/installService.test.ts tests/unit/kits/schema.test.ts` | Skip (`0 pass`, `5 skip`) |
| Admin client | `bun test tests/unit/admin/solutionKitsClient.test.ts` | Pass (`6 pass`) |
| UI pages | `bun test tests/unit/ui/solution-kits-page.test.tsx tests/unit/ui/ai-site-wizard.test.tsx` | Pass (`6 pass`) |
| Integration routes/UI | `bun test tests/integration/routes/solutionKitsRoutes.test.ts tests/integration/ui/setup-wizard.test.tsx` | Pass (`4 pass`) |

Notes:
- DB-dependent kit suites are intentionally `skip` when DB preconditions are not met in runtime (`canConnect + hasTable` guard in tests).
