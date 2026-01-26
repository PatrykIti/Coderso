export const menuCreateSchema = {
  type: "object",
  required: ["name", "location"],
  properties: {
    name: { type: "string" },
    location: { type: ["string", "null"] },
  },
  additionalProperties: false,
};

export const menuUpdateSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    location: { type: ["string", "null"] },
  },
  additionalProperties: false,
};

export const menuItemsSchema = {
  type: "object",
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        required: ["label"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          href: { type: "string" },
          pageId: { type: "string" },
          parentId: { type: ["string", "null"] },
          orderIndex: { type: "number" },
        },
        oneOf: [
          { required: ["href"], not: { required: ["pageId"] } },
          { required: ["pageId"], not: { required: ["href"] } },
        ],
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};
