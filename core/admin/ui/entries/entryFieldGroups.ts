import type { ContentField } from "../content-types/SchemaBuilder";
import { slugify } from "./entrySlug";

export type EntryFieldSection = {
  label: string | null;
  fields: ContentField[];
};

export type EntryFieldGroup = {
  id: string;
  label: string;
  sections: EntryFieldSection[];
};

/**
 * The authored layout of a content type's fields: `layout.tab` becomes a group and
 * `layout.section` a section inside it, both in authoring order.
 *
 * The "Content" group is re-homed into the prototype Content card (Title/Slug above
 * its fields). Every OTHER authored group (Media, Relations, or a custom layout.tab)
 * renders as its own stacked SectionCard — no authored grouping is ever dropped
 * (514-03 field-grouping decision) — so the split is resolved here next to the
 * grouping itself rather than in the editor's render body.
 */
export type EntryFieldGroups = {
  groups: EntryFieldGroup[];
  contentGroup: EntryFieldGroup | null;
  otherGroups: EntryFieldGroup[];
};

const resolveTabLabel = (field: ContentField) => {
  const explicitTab = field.layout?.tab?.trim();
  if (explicitTab) return explicitTab;
  if (field.type === "media") return "Media";
  if (field.type === "relation") return "Relations";
  return "Content";
};

export function buildEntryFieldGroups(fields: ContentField[]): EntryFieldGroups {
  const tabs = new Map<string, { label: string; sections: Map<string, EntryFieldSection> }>();
  const tabOrder: string[] = [];

  fields.forEach((field) => {
    const tabLabel = resolveTabLabel(field);
    if (!tabs.has(tabLabel)) {
      tabs.set(tabLabel, { label: tabLabel, sections: new Map() });
      tabOrder.push(tabLabel);
    }
    const sectionLabel = field.layout?.section?.trim() ?? "";
    const tab = tabs.get(tabLabel);
    if (!tab) return;
    if (!tab.sections.has(sectionLabel)) {
      tab.sections.set(sectionLabel, {
        label: sectionLabel ? sectionLabel : null,
        fields: [],
      });
    }
    tab.sections.get(sectionLabel)?.fields.push(field);
  });

  const groups = tabOrder.map((label, index) => {
    const tab = tabs.get(label);
    return {
      id: slugify(label) || `tab-${index + 1}`,
      label,
      sections: tab ? Array.from(tab.sections.values()) : [],
    };
  });

  return {
    groups,
    contentGroup: groups.find((group) => group.label === "Content") ?? null,
    otherGroups: groups.filter((group) => group.label !== "Content"),
  };
}
