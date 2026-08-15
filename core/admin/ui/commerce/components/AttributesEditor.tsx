import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AttributesEditorProps = {
  attributes: Record<string, string>;
  onSet: (key: string, value: string) => void;
  onRemove: (key: string) => void;
  onRenameKey: (prevKey: string, nextKey: string) => void;
};

/**
 * TASK-488-01-L02: per-variant metadata key/value editor. Rows are rendered
 * directly from the draft `attributes` record; renaming a key and removing a
 * row delegate to the L01 model helpers so the variant draft stays immutable.
 * A local draft row lets the author type a new key/value pair; once both are
 * non-blank the pair is committed through `onSet` and the draft row resets.
 */
export function AttributesEditor({
  attributes,
  onSet,
  onRemove,
  onRenameKey,
}: AttributesEditorProps) {
  const [draftKey, setDraftKey] = useState("");
  const [draftValue, setDraftValue] = useState("");

  const commitDraft = (key: string, value: string) => {
    if (!key.trim()) return;
    onSet(key.trim(), value.trim());
    setDraftKey("");
    setDraftValue("");
  };

  const entries = Object.entries(attributes);

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">Attributes</div>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">No attributes yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <Input
                aria-label={`Attribute key for ${key}`}
                value={key}
                className="h-8 w-1/2"
                onChange={(event) => onRenameKey(key, event.target.value)}
              />
              <Input
                aria-label={`Attribute value for ${key}`}
                value={value}
                className="h-8 flex-1"
                onChange={(event) => onSet(key, event.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove attribute ${key}`}
                onClick={() => onRemove(key)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          aria-label="New attribute key"
          value={draftKey}
          placeholder="Size"
          className="h-8 w-1/2"
          onChange={(event) => {
            const nextKey = event.target.value;
            if (draftValue && nextKey.trim()) {
              commitDraft(nextKey, draftValue);
            } else {
              setDraftKey(nextKey);
            }
          }}
        />
        <Input
          aria-label="New attribute value"
          value={draftValue}
          placeholder="L"
          className="h-8 flex-1"
          onChange={(event) => {
            const nextValue = event.target.value;
            if (draftKey.trim()) {
              commitDraft(draftKey, nextValue);
            } else {
              setDraftValue(nextValue);
            }
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Add attribute"
          disabled={!draftKey.trim() || !draftValue.trim()}
          onClick={() => commitDraft(draftKey, draftValue)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
