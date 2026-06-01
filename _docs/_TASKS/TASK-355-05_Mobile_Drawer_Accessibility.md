# TASK-355-05: Mobile Drawer Accessibility
# FileName: TASK-355-05_Mobile_Drawer_Accessibility.md

**Priority:** High
**Category:** Admin UI + Users + Accessibility
**Estimated Effort:** Small
**Dependencies:** TASK-355, TASK-360-05
**Status:** To Do

---

## Overview

Repair the mobile Users details sheet semantics so it exposes a dialog title
and description to assistive technology and no longer triggers Radix dialog
warnings.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_USERS.md`
- `core/admin/ui/users/UserDetailsDrawer.tsx`
- Shared sheet/drawer primitives used by admin UI

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/users/UserDetailsDrawer.tsx` | Add `SheetTitle` and `SheetDescription`, using visually hidden text if visible headings already exist. |
| Shared drawer tests or Users UI tests | Assert the mobile open path has title/description and no console warning. |
| Playwright Users audit fixture | Re-open mobile details drawer and capture clean a11y evidence. |

## Implementation Pseudocode

```tsx
<SheetContent aria-describedby={descriptionId}>
  <SheetHeader>
    <SheetTitle>{user.email}</SheetTitle>
    <SheetDescription id={descriptionId}>
      User profile, roles, sessions, and available account actions.
    </SheetDescription>
  </SheetHeader>
  <UserDetailsContent user={user} />
</SheetContent>
```

Data flow:

- The selected user still owns the drawer body.
- The title uses stable user identity when available and a fallback when the
  drawer opens during loading.
- Description summarizes the drawer purpose without duplicating long visible
  content.

Error handling:

- Loading and not-found states still render a valid title/description pair.
- If the visual design already contains equivalent headings, use visually
  hidden primitives to satisfy semantics without duplicate visible text.
- Focus returns to the opening control when the drawer closes.

## Security Contract

- Endpoint visibility: none; this is UI-only unless tests reveal an existing
  fetch bug.
- Auth model/RBAC/CSRF/rate-limit: unchanged.
- Reject unknown validation: unchanged.
- Anti-abuse: unchanged.
- Secret handling: title/description must not expose secrets or privileged
  session identifiers.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest UI test that opens the mobile details sheet and asserts
  accessible name/description.
- Console-warning regression test for the Radix title/description warning.
- Playwright mobile pass for `/admin/users` details drawer.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_USERS.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Users mobile details sheet has a valid accessible title and description in
  every state.
- The Radix dialog warning no longer appears during mobile drawer open.
- Visual layout remains consistent with the existing admin drawer pattern.

