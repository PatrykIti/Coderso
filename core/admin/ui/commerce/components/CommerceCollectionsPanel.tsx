import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import type { CommerceCollectionRecord } from "@/services/commerceClient";

type CommerceCollectionsPanelProps = {
  collections: CommerceCollectionRecord[];
  selectedIds: string[];
  mediaIdsText: string;
  onToggleCollection: (id: string, checked: boolean) => void;
  onMediaIdsChange: (value: string) => void;
};

export function CommerceCollectionsPanel({
  collections,
  selectedIds,
  mediaIdsText,
  onToggleCollection,
  onMediaIdsChange,
}: CommerceCollectionsPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <div>
        <h2 className="text-sm font-semibold">Collections</h2>
        <p className="text-xs text-muted-foreground">
          Assign this product to one or more collections.
        </p>
      </div>

      <ScrollArea className="min-h-0 flex-1 rounded-md border bg-muted/30 p-2">
        <div className="space-y-2 p-1">
          {collections.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No collections yet. Create collections from the Commerce API/UI flow.
            </p>
          ) : (
            collections.map((collection) => {
              const checked = selectedIds.includes(collection.id);
              return (
                <label
                  key={collection.id}
                  className="flex cursor-pointer items-start gap-2 rounded-md border bg-background p-2"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) =>
                      onToggleCollection(collection.id, value === true)
                    }
                    className="mt-0.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-tight">
                      {collection.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      /{collection.slug}
                    </span>
                  </span>
                </label>
              );
            })
          )}
        </div>
      </ScrollArea>

      <div className="space-y-2 rounded-md border bg-muted/30 p-3">
        <div className="flex items-center justify-between">
          <label
            htmlFor="commerce-media-ids"
            className="text-xs font-medium uppercase text-muted-foreground"
          >
            Media IDs
          </label>
          <Badge variant="outline">{selectedIds.length} selected</Badge>
        </div>
        <Input
          id="commerce-media-ids"
          value={mediaIdsText}
          onChange={(event) => onMediaIdsChange(event.target.value)}
          placeholder="uuid-1, uuid-2"
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated IDs. Media picker integration will be added in runtime widget flow.
        </p>
      </div>
    </div>
  );
}
