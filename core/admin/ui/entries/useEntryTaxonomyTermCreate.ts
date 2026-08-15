import { useCallback } from "react";

import { isApiClientError } from "@/services/apiClient";
import {
  createTaxonomyTerm,
  type ContentTerm,
  type TaxonomyOverview,
} from "@/services/taxonomyClient";

type UseEntryTaxonomyTermCreateOptions = Readonly<{
  taxonomyOverview: TaxonomyOverview | null;
  setTaxonomyOverview: (
    updater: (prev: TaxonomyOverview | null) => TaxonomyOverview | null
  ) => void;
  setError: (message: string) => void;
}>;

/**
 * Creates a taxonomy term from the entry editor's taxonomy panel and folds the
 * new term into the overview so the picker shows it immediately. Extracted from
 * `EntryEditor` so the editor stays within the repository's file-size budget.
 */
export function useEntryTaxonomyTermCreate({
  taxonomyOverview,
  setTaxonomyOverview,
  setError,
}: UseEntryTaxonomyTermCreateOptions) {
  return useCallback(
    async (kind: "category" | "tag", name: string): Promise<ContentTerm | null> => {
      const taxonomy =
        kind === "category"
          ? taxonomyOverview?.taxonomies.category
          : taxonomyOverview?.taxonomies.tag;
      if (!taxonomy) return null;
      try {
        const created = await createTaxonomyTerm(taxonomy.id, { name });
        setTaxonomyOverview((prev) => {
          if (!prev) return prev;
          const termsKey = kind === "category" ? "categories" : "tags";
          const nextTerms = [...prev.terms[termsKey], created].sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          return {
            ...prev,
            terms: {
              ...prev.terms,
              [termsKey]: nextTerms,
            },
          };
        });
        return created;
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to create term.");
        }
        return null;
      }
    },
    [setError, setTaxonomyOverview, taxonomyOverview]
  );
}
