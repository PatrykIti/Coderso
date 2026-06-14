# TASK-464-04-L02: Extract Registry Option Provider And Media Lookup Contract
# FileName: TASK-464-04-L02-Extract-Registry-Option-Provider-And-Media-Lookup-Contract.md

**Parent Subtask:** TASK-464-04
**Priority:** High
**Category:** Pages / Admin UI / Floating Panel
**Estimated Effort:** Medium
**Dependencies:** TASK-464-04-L01
**Status:** ⏳ To Do

---

## Overview

Extract dynamic registry option lookup and media URL resolution behind injected
browser-safe provider contracts before moving registry panel rendering. This
prevents reusable panel modules from importing Page Editor admin clients, cache
clients, media clients, or host-specific loaders.

Hard constraint: no UX/UI changes. Preserve current dynamic option ordering,
labels, empty/loading/failure behavior, media preview URL behavior, and Menu
Design editor behavior.

---

## Sub-Tasks

- [ ] Define `RegistryOptionProvider` and `AuthoringMediaLookupProvider`
      contracts in the Page Editor host/registry boundary.
- [ ] Move current Page Editor dynamic option loading behind the provider.
- [ ] Move media URL resolution behind the media lookup provider.
- [ ] Inject providers from the Page Editor/Page Template Editor/Menu Design
      hosts; reusable toolbar/panel modules receive only provider callbacks.
- [ ] Add import-boundary tests so provider contracts stay client-free.

---

## Implementation Pseudocode

```ts
export type RegistryOptionProviderRequest = {
  controlId: string;
  source: PageEditorControlOptionSource;
  context: PageEditorControlContext;
};

export type RegistryOptionProvider = {
  resolveOptions(request: RegistryOptionProviderRequest): Promise<readonly PageEditorControlOption[]>;
};

export type AuthoringMediaLookupProvider = {
  resolveMediaUrl(mediaId: string): string | null;
};

export function createPageEditorRegistryProviders(deps: PageEditorHostDeps): PageEditorRegistryProviders {
  return {
    options: {
      async resolveOptions(request) {
        const options = await deps.loadControlOptions(request);
        return normalizeRegistryControlOptions(options);
      }
    },
    media: {
      resolveMediaUrl(mediaId) {
        return deps.mediaUrlLookup(mediaId);
      }
    }
  };
}
```

Expected data flow:

- Page Editor shell owns client/cache-backed loading.
- Reusable registry panel receives provider callbacks and normalized option
  results only.
- Media lookup returns safe URL strings or `null`; it never exposes media
  records, cache state, credentials, or backend-only fields.

Error handling:

- Provider failures use the current bounded option failure/empty states.
- Unknown option sources return an empty option list and do not mutate drafts.
- Missing media ids resolve to `null` and preserve the current missing-preview
  behavior.

Regression-test shape:

- Dynamic option provider preserves labels/order for representative controls.
- Media lookup preserves preview URL resolution behavior.
- Import guard proves reusable toolbar/panel modules do not import admin
  clients or media/cache clients.

---

## Security Contract

- Provider contracts are browser-safe and must not import admin API clients,
  cache clients, route helpers, runtime services, server modules, storage
  adapters, provider SDKs, secrets, or privileged settings.
- Provider results must normalize option labels as text and media URLs through
  the authoring URL/media policy from TASK-464-06.
- No raw HTML, `dangerouslySetInnerHTML`, or raw document patches.
- No new endpoints, auth, RBAC, CSRF, or rate-limit behavior.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-editor-control-ui-model.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
