---
title: "Users"
audience: "admin"
productArea: "access-control"
language: "en"
keywords:
  - users
  - invite user
  - team access
  - user roles
  - user permissions
---

# Basic

Users is the team-access surface for reviewing people who can enter the admin
workspace, inviting new members, and checking per-user access context. It is
where you filter the user list, inspect an individual user, and start invite or
edit flows.

In the current UI, this route includes:
- page actions:
  `Create Role`, `Invite User`
- filters:
  search, role, status
- a user table,
- a right-side user details panel,
- an invite dialog,
- a role summary section at the bottom of the same route.

# Medium

Use Users when the main question is about people and their access state, not
about the full permissions matrix. The current route is designed for:
- finding a user quickly,
- filtering by role or status,
- seeing whether a user is active, inactive, or pending,
- reviewing one user’s last activity and account controls,
- inviting a new workspace member.

Although the route also shows a compact roles section, this page still behaves
primarily like a user-management workspace rather than a full role-design
screen.

# Instruction

1. Open `Users`.
2. Start with the filters above the table:
   - search by name or email,
   - role filter,
   - status filter.
3. Review the user table in order:
   - user identity,
   - role badges,
   - status,
   - last active,
   - actions.
4. Select the user you actually want to review before opening any edit flow.
5. Use the right-side details panel to review:
   - last active,
   - permissions summary,
   - email notification toggles,
   - account controls,
   - two-factor state.
6. Treat the `Last admin` badge carefully.
7. Use `Invite User` when onboarding a new person.
8. In the invite dialog, fill:
   - full name,
   - email address,
   - workspace role.
9. Review the permissions preview before sending the invitation.
10. Use `Send Invitation` only after the selected role is intentional.
11. Use the row action menu when you need lifecycle actions such as:
    - view profile,
    - edit user,
    - reset password,
    - activate/deactivate,
    - delete.
12. Treat the bottom `Roles` section as supporting context for user assignment,
    not as the full permissions-matrix replacement.

Use this safe user-management order when you want fewer access mistakes:
1. Find the right user.
2. Review their current status and roles.
3. Inspect the details panel.
4. Edit or invite only after the role choice is clear.

# Advanced

- Role badges in the table are useful operational signals, but they are still a
  summary. The right-side details panel gives better context before changes.
- `Last admin` is a high-signal warning. It indicates that deleting or changing
  that account has broader access implications.
- The route mixes user management with a lightweight role summary because daily
  access work often needs both contexts together.
- Invitation preview is more than a convenience. It helps stop obvious
  over-permissioning before the user is even created.
- The route’s details panel exposes notification and two-factor context, which
  makes it stronger than a simple members list.

# Troubleshooting

- You cannot find a user:
  clear the filters and search by email before assuming the account is missing.
- A user has the wrong access:
  review the assigned role badges and the permissions summary before changing the
  account.
- The action feels risky:
  check whether the account is marked `Last admin`.
- The invite role feels uncertain:
  use the permissions preview to compare expected capabilities before sending.

# Decision Guide

- Choose invite vs edit:
  invite when the person is new to the workspace; edit when the account already
  exists.
- Choose deactivate vs delete:
  deactivate when access should stop but the account should remain; delete only
  when the user should be removed entirely.
- Choose Users vs Roles Matrix:
  use Users for person-level management; use Roles Matrix when the real change is
  about permission design itself.

# Checklist

1. Confirm the correct user is selected.
2. Confirm status and role filters are intentional.
3. Review the details panel before changing access.
4. Confirm invitation role choice before sending.
5. Treat `Last admin` state carefully.

# Security

- Users is an authenticated admin surface and should only be used by
  high-trust administrators responsible for workspace access.
- Invitation, status changes, password resets, and deletion are access-control
  actions, not just profile edits.
- Be especially careful with last-admin and high-privilege accounts, because
  those changes can affect the whole workspace’s recoverability.
