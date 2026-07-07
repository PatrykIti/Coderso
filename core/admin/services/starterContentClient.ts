import { apiRequest } from "./apiClient";

// TASK-482-05-L02: thin client for the internal starter-content endpoints owned
// by 06-L02 (`POST /setup/starter-content/{preview,apply}`). It reuses the
// shared admin `apiClient` with `{ withCsrf: true }` — never a bespoke fetch —
// and only ever sends a known kit/blueprint id (the server maps it to a curated
// definition, matching 06-L02's anti-abuse contract).
//
// Temporal-inversion note: 06-L02 lands AFTER 05-L02, so these calls 404 until
// then. The StarterContentStep is skippable, so an operator is never blocked.

export type StarterContentSelection = {
  kitId: string;
};

export type StarterContentPreviewItem = {
  type: string;
  label: string;
};

export type StarterContentPreview = {
  kitId: string;
  label: string;
  summary: string;
  items: StarterContentPreviewItem[];
};

export type StarterContentApplyResult = {
  kitId: string;
  applied: boolean;
  createdCount: number;
};

export async function previewStarterContent(selection: StarterContentSelection) {
  return apiRequest<StarterContentPreview>(
    "/setup/starter-content/preview",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selection),
    },
    { withCsrf: true }
  );
}

export async function applyStarterContent(selection: StarterContentSelection) {
  return apiRequest<StarterContentApplyResult>(
    "/setup/starter-content/apply",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selection),
    },
    { withCsrf: true }
  );
}
