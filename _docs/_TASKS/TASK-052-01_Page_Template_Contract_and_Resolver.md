# TASK-052-01: Page Template Contract and Resolver
# FileName: TASK-052-01_Page_Template_Contract_and_Resolver.md

**Priority:** High  
**Category:** CMS/Themes + CMS/Pages  
**Estimated Effort:** Medium  
**Dependencies:** TASK-008-03, TASK-051-01  
**Status:** To Do

---

## Overview

Define and implement a strict contract for page template resolution, so
`settings.template` is not only persisted but also reliable for runtime use.

This task creates the resolver/service layer and default template fallback
without touching final public route wiring yet (handled in TASK-052-02).

---

## Scope

1. Normalize `settings.template` into a safe runtime key.
2. Resolve `type: "page"` template path with current resolver order.
3. Add default core page template component as deterministic fallback.
4. Expose reusable helpers for runtime renderer and admin template options.

---

## Pseudocode

```ts
// core/services/pages/pageTemplateService.ts
export const DEFAULT_PAGE_TEMPLATE_KEY = "landing";

export function normalizePageTemplateKey(input: unknown): string {
  if (typeof input !== "string") return DEFAULT_PAGE_TEMPLATE_KEY;
  const key = input.trim().toLowerCase();
  if (!key) return DEFAULT_PAGE_TEMPLATE_KEY;
  return key.replace(/[^a-z0-9-]/g, "-");
}

export async function resolvePageTemplatePath(params: {
  themeName: string;
  templateKey?: string | null;
  cache?: TemplateCache;
}) {
  const key = normalizePageTemplateKey(params.templateKey);
  return (
    resolveTemplate({ themeName: params.themeName, type: "page", key, cache: params.cache }) ??
    resolveTemplate({ themeName: params.themeName, type: "page", cache: params.cache })
  );
}
```

```tsx
// core/templates/page.tsx
export default function DefaultPageTemplate(props: PageTemplateProps) {
  return <DefaultRuntimePageShell {...props} />;
}
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/pages/pageTemplateService.ts` | new | normalize key + resolver wrappers |
| `core/site/renderPublicPage.tsx` | update types only | export reusable page template props type |
| `core/templates/page.tsx` | new | core fallback page template |
| `core/themes/resolver.ts` | minor update (if needed) | ensure `page-<key>.tsx` lookup stays deterministic |
| `tests/unit/pages/pageTemplateService.test.ts` | new | normalization + fallback tests |
| `tests/unit/themes/resolver.test.ts` | update | explicit page type candidate coverage |

---

## Acceptance Criteria

1. `normalizePageTemplateKey` returns deterministic safe keys.
2. `resolvePageTemplatePath` always returns either a valid path or `null`.
3. Core fallback template exists at `core/templates/page.tsx`.
4. Unit tests cover invalid/empty template keys and fallback behavior.

---

## Testing Requirements

- `bun test tests/unit/pages/pageTemplateService.test.ts`
- `bun test tests/unit/themes/resolver.test.ts`
- `bun --cwd core lint && bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/THEMES_SPEC.md` (page template key normalization rules)
- `_docs/PAGE_MODEL.md` (`settings.template` normalization contract)

---

## Notes

- Keep this task framework-agnostic for template authoring.
- Do not introduce admin UI behavior here (covered by TASK-052-04).
