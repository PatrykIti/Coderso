import { Button } from "@/components/ui/button";

/**
 * What the field area shows while it has no fields to show. That is TWO different facts and
 * the difference is the whole point of this component:
 *
 * - a read still in flight is a wait, and the editor says so;
 * - a read that FAILED, or resolved nothing, is a dead end. Every submit is gated on having
 *   loaded the entry (correctly — an unhydrated save PATCHes `data: {}` over the stored
 *   entry), and the only re-read the UI offered lived inside the "updated in another tab"
 *   alert, which itself only appears once a hydration has happened. So the editor showed
 *   "Loading entry fields..." forever, with nothing enabled and no way back in short of a
 *   browser reload. Closing the data-loss path must not install a dead editor in its place.
 *
 * The retry is USER-INITIATED, not automatic, and that is deliberate: a re-read driven by the
 * failure itself would loop against a GET that keeps failing, which is exactly why the commit
 * that added the submit guards chose to hand over rather than recover. A click is bounded by
 * the person clicking.
 *
 * It lives here rather than in the error alert because this placeholder is the one surface
 * that renders in EVERY not-loaded shape — including a read that resolves null, which sets no
 * error at all and therefore renders no alert to hang a button on.
 */
type EntryFieldsPlaceholderProps = Readonly<{
  isLoading: boolean;
  onRetry: () => void;
}>;

export function EntryFieldsPlaceholder({ isLoading, onRetry }: EntryFieldsPlaceholderProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        Loading entry fields...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
      <p>This entry did not load, so its fields are not shown and nothing can be saved yet.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry loading this entry
      </Button>
    </div>
  );
}
