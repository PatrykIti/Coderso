export const menuCreateSchema = {
  type: "object",
  required: ["name", "location"],
  properties: {
    name: { type: "string" },
    location: { type: ["string", "null"] },
    status: { enum: ["draft", "published"] },
  },
  additionalProperties: false,
};

export const menuUpdateSchema = {
  type: "object",
  minProperties: 1,
  properties: {
    name: { type: "string" },
    location: { type: ["string", "null"] },
    status: { enum: ["draft", "published"] },
    // Deep validation is owned by `normalizeMenuAppearance` in the menu
    // service (reject-unknown, machine-readable `menu_appearance_invalid`);
    // `null` clears the stored appearance (TASK-458-02).
    appearance: { type: ["object", "null"] },
    // Deep validation is owned by `normalizeMenuNavExtras` (Page v2 block
    // schema + button/image allowlist, machine-readable
    // `menu_nav_extras_invalid`); `null` clears the slot (TASK-458-03).
    extras: { type: ["array", "null"] },
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
          settings: {
            type: "object",
            additionalProperties: false,
            properties: {
              visibility: {
                enum: ["all", "logged_in", "logged_out"],
              },
              badge: {
                type: "object",
                additionalProperties: false,
                required: ["label"],
                properties: {
                  label: { type: "string" },
                  tone: {
                    enum: ["default", "accent", "success", "warning", "danger"],
                  },
                },
              },
              description: { type: "string" },
              icon: { type: "string" },
            },
          },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};
