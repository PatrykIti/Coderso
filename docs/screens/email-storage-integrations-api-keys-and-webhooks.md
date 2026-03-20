---
title: "Email, Storage, Integrations, API Keys, and Webhooks"
audience: "admin"
productArea: "integrations"
language: "en"
keywords:
  - email
  - storage
  - integrations
  - api keys
  - webhooks
---

# What Is It

These settings screens manage external communication and runtime connections:
email delivery, storage adapters, third-party integrations, internal API keys,
and webhook endpoints.

# When To Use

Use these screens when connecting the platform to external systems or when a
workflow depends on delivery, storage, API authentication, or event callbacks.

# Step By Step

1. Configure email when the site sends notifications, confirmations, or alerts.
2. Configure storage when media handling or public asset delivery needs a
   specific backend.
3. Configure integrations for provider-backed features such as assistant LLM
   access or external services.
4. Use API Keys and Webhooks only when the external system needs programmatic
   access or event delivery.

# Examples

- An assistant rollout requires an OpenRouter integration for optional `llm-rag`
  mode.
- A media-heavy site moves from local storage to an external adapter.
- A service workflow sends appointment notifications by email and external
  events by webhook.

# Common Mistakes

- Configuring integrations before understanding which runtime feature uses them.
- Treating API keys and webhooks as interchangeable; one authenticates calls,
  the other emits events.
- Forgetting to test delivery after changing email or storage configuration.
