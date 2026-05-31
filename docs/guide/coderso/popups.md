---
title: "Popups"
audience: "admin"
productArea: "coderso-engagement"
language: "en"
keywords:
  - popups
  - engagement
  - trigger
  - targeting
  - lifecycle
---

# Basic

Popups is the admin surface for creating and managing popup campaigns. It
controls popup lifecycle state, trigger rules, targeting, message content, and
display behavior.

In the current UI, the popup module includes:
- a popup list route with search and status tabs,
- a popup editor route for trigger, targeting, content, and display settings,
- lifecycle actions such as publish, move to draft, archive, delete, and save
  changes.

# Medium

Use Popups when you want to control when a campaign-style overlay appears and
what it says, without mixing that logic into page content directly. This module
is best for lifecycle-managed engagement flows rather than one-off inline page
copy.

The current popup workflow breaks down into two parts:
- list route:
  review all popup campaigns, filter by lifecycle state, and open a popup for
  editing
- editor route:
  configure the actual campaign behavior and content

The local dataset currently shows one published popup, which makes it possible
to verify both list and editor behavior in a realistic way.

# Instruction

1. Open `Coderso > Popups`.
2. Start on the list route.
3. Use the search field when you know the popup name or slug.
4. Use the status tabs to narrow the list:
   - `All`
   - `Published`
   - `Draft`
   - `Archived`
5. Review each row for:
   - popup name,
   - slug,
   - status,
   - trigger type,
   - updated date.
6. Open a popup from the list to edit it.
7. In the editor, work top to bottom.
8. Start with `Identity`:
   - `Name`
   - `Slug`
   - `Status`
9. Move to `Trigger`:
   - choose `Trigger type`
   - set trigger-specific values such as delay
10. Move to `Targeting and Frequency`:
    - include paths
    - exclude paths
    - audience
    - frequency strategy
    - cooldown
11. Move to `Content`:
    - title
    - template id
    - body
    - CTA label
    - CTA URL
12. Move to `Display Settings`:
    - placement
    - dismissible
    - overlay
13. Use top actions intentionally:
    - `Back to list`
    - `Discard`
    - `Publish` or `Move to draft`
    - `Save changes`

Use this safe authoring order when you want fewer popup mistakes:
1. Name the popup clearly.
2. Set lifecycle status intentionally.
3. Define trigger.
4. Define targeting and frequency.
5. Define content and CTA.
6. Review display settings.
7. Save changes.
8. Publish only when the popup is actually ready.

# Advanced

- Trigger choice is a product decision, not just a technical toggle. `Time
  delay` and other trigger types change the user’s interruption profile.
- Include/exclude paths should be treated as route targeting rules, not as
  casual notes. A small targeting mistake can put a popup on the wrong journey.
- Frequency strategy matters as much as the content itself. A good message shown
  too often becomes harmful.
- `Template ID` hints at reuse or alignment with a broader design system. Use it
  consistently when popup campaigns should share a structure.
- Popups should support a main journey, not compete with it. If a popup becomes
  the primary way a user discovers an action, the underlying journey may still
  be weak.

# Troubleshooting

- A popup appears on the wrong route:
  review include/exclude paths first.
- The popup is too aggressive:
  review trigger type, frequency strategy, and cooldown.
- The popup should be visible but is not:
  check status and audience before debugging anything deeper.
- The CTA feels wrong:
  review title, body, CTA label, and CTA URL as one message package.
- You want the popup to stop without deleting it:
  move it back to draft or archive it, depending on lifecycle intent.

# Decision Guide

- Choose publish vs move to draft:
  publish when the campaign should be active; move to draft when it should be
  disabled without deletion.
- Choose archive vs delete:
  archive when history matters; delete only when the popup should be removed
  entirely.
- Choose broad targeting vs narrow targeting:
  start narrow when the campaign is high-impact; broaden only after validation.
- Choose popup vs page content:
  use a popup for contextual attention capture; use page content when the
  message belongs in the main journey itself.

# Checklist

1. Confirm popup name and slug.
2. Confirm status is intentional.
3. Confirm trigger settings are correct.
4. Confirm include/exclude paths are correct.
5. Confirm audience and frequency are correct.
6. Confirm title, body, and CTA are coherent.
7. Confirm display settings are intentional.
8. Save changes.
9. Publish only when the popup is truly ready.

# Security

- Popups is an authenticated admin surface and should only be used by users with
  the appropriate campaign/configuration permissions.
- CTA URLs and route targeting should be reviewed carefully before publish,
  because mistakes immediately affect user journeys.
- Do not embed secrets, provider keys, or privileged operational values into
  popup content.
