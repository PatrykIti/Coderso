---
title: "Plugin Store"
audience: "admin"
productArea: "store"
language: "en"
keywords:
  - plugin store
  - plugins
  - extensions
  - package
---

# Basic

Plugin Store is the catalog surface for discovering and comparing plugins. It is
where you browse available extensions, compare installed vs store items, and
select one plugin for deeper inspection in the details view.

In the current UI, the store route includes:
- tabs:
  `Store`, `Installed`
- plugin cards with status markers,
- selected-plugin summary panel,
- install/update state information,
- an `Installed` management table with per-plugin `Manage` actions.

# Medium

Use Plugin Store when the built-in product surfaces are not enough and you need
an extension, integration package, or marketplace-backed capability.

The current catalog route answers:
- what plugins exist,
- which ones are already installed,
- which ones are official, verified, or community-sourced,
- which plugin should be opened for deeper evaluation.

The selected-plugin summary on the same screen gives an intermediate layer
between browsing cards and installed-plugin operations. The dedicated
plugin-details route is reached from the `Installed` tab via `Manage`.

# Instruction

1. Open `Plugin Store`.
2. Start on the `Store` tab when you want to browse available plugins.
3. Switch to `Installed` when you want to review what is already active in the
   environment.
4. Scan the plugin cards for:
   - plugin name,
   - short description,
   - source badge such as `Verified`, `Official`, or `Community`,
   - version,
   - install count,
   - installed state.
5. Select a plugin card to load its summary panel.
6. In the summary panel, review:
   - category tags,
   - security score,
   - latest update,
   - install count,
   - version state,
   - update/install action.
7. Switch to `Installed` when you need lifecycle controls for a plugin that is
   already present in the environment.
8. In `Installed`, review:
   - plugin name,
   - status,
   - update policy,
   - last updated date,
   - `Manage` action.
9. Use `Manage` to open the dedicated plugin-details route for deeper review.
10. Treat `Update plugin`, `Manage`, and other lifecycle actions as operational
    decisions, not just browsing actions.

Use this safe catalog-review order when you want fewer extension mistakes:
1. Browse the store.
2. Compare against installed state.
3. Review the summary panel.
4. Switch to `Installed` for current operational state.
5. Open `Manage` only for serious candidates or active extensions.

# Advanced

- The store route is a triage surface. It should help narrow choices before you
  spend time on deeper plugin evaluation.
- Installed state and source reputation are not cosmetic badges; they are strong
  operational signals.
- Security score and update status should be treated as part of plugin fitness,
  not as optional metadata.
- A plugin with strong feature fit but weak governance or upgrade posture may be
  a worse choice than a simpler built-in alternative.

# Troubleshooting

- The plugin sounds useful but still feels uncertain:
  use the selected-plugin summary panel first, then move to `Installed` and
  `Manage` if deeper operational review is needed.
- Too many candidate plugins look similar:
  compare source reputation, install count, version state, and security score
  before deciding.
- A plugin is already installed but still appears in the store:
  that is expected when the catalog is also acting as an update/management
  surface.

# Decision Guide

- Choose `Store` vs `Installed`:
  use `Store` for discovery; use `Installed` for lifecycle review of current
  extensions.
- Choose summary panel vs full details:
  use the summary panel for quick triage; use `Installed` plus `Manage` for
  serious operational review.
- Choose built-in feature vs plugin:
  compare native product fit before assuming a plugin is the best path.

# Checklist

1. Confirm the extension solves a real gap.
2. Confirm its source reputation is acceptable.
3. Confirm its version/update state is acceptable.
4. Review summary data before opening full details.
5. Only then move to install/update decisions.

# Security

- Plugin Store is an authenticated admin surface and should only be used by
  users with extension-management permissions.
- Treat install/update decisions as operational changes with security and
  governance impact.
- Do not use marketplace convenience as a reason to skip extension review.
