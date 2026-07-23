import { buildDefaultListViewDefinition } from "../../../core/services/customScreens/customScreenSchemas";

export const buildV4WithBlocks = (blocks: unknown[]) => ({
  schemaVersion: 4,
  listView: buildDefaultListViewDefinition(),
  editorView: {
    document: {
      schemaVersion: 1,
      sections: [
        {
          id: "section-default",
          type: "section",
          data: { title: "Details" },
          blocks,
        },
      ],
    },
    bindings: [],
    saveMode: "entry",
    interactionMode: "inline",
  },
});

export const fixedKindDataCases = {
  heading: { label: "", text: "", level: 3, align: "right", field: "headline" },
  text: { content: "", tone: "muted", label: " " },
  stat: {
    label: "Total",
    format: "money",
    trend: "flat",
    deltaField: "",
    field: "amount",
  },
  divider: { variant: "label", label: "" },
  image: {
    label: "Image",
    fit: "contain",
    ratio: "16:9",
    field: "heroImage",
    src: "/media/hero.jpg",
  },
  "related-list": {
    label: "Related",
    target: "",
    displayField: "title",
    variant: "cards",
    limit: 50,
    field: "relatedItems",
  },
  tabs: {
    label: "Tabs",
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "details", label: "Details" },
    ],
  },
  button: {
    label: "Open",
    action: "link",
    variant: "secondary",
    href: "/catalog",
    field: "targetUrl",
  },
} as const;

export const fixedKindBlock = (
  type: keyof typeof fixedKindDataCases,
  data: Record<string, unknown> = fixedKindDataCases[type]
) => ({
  id: `${type}-strict`,
  type,
  data,
  ...(type === "tabs" ? { slots: { overview: [], details: [] } } : {}),
});
