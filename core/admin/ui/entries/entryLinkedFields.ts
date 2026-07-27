/**
 * The entry columns a content-type schema may ALSO expose as a field of its own name.
 *
 * `title` and `slug` are columns on the entry and legal schema field names at the same time —
 * the default content-type schema declares a required `title` — so the editor can end up
 * holding two copies of one value: the header composer's state and `values[name]`. Two copies
 * of one value is only safe while every place that touches them agrees which one is
 * authoritative, and they did not:
 *
 *   - `buildEntryPayloadData` resolves `data[name]` from the COLUMN, but only the header
 *     composer wrote both copies; a keystroke in the schema-rendered field wrote its own copy
 *     and was then discarded by the very save meant to persist it;
 *   - hydration split the same way — the header took `entry[name]`, the field took
 *     `entry.data[name]` — so a stored entry whose two halves had drifted apart showed the
 *     user two values for one field and saved the one they were not looking at.
 *
 * One value, one writer, one hydration source, and the column is the authority for both. Every
 * place that reads or writes a linked name takes the list from here, so a third copy of the
 * rule cannot be added in one place only.
 */
export const ENTRY_LINKED_FIELD_NAMES = ["title", "slug"] as const;

export type EntryLinkedFieldName = (typeof ENTRY_LINKED_FIELD_NAMES)[number];

/** The column values, keyed by linked name, that hydration and the payload both resolve from. */
export type EntryLinkedColumnValues = Readonly<Record<EntryLinkedFieldName, string>>;

export const isEntryLinkedFieldName = (name: string): name is EntryLinkedFieldName =>
  ENTRY_LINKED_FIELD_NAMES.some((linkedName) => linkedName === name);
