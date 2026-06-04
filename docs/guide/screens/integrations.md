---
title: "Integrations"
audience: "admin"
productArea: "integrations"
language: "en"
keywords:
  - integrations
  - third party services
  - connect service
  - integration scopes
  - request integration
  - openrouter
  - openai
  - assistant provider
  - llm api key
---

# Basic

Integrations is the service-catalog surface for connecting the product to
third-party providers. It is where you browse available integrations, filter by
category, open a configuration drawer, and request a new integration that does
not yet exist in the catalog.

Assistant provider API keys also live here. OpenRouter and OpenAI keys are
stored as encrypted integration secrets; Assistant Settings only selects which
configured provider and model the assistant should use.

In the current UI, this route includes:
- category chips:
  `All Services`, `Analytics`, `Communication`, `Automation`,
  `Developer Tools`
- integration cards,
- a right-side integration drawer,
- `Request new` and a request dialog.

# Medium

Use Integrations when the product needs a managed provider connection, whether
that is a full service setup or a single encrypted provider secret such as an
LLM API key. The current route is designed for:
- browsing the available service catalog,
- searching by provider name or description,
- narrowing the list by category,
- opening a provider-specific configuration drawer,
- reviewing required fields and security scopes,
- configuring encrypted OpenRouter or OpenAI secrets for `LLM Guide`,
- requesting a missing provider from the team.

This is not only a settings list. It is a service-discovery and connection
workspace that balances catalog review with configuration and procurement.

# Instruction

1. Open `Settings > Integrations`.
2. Start with the category chips when the catalog is larger than one screen.
3. Use:
   - `All Services`
   - `Analytics`
   - `Communication`
   - `Automation`
   - `Developer Tools`
4. Use the `Search integrations...` field when you already know the provider
   name or want to narrow the list by description keywords.
5. Review each integration card for:
   - connection status,
   - service name,
   - service description,
   - `Connect` or `Configure` action.
6. Open the integration you actually need rather than configuring multiple
   services at once.
7. In the drawer, review:
   - connection status,
   - required fields,
   - secret-field behavior,
   - security scopes.
8. Treat required fields as the minimum viable contract for that provider.
9. Treat secret updates carefully; the drawer explicitly distinguishes regular
   fields from secret fields that may already be configured.
10. Review `Security scopes` before saving so the provider’s access model is
    understood.
11. Use `Save Changes` only when the provider configuration is coherent. When a
    secret field changed, review the `Review integration secrets` dialog before
    applying it.
12. For LLM Guide, configure the OpenRouter or OpenAI integration here first,
    then return to `Settings > Assistant` to enable LLM Guide and select the
    provider/model.
13. Use `Request new` when the catalog does not contain the integration you need.
14. In the request dialog, provide:
    - service name,
    - website URL,
    - notes.
15. Submit the request when the need is real:
    - success closes the dialog,
    - validation or backend failures stay inline in the dialog until corrected.
16. Use the request flow when a real product need exists, not as a substitute
    for choosing from the existing catalog.

Use this safe integrations workflow when you want fewer misconfigurations:
1. Search or filter the catalog.
2. Open the right provider.
3. Review required fields and scopes.
4. Save only after the config is coherent.
5. Use request-new only for a genuinely missing service.

# Advanced

- Category chips are a decision aid, not decoration. They reduce noise when the
  catalog grows.
- Connection status should be treated as an operational signal, not just a UI
  badge.
- Security scopes in the drawer matter because they clarify what the provider
  will be allowed to do or read.
- Secret fields should be handled differently from plain text fields; the drawer
  already models that distinction explicitly.
- Secret review dialogs show provider and field labels only. They must not echo
  the submitted secret value.
- OpenRouter/OpenAI assistant keys are provider secrets, not Assistant Settings
  form values. Keep them in the integration drawer so encryption, masking, and
  secret-review behavior apply.
- `Request new` is part of governance. It keeps the product from turning into a
  one-off unmanaged integration layer.

# Troubleshooting

- The service is not in the list:
  use `Request new` instead of trying to force another integration to fit.
- Search returns no result:
  clear the current category chip or broaden the search term because matching is
  based on provider name and description.
- The drawer feels incomplete:
  check whether the provider is disconnected and still needs all required
  values.
- A field is already configured but should change:
  update the field intentionally; only secret fields stay masked behind
  `Update secret`, while plain text and URL fields remain visible. Secret
  updates require the extra review dialog.
- LLM Guide says the provider is unavailable:
  confirm the matching OpenRouter or OpenAI integration is connected here, then
  return to `Settings > Assistant` and select that provider/model.
- Too many services look relevant:
  filter by category first, then compare description and scope expectations.

# Decision Guide

- Choose connect vs configure:
  connect when the service is not yet set up; configure when an existing
  connection needs changes.
- Choose existing service vs request new:
  use the catalog when a suitable service already exists; request new only when
  the required provider is truly missing.
- Choose broad vs narrow provider use:
  prefer the service whose stated purpose and scopes most closely match the real
  workflow.

# Checklist

1. Confirm the correct integration card is selected.
2. Confirm required fields are filled intentionally.
3. Confirm secret handling is understood.
4. Confirm the listed security scopes are acceptable.
5. Save changes deliberately or submit a request for a missing service.

# Security

- Integrations is an authenticated admin surface and should only be used by
  high-trust administrators responsible for third-party connectivity.
- Provider configuration and secret fields are sensitive integration material and
  should be treated as operational secrets.
- Assistant provider API keys must remain encrypted integration secrets. Do not
  paste them into Assistant Settings fields, prompts, docs, screenshots, or
  support notes.
- Scope review matters because integrations can widen system access in ways that
  are easy to overlook if the card is treated as just another settings row.
