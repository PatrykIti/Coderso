import { Badge } from "@/components/ui/badge";
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

export type FieldValidation = {
  required?: boolean;
  unique?: boolean;
  limitLength?: boolean;
};

export type FieldSettingsProps = {
  displayName: string;
  apiId: string;
  fieldType: string;
  description?: string;
  validation: FieldValidation;
  helpText?: string;
  typeOptions?: string[];
};

export function FieldSettings({
  displayName,
  apiId,
  fieldType,
  description,
  validation,
  helpText,
  typeOptions = ["text", "rich-text", "media", "relation"],
}: FieldSettingsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Display name
          </label>
          <Input defaultValue={displayName} />
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            API ID (slug)
          </label>
          <Input
            defaultValue={apiId}
            readOnly
            className="bg-muted font-mono text-xs"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Field type
          </label>
          <Select defaultValue={fieldType}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a type" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Validation
            </label>
            <Badge variant="outline" className="text-[10px] uppercase">
              Field rules
            </Badge>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox defaultChecked={validation.required} />
              Required field
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox defaultChecked={validation.unique} />
              Unique value
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox defaultChecked={validation.limitLength} />
              Limit character count
            </label>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Help text
          </label>
          <Textarea
            defaultValue={helpText}
            placeholder="Short guidance for editors"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
