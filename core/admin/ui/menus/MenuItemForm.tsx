import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export function MenuItemForm() {
  return (
    <form className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Navigation Label</label>
        <Input defaultValue="Clothing" />
        <p className="text-xs text-muted-foreground">Text displayed in the menu.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Link Type</label>
        <div className="flex gap-2 rounded-lg bg-muted p-1">
          <Button type="button" variant="ghost" className="flex-1">
            Page
          </Button>
          <Button type="button" variant="secondary" className="flex-1">
            Custom URL
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Parent Item</label>
        <Select defaultValue="products">
          <SelectTrigger>
            <SelectValue placeholder="Select parent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Parent (Top Level)</SelectItem>
            <SelectItem value="products">Products</SelectItem>
            <SelectItem value="about">About Us</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">URL Path</label>
        <Input placeholder="https://" />
        <p className="text-xs text-rose-500">
          This field is required for Custom URLs.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Open in new tab</p>
          <p className="text-xs text-muted-foreground">Target _blank</p>
        </div>
        <Switch />
      </div>
    </form>
  );
}
