export const accessLogMethodValues = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

export type AccessLogMethod = (typeof accessLogMethodValues)[number];

const accessLogMethods = new Set<string>(accessLogMethodValues);

export const isAccessLogMethod = (value: string): value is AccessLogMethod =>
  accessLogMethods.has(value);
