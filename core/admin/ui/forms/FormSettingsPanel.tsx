import { ClipboardList } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { FormStatus } from "@/services/formsClient";

type FormSettingsPanelProps = {
  name: string;
  description: string;
  status: FormStatus;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStatusChange: (value: FormStatus) => void;
};

export function FormSettingsPanel({
  name,
  description,
  status,
  onNameChange,
  onDescriptionChange,
  onStatusChange,
}: FormSettingsPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary/10 p-1 text-primary">
            <ClipboardList className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Form Settings</p>
            <p className="text-xs text-muted-foreground">Define basic form details.</p>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 px-4 py-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Form name
            </label>
            <Input value={name} onChange={(event) => onNameChange(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Description
            </label>
            <Textarea
              rows={3}
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Short summary shown in the form list"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Status
            </label>
            <Select value={status} onValueChange={(value) => onStatusChange(value as FormStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
