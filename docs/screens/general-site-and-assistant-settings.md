---
title: "General, Site, and Assistant Settings"
audience: "admin"
productArea: "settings"
language: "en"
keywords:
  - settings
  - site settings
  - assistant settings
  - general settings
---

# What Is It

General, Site, and Assistant Settings are the main configuration screens for
site identity, routing, runtime behavior, and assistant capabilities.

# When To Use

Use these screens when changing the site's baseline configuration, preparing a
new environment, or enabling/disabling assistant behavior for the whole admin.

# Step By Step

1. Use General Settings for broad site identity and shared runtime fields.
2. Use Site Settings for site-level behavior such as routes and related setup
   controls.
3. Use Assistant Settings to manage assistant availability, launcher behavior,
   source root expectations, reindex policy, and optional LLM settings.
4. Treat these screens as environment-level controls, not casual content tools.

# Examples

- A new workspace enables the assistant only after the official `docs/` corpus
  is ready to seed into DB.
- A launch owner adjusts site-level routing and then rechecks previews and
  menus.
- An admin sets an assistant launcher avatar from a shared media asset.

# Common Mistakes

- Turning on assistant runtime before the official docs corpus has been seeded
  to the database.
- Mixing environment configuration changes with content editing tasks.
- Forgetting that changes here can affect many other screens immediately.
