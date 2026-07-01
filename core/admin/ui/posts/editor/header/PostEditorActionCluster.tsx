import { Eye, Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";

type PostEditorActionClusterProps = {
  status: string;
  saving: boolean;
  onPreview: () => void;
  onSaveDraft?: () => void;
  onPublish: () => void;
};

export function PostEditorActionCluster({
  status,
  saving,
  onPreview,
  onSaveDraft,
  onPublish,
}: PostEditorActionClusterProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-end gap-2"
      aria-label="Primary editor actions"
      data-post-editor-header-cluster="primary-actions"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onPreview}
        disabled={saving}
        aria-label="Open runtime preview"
      >
        <Eye className="h-4 w-4" />
        Preview
      </Button>

      {onSaveDraft ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSaveDraft}
          disabled={saving}
          aria-label="Save draft"
          data-post-editor-save-draft="true"
        >
          Save draft
        </Button>
      ) : null}

      <Button
        type="button"
        size="sm"
        onClick={onPublish}
        disabled={saving}
        aria-label={status === "published" ? "Update published post" : "Publish post"}
      >
        <Rocket className="h-4 w-4" />
        {status === "published" ? "Update" : "Publish"}
      </Button>
    </div>
  );
}
