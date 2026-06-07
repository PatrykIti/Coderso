---
title: "Coderso Solution Kits"
audience: "admin"
productArea: "solution-kits"
language: "en"
keywords:
  - solution kits
  - starter packs
  - site builder
  - llm guide
  - setup
  - reviewed site builder
---

# Basic

Solution Kits are packaged starting points for common business shapes. In the
current UI, they combine:
- selectable kit cards,
- recommended module guidance,
- an `Open LLM Guide` entry point for reviewed site-builder intake,
- a selected-kit details panel with manifest and checklist information.

This surface is for choosing the right baseline before you start building in
depth. It is a guided setup and recommendation layer, not the final destination
for all later content and UX work.

# Medium

Use Solution Kits when you want a strong starting point and a guided rollout
instead of building the full structure from zero. The current local UI includes
kits such as:
- Automotive Workshop
- Medical Clinic
- Beauty Salon
- Local Service Business
- Local Services Directory
- Small E-commerce

Each kit card exposes:
- short description,
- recommended modules,
- highlights,
- selection state.

Once a kit is selected, the right side of the screen adds two more important
surfaces:
- `Open LLM Guide`
- `Selected kit details`

Together they help you decide:
- whether the kit matches the business model,
- which modules should be active,
- what content/resources are included,
- what still needs to be done after installation.

The reviewed LLM Guide site-builder intake owns setup work: structured answers,
review summary, typed plan, dry-run, then execute. It is not an unrestricted
site generator and does not run arbitrary mutations outside the supported typed
actions.

# Instruction

1. Open `Coderso > Solution Kits`.
2. Start by scanning the kit cards rather than choosing by label alone.
3. For each candidate kit, review:
   - short description,
   - recommended modules,
   - highlights.
4. Select the kit that is closest to the real business model.
5. Review `Selected kit details` before treating the choice as final.
6. In the details panel, check:
   - business fit,
   - manifest vertical,
   - includes,
   - required modules,
   - recommended modules,
   - optional modules when present,
   - post-install checklist.
7. Use `Open LLM Guide` when you want the assistant to build a reviewed site
   plan from your business/site answers.
8. In LLM Guide, complete the intake and final review before dry-run/execute.
9. Treat the post-install checklist as real work that still needs to happen
   after the kit is selected or executed.

Use this safe selection order when you want fewer setup mistakes:
1. Compare kit cards.
2. Select the closest match.
3. Review details panel carefully.
4. Open LLM Guide for reviewed site-builder intake.
5. Treat the kit as a baseline, not a finished product.

# Advanced

- Recommended modules are one of the most important signals in the current UI.
  They shape later workflow availability and should weigh more than marketing
  labels alone.
- The details panel is not decorative. It exposes manifest and checklist data
  that should influence whether the kit is truly a fit.
- The reviewed LLM Guide site-builder intake is useful for structure and
  decision support, but it does not remove the need for later content, schema,
  template, and settings work.
- Kit execution remains a reviewed setup action. Booking resources,
  checkout/payment setup, and solution-kit refinements that depend on installed
  kit resource context stay gated until those contracts are implemented.
- A good kit match reduces setup friction; it does not eliminate business
  choices.
- The note about focusing the `Coderso` sidebar on recommended modules matters:
  kit selection can influence how the admin experience is framed for the team.

# Troubleshooting

- Two kits seem equally plausible:
  compare recommended modules and post-install checklist before deciding.
- The kit looks attractive but feels wrong operationally:
  business fit and included modules matter more than surface labels.
- The reviewed intake is not enough to guarantee the final site:
  that is expected. Treat the kit as a starting baseline.
- The team expects zero follow-up after kit selection:
  use the post-install checklist to reset that assumption.

# Decision Guide

- Choose a kit by workflow fit, not by label alone.
- Choose a narrower but closer business fit over a broader but less accurate
  one.
- Choose a kit when guided setup speed matters.
- Choose a more manual path only when no kit is close enough to the real
  business model.

# Checklist

1. Confirm the selected kit matches the business type.
2. Confirm the recommended modules are acceptable.
3. Confirm the includes/manifests make sense.
4. Confirm the post-install checklist is realistic for the team.
5. Proceed only after treating the kit as a baseline, not the final site.

# Security

- Solution Kits is an authenticated admin surface and should only be used by
  users with the appropriate setup/configuration permissions.
- Kit execution choices can influence which modules and resources become active,
  so they should be reviewed as operational setup decisions.
- Do not assume a kit safely configures every downstream secret or integration;
  those still require explicit review later.
