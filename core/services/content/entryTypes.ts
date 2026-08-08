import type { EntryTaxonomyAssignments } from "./taxonomyService";

export type EntryStatus = "draft" | "published" | "scheduled" | "archived";
export type EntryVisibility = "public" | "private" | "password";
export type EntryData = Record<string, unknown>;

export type EntrySeo = {
  title?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
};

export type EntryDetail = {
  id: string;
  typeId: string;
  title: string;
  slug: string;
  status: EntryStatus;
  visibility: EntryVisibility;
  hasPassword: boolean;
  data: EntryData;
  tags: string[];
  taxonomy?: EntryTaxonomyAssignments;
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string | null; email: string } | null;
  seo: EntrySeo | null;
};

export type EntryListItem = Omit<EntryDetail, "seo" | "taxonomy"> & {
  seo?: EntrySeo | null;
  contentType: {
    id: string;
    slug: string;
    name: string;
    status: string;
  };
};

export type CreateEntryInput = {
  title: string;
  slug: string;
  data: EntryData;
  authorId?: string | null;
};

export type UpdateEntryInput = {
  title?: string;
  slug?: string;
  data?: EntryData;
};

export type UpdateEntryMetadataInput = {
  status?: EntryStatus;
  scheduledAt?: Date | null;
  visibility?: EntryVisibility;
  accessPassword?: string | null;
  tags?: string[];
  taxonomy?: {
    categoryId?: string | null;
    tagIds?: string[];
  };
  seo?: EntrySeo;
};
