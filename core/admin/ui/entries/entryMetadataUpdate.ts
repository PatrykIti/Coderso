import type { EntryMetadataPayload, EntryVisibility } from "@/services/entriesClient";
import type { TaxonomyOverview } from "@/services/taxonomyClient";

import type { EntryStatus } from "./EntryMetadataPanel";

export type EntryMetadataFormValues = Readonly<{
  status: EntryStatus;
  visibility: EntryVisibility;
  accessPassword: string;
  scheduledAt: string;
  seoDescription: string;
  seoTitle: string;
  seoCanonicalUrl: string;
  seoRobots: string;
  taxonomyOverview: TaxonomyOverview | null;
  selectedCategoryId: string | null;
  selectedTagIds: string[];
}>;

export type EntryMetadataUpdate =
  { ok: true; payload: EntryMetadataPayload } | { ok: false; message: string };

/**
 * Validates the metadata panel's form and turns it into the `updateEntryMetadata`
 * body. The panel PATCHes status, visibility, password, schedule, taxonomy and SEO
 * TOGETHER, so the rules that decide what each control contributes belong together
 * too — and keeping them out of the request handler makes them checkable without a
 * mounted editor.
 */
export function buildEntryMetadataUpdate({
  status,
  visibility,
  accessPassword,
  scheduledAt,
  seoDescription,
  seoTitle,
  seoCanonicalUrl,
  seoRobots,
  taxonomyOverview,
  selectedCategoryId,
  selectedTagIds,
}: EntryMetadataFormValues): EntryMetadataUpdate {
  let scheduledAtIso: string | null = null;
  if (scheduledAt.trim()) {
    const parsed = new Date(scheduledAt);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, message: "Schedule date must be a valid ISO timestamp." };
    }
    scheduledAtIso = parsed.toISOString();
  }

  if (status === "scheduled" && !scheduledAtIso) {
    return { ok: false, message: "Schedule date is required for scheduled entries." };
  }

  const categoryEnabled = Boolean(taxonomyOverview?.taxonomies.category);
  const tagEnabled = Boolean(taxonomyOverview?.taxonomies.tag);
  const taxonomyPayload =
    categoryEnabled || tagEnabled
      ? {
          categoryId: categoryEnabled ? selectedCategoryId : null,
          tagIds: tagEnabled ? selectedTagIds : [],
        }
      : undefined;

  return {
    ok: true,
    payload: {
      status,
      visibility,
      // undefined = omit the key = keep the existing hash; null = clear the
      // hash (only ever sent when leaving password mode). See 514-01 §3.
      accessPassword:
        visibility !== "password" ? null : accessPassword === "" ? undefined : accessPassword,
      scheduledAt: status === "scheduled" ? scheduledAtIso : null,
      taxonomy: taxonomyPayload,
      seo: {
        title: seoTitle.trim() || undefined,
        description: seoDescription,
        canonicalUrl: seoCanonicalUrl.trim() || undefined,
        robots: seoRobots.trim() || undefined,
      },
    },
  };
}
