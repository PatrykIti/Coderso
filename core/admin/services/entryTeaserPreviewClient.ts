import { apiRequest } from "./apiClient";

import type { EntryTeaserData } from "../../widgets/core/entryTeaser";

export type EntryTeaserPreviewResponse = NonNullable<EntryTeaserData["resolved"]>;

export async function previewEntryTeaser(data: EntryTeaserData) {
  return apiRequest<EntryTeaserPreviewResponse>(
    "/widgets/entry-teaser/preview",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    },
    { withCsrf: true }
  );
}
