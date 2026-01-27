import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { ContentField } from "../content-types/SchemaBuilder";

type FieldRendererProps = {
  field: ContentField;
  value: unknown;
  onChange: (value: unknown) => void;
};

export function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  switch (field.type) {
    case "text":
      return (
        <Input
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "richtext":
      return (
        <Textarea
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          rows={5}
        />
      );
    case "number":
      return (
        <Input
          type="number"
          value={value !== null && value !== undefined ? String(value) : ""}
          onChange={(event) => {
            const next = event.target.value;
            onChange(next === "" ? null : Number(next));
          }}
        />
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          {field.label}
        </label>
      );
    case "select":
      return (
        <Select
          value={String(value ?? "")}
          onValueChange={(next) => onChange(next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "media":
      return (
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            Select media
          </Button>
          <Badge variant="outline" className="text-xs">
            {value ? "1 asset" : "None"}
          </Badge>
        </div>
      );
    case "relation":
      return (
        <Input
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Related entry ID"
        />
      );
    default:
      return null;
  }
}
