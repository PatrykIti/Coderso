import {
  TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION,
  type Task551SanitizedCatalogProjectionV1,
} from "./digestContract";

const INVALID_ERROR_MESSAGE = "database_baseline_invalid";
function invalid(): never {
  throw new Error(INVALID_ERROR_MESSAGE);
}

type CatalogRows = readonly Record<string, unknown>[];
export type Task551CatalogClient = Readonly<{
  unsafe: (query: string, values?: readonly unknown[]) => Promise<CatalogRows>;
}>;

const tableNames = TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION.tables.map((table) => table.name);

function stringValue(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) invalid();
  return value;
}

function stringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) invalid();
  return value.map(stringValue);
}

function numberValue(value: unknown): number {
  const result = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(result) || result < 1) invalid();
  return result;
}

function expectedNames(
  table: (typeof TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION.tables)[number],
  key: "columns" | "constraints" | "indexes"
): ReadonlySet<string> {
  return new Set(table[key].map((entry) => entry.name));
}

function buildColumns(
  table: (typeof TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION.tables)[number],
  rows: CatalogRows
): Task551SanitizedCatalogProjectionV1["tables"][number]["columns"] {
  const requiredNames = expectedNames(table, "columns");
  const tableRows = rows.filter(
    (row) => row.table_name === table.name && requiredNames.has(row.column_name as string)
  );
  const seenNames = new Set<string>();
  const columns = tableRows.map((row) => {
    const name = stringValue(row.column_name);
    if (!requiredNames.has(name) || seenNames.has(name)) invalid();
    seenNames.add(name);
    const isNullable = row.is_nullable;
    if (isNullable !== "YES" && isNullable !== "NO") invalid();
    return {
      name,
      postgresType: stringValue(row.udt_name),
      nullable: isNullable === "YES",
      ordinal: numberValue(row.ordinal_position),
    };
  });
  if (seenNames.size !== requiredNames.size) invalid();
  const ordered = columns.sort((left, right) => left.ordinal - right.ordinal);
  if (ordered.some((column, index) => column.name !== table.columns[index]?.name)) invalid();
  return ordered.map(({ ordinal: _ordinal, ...column }) => column);
}

function constraintKind(value: unknown): "primary-key" | "foreign-key" | "unique" | "check" {
  if (value === "p") return "primary-key";
  if (value === "f") return "foreign-key";
  if (value === "u") return "unique";
  if (value === "c") return "check";
  invalid();
}

function buildConstraints(
  table: (typeof TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION.tables)[number],
  rows: CatalogRows
): Task551SanitizedCatalogProjectionV1["tables"][number]["constraints"] {
  const requiredNames = expectedNames(table, "constraints");
  const tableRows = rows.filter((row) => requiredNames.has(row.constraint_name as string));
  const seenNames = new Set<string>();
  const constraints = tableRows.map((row) => {
    const kind = constraintKind(row.contype);
    const name = stringValue(row.constraint_name);
    if (seenNames.has(name)) invalid();
    seenNames.add(name);
    const columns = stringArray(row.column_names);
    const referencedTable = kind === "foreign-key" ? stringValue(row.foreign_table_name) : null;
    const referencedColumns = kind === "foreign-key" ? stringArray(row.foreign_column_names) : [];
    if (kind === "foreign-key" && columns.length !== referencedColumns.length) invalid();
    if (
      kind !== "foreign-key" &&
      ((row.foreign_table_name !== null && row.foreign_table_name !== undefined) ||
        referencedColumns.length !== 0)
    )
      invalid();
    return {
      name,
      kind,
      columns,
      referencedTable,
      referencedColumns,
    };
  });
  if (seenNames.size !== requiredNames.size) invalid();
  return constraints;
}

function buildIndexes(
  table: (typeof TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION.tables)[number],
  rows: CatalogRows
): Task551SanitizedCatalogProjectionV1["tables"][number]["indexes"] {
  const requiredNames = expectedNames(table, "indexes");
  const grouped = new Map<
    string,
    {
      tableName: string;
      name: string;
      unique: boolean;
      method: string;
      columns: { position: number; name: string; direction: "asc" | "desc" }[];
    }
  >();
  for (const row of rows) {
    if (!requiredNames.has(row.index_name as string)) continue;
    if (row.has_expression === true || row.has_predicate === true) invalid();
    const tableName = stringValue(row.table_name);
    const name = stringValue(row.index_name);
    const key = `${tableName}\u0000${name}`;
    const current = grouped.get(key) ?? {
      tableName,
      name,
      unique: row.is_unique === true,
      method: stringValue(row.method),
      columns: [],
    };
    if (current.unique !== (row.is_unique === true) || current.method !== stringValue(row.method))
      invalid();
    const position = numberValue(row.column_position);
    if (current.columns.some((column) => column.position === position)) invalid();
    current.columns.push({
      position,
      name: stringValue(row.column_name),
      direction: row.is_desc === true ? "desc" : "asc",
    });
    grouped.set(key, current);
  }
  if (grouped.size !== requiredNames.size) invalid();
  return [...grouped.values()].map((index) => ({
    name: index.name,
    unique: index.unique,
    method: index.method,
    columns: (() => {
      const ordered = index.columns.sort((left, right) => left.position - right.position);
      if (ordered.some((column, position) => column.position !== position + 1)) invalid();
      if (new Set(ordered.map((column) => column.name)).size !== ordered.length) invalid();
      return ordered.map(({ position: _position, ...column }) => column);
    })(),
  }));
}

