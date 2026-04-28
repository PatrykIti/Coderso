function humanize(value: string) {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function getContentTypeLabels(nameOrSlug?: string | null) {
  const base = nameOrSlug ? humanize(nameOrSlug) : "";
  const label = base || "Content";
  return { singular: label, plural: label };
}
