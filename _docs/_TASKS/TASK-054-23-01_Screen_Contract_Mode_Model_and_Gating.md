# TASK-054-23-01: Screen Contract, Mode Model, and Gating
# FileName: TASK-054-23-01_Screen_Contract_Mode_Model_and_Gating.md

**Priority:** High  
**Category:** CMS/Content + API + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-22-01, TASK-054-22-02, TASK-054-22-05  
**Status:** To Do

---

## Overview

Obecny kontrakt `custom screen` ma tylko `contentTypeId`, `blocks`, `bindings`, `status`
i `showInSidebar`. To za malo, bo UI nie potrafi odroznic:
- ekranu, ktory tylko zawęża liste rekordow (`collection-only`),
- ekranu, ktory ma read-only dashboard/preview (`dashboard`),
- ekranu, ktory faktycznie daje dedykowany editor rekordu (`editor`).

Ten task ma zdefiniowac jawny capability contract i spiac go przez schema/service/routes/UI.

## Scope

1. Ustalic capability model ekranu i jego source of truth.
2. Zdecydowac, czy to jest:
   - persisted `mode`,
   - persisted `intent` + derived capabilities,
   - albo czysto derived contract z `blocks/bindings/widget surface`.
3. Ustalic czy potrzebny jest `schemaVersion=2`.
4. Dopisac helper typu `resolveCustomScreenCapabilities(screen)`.
5. Podpiac ten helper pod admin routes/client payloady i gating linkow/CTA.

## Sub-Tasks

1. Zaprojektowac finalny capability/mode contract i back-compat policy.
2. Rozszerzyc schema/service normalization i admin API validation.
3. Dopisac shared helper capabilities i przepiac na niego clients/UI.
4. Zamknac testy schema/service/routes dla nowego kontraktu.

## Security Contract

- Visibility: `internal`
- Auth model: admin session
- RBAC: `content:read` dla read/list/detail; `content:write` dla create/update/delete screen definitions
- CSRF: wymagany dla admin write (`POST/PATCH/DELETE /admin/api/custom-screens*`) zgodnie z istniejacym internal admin contract
- Rate-limit bucket: `admin-write` dla mutacji, `admin-read` dla read/list/detail
- Validation: strict reject-unknown payloads dla create/update; jawne enum/schema validation dla nowego mode/capability contract
- Anti-abuse controls: brak public write; wyłącznie internal session path

## Architecture

Rekomendowany model:

```ts
type CustomScreenMode = "collection-only" | "dashboard" | "editor";

type CustomScreenCapabilities = {
  mode: CustomScreenMode;
  hasBlocks: boolean;
  hasReadableBindings: boolean;
  hasWritableBindings: boolean;
  hasPreviewableWidgets: boolean;
};
```

Preferowane jest trzymanie `intent`/`schemaVersion` w definicji i liczenie finalnych
capabilities w jednym helperze, zamiast rozlewania heurystyk po komponentach UI.

## Files to Create / Change

- `core/services/customScreens/customScreenSchemas.ts`
- `core/services/customScreens/customScreenService.ts`
- `core/services/customScreens/*` (new helper for capabilities/mode)
- `core/server/routes/customScreenRoutes.ts`
- `core/admin/services/customScreensClient.ts`
- `core/admin/ui/custom-screens/*`
- `tests/integration/routes/customScreensRoutes.test.ts`
- `tests/vitest/admin/custom-screen-schemas.test.ts`
- `tests/vitest/customScreens/customScreenService.test.ts`

## Pseudocode

```ts
export function resolveCustomScreenCapabilities(screen: CustomScreenRecord) {
  const hasBlocks = screen.blocks.length > 0;
  const hasReadableBindings = screen.bindings.some((binding) => binding.mode !== "write");
  const hasWritableBindings = screen.bindings.some((binding) => binding.mode !== "read");
  const hasPreviewableWidgets = screen.blocks.some(isScreenPreviewableWidget);

  if (!hasBlocks) return { mode: "collection-only", ...flags };
  if (!hasWritableBindings) return { mode: "dashboard", ...flags };
  return { mode: "editor", ...flags };
}
```

## Acceptance Criteria

1. Jest jeden wspoldzielony helper rozstrzygajacy mode/capabilities ekranu.
2. Routes, clients i UI nie duplikuja lokalnych heurystyk `bindings.length === 0`.
3. Payload `custom screen` jest schema-first i reject-unknown po rozszerzeniu kontraktu.
4. Po zmianie kontraktu stare rekordy `custom_screens` maja bezpieczny adapter/back-compat.

## Testing Requirements

- Bun route coverage dla `customScreensRoutes` z create/update payload validation
- Vitest dla schema normalization/back-compat
- Vitest dla service helpera `resolveCustomScreenCapabilities`

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CODERSO_MODULES.md`
