const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeSnapshotValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeSnapshotValue(item));
  }

  if (isRecord(value)) {
    const normalized: Record<string, unknown> = {};
    const keys = Object.keys(value).sort((left, right) => left.localeCompare(right));
    for (const key of keys) {
      normalized[key] = normalizeSnapshotValue(value[key]);
    }
    return normalized;
  }

  return value;
};

export function serializeRevisionSnapshot(value: unknown): string {
  return JSON.stringify(normalizeSnapshotValue(value));
}

export function areRevisionSnapshotsEqual(left: unknown, right: unknown): boolean {
  return serializeRevisionSnapshot(left) === serializeRevisionSnapshot(right);
}

