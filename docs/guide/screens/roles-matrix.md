---
title: "Roles Matrix"
audience: "admin"
productArea: "access-control"
language: "en"
keywords:
  - roles matrix
  - permissions matrix
  - role permissions
  - access control
  - role editor
---

# Basic

Roles Matrix is the permission-design surface for deciding what each role can
see or do across the admin workspace. It is where you review the permission
catalog, toggle access role by role, and create a new role with an explicit
scope.

Access is permission-aware:
- accounts with `roles:read` can open, inspect, and search the matrix,
- accounts with `roles:read` but not `roles:write` see a read-only matrix,
- accounts without `roles:read` see access denied before role data is loaded.

In the current UI, this route includes:
- permission search,
- `Add Role` for accounts with `roles:write`,
- bulk role toggles for accounts with `roles:write`,
- the permissions matrix,
- an unsaved-changes footer with `Cancel` and `Save changes` when editing is
  allowed,
- a role-creation dialog for accounts with `roles:write`.

# Medium

Use Roles Matrix when the real change is about permission structure, not about
one person’s account. The current route is designed for:
- scanning the full permission catalog by grouped area,
- comparing role access side by side,
- toggling one permission for one role when you have `roles:write`,
- toggling whole role columns in bulk when you have `roles:write`,
- creating a new role when the existing set is not enough and you have
  `roles:write`.

This route is the right place for role design and permission governance. It is
deeper and more structural than the `/users` route.

# Instruction

1. Open `Roles Matrix`.
2. Start with the permission search when you know the capability you want to
   review.
3. Review the summary above the matrix:
   - number of roles,
   - number of permissions.
4. Use the bulk role toggles only when you really intend a broad role-level
   change.
5. Review the matrix by permission group rather than jumping between unrelated
   rows.
6. For each row, review:
   - permission label,
   - description,
   - role columns.
7. If your account is read-only, use the matrix for inspection only. Disabled
   controls explain that `roles:write` is required.
8. Toggle permissions carefully, one role at a time, when making targeted
   changes and your account has `roles:write`.
9. Watch the footer state:
   it explicitly tells you whether there are unsaved permission changes.
10. Use `Cancel` when the current draft should be discarded.
11. Use `Save changes` only when the whole permission set is coherent.
12. Use `Add Role` when the current role catalog does not fit the access model.
13. In `Create new role`, fill:
    - role name,
    - description,
    - permission scope.
14. Use `Select all` only for a true full-access role.
15. Read the `Full access enabled` warning carefully before saving an admin-like
    role.
16. Use `Create role` only after the name, description, and permission scope all
    match the intended responsibility boundary.

Use this safe role-design order when you want fewer access mistakes:
1. Search the permission.
2. Review the relevant group.
3. Change the smallest necessary set.
4. Save only after reviewing the whole role impact.
5. Create a new role only when editing an existing one would blur boundaries.

# Advanced

- The matrix is optimized for comparison, not for casual editing. Treat it as a
  governance surface.
- Bulk toggles are powerful and should be used sparingly, because they can
  flatten role distinctions quickly.
- Search is especially useful when the permission catalog grows, but grouped
  review still matters because permission context is important.
- Read-only mode still supports search and comparison, but it cannot dirty the
  matrix locally or open a submit-ready role-creation flow.
- `Full access` is a strong security boundary. The dialog explicitly warns that
  it should be reserved for admin-level roles only.
- The footer’s unsaved-changes signal is operationally important because this
  screen encourages experimentation before commit.

# Troubleshooting

- The matrix feels overwhelming:
  start with search, then review one permission group at a time.
- Two roles look too similar:
  compare their column toggles directly before creating a redundant new role.
- A change feels risky:
  leave it unsaved and use `Cancel` until the role impact is clear.
- Add Role, bulk toggles, checkboxes, or Save changes are unavailable:
  your account can inspect roles, but editing requires `roles:write`.
- You think a role needs everything:
  use `Select all` only after checking whether a narrower role would still work.

# Decision Guide

- Choose edit existing role vs create new role:
  edit when the responsibility boundary stays the same; create a new role when a
  truly different boundary is needed.
- Choose targeted toggles vs bulk toggles:
  use targeted toggles for small access changes; use bulk only for intentional
  broad role changes.
- Choose Roles Matrix vs Users:
  use Roles Matrix for permission design; use Users when assigning or reviewing
  one person’s access.

# Checklist

1. Confirm the right role or permission group is selected for review.
2. Confirm any toggle change is intentional.
3. Review the unsaved-changes footer before leaving the route.
4. Confirm full-access roles are truly necessary.
5. Save changes deliberately.

# Security

- Roles Matrix is an authenticated admin surface and should only be used by
  high-trust administrators responsible for access-control design.
- `roles:read` is enough for inspection. `roles:write` is required for role
  creation, permission toggles, bulk toggles, and saving matrix changes.
- Permission changes here can widen or restrict access across the whole admin
  workspace.
- Full-access roles should be rare and explicitly justified, because this screen
  can change the blast radius of every other surface in the product.
