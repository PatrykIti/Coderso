export type IntegrationCategory =
  | "Analytics"
  | "Communication"
  | "Developer Tools"
  | "Automation";

export type IntegrationField = {
  key: string;
  label: string;
  type: "text" | "url" | "secret";
  required?: boolean;
  placeholder?: string;
};

export type IntegrationDefinition = {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  scopes: string[];
  fields: IntegrationField[];
};

const INTEGRATIONS: IntegrationDefinition[] = [
  {
    id: "google-analytics",
    name: "Google Analytics",
    description:
      "Track website traffic and user behavior patterns in real time with GA4.",
    category: "Analytics",
    scopes: ["analytics:read", "events:read"],
    fields: [
      {
        key: "measurementId",
        label: "Measurement ID",
        type: "text",
        required: true,
        placeholder: "G-XXXXXXXX",
      },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    description:
      "Send instant notifications to team channels when content is published.",
    category: "Communication",
    scopes: ["notifications:send", "events:read"],
    fields: [
      {
        key: "webhookUrl",
        label: "Webhook URL",
        type: "secret",
        required: true,
        placeholder: "https://hooks.slack.com/...",
      },
      {
        key: "defaultChannel",
        label: "Default channel",
        type: "text",
        required: false,
        placeholder: "#content-updates",
      },
    ],
  },
  {
    id: "zapier",
    name: "Zapier",
    description:
      "Automate workflows by connecting Nextless with 5,000+ popular apps.",
    category: "Automation",
    scopes: ["events:read", "webhooks:send"],
    fields: [
      {
        key: "hookUrl",
        label: "Hook URL",
        type: "secret",
        required: true,
        placeholder: "https://hooks.zapier.com/...",
      },
    ],
  },
  {
    id: "sentry",
    name: "Sentry",
    description:
      "Monitor production errors and performance issues with automatic alerts.",
    category: "Developer Tools",
    scopes: ["errors:read", "events:read"],
    fields: [
      {
        key: "dsn",
        label: "DSN",
        type: "secret",
        required: true,
        placeholder: "https://public@o0.ingest.sentry.io/0",
      },
      {
        key: "environment",
        label: "Environment",
        type: "text",
        required: false,
        placeholder: "production",
      },
    ],
  },
];

const integrationMap = new Map(INTEGRATIONS.map((item) => [item.id, item]));

export function listIntegrationDefinitions(): IntegrationDefinition[] {
  return INTEGRATIONS.slice();
}

export function getIntegrationDefinition(
  id: string
): IntegrationDefinition | null {
  return integrationMap.get(id) ?? null;
}
