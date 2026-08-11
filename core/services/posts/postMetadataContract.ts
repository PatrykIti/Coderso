export const POST_METADATA_REQUEST_MAX_BYTES = 64 * 1024;

export const POST_METADATA_STATUSES = ["draft", "published", "scheduled", "archived"] as const;

export type PostMetadataStatus = (typeof POST_METADATA_STATUSES)[number];

export type PostMetadataTaxonomy = {
  categoryId?: string | null;
  tagIds?: string[];
};

export type PostMetadataSeo = {
  title?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
};

export type PostMetadataMutationV1 = {
  status?: PostMetadataStatus;
  scheduledAt?: string | null;
  tags?: string[];
  taxonomy?: PostMetadataTaxonomy;
  seo?: PostMetadataSeo;
};

export const postMetadataSchema = {
  type: "object",
  minProperties: 1,
  properties: {
    status: {
      type: "string",
      enum: POST_METADATA_STATUSES,
    },
    scheduledAt: { type: ["string", "null"], format: "date-time" },
    tags: {
      type: "array",
      maxItems: 20,
      items: { type: "string", minLength: 1, maxLength: 24 },
    },
    taxonomy: {
      type: "object",
      minProperties: 1,
      properties: {
        categoryId: { type: ["string", "null"] },
        tagIds: {
          type: "array",
          maxItems: 20,
          items: { type: "string", minLength: 1 },
        },
      },
      additionalProperties: false,
    },
    seo: {
      type: "object",
      minProperties: 1,
      properties: {
        title: { type: ["string", "null"] },
        description: { type: ["string", "null"] },
        canonicalUrl: { type: ["string", "null"] },
        robots: { type: ["string", "null"] },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const copyPostMetadataTaxonomy = (value: unknown): PostMetadataTaxonomy => {
  const source = isRecord(value) ? value : {};
  const taxonomy: PostMetadataTaxonomy = {};
  if (Object.hasOwn(source, "categoryId")) {
    taxonomy.categoryId = source.categoryId as string | null;
  }
  if (Object.hasOwn(source, "tagIds") && Array.isArray(source.tagIds)) {
    taxonomy.tagIds = [...source.tagIds] as string[];
  }
  return taxonomy;
};

const copyPostMetadataSeo = (value: unknown): PostMetadataSeo => {
  const source = isRecord(value) ? value : {};
  const seo: PostMetadataSeo = {};
  if (Object.hasOwn(source, "title")) seo.title = source.title as string | null;
  if (Object.hasOwn(source, "description")) seo.description = source.description as string | null;
  if (Object.hasOwn(source, "canonicalUrl")) {
    seo.canonicalUrl = source.canonicalUrl as string | null;
  }
  if (Object.hasOwn(source, "robots")) seo.robots = source.robots as string | null;
  return seo;
};

/**
 * Copies only schema-owned own properties. Callers validate the input first;
 * this projection retains field absence through the service boundary.
 */
export const projectPostMetadataMutation = (
  validated: Record<string, unknown>
): PostMetadataMutationV1 => {
  const projected: PostMetadataMutationV1 = {};
  if (Object.hasOwn(validated, "status")) {
    projected.status = validated.status as PostMetadataStatus;
  }
  if (Object.hasOwn(validated, "scheduledAt")) {
    projected.scheduledAt = validated.scheduledAt as string | null;
  }
  if (Object.hasOwn(validated, "tags") && Array.isArray(validated.tags)) {
    projected.tags = [...validated.tags] as string[];
  }
  if (Object.hasOwn(validated, "taxonomy")) {
    projected.taxonomy = copyPostMetadataTaxonomy(validated.taxonomy);
  }
  if (Object.hasOwn(validated, "seo")) {
    projected.seo = copyPostMetadataSeo(validated.seo);
  }
  return projected;
};

export const requestsPostPublicationMutation = (value: PostMetadataMutationV1): boolean =>
  Object.hasOwn(value, "status") || Object.hasOwn(value, "scheduledAt");

const RFC3339_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|([+-])(\d{2}):(\d{2}))$/;

const isLeapYear = (year: number): boolean =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const daysInMonth = (year: number, month: number): number => {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

/**
 * Accepts only the uppercase RFC3339 wire shape and rejects JavaScript Date
 * rollover semantics before constructing the instant.
 */
export const parseExactRfc3339DateTime = (value: string): Date | undefined => {
  const match = RFC3339_DATE_TIME.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[9] === undefined ? 0 : Number(match[9]);
  const offsetMinute = match[10] === undefined ? 0 : Number(match[10]);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month) ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : undefined;
};
