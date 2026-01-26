export const settingsUpdateSchema = {
  type: "object",
  required: ["value"],
  properties: {
    value: {},
  },
  additionalProperties: false,
};

export const settingsBulkSchema = {
  type: "object",
  minProperties: 1,
  additionalProperties: true,
};
