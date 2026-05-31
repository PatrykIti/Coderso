---
title: "Themes"
audience: "admin"
productArea: "themes"
language: "en"
keywords:
  - themes
  - tokens
  - templates
  - presentation
  - admin ui theme
  - theme profiles
---

# Basic

Admin UI Theme is the visual control surface for the admin panel itself. It is
where you manage theme templates, create or edit theme profiles, and activate
which profile currently drives the admin experience.

In the current UI, this screen includes:
- top actions:
  `Export JSON`, `New Template`
- template search,
- template cards with token counts,
- profiles section with activation state,
- `New Profile` and `Activate` actions.

# Medium

Use this screen when the admin panel needs a coherent visual system rather than
one-off local styling fixes. The current UI clearly separates two responsibilities:
- templates:
  reusable token sets
- profiles:
  activation layer that points the admin UI at one chosen template

The local runtime currently shows:
- two templates:
  `Default`, `Dark Theme`
- profiles section with:
  `Light` marked `ACTIVE`
  `Dark` marked `CURRENT`
  and the footer summary `Active profile: Light`

This makes the workflow clear:
- manage templates,
- manage profiles,
- activate the right profile.

# Instruction

1. Open `Admin UI Theme`.
2. Start in the templates area.
   Review:
   - template name,
   - token count,
   - edit action.
3. Use the search field when the template list grows.
4. Use `New Template` when a new admin visual baseline is needed.
5. Use `Export JSON` when the current theme definition needs to be reviewed,
   shared, or versioned externally.
6. Move to `Profiles`.
7. In the profiles section, review:
   - profile name,
   - bound template,
   - whether it is `ACTIVE`,
   - whether it is marked `CURRENT`.
8. Use `New Profile` when you want a new activation layer without overwriting an
   existing one.
9. Use `Activate` when you want the admin UI to switch to another profile.
10. Treat activation as the final step, not the first step.
    First confirm the template is correct, then switch the profile.

Use this safe theme-management order when you want fewer visual regressions:
1. Review templates.
2. Edit or create the needed template.
3. Review profiles.
4. Activate the intended profile only after the template is ready.

# Advanced

- Templates and profiles are not the same thing. Templates define token sets;
  profiles decide which template is currently active.
- Export is useful for governance and review. Treat theme configuration as a
  managed system artifact, not just a UI convenience.
- A global admin theme issue should be fixed here first, not patched in
  unrelated screens.
- Activation should be treated as a controlled visual rollout. Even if the
  change is “just theme”, it affects the entire admin workspace.
- Token count is a quick signal of template completeness or complexity, but not a
  substitute for actual review.

# Troubleshooting

- The admin panel still looks wrong after local UI edits:
  review the active profile and underlying template before patching screens one
  by one.
- The wrong visual variant is active:
  check which profile is marked `ACTIVE` and whether `Activate` has been used on
  the intended one.
- A template exists but does not affect the UI:
  the profile may not be pointing at it yet.
- Theme changes feel risky:
  export the current JSON first so the current state is easier to audit.

# Decision Guide

- Choose template edit vs profile activation:
  edit templates to change the design system; use profile activation to switch
  which template is live.
- Choose new template vs new profile:
  use a new template for a new token set; use a new profile when you want a new
  activation state on top of existing templates.
- Choose screen-level tweak vs theme-level fix:
  use the theme layer when the issue is truly global across the admin UI.

# Checklist

1. Confirm the right template exists.
2. Confirm the target profile points at the intended template.
3. Confirm export/review needs are handled before broad activation.
4. Activate the new profile only when the template is ready.

# Security

- Admin UI Theme is an authenticated admin surface and should only be used by
  users with theme/configuration permissions.
- Activation changes the admin experience globally, so it should be treated as a
  controlled configuration change rather than a casual styling tweak.
