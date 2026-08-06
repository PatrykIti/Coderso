/**
 * Slug token derivation for the entry editor. Both the slug field
 * (`EntryTitleSlugFields`, "generate from title") and the authored field-group tab
 * ids (`entryFieldGroups`) need the same lowercase dash-separated token, so it is
 * defined once here instead of being duplicated on either side.
 */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
