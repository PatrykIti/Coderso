export const adminLimitQueryParamSchema = {
  type: "string",
  pattern: "^[1-9][0-9]*$",
};

export const adminCursorQueryParamSchema = {
  type: "string",
  minLength: 1,
  maxLength: 500,
};

export const adminDateTimeQueryParamSchema = {
  type: "string",
  format: "date-time",
};

export const adminQueryTextParamSchema = {
  type: "string",
  minLength: 1,
  maxLength: 200,
};
