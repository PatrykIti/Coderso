/**
 * Outbound integration event hub (TASK-491-02-L01).
 *
 * Owns the closed outbound event enum, the normalized event payload contract,
 * and `emitIntegrationEvent`/`emitIntegrationEventSafe` used by the mutation
 * seams (entry/page publish, form submission). Resolves enabled outbound
 * targets (slack, zapier) and dispatches via the L02 delivery adapters.
 *
 * Security: payloads are normalized to a fixed safe shape (ids, slugs, titles,
 * timestamps) — never raw record bodies. Webhook URLs stay inside the runtime
 * config (server-side decrypted) and are never logged, echoed, or returned.
 * Dispatch failures log only a machine-readable code.
 */

import type { IntegrationRuntimeConfig } from "./integrationsService";

export const INTEGRATION_EVENTS = ["entry.published", "page.published", "form.submission"] as const;
export type IntegrationEvent = (typeof INTEGRATION_EVENTS)[number];

export type IntegrationEventResource = {
  type: "entry" | "page" | "form-submission";
  id: string;
  title?: string;
  slug?: string;
};

export type IntegrationEventPayload = {
  event: IntegrationEvent;
  occurredAt: string;
  resource: IntegrationEventResource;
};

const EVENT_RESOURCE_TYPE: Record<IntegrationEvent, IntegrationEventResource["type"]> = {
  "entry.published": "entry",
  "page.published": "page",
  "form.submission": "form-submission",
};

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export function normalizeIntegrationEventPayload(
  event: IntegrationEvent,
  resource: IntegrationEventPayload["resource"]
): IntegrationEventPayload {
  return {
    event,
    occurredAt: new Date().toISOString(),
    resource: {
      type: EVENT_RESOURCE_TYPE[event] ?? resource.type,
      id: typeof resource.id === "string" ? resource.id : "",
      title: normalizeOptionalString(resource.title),
      slug: normalizeOptionalString(resource.slug),
    },
  };
}

export type IntegrationEventAdapter = (
  config: IntegrationRuntimeConfig,
  payload: IntegrationEventPayload
) => Promise<void>;

export type DispatchDeps = {
  getIntegrationRuntimeConfig: (id: string) => Promise<IntegrationRuntimeConfig | null>;
  deliverSlack: IntegrationEventAdapter;
  deliverZapier: IntegrationEventAdapter;
};

const defaultDeps: DispatchDeps = {
  getIntegrationRuntimeConfig: async (id) => {
    const mod = await import("./integrationsService");
    return mod.getIntegrationRuntimeConfig(id);
  },
  deliverSlack: async (config, payload) => {
    const mod = await import("./slackDelivery");
    await mod.deliverSlack(config, payload);
  },
  deliverZapier: async (config, payload) => {
    const mod = await import("./zapierDelivery");
    await mod.deliverZapier(config, payload);
  },
};

export async function emitIntegrationEvent(
  event: IntegrationEvent,
  resource: IntegrationEventPayload["resource"],
  deps: DispatchDeps = defaultDeps
): Promise<void> {
  if (!INTEGRATION_EVENTS.includes(event)) return;
  const payload = normalizeIntegrationEventPayload(event, resource);

  const [slack, zapier] = await Promise.all([
    deps.getIntegrationRuntimeConfig("slack"),
    deps.getIntegrationRuntimeConfig("zapier"),
  ]);

  const results = await Promise.allSettled([
    slack?.webhookUrl ? deps.deliverSlack(slack, payload) : Promise.resolve(),
    zapier?.hookUrl ? deps.deliverZapier(zapier, payload) : Promise.resolve(),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      // Machine-readable only — never the URL/secret or the error detail.
      console.warn("integration_event_dispatch_failed", { event, code: "dispatch_failed" });
    }
  }
}

/**
 * Fire-and-forget wrapper used at the mutation seams: dispatch never blocks or
 * breaks the mutation. Adapter errors are swallowed by `Promise.allSettled`;
 * the outer catch only guards the config-resolution step.
 */
export function emitIntegrationEventSafe(
  event: IntegrationEvent,
  resource: IntegrationEventPayload["resource"]
): void {
  void emitIntegrationEvent(event, resource).catch(() => {
    console.warn("integration_event_dispatch_failed", { event, code: "dispatch_failed" });
  });
}
