---
title: "Assistant Settings"
audience: "admin"
productArea: "assistant"
language: "en"
keywords:
  - assistant settings
  - doc navigator
  - llm rag
  - reindex
  - assistant quotas
---

# Basic

Assistant Settings is the runtime-control surface for the admin assistant. It
is where you enable the assistant globally, choose docs-only vs LLM behavior,
configure launcher presentation, manage reindex policy, and set request/token
limits.

In the current UI, this screen includes:
- the settings sidebar,
- assistant enable toggle,
- launcher avatar controls,
- default mode and LLM provider/model settings,
- official corpus and reindex controls,
- quota fields,
- `Run reindex`,
- `Save changes`,
- an auto-save toggle.

# Medium

Use Assistant Settings when the question is about how the assistant should
behave across the admin workspace, not about one specific conversation. The
current route is designed for:
- turning assistant availability on or off globally,
- deciding whether the default answer path is `Docs only` or `LLM + RAG`,
- controlling whether a launcher avatar is used,
- managing the official `docs/` corpus expectations and reindex flow,
- setting LLM token/time constraints and request quotas.

This is a runtime and governance screen, not a chat surface. It defines what
the assistant is allowed to do and how expensive or constrained that behavior
should be.

# Instruction

1. Open `Settings > Assistant`.
2. Start with the global `Enable assistant` toggle.
3. Review whether the floating launcher should stay in default mode or use a
   configured avatar.
4. If `Launcher avatar` is enabled, review the asset URL field carefully.
5. Choose the `Default mode` intentionally:
   - `Docs only`
   - `LLM + RAG`
6. Review the `LLM provider` before changing the mode assumption.
7. Read the `Official assistant corpus` section carefully:
   the current contract is the root `docs/` corpus seeded to the DB-backed
   knowledge base.
8. Use `Reindex on boot` only when startup-time rebuild behavior is truly
   intended.
9. Use `Run reindex` when the saved assistant state is ready and the official
   corpus needs to be rebuilt now.
10. If LLM mode is in scope, review:
    - enable LLM mode,
    - provider,
    - model,
    - max input tokens,
    - max output tokens,
    - timeout.
11. Review request quotas:
    - requests per minute,
    - requests per day.
12. Use `Save changes` when you want an explicit save instead of relying only on
    auto-save behavior.
13. Treat validation errors seriously, especially when `LLM + RAG` is selected
    without a valid enabled provider.

Use this safe Assistant Settings order when you want fewer runtime mistakes:
1. Enable the assistant intentionally.
2. Confirm the docs corpus expectation.
3. Choose mode.
4. Configure LLM only if truly needed.
5. Set quotas and limits.
6. Save.
7. Run reindex only after the saved state is coherent.

# Advanced

- The official corpus note is one of the most important parts of the screen
  because it defines the runtime source of truth: root `docs/` seeded into DB,
  not a filesystem fallback.
- `Run reindex` is an operational action, not a cosmetic button. It should be
  used only when the saved assistant configuration and corpus state are ready.
- `Docs only` vs `LLM + RAG` is a policy decision as much as a feature toggle.
  It changes cost, behavior, and operational expectations.
- Token/time limits and request quotas are part of runtime governance, not only
  technical tuning.
- The launcher avatar settings affect assistant presentation, but they should
  still be treated as controlled UI configuration rather than casual decoration.

# Troubleshooting

- `LLM + RAG` cannot be saved:
  check that LLM mode is enabled and the provider is not `None`.
- `Run reindex` is blocked:
  save and enable the assistant first before trying again.
- The assistant should work but does not feel ready:
  review the corpus note and reindex state before assuming the problem is the
  model or UI.
- Launcher avatar looks wrong:
  verify whether avatar mode is enabled and whether the asset URL is intentional.

# Decision Guide

- Choose docs-only vs LLM + RAG:
  use docs-only when deterministic product guidance is the priority; use
  LLM + RAG only when broader assisted generation is intentionally allowed.
- Choose reindex on boot vs manual reindex:
  use boot reindex only when automatic rebuild cost is acceptable; otherwise
  prefer explicit manual reindex.
- Choose low vs high quotas:
  keep quotas tighter when governance matters more than experimentation.

# Checklist

1. Confirm assistant enablement is intentional.
2. Confirm the default mode is intentional.
3. Confirm corpus/reindex expectations are understood.
4. Confirm LLM provider/model/limits are valid when enabled.
5. Confirm quotas are appropriate.
6. Save changes deliberately.

# Security

- Assistant Settings is an authenticated admin surface and should only be used
  by users with high-trust configuration permissions.
- LLM enablement, provider choice, quotas, and reindex behavior all affect
  runtime exposure and cost, so they should be treated as controlled operational
  settings.
- Do not place secrets or private credentials into user-facing assistant fields
  such as avatar asset URLs or descriptive settings inputs.
