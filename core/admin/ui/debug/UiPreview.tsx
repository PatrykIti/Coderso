import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function UiPreview() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">UI Preview</h2>
        <p className="text-sm text-muted-foreground">
          Basic shadcn components rendered in admin UI.
        </p>
      </div>
      <div className="space-y-4">
        <Button>Primary</Button>
        <Input placeholder="Type here" />
        <Textarea placeholder="Longer text" />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox defaultChecked />
          Enable notifications
        </label>
      </div>
    </div>
  );
}
