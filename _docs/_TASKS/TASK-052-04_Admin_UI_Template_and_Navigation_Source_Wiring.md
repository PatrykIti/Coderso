# TASK-052-04: Admin UI Template and Navigation Source Wiring
# FileName: TASK-052-04_Admin_UI_Template_and_Navigation_Source_Wiring.md

**Priority:** High  
**Category:** Admin/UI + API  
**Estimated Effort:** Medium  
**Dependencies:** TASK-052-01, TASK-052-03  
**Status:** To Do

---

## Overview

Align admin editing UX with runtime behavior:
- page template select should be runtime-real (theme-driven),
- navigation source UX should expose pages-based mode,
- no hardcoded options that drift from runtime.

---

## Scope

1. Replace hardcoded page template select options with API-driven options.
2. Expose active-theme template options from backend.
3. Expose navigation source option `Pages index (showInNav pages)` in editor.
4. Keep current UX principle:
- Wizard: minimal,
- Visual: main editing surface,
- Advanced: technical settings only.

---

## Pseudocode

```ts
// server route
GET /pages/template-options -> {
  themeName: "default",
  templates: [
    { key: "landing", label: "Landing" },
    { key: "about", label: "About" },
    { key: "custom", label: "Custom" }
  ]
}
```

```tsx
// PageSettingsDrawer
const options = usePageTemplateOptions();
<Select value={template} onValueChange={setTemplate}>
  {options.templates.map((item) => (
    <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>
  ))}
</Select>
```

```tsx
// Navigation Visual editor
<Select value={linksSource} onValueChange={setLinksSource}>
  <SelectItem value="manual">Manual links</SelectItem>
  <SelectItem value="menu">Menu</SelectItem>
  <SelectItem value="pages">Pages index</SelectItem>
</Select>
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/server/routes/pageRoutes.ts` | add endpoint | `GET /pages/template-options` |
| `core/services/pages/pageTemplateService.ts` | extend | provide list of available page template options |
| `core/admin/services/pagesClient.ts` | add client method | fetch template options |
| `core/admin/ui/pages/PageEditor.tsx` | load options | pass to drawer |
| `core/admin/ui/pages/PageSettingsDrawer.tsx` | replace hardcoded template list | show dynamic + fallback UI states |
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | add `pages` source UX | helper copy for showInNav behavior |
| `tests/integration/routes/pages.test.ts` | update | assert new endpoint registration |
| `tests/unit/ui/page-settings-drawer.test.tsx` | update | dynamic options rendering assertions |
| `tests/unit/ui/widget-template-editor.test.tsx` | update if needed | navigation editor source option visibility |

---

## Acceptance Criteria

1. Page settings template select is driven by backend options.
2. Selected template key persists exactly as runtime key.
3. Navigation editor exposes `pages` source with clear user-facing copy.
4. UI handles empty template options gracefully (fallback option list).

---

## Testing Requirements

- `bun test tests/integration/routes/pages.test.ts`
- `bun test tests/unit/ui/page-settings-drawer.test.tsx`
- `bun test tests/unit/ui/widget-template-editor.test.tsx`
- `bun --cwd core lint && bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/CMS_API.md` (new `GET /pages/template-options` contract)
- `_docs/PAGE_MODEL.md` (template key source and expected values)
- `_docs/CMS_SPEC.md` (admin/runtime parity rules for page settings)
