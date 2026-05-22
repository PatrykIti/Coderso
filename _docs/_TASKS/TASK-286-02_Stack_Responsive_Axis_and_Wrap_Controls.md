# TASK-286-02: Stack Responsive Axis and Wrap Controls

# FileName: TASK-286-02_Stack_Responsive_Axis_and_Wrap_Controls.md

**Priority:** High
**Category:** Widgets + Layout + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-05-02, TASK-286-01, TASK-286
**Status:** To Do

---

## Overview

Add Stack-owned responsive control for axis alignment and wrap behavior from
`REPORT_STACK_WIDGET.md`:

- ISSUE-03: `align` and `justify` are currently global even though Stack
  direction can change per breakpoint;
- ISSUE-04: `wrap` is currently global even though row wrapping is often
  desktop-only.

This leaf must preserve existing scalar payloads:

```json
{ "align": "stretch", "justify": "start", "wrap": false }
```

New responsive payloads may use the same fields with object values so legacy
content remains readable while newer content can target breakpoints:

```json
{
  "align": { "desktop": "center", "tablet": "stretch", "mobile": "stretch" },
  "justify": { "desktop": "between", "tablet": "start", "mobile": "start" },
  "wrap": { "desktop": true, "tablet": true, "mobile": false }
}
```

Read/write contract:

- The normalizer must accept legacy scalar `align`, `justify`, and `wrap`
  values and project them to all three breakpoints at read time.
- Once a Stack editor writes `align`, `justify`, or `wrap`, it must persist the
  full breakpoint object shape so stored payloads stay deterministic after
  interactive edits.
- Compatibility markers `data-stack-align`, `data-stack-justify`, and
  `data-stack-wrap` remain present and must always mirror the resolved mobile
  breakpoint values. New breakpoint markers carry the full responsive truth.

## Scope Boundary

This leaf does not repair variant-to-direction sync, duplicate zero gap tokens,
or Advanced variant controls. It depends on TASK-256-05-02 for final variant
truthfulness.

Do not add arbitrary breakpoint names, custom classes, container query logic, or
non-Stack layout wrappers. Only `desktop`, `tablet`, and `mobile` breakpoints are
in scope because Stack already uses those for `direction` and `gap`.

## Sub-Tasks

- [ ] Define a `StackResponsiveValue<T>` helper type for scalar legacy values
  and object breakpoint values.
- [ ] Extend `stackSchema` to accept either scalar legacy values or
  breakpoint-object values for `align`, `justify`, and `wrap`.
- [ ] Normalize scalar legacy values by projecting the scalar to all
  breakpoints.
- [ ] Normalize sparse breakpoint objects with existing defaults:
  `stretch/start/false`.
- [ ] Add responsive class maps for align, justify, and wrap:
  base mobile class plus `md:*` and `lg:*` breakpoint overrides.
- [ ] Add deterministic runtime markers:
  `data-stack-align-desktop|tablet|mobile`,
  `data-stack-justify-desktop|tablet|mobile`, and
  `data-stack-wrap-desktop|tablet|mobile`.
- [ ] Keep existing `data-stack-align`, `data-stack-justify`, and
  `data-stack-wrap` as compatibility markers that always mirror the resolved
  mobile breakpoint values until docs can retire them.
- [ ] Update Visual and Advanced editors with breakpoint-aware controls.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/stack.tsx` | Add responsive axis/wrap typing, schema, normalization, class maps, and data markers. |
| `core/admin/ui/widgets/editors/StackEditors.tsx` | Replace scalar align/justify/wrap rows with breakpoint-aware controls while preserving simple defaults. |
| `tests/vitest/widgets/stack.test.tsx` | Add scalar legacy, sparse object, class output, and data marker assertions. |
| `tests/vitest/ui/stack-editor-wave.test.tsx` | Add editor assertions for per-breakpoint axis and wrap changes. |
| `tests/unit/widgets/validator.test.ts` | Add schema acceptance/rejection coverage for scalar and object shapes. |
| `_docs/_WIDGETS/STACK.md` | Document responsive axis/wrap data model and compatibility. |

## Implementation Pseudocode

```ts
type StackBreakpoint = "desktop" | "tablet" | "mobile";
type StackResponsiveValue<T> = T | Partial<Record<StackBreakpoint, T>>;

type ResolvedResponsiveValue<T> = Record<StackBreakpoint, T>;

function normalizeResponsiveValue<T extends string | boolean>(
  value: unknown,
  fallback: T,
  isAllowed: (candidate: unknown) => candidate is T
): ResolvedResponsiveValue<T> {
  if (isAllowed(value)) {
    return { desktop: value, tablet: value, mobile: value };
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Partial<Record<StackBreakpoint, unknown>>;
    return {
      desktop: isAllowed(record.desktop) ? record.desktop : fallback,
      tablet: isAllowed(record.tablet) ? record.tablet : fallback,
      mobile: isAllowed(record.mobile) ? record.mobile : fallback,
    };
  }

  return { desktop: fallback, tablet: fallback, mobile: fallback };
}

