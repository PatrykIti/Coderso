---
title: "Plugin Details"
audience: "admin"
productArea: "store"
language: "en"
keywords:
  - plugin details
  - plugin permissions
  - plugin changelog
  - plugin settings
---

# Basic

Plugin Details is the deeper review and management surface for one installed
plugin. It shows versioning, status, permissions, change history, and
configuration-related detail before you decide how the extension should stay in
the environment.

In the current UI, the page includes:
- plugin identity and current status,
- header controls such as `Auto-update` and `Uninstall`,
- detail tabs:
  `Overview`, `Permissions`, `Changelog`, `Settings`,
- compatibility and install information,
- overview cards for screenshots, plugin information, and support,
- links such as `View website` and `Documentation`.

# Medium

Use Plugin Details when a plugin is already installed and you need to decide
whether it is acceptable operationally. This is where you move from summary
management into deeper review.

The current detail route helps answer:
- what this plugin does,
- whether it is enabled,
- which version is installed vs available,
- whether it is compatible,
- what permissions it needs,
- how it has changed over time.

# Instruction

1. Open a plugin from the store catalog.
   In the current UI flow, switch to `Installed` and use `Manage`.
2. Start in the header area and confirm:
   - plugin name,
   - enabled/installed state,
   - current version,
   - publisher.
3. Review the header controls before changing anything:
   - `Auto-update`
   - `Uninstall`
4. Use the top tabs in order:
   - `Overview`
   - `Permissions`
   - `Changelog`
   - `Settings`
5. In `Overview`, review:
   - description,
   - key features,
   - screenshots,
   - compatibility,
   - install date,
   - license,
   - support/documentation actions.
6. Use `Permissions` when you need a clearer governance view before rollout.
7. Use `Changelog` when the version jump matters operationally.
8. Use `Settings` when the plugin exposes configurable options and you need to
   understand what would have to be maintained after installation.
9. Use `View website` and `Documentation` when the page alone is not
   enough for a confident decision.
10. Treat `Auto-update`, `Uninstall`, and other update-related actions as
    operational changes, not casual clicks.

Use this safe review order when you want fewer extension mistakes:
1. Confirm plugin fit.
2. Confirm compatibility.
3. Review permissions.
4. Review changelog.
5. Review settings burden.
6. Only then decide on lifecycle actions.

# Advanced

- A plugin can look functionally useful and still be a poor operational fit if
  its permissions or maintenance expectations are too broad.
- Changelog review matters more when the plugin touches security, data flow, or
  critical admin surfaces.
- Installed version and latest available version should be treated as part of
  change management, not just as a passive detail label.
- Documentation links are part of the evaluation workflow, especially when the
  plugin adds concepts the team does not already operate.

# Troubleshooting

- The plugin sounds useful but still feels risky:
  review permissions and changelog before making the decision emotional or
  marketing-driven.
- The plugin is installed but you are not sure whether to update:
  compare installed vs latest version and inspect the changelog first.
- The plugin looks compatible but might still be high-maintenance:
  review settings/configuration burden, not only feature list.
- The plugin seems stable but update behavior is unclear:
  review the `Auto-update` header control and the settings burden together.

# Decision Guide

- Choose catalog vs details:
  use the catalog for discovery; use details for real evaluation.
- Choose install/update vs hold:
  proceed only after compatibility, permissions, and changelog all look
  acceptable.
- Choose uninstall vs leave installed:
  uninstall only when the plugin should no longer remain part of the system’s
  operational surface.

# Checklist

1. Confirm the plugin solves a real gap.
2. Confirm compatibility with the current core version.
3. Review permissions.
4. Review changelog.
5. Review settings/configuration burden.
6. Use documentation links when needed.
7. Only then decide on install/update/uninstall actions.

# Security

- Plugin Details is an authenticated admin surface and should only be used by
  users with the appropriate extension-management permissions.
- Permission review is a security task, not just documentation reading.
- Updates and uninstalls should be treated as operational changes that may alter
  runtime behavior, data flow, or admin capabilities.
- Auto-update should be enabled only when the team accepts the plugin’s update
  trust model and operational blast radius.
