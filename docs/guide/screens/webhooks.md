---
title: "Webhooks"
audience: "admin"
productArea: "integrations"
language: "en"
keywords:
  - webhooks
  - webhook delivery
  - event triggers
  - signing secret
  - test connection
---

# Basic

Webhooks is the outbound event-delivery surface for sending changes to external
services in real time. It is where you create webhook endpoints, choose which
events should trigger delivery, manage signing secrets, and review webhook
lifecycle state.

In the current UI, this route includes:
- `Create Webhook`,
- a webhooks table,
- a create/edit drawer with:
  name, endpoint URL, event triggers, signing secret, enabled state,
  test connection, save/cancel actions.

# Medium

Use Webhooks when another system should react automatically to content or media
events without polling the API. The current route is designed for:
- creating a new outbound integration endpoint,
- choosing exactly which events should trigger deliveries,
- enabling or disabling a webhook without deleting it,
- testing connection for an existing webhook,
- deleting a webhook when it should no longer receive events.

The current local walkthrough shows an empty-state table, which makes the create
drawer the primary starting point. The edit/test lifecycle is additionally
verified in the shipped UI source.

# Instruction

1. Open `Settings > Webhooks`.
2. Start by checking whether any webhooks already exist in the table.
3. Use `Create Webhook` when a new event-delivery endpoint is needed.
4. In the drawer, review the enable toggle first.
5. Fill:
   - webhook name,
   - endpoint URL.
6. Choose the event triggers intentionally.
   The current UI exposes:
   - `entry.created`
   - `entry.updated`
   - `media.uploaded`
   - `media.deleted`
   - `page.published`
   - `page.unpublished`
7. Select only the events that the target system really needs.
8. Review `Signing Secret`.
9. Use `Generate` when a fresh shared secret should be created in the UI.
10. Treat the signing secret as part of request verification, not as optional
    decoration.
11. Use `Create Webhook` only after the endpoint, events, and secret are
    coherent together.
12. For existing rows, review:
    - URL,
    - events,
    - active/inactive status,
    - last delivery state.
13. Use lifecycle actions intentionally:
    - edit webhook,
    - test connection,
    - delete webhook.
14. Existing webhook edits open `Review webhook changes` before saving, webhook
    tests open `Send webhook test?`, and deletes require a destructive confirm.
    Cancel keeps the draft/row unchanged.

Use this safe webhook flow when you want fewer delivery mistakes:
1. Confirm the endpoint URL.
2. Choose the narrowest event set.
3. Generate or verify the signing secret.
4. Create the webhook.
5. Test the connection once the endpoint is ready.

# Advanced

- Event selection is the most important design choice on this route. Broad
  trigger sets create noisy integrations and harder debugging.
- The enable toggle matters because it lets you pause deliveries without
  destroying the configuration.
- Signing secret management is a real security boundary. It is what lets the
  receiving system verify that requests came from this platform.
- `Test Connection` is an operational check, not just a convenience button. It
  should be used when the endpoint is supposed to be reachable now, and the UI
  asks for confirmation before sending the test request.
- Last-delivery state is a practical health signal when webhooks already exist,
  even though the current local dataset is empty.

# Troubleshooting

- No webhooks are listed:
  that simply means no webhook has been configured yet in this environment.
- The endpoint exists but should stop receiving traffic:
  disable or edit the webhook instead of deleting it blindly.
- Deliveries are not trusted by the receiver:
  review the signing secret first.
- The integration gets too many events:
  narrow the event trigger set before debugging downstream logic.
- The endpoint might be reachable but still feels uncertain:
  use the built-in test-connection path on an existing webhook.

# Decision Guide

- Choose create vs edit:
  create for a new endpoint; edit when the destination, events, or secret model
  must change.
- Choose disable vs delete:
  disable when the integration may come back; delete when it should be removed
  entirely, then confirm the destructive delete dialog.
- Choose broad vs narrow event selection:
  choose the narrowest set that still satisfies the real integration need.

# Checklist

1. Confirm the endpoint URL is correct.
2. Confirm the event set is minimal and intentional.
3. Confirm the signing secret strategy is correct.
4. Create or update the webhook deliberately.
5. Test connection when the endpoint should already be live.

# Security

- Webhooks is an authenticated admin surface and should only be used by
  high-trust administrators responsible for outbound integrations.
- Signing secrets are security material and should be handled like credentials.
- Broad or unreviewed event delivery can leak more operational data than the
  receiver actually needs, so scope carefully.
