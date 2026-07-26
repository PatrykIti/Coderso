import { useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { previewEntry } from "@/services/entriesClient";

/**
 * Runtime preview state for one entry: opening the dialog, minting a short-lived
 * preview token and surfacing its loading/error state. Self-contained — no other part
 * of the editor reads or writes it — so `EntryEditor` only forwards the result into
 * `RuntimePreviewDialog`.
 *
 * The dialog opens even without a resolved type/id, because it renders its own
 * "save this entry first" message in that case.
 */
export function useEntryRuntimePreview(type: string | null, id: string | null) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const openPreview = async () => {
    setPreviewOpen(true);
    if (!type || !id) {
      setPreviewLoading(false);
      setPreviewError(null);
      setPreviewUrl(null);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const result = await previewEntry(type, id, 30);
      setPreviewUrl(result.previewUrl);
    } catch (err) {
      if (isApiClientError(err)) {
        setPreviewError(err.message);
      } else {
        setPreviewError("Failed to generate preview.");
      }
      setPreviewUrl(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  return {
    previewOpen,
    setPreviewOpen,
    previewUrl,
    previewLoading,
    previewError,
    openPreview,
  };
}
