export type IntegrationCategory = "Analytics" | "Communication" | "Developer Tools" | "Automation";

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
    description: "Track website traffic and user behavior patterns in real time with GA4.",
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
    description: "Send instant notifications to team channels when content is published.",
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
    id: "resend",
    name: "Resend",
    description: "Send transactional email through Resend.",
    category: "Communication",
    scopes: ["email:send"],
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "secret",
        required: true,
        placeholder: "re_...",
      },
    ],
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Automate workflows by connecting Coderso with 5,000+ popular apps.",
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
    description: "Monitor production errors and performance issues with automatic alerts.",
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
  {
    id: "openai",
    name: "OpenAI",
    description:
      "Use OpenAI directly as the optional LLM provider for Assistant LLM Guide responses.",
    category: "Developer Tools",
    scopes: ["assistant:generate", "assistant:retrieve"],
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "secret",
        required: true,
        placeholder: "sk-...",
      },
      {
        key: "baseUrl",
        label: "Base URL",
        type: "url",
        required: false,
        placeholder: "https://api.openai.com/v1",
      },
      {
        key: "organization",
        label: "Organization",
        type: "text",
        required: false,
        placeholder: "org_...",
      },
      {
        key: "project",
        label: "Project",
        type: "text",
        required: false,
        placeholder: "proj_...",
      },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Use OpenRouter as the optional LLM provider for Assistant LLM Guide responses.",
    category: "Developer Tools",
    scopes: ["assistant:generate", "assistant:retrieve"],
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "secret",
        required: true,
        placeholder: "sk-or-v1-...",
      },
      {
        key: "baseUrl",
        label: "Base URL",
        type: "url",
        required: false,
        placeholder: "https://openrouter.ai/api/v1",
      },
      {
        key: "siteUrl",
        label: "Site URL",
        type: "url",
        required: false,
        placeholder: "https://cms.example.com",
      },
      {
        key: "appName",
        label: "App Name",
        type: "text",
        required: false,
        placeholder: "Coderso Assistant",
      },
    ],
  },
  {
    id: "google-search-console",
    name: "Google Search Console",
    description: "Pull indexed-page status and search performance (impressions, clicks, queries).",
    category: "Analytics",
    // Descriptive capability label only - NOT permissionCatalog RBAC (no
    // seo:* permission exists). The SEO pipeline gates on settings:read /
    // settings:write via the integrations admin route.
    scopes: ["seo:read", "search-console:read"],
    fields: [
      {
        key: "serviceAccountJson",
        label: "Service Account JSON",
        type: "secret",
        required: true,
        placeholder: "Paste the GCP service account JSON (serviceAccountJson)",
      },
      {
        key: "siteUrl",
        label: "Property URL",
        type: "text",
        required: true,
        placeholder: "https://example.com/ or sc-domain:example.com",
      },
    ],
  },
];

const integrationMap = new Map(INTEGRATIONS.map((item) => [item.id, item]));

export function listIntegrationDefinitions(): IntegrationDefinition[] {
  return INTEGRATIONS.slice();
}

export function getIntegrationDefinition(id: string): IntegrationDefinition | null {
  return integrationMap.get(id) ?? null;
}
