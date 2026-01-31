export type ApiKeyScopeOption = {
  id: string;
  label: string;
  description: string;
  defaultChecked?: boolean;
};

export const apiKeyScopeOptions: ApiKeyScopeOption[] = [
  {
    id: "content.read",
    label: "Content Read",
    description: "Read published entries and page content.",
    defaultChecked: true,
  },
  {
    id: "content.write",
    label: "Content Write",
    description: "Create and update entries or pages.",
  },
  {
    id: "media.read",
    label: "Media Read",
    description: "Access media asset metadata and files.",
    defaultChecked: true,
  },
  {
    id: "media.manage",
    label: "Media Manage",
    description: "Upload, edit, and delete media assets.",
  },
  {
    id: "settings.read",
    label: "Settings Read",
    description: "View configuration details and audit logs.",
  },
  {
    id: "settings.write",
    label: "Settings Write",
    description: "Update settings, roles, and team access.",
  },
];

const scopeLabelMap = new Map(
  apiKeyScopeOptions.map((option) => [option.id, option.label])
);

export function getScopeLabel(scope: string) {
  return scopeLabelMap.get(scope) ?? scope;
}

export function getDefaultScopes() {
  return apiKeyScopeOptions
    .filter((option) => option.defaultChecked)
    .map((option) => option.id);
}

