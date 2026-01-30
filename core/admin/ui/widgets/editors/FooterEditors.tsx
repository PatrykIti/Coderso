import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { FooterData } from "../../../../widgets/core/footer";
import type { WidgetEditorProps } from "../../../../widgets/types";

const variantOptions = [
  { id: "columns-2", label: "Columns 2" },
  { id: "columns-3", label: "Columns 3" },
  { id: "minimal", label: "Minimal" },
];

function FooterVariantSelect({
  value,
  onChange,
}: {
  value: string;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Footer layout</p>
      <Select value={value} onValueChange={(next) => onChange?.(next)}>
        <SelectTrigger>
          <SelectValue placeholder="Choose layout" />
        </SelectTrigger>
        <SelectContent>
          {variantOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function FooterWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<FooterData>) {
  const updateColumn = (index: number, title: string) => {
    const columns = [...value.columns];
    columns[index] = { ...columns[index], title };
    onChange({ ...value, columns });
  };

  return (
    <div className="space-y-4">
      <FooterVariantSelect value={variant} onChange={onVariantChange} />
      <div className="space-y-2">
        <p className="text-sm font-medium">Column titles</p>
        <div className="space-y-2">
          {value.columns.slice(0, 3).map((column, index) => (
            <Input
              key={`${column.title}-${index}`}
              value={column.title}
              onChange={(event) => updateColumn(index, event.target.value)}
              placeholder={`Column ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FooterVisualEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<FooterData>) {
  const updateLegal = (patch: Partial<FooterData["legal"]>) =>
    onChange({ ...value, legal: { ...value.legal, ...patch } });

  return (
    <div className="space-y-4">
      <FooterVariantSelect value={variant} onChange={onVariantChange} />
      <div className="space-y-2">
        <p className="text-sm font-medium">Copyright line</p>
        <Input
          value={value.legal?.copyright ?? ""}
          onChange={(event) => updateLegal({ copyright: event.target.value })}
          placeholder="© 2026 Nextless"
        />
      </div>
    </div>
  );
}

export function FooterAdvancedEditor({ value, onChange }: WidgetEditorProps<FooterData>) {
  const updateLinks = (columnIndex: number, links: string) => {
    const columns = [...value.columns];
    const parsedLinks = links
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((label) => ({ label, href: "#" }));
    columns[columnIndex] = { ...columns[columnIndex], links: parsedLinks };
    onChange({ ...value, columns });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">Links per column</p>
      <div className="space-y-3">
        {value.columns.slice(0, 3).map((column, index) => (
          <Input
            key={`${column.title}-${index}`}
            value={column.links.map((link) => link.label).join(", ")}
            onChange={(event) => updateLinks(index, event.target.value)}
            placeholder="Home, About, Contact"
          />
        ))}
      </div>
    </div>
  );
}
