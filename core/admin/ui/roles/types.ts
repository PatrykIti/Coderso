export type RoleSummary = {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  system?: boolean;
};

export type RoleDraft = {
  name: string;
  description?: string;
  permissions: string[];
};
