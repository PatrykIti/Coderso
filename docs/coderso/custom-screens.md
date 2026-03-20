---
title: "Coderso Custom Screens"
audience: "admin"
productArea: "coderso-custom-screens"
language: "en"
keywords:
  - custom screens
  - bindings
  - record workflow
  - admin screens
---

# What Is It

Custom Screens let you design focused admin experiences for records by combining
widgets, bindings, and record workflows into a purpose-built editing surface.

# When To Use

Use Custom Screens when the default Entries editor is too generic and a team
needs a dedicated workflow for a specific record type or business process.

# Step By Step

1. Start from a content model that already exists in Engine.
2. Create a custom screen and bind it to the relevant record type.
3. Add widgets and field bindings to shape the editing experience.
4. Use the record routes and preview diagnostics to confirm the screen is truly
   usable for real data.

# Examples

- A booking team gets a screen focused on availability and operational fields
  instead of all record data at once.
- A directory manager uses a custom screen to streamline provider moderation.
- A commerce team exposes only the fields needed by a specialized internal
  workflow.

# Common Mistakes

- Building a custom screen before the data model is stable.
- Treating widget composition as enough without validating bindings and record
  routes.
- Expecting a custom screen to fix unclear field semantics coming from the
  underlying schema.