function StackBlock(...) {
  const align = normalizeResponsiveValue(data.align, "stretch", isStackAlign);
  const justify = normalizeResponsiveValue(data.justify, "start", isStackJustify);
  const wrap = normalizeResponsiveValue(data.wrap, false, isBoolean);

  return (
    <div
      className={joinClasses(
        alignClassMap.mobile[align.mobile],
        alignClassMap.tablet[align.tablet],
        alignClassMap.desktop[align.desktop],
        justifyClassMap.mobile[justify.mobile],
        justifyClassMap.tablet[justify.tablet],
        justifyClassMap.desktop[justify.desktop],
        wrapClassMap.mobile[String(wrap.mobile)],
        wrapClassMap.tablet[String(wrap.tablet)],
        wrapClassMap.desktop[String(wrap.desktop)]
      )}
      data-stack-align={align.mobile}
      data-stack-align-desktop={align.desktop}
      data-stack-align-tablet={align.tablet}
      data-stack-align-mobile={align.mobile}
    />
  );
}
```

Editor data flow:

```tsx
function updateResponsiveAxis<T>(
  field: "align" | "justify" | "wrap",
  breakpoint: StackBreakpoint,
  next: T
) {
  updateValue(value, variant, onChange, (current) => ({
    ...current,
    [field]: {
      ...projectScalarToBreakpoints(current[field], fallbackFor(field)),
      [breakpoint]: next,
    },
  }));
}
```

Error handling:

- Scalar legacy payloads must keep rendering as before.
- Sparse responsive objects fill missing breakpoints with safe defaults.
- Unknown nested breakpoint keys are rejected by schema.
- Unknown values normalize to defaults and must not produce undefined class map
  lookups.
- Interactive editor writes must not leave mixed scalar/object state for the
  touched field after the change is applied.

## Regression Test Shape

- `tests/vitest/widgets/stack.test.tsx`
  - Accept legacy scalar `align`, `justify`, and `wrap`, normalize them to full
    breakpoint objects, and preserve their prior effective runtime behavior.
  - Accept sparse responsive objects, fill missing breakpoints with safe
    defaults, and render deterministic base/`md:`/`lg:` classes plus
    breakpoint-specific `data-stack-*-(desktop|tablet|mobile)` markers.
  - Keep compatibility markers `data-stack-align`, `data-stack-justify`, and
    `data-stack-wrap` equal to the resolved mobile values.
- `tests/vitest/ui/stack-editor-wave.test.tsx`
  - Assert Visual and Advanced expose per-breakpoint align/justify/wrap
    controls.
  - Assert editing one breakpoint rewrites the touched field to a full
    breakpoint object without clobbering direction, gap, or the other responsive
    fields.
  - Assert scalar input values are upgraded to object form after interaction.
- `bun test tests/unit/widgets/validator.test.ts`
  - Accept both scalar legacy values and object breakpoint values.
  - Reject unknown breakpoint keys and unknown token values inside responsive
    objects.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged admin editing and public runtime rendering.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: schema must reject unknown breakpoint keys and
  unknown token values.
- Anti-abuse: no arbitrary CSS, class names, media queries, or inline scripts in
  Stack data.
- Secret handling: no secrets or privileged settings are introduced.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/stack.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/stack-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/widget-template-editor.test.tsx` if
  template editor smoke output changes
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/STACK.md`
- `_docs/WIDGETS.md` only if the responsive scalar/object compatibility pattern
  becomes a shared widget contract
- `_docs/PLAYWRIGHT/REPORT_STACK_WIDGET.md` when this leaf is implemented and
  verified
- `_docs/_TASKS/TASK-286-02_Stack_Responsive_Axis_and_Wrap_Controls.md` status
  updates during execution
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Stack can set align, justify, and wrap independently for desktop, tablet, and
  mobile.
- Existing scalar `align`, `justify`, and `wrap` payloads remain valid and render
  with the same effective behavior.
- Runtime output has deterministic breakpoint markers for axis and wrap values.
- Compatibility markers `data-stack-align`, `data-stack-justify`, and
  `data-stack-wrap` deterministically equal the resolved mobile values.
- Visual and Advanced editors expose responsive axis/wrap controls without
  overwriting unrelated direction or gap fields.
- Editor writes persist full breakpoint objects for touched responsive
  axis/wrap fields.
- Tests prove schema, legacy compatibility, runtime classes, editor updates, and
  data markers.
