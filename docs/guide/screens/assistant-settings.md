---
title: "Assistant Settings"
audience: "admin"
productArea: "assistant"
language: "en"
keywords:
  - assistant settings
  - docs assistant
  - docs only
  - doc navigator
  - llm guide
  - openrouter
  - openai
  - llm api key
  - llm provider
  - openrouter model limits
  - advanced assistant settings
  - reindex
  - assistant quotas
---

# Basic

Assistant Settings is the runtime-control surface for the admin assistant. It
is where you enable the assistant globally, choose Docs Assistant vs LLM Guide
behavior, configure launcher presentation, choose the LLM provider/model, and
set advanced request/token limits.

`Docs Assistant` is the default read-only mode. The floating chat may show this
as a compact `Docs only` badge, and older material may call it `Doc Navigator`.
All of those names refer to the same documentation-grounded answer path.

In the current UI, this screen includes:
- the settings sidebar,
- assistant enable toggle,
- launcher avatar controls,
- default mode and LLM provider/model settings,
- official `docs/guide` corpus status guidance,
- collapsed `Advanced` controls for token limits, quotas, timeout, startup
  reindex behavior, and support reindex,
- `Save changes`,
- an auto-save toggle.

# Medium

Use Assistant Settings when the question is about how the assistant should
behave across the admin workspace, not about one specific conversation. The
current route is designed for:
- turning assistant availability on or off globally,
- deciding whether the default answer path is `Docs Assistant` or `LLM Guide`,
- controlling whether a launcher avatar is used,
- managing the official `docs/guide` corpus expectations,
- setting LLM token/time constraints and request quotas.

`Docs Assistant` answers questions from the official docs corpus and does not
create or change resources. `LLM Guide` is for reviewed setup and
resource-operation work: it can prepare a typed plan, run a dry-run preview, and
execute only the supported assistant actions after confirmation.

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
   - `Docs Assistant`
   - `LLM Guide`
6. Turn on `Enable LLM Guide` before configuring provider-backed behavior. The
   provider and model controls stay locked while LLM Guide is off.
7. Review the `LLM provider` and `LLM model` before changing the mode
   assumption.
   The provider API key is not entered on this screen. Configure OpenRouter or
   OpenAI under `Settings > Integrations` as an encrypted integration secret;
   Assistant Settings only selects which configured provider and model to use.
8. If OpenRouter is selected, use the provider/model metadata shown under the
   model field. The app reads OpenRouter limits when available and falls back to
   safe editable defaults when the provider does not publish those values.
9. Read the `Official assistant corpus` section carefully:
   the current contract is the official `docs/guide` corpus seeded to the
   DB-backed knowledge base.
10. Open `Advanced` only when you need technical limits or support tools:
   - max input tokens,
   - max output tokens,
   - LLM timeout,
   - requests per minute,
   - requests per day,
   - startup reindex override,
   - support reindex.
11. Leave startup and support reindex controls alone for routine configuration.
    Docker startup normally seeds the `docs/guide` index once per image/docs
    version.
12. Use `Run support reindex` only for support recovery after saved settings are
    coherent. The rebuild refreshes DB records from the current `docs/guide`
    corpus and removes official docs that no longer exist in the source corpus.
    The action opens a confirmation dialog before the reindex request is sent;
    cancel leaves the current index untouched.
13. Use `Save changes` when you want an explicit save instead of relying only on
    auto-save behavior.
14. Treat validation errors seriously, especially when `LLM Guide` is selected
    without a valid enabled provider.
15. Keep the capability boundary clear:
    - Docs Assistant answers are read-only,
    - LLM Guide setup and resource-operation actions require plan review,
      dry-run, and execute,
    - arbitrary code execution and autonomous mutation are not supported.

Use this safe Assistant Settings order when you want fewer runtime mistakes:
1. Enable the assistant intentionally.
2. Confirm the docs corpus expectation.
3. Choose mode.
4. Configure LLM only if truly needed.
5. Set quotas and limits.
6. Save.

# Advanced

- The official corpus note is one of the most important parts of the screen
  because it defines the runtime source of truth: `docs/guide` seeded into DB,
  not a filesystem fallback.
- Docker startup owns normal docs seeding. It reindexes the official corpus once
  for the current image/docs fingerprint and skips later starts until the image
  version or docs fingerprint changes.
