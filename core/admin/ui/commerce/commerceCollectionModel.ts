import type { CommerceCollectionInput, CommerceCollectionRecord } from "@/services/commerceClient";

export type CollectionDraft = {
  id: string | null;
  name: string;
  slug: string;
  description: string;
};

export const emptyCollectionDraft = (): CollectionDraft => ({
  id: null,
  name: "",
  slug: "",
  description: "",
});

export const draftFromCollection = (collection: CommerceCollectionRecord): CollectionDraft => ({
  id: collection.id,
  name: collection.name,
  slug: collection.slug,
  description: collection.description ?? "",
});

// Defensive client shaping only: the server schema owns validation
// (`commerceCollectionCreateSchema` / `commerceCollectionUpdateSchema`).
// Blank slug/description become `null` so the server derives the slug from the
// name when omitted.
export const toCollectionInput = (draft: CollectionDraft): CommerceCollectionInput => ({
  name: draft.name.trim(),
  slug: draft.slug.trim() || null,
  description: draft.description.trim() || null,
});

export const isCollectionDraftValid = (draft: CollectionDraft) => draft.name.trim().length > 0;
