import type { LucideIcon } from "lucide-react";

import { EditorRailGroup, EditorRailItem } from "@/ui/shared/EditorFrame";

export type FieldLibraryItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  type: string;
  helper?: string;
};

type FieldLibraryProps = {
  items: FieldLibraryItem[];
  onAddField: (field: FieldLibraryItem) => void;
  // The currently-selected field's type highlights the matching rail item
  // (prototype `active`, FormBuilderPreview.tsx:63). Undefined ⇒ no active item.
  selectedFieldType?: string;
};

export function FieldLibrary({ items, onAddField, selectedFieldType }: FieldLibraryProps) {
  return (
    <EditorRailGroup label="Fields">
      {items.map((item) => (
        <EditorRailItem
          key={item.id}
          icon={<item.icon />}
          active={item.type === selectedFieldType}
          onClick={() => onAddField(item)}
        >
          {item.label}
        </EditorRailItem>
      ))}
    </EditorRailGroup>
  );
}
