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

# Basic

These settings manage outbound communication and external runtime connections:
email, storage, integrations, API keys, and webhooks.

# Medium

Use this surface whenever a feature depends on external providers or secure
machine-to-machine communication.

Use this surface when:
- notifications and transactional email must be delivered,
- media/storage backend must be changed,
- external services are required for product capabilities,
- APIs/webhooks are needed for system-to-system workflows.

# Instruction

1. Configure email provider and validate outbound delivery.
2. Configure storage backend and verify media upload/read paths.
3. Configure integrations required by feature modules (for example assistant
   provider integration).
4. Create API keys/webhooks only for explicit integration use cases.
5. Validate end-to-end delivery and logging before rollout.

# Advanced

- Separate integration ownership by environment and feature scope.
- Use least-privilege API key scopes with explicit rotation schedules.
- Document webhook retry/idempotency expectations to prevent duplicate side
  effects.

# Troubleshooting

- If delivery fails, test provider credentials and outbound network path first.
- If media URLs break after storage migration, verify adapter config and public
  base URL assumptions.
- If webhook consumers show duplicates, validate retry semantics and idempotent
  receiver behavior.

# Decision Guide

- Choose Integrations when a feature needs a third-party provider.
- Choose API Keys for authenticated pull/push API access.
- Choose Webhooks for event-driven outbound notifications.
- Choose Email/Storage settings only when runtime capabilities depend on them.

# Checklist

1. Provider credentials validated.
2. Scope/permission boundaries reviewed.
3. Delivery tests executed (email/storage/webhook).
4. Observability checks confirmed (logs/alerts).
5. Rollback plan prepared before production cutover.

# Security

- Never expose provider secrets in client-side payloads or logs.
- Rotate API keys regularly and track owner/reason for each key.
- Validate webhook signatures and enforce strict payload schema checks.