export async function readTask551SanitizedCatalogProjection(
  sql: Task551CatalogClient
): Promise<Task551SanitizedCatalogProjectionV1> {
  const columnRows = await sql.unsafe(
    "SELECT table_name, column_name, udt_name, is_nullable, ordinal_position FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ANY($1::text[]) AND column_name = ANY($2::text[])",
    [
      tableNames,
      [
        ...new Set(
          TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION.tables.flatMap((table) =>
            table.columns.map((column) => column.name)
          )
        ),
      ],
    ] as const
  );
  const constraintRows = await sql.unsafe(
    "SELECT cls.relname AS table_name, con.conname AS constraint_name, con.contype, refcls.relname AS foreign_table_name, COALESCE((SELECT array_agg(att.attname ORDER BY key.ordinality) FROM unnest(con.conkey) WITH ORDINALITY AS key(attnum, ordinality) JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = key.attnum), ARRAY[]::text[]) AS column_names, COALESCE((SELECT array_agg(att.attname ORDER BY key.ordinality) FROM unnest(con.confkey) WITH ORDINALITY AS key(attnum, ordinality) JOIN pg_attribute att ON att.attrelid = con.confrelid AND att.attnum = key.attnum), ARRAY[]::text[]) AS foreign_column_names FROM pg_constraint con JOIN pg_class cls ON cls.oid = con.conrelid JOIN pg_namespace ns ON ns.oid = cls.relnamespace LEFT JOIN pg_class refcls ON refcls.oid = con.confrelid WHERE ns.nspname = 'public' AND cls.relname = ANY($1::text[]) AND con.conname = ANY($2::text[]) AND con.contype IN ('p', 'f', 'u', 'c')",
    [
      tableNames,
      [
        ...new Set(
          TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION.tables.flatMap((table) =>
            table.constraints.map((constraint) => constraint.name)
          )
        ),
      ],
    ] as const
  );
  const indexRows = await sql.unsafe(
    "SELECT table_class.relname AS table_name, index_class.relname AS index_name, index_info.indisunique AS is_unique, access_method.amname AS method, key.ordinality AS column_position, attribute.attname AS column_name, ((index_info.indoption[key.ordinality] & 1) = 1) AS is_desc, (index_info.indexprs IS NOT NULL) AS has_expression, (index_info.indpred IS NOT NULL) AS has_predicate FROM pg_index index_info JOIN pg_class table_class ON table_class.oid = index_info.indrelid JOIN pg_namespace table_namespace ON table_namespace.oid = table_class.relnamespace JOIN pg_class index_class ON index_class.oid = index_info.indexrelid JOIN pg_am access_method ON access_method.oid = index_class.relam LEFT JOIN LATERAL unnest(index_info.indkey) WITH ORDINALITY AS key(attnum, ordinality) ON key.ordinality <= index_info.indnkeyatts LEFT JOIN pg_attribute attribute ON attribute.attrelid = index_info.indrelid AND attribute.attnum = key.attnum WHERE table_namespace.nspname = 'public' AND table_class.relname = ANY($1::text[]) AND index_class.relname = ANY($2::text[])",
    [
      tableNames,
      [
        ...new Set(
          TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION.tables.flatMap((table) =>
            table.indexes.map((index) => index.name)
          )
        ),
      ],
    ] as const
  );
  const constraintsByTable = new Map<string, CatalogRows>();
  for (const row of constraintRows) {
    const tableName = stringValue(row.table_name);
    constraintsByTable.set(tableName, [...(constraintsByTable.get(tableName) ?? []), row]);
  }
  const indexesByTable = new Map<string, CatalogRows>();
  for (const row of indexRows) {
    const tableName = stringValue(row.table_name);
    indexesByTable.set(tableName, [...(indexesByTable.get(tableName) ?? []), row]);
  }
  return {
    version: "task551-sanitized-catalog@v1",
    tables: TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION.tables.map((table) => ({
      schema: "public",
      name: table.name,
      columns: buildColumns(table, columnRows),
      constraints: buildConstraints(table, constraintsByTable.get(table.name) ?? []),
      indexes: buildIndexes(table, indexesByTable.get(table.name) ?? []),
    })),
  };
}
