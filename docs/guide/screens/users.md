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

What you see depends on your admin permissions. With `users:read` you can
review users. With `roles:read` you can review roles and permission summaries.
If you only have one of those permissions, the other half of the screen is
shown as unavailable instead of silently loading or submitting forbidden data.

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
   The advanced filter icon is intentionally unavailable; use these visible
   filters for the current Users list.
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
   - read-only email notification state,
   - account controls,
   - two-factor state.
6. Treat the `Last admin` badge carefully.
7. Use `Invite User` when onboarding a new person.
8. In the invite dialog, fill:
   - full name,
   - email address,
   - workspace role.
9. Review the permissions preview before sending the invitation.
10. Use `Send Invitation` only after the selected role is intentional. The
    invited user receives a single-use set-password email and starts as
    `pending`.
11. Use the row action menu when you need lifecycle actions such as:
    - view profile,
    - edit user,
    - reset password,
    - activate/deactivate,
    - delete.
12. Review the confirmation dialog before destructive or high-risk actions:
    - deactivate user,
    - delete user,
    - delete role,
    - duplicate a role with sensitive permissions,
    - reactivate a user when role risk is high or cannot be verified.
13. Treat the bottom `Roles` section as supporting context for user assignment,
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
- `Reset password` sends a single-use set-password email. It does not reveal or
  cache the token in the browser.
- Deactivate, delete, delete-role, and high-risk duplicate actions require an
  explicit confirmation that names the target user or role.
- The route’s details panel exposes read-only notification and two-factor
  context, which makes it stronger than a simple members list without implying
  local notification preference writes.
- Missing role-read access hides role filters and role names/details. Missing
  user-read access hides the user table and invite entry points.

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
- Invite or reset cannot send email:
  ask a settings admin to configure Settings -> Email before retrying.
- Role details are unavailable:
  ask for `roles:read` if your work requires role names, filters, or permission
  summaries.
- The user table is unavailable:
  ask for `users:read` if your work requires person-level access review.

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
- The route uses the current admin's permission snapshot. Read-only and
  partial-read states are intentional, and write actions stay unavailable until
  the matching write permission is present.
- Invitation, status changes, password resets, and deletion are access-control
  actions, not just profile edits.
- Admins do not type another user's password. Invite and reset both use
  TTL-bound, single-use set-password emails.
- Be especially careful with last-admin and high-privilege accounts, because
  those changes can affect the whole workspace’s recoverability.