- `Run support reindex` is an operational recovery action, not a cosmetic
  button. It should be used only when the saved assistant configuration and
  corpus state are ready, and it requires confirmation before execution.
- Reindex is also the cleanup path for removed assistant docs. Deleting a
  canonical article from `docs/guide` does not change runtime answers until the
  DB corpus is rebuilt.
- `Docs Assistant` vs `LLM Guide` is a policy decision as much as a feature
  toggle. It changes cost, behavior, and operational expectations.
- OpenRouter model metadata can populate max input and output token limits from
  provider data. If the provider does not publish those values, the app uses
  conservative editable defaults in `Advanced`.
- The current LLM Guide surface supports typed actions for catalog,
  lead-capture, product-inquiry, portfolio, editorial-hub, site-kit setup flows,
  and reviewed edits/deletes for supported existing admin resources. Booking,
  checkout/payment, webhook automation, fine-grained existing Page
  section/block patch actions beyond reviewed Page upserts/metadata updates,
  and installed-kit refinements remain gated until their adapters and hardening
  are explicit.
- Token/time limits and request quotas are part of runtime governance, not only
  technical tuning.
- The launcher avatar settings affect assistant presentation, but they should
  still be treated as controlled UI configuration rather than casual decoration.

## Defaults

| Setting | Default |
| --- | --- |
| Assistant enabled | Off |
| Default mode | Docs Assistant |
| LLM Guide enabled / provider | Off / None |
| Model | `google/gemma-3n-e2b-it:free` |
| Max input / output tokens | 8192 / 2048 before provider metadata |
| LLM timeout | 20000 ms |
| Quotas | 20 requests/minute, 1000 requests/day |

# Troubleshooting

- `LLM Guide` cannot be saved:
  check that LLM mode is enabled and the provider is not `None`.
- Provider/model fields are greyed out:
  turn on `Enable LLM Guide`; provider and model controls are disabled while LLM
  Guide is off.
- Docs Assistant input is unavailable:
  the DB-backed `docs/guide` index is not ready yet. Let Docker startup finish
  the first index, or use `Run support reindex` from `Advanced` during recovery.
- `Run support reindex` is blocked:
  save and enable the assistant first before trying again. A pending unsaved
  toggle does not unlock the action.
- The assistant should work but does not feel ready:
  review the corpus note and reindex state before assuming the problem is the
  model or UI.
- LLM Guide input is unavailable:
  confirm that LLM Guide is enabled, a provider other than `None` is selected,
  and the provider API key is configured under `Settings > Integrations`.
- Launcher avatar looks wrong:
  verify whether avatar mode is enabled and whether the asset URL is intentional.

# Decision Guide

- Choose Docs Assistant vs LLM Guide:
  use Docs Assistant when deterministic product guidance is the priority; use
  LLM Guide only when reviewed setup planning and typed action execution are
  intentionally allowed.
- Choose startup reindex override vs support reindex:
  prefer the Docker startup helper for normal deployments; use support reindex
  only for recovery after saved settings and corpus state are verified.
- Choose low vs high quotas:
  keep quotas tighter when governance matters more than experimentation.

# Checklist

1. Confirm assistant enablement is intentional.
2. Confirm the default mode is intentional.
3. Confirm corpus/reindex expectations are understood.
4. Confirm LLM provider/model/limits are valid when enabled.
5. Confirm quotas are appropriate.
6. Save changes deliberately.

# Navigation And Drafts

- Settings section links use in-app navigation on desktop and mobile.
- If this screen has unsaved edits, moving to another Settings section,
  browser Back/Forward, or refresh/close prompts before the draft is discarded.
- Choose cancel/keep editing when you need to preserve the current draft.

# Security

- Assistant Settings is an authenticated admin surface and should only be used
  by users with high-trust configuration permissions.
- LLM enablement, provider choice, quotas, and reindex behavior all affect
  runtime exposure and cost, so they should be treated as controlled operational
  settings.
- Provider API keys belong in `Settings > Integrations` as encrypted secrets,
  not in Assistant Settings text fields.
- Do not place secrets or private credentials into user-facing assistant fields
  such as avatar asset URLs or descriptive settings inputs.
