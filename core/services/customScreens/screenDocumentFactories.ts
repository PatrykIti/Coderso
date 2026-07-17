import type {
  CustomScreenBindingMode,
  ScreenBlockV1,
  ScreenFieldBinding,
  ScreenSectionV1,
} from "./customScreenContracts";
import { buildScreenFieldBindingId } from "./customScreenNormalizationPrimitives";
import type { ScreenBlockKind } from "./screenDocumentContracts";

export const createScreenNodeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const screenBlockLabels: Record<ScreenBlockKind, string> = {
  "record-header": "Record Header",
  field: "Field",
  "field-group": "Field Group",
  columns: "Columns",
  "rich-text": "Rich Text",
  heading: "Heading",
  text: "Text",
  stat: "Stat",
  divider: "Divider",
  image: "Image",
  "related-list": "Related list",
  tabs: "Tabs",
  button: "Button",
  "legacy-widget": "Legacy Widget",
};

export function createScreenSection(
  input: {
    id?: string;
    label?: string;
    blocks?: ScreenBlockV1[];
  } = {}
): ScreenSectionV1 {
  const label = input.label ?? "Details";
  return {
    id: input.id ?? createScreenNodeId("section"),
    type: "section",
    label,
    data: { title: label },
    blocks: input.blocks ?? [],
  };
}

const createReadBinding = (
  blockId: string,
  propPath: string,
  field: string,
  mode: CustomScreenBindingMode = "read"
): ScreenFieldBinding => ({
  id: buildScreenFieldBindingId(blockId, propPath),
  blockId,
  propPath,
  source: "entry",
  field,
  mode,
});

export function createScreenBlock(input: {
  type: ScreenBlockKind;
  id?: string;
  field?: string;
  label?: string;
  mode?: CustomScreenBindingMode;
  // TASK-498-02 B2: the sole caller passes the relation target so this factory
  // can seed related-list data without re-deriving metadata from a field name.
  relationTarget?: string;
}): { block: ScreenBlockV1; bindings: ScreenFieldBinding[] } {
  const id = input.id ?? createScreenNodeId(input.type);
  const label = input.label ?? (input.field ? input.field : screenBlockLabels[input.type]);
  const base = {
    id,
    type: input.type,
    data: {
      label,
      ...(input.field ? { field: input.field } : {}),
    },
  } satisfies ScreenBlockV1;

  if (input.type === "field") {
    const field = input.field ?? "title";
    return {
      block: {
        ...base,
        type: "field",
        data: {
          label,
          helper: "",
          display: "stacked",
          field,
        },
      },
      bindings: [
        {
          id: buildScreenFieldBindingId(id, "value"),
          blockId: id,
          propPath: "value",
          source: "entry",
          field,
          mode: input.mode ?? "readwrite",
        },
      ],
    };
  }

  if (input.type === "field-group") {
    return {
      block: {
        ...base,
        type: "field-group",
        data: {
          title: label,
          description: "",
        },
        slots: { content: [] },
      },
      bindings: [],
    };
  }

  if (input.type === "columns") {
    return {
      block: {
        ...base,
        type: "columns",
        data: {
          label,
          columns: 2,
        },
        slots: { left: [], right: [] },
      },
      bindings: [],
    };
  }

  if (input.type === "record-header") {
    return {
      block: {
        ...base,
        type: "record-header",
        data: {
          eyebrow: "",
          title: label,
          subtitle: "",
        },
      },
      bindings: [
        {
          id: buildScreenFieldBindingId(id, "title"),
          blockId: id,
          propPath: "title",
          source: "entry",
          field: input.field ?? "title",
          mode: input.mode ?? "read",
        },
      ],
    };
  }

  if (input.type === "rich-text") {
    return {
      block: {
        ...base,
        type: "rich-text",
        data: {
          content: "Add supporting text",
          tone: "muted",
        },
      },
      bindings: [],
    };
  }

  if (input.type === "heading") {
    return {
      block: {
        ...base,
        type: "heading",
        data: {
          label,
          text: input.field ? "" : label,
          level: 2,
          align: "left",
          ...(input.field ? { field: input.field } : {}),
        },
      },
      bindings: input.field ? [createReadBinding(id, "text", input.field)] : [],
    };
  }

  if (input.type === "text") {
    return {
      block: {
        ...base,
        type: "text",
        data: {
          label,
          content: "Add supporting text",
          tone: "default",
        },
      },
      bindings: [],
    };
  }

  if (input.type === "stat") {
    return {
      block: {
        ...base,
        type: "stat",
        data: {
          label,
          format: "number",
          trend: "auto",
          ...(input.field ? { field: input.field } : {}),
        },
      },
      bindings: input.field ? [createReadBinding(id, "value", input.field)] : [],
    };
  }

  if (input.type === "divider") {
    return {
      block: {
        ...base,
        type: "divider",
        data: {
          label,
          variant: "line",
        },
      },
      bindings: [],
    };
  }

  if (input.type === "image") {
    return {
      block: {
        ...base,
        type: "image",
        data: {
          label,
          fit: "cover",
          ...(input.field ? { field: input.field } : {}),
        },
      },
      bindings: input.field ? [createReadBinding(id, "src", input.field)] : [],
    };
  }

  if (input.type === "related-list") {
    return {
      block: {
        ...base,
        type: "related-list",
        data: {
          label,
          target: input.relationTarget ?? "",
          displayField: "",
          variant: "checklist",
          limit: 5,
          ...(input.field ? { field: input.field } : {}),
        },
      },
      bindings: input.field ? [createReadBinding(id, "items", input.field)] : [],
    };
  }

  if (input.type === "tabs") {
    return {
      block: {
        ...base,
        type: "tabs",
        data: {
          label,
          tabs: [
            { id: "tab-1", label: "Tab 1" },
            { id: "tab-2", label: "Tab 2" },
          ],
        },
        slots: { "tab-1": [], "tab-2": [] },
      },
      bindings: [],
    };
  }

  if (input.type === "button") {
    return {
      block: {
        ...base,
        type: "button",
        data: {
          label,
          action: "link",
          variant: "primary",
          ...(input.field ? { field: input.field } : {}),
        },
      },
      bindings: input.field ? [createReadBinding(id, "href", input.field)] : [],
    };
  }

  return { block: base, bindings: [] };
}
