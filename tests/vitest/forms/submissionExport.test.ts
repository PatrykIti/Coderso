import { expect, test, vi } from "vitest";

import {
  buildFormSubmissionsExport,
  serializeSubmissionsCsv,
  serializeSubmissionsJson,
  type SubmissionExportRow,
} from "../../../core/services/forms/submissionExport";

const fieldFixtures = [
  { key: "fullName", name: "fullName", label: "Full name", orderIndex: 0 },
  { key: "email", name: "email", label: "Email", orderIndex: 1 },
];

const rowFixtures: SubmissionExportRow[] = [
  {
    id: "sub-1",
    createdAt: "2026-06-28T10:00:00.000Z",
    status: "new",
    payload: { fullName: "Ada", email: "ada@example.com" },
  },
  {
    id: "sub-2",
    createdAt: new Date("2026-06-29T11:30:00.000Z"),
    status: "spam",
    payload: { fullName: "Linus", email: "linus@example.com", legacy: "kept" },
  },
];

test("CSV header lists base columns then field labels in orderIndex order", () => {
  const csv = serializeSubmissionsCsv(fieldFixtures, rowFixtures);
  const lines = csv.split("\n");
  expect(lines[0]).toBe("Submission ID,Received At,Status,Full name,Email");
});

test("CSV quotes cells with commas, quotes, CR and LF and doubles embedded quotes", () => {
  const rows: SubmissionExportRow[] = [
    {
      id: "sub-1",
      createdAt: "2026-06-28T10:00:00.000Z",
      status: "new",
      payload: { text: 'He said "hi", then left' },
    },
    {
      id: "sub-2",
      createdAt: "2026-06-28T10:00:00.000Z",
      status: "new",
      payload: { text: "line one\nline two" },
    },
  ];
  const csv = serializeSubmissionsCsv([{ key: "text", label: "Comment" }], rows);
  expect(csv).toContain('"He said ""hi"", then left"');
  expect(csv).toContain('"line one\nline two"');
});

test("CSV prefixes cells starting with =, +, -, or @ to block formula injection", () => {
  const rows: SubmissionExportRow[] = [
    {
      id: "sub-1",
      createdAt: "2026-06-28T10:00:00.000Z",
      status: "new",
      payload: {
        text: '=HYPERLINK("https://evil.example")',
        plus: "+1-234",
        minus: "-SUM(A1:A9)",
        at: "@user",
      },
    },
  ];
  const columns = [
    { key: "text", label: "Text" },
    { key: "plus", label: "Plus" },
    { key: "minus", label: "Minus" },
    { key: "at", label: "At" },
  ];
  const csv = serializeSubmissionsCsv(columns, rows);
  const line = csv.split("\n")[1]!;
  expect(line).toContain("'=HYPERLINK(");
  expect(line).toContain("'+1-234");
  expect(line).toContain("'-SUM(A1:A9)");
  expect(line).toContain("'@user");
});

test("CSV serializes object/array payload values as JSON and null/undefined as empty cells", () => {
  const rows: SubmissionExportRow[] = [
    {
      id: "sub-1",
      createdAt: "2026-06-28T10:00:00.000Z",
      status: "new",
      payload: {
        choices: ["a", "b"],
        address: { city: "Krakow" },
        missing: null,
        absent: undefined,
      },
    },
  ];
  const csv = serializeSubmissionsCsv(
    [
      { key: "choices", label: "Choices" },
      { key: "address", label: "Address" },
      { key: "missing", label: "Missing" },
      { key: "absent", label: "Absent" },
    ],
    rows
  );
  const dataLine = csv.split("\n")[1]!;
  expect(dataLine).toContain('"[""a"",""b""]"');
  expect(dataLine).toContain('"{""city"":""Krakow""}"');
  expect(csv).toMatch(/,,$/); // null/undefined payload cells serialize as empty cells
});

test("buildFormSubmissionsExport appends extra payload keys not in the schema as trailing columns", async () => {
  getFormMock.mockResolvedValueOnce({
    id: "form-1",
    name: "Contact Form",
    slug: "contact-form",
    status: "published",
    submissionAccess: "public",
    settings: {},
    description: null,
    successMessage: null,
    successRedirectUrl: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  listFormFieldsMock.mockResolvedValueOnce([]);
  listSubmissionsMock.mockResolvedValueOnce([
    {
      id: "sub-2",
      formId: "form-1",
      payload: { fullName: "Linus", email: "linus@example.com", legacy: "kept" },
      status: "new",
      ip: null,
      userAgent: null,
      createdAt: new Date("2026-06-29T11:30:00.000Z"),
    },
  ]);
  const result = await buildFormSubmissionsExport(
    "form-1",
    "csv",
    new Date("2026-06-28T12:00:00.000Z")
  );
  const lines = result.content.split("\n");
  expect(lines[0]).toBe("Submission ID,Received At,Status,fullName,email,legacy");
  expect(lines[1]).toContain(",kept");
});

test("JSON format returns { id, createdAt, status, data } rows and never ip/userAgent", () => {
  const json = JSON.parse(serializeSubmissionsJson(rowFixtures)) as Array<Record<string, unknown>>;
  expect(json).toHaveLength(2);
  expect(json[0]).toEqual({
    id: "sub-1",
    createdAt: "2026-06-28T10:00:00.000Z",
    status: "new",
    data: { fullName: "Ada", email: "ada@example.com" },
  });
  expect(json[1]?.createdAt).toBe("2026-06-29T11:30:00.000Z");
  for (const row of json) {
    expect(row).not.toHaveProperty("ip");
    expect(row).not.toHaveProperty("userAgent");
  }
});

test("empty submissions produce a header-only CSV, an empty JSON array, and totalRows 0", async () => {
  expect(serializeSubmissionsCsv(fieldFixtures, [])).toBe(
    "Submission ID,Received At,Status,Full name,Email"
  );
  expect(serializeSubmissionsJson([])).toBe("[]");

  getFormMock.mockResolvedValueOnce({
    id: "form-1",
    name: "Contact Form",
    slug: "contact-form",
    status: "published",
    submissionAccess: "public",
    settings: {},
    description: null,
    successMessage: null,
    successRedirectUrl: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  listFormFieldsMock.mockResolvedValueOnce([]);
  listSubmissionsMock.mockResolvedValueOnce([]);
  const result = await buildFormSubmissionsExport(
    "form-1",
    "csv",
    new Date("2026-06-28T12:00:00.000Z")
  );
  expect(result.totalRows).toBe(0);
  expect(result.content).toBe("Submission ID,Received At,Status");
});

vi.mock("../../../core/services/forms/formsService", () => ({
  getForm: vi.fn(),
  listFormFields: vi.fn(),
  toFieldRecord: vi.fn((row: { name: string; label: string; orderIndex: number }) => ({
    id: "field-id",
    type: "text",
    name: row.name,
    label: row.label,
    required: false,
    orderIndex: row.orderIndex,
    settings: {},
  })),
}));

vi.mock("../../../core/services/forms/submissionService", () => ({
  listSubmissions: vi.fn(),
}));

import { getForm, listFormFields } from "../../../core/services/forms/formsService";
import { listSubmissions } from "../../../core/services/forms/submissionService";

const getFormMock = vi.mocked(getForm);
const listFormFieldsMock = vi.mocked(listFormFields);
const listSubmissionsMock = vi.mocked(listSubmissions);

const buildFormSubmissionsExportWithFakes = async (
  formId: string,
  format: "csv" | "json",
  now = new Date("2026-06-28T12:00:00.000Z")
) => {
  getFormMock.mockResolvedValueOnce({
    id: formId,
    name: "Contact Form",
    slug: "Contact Form!",
    status: "published",
    submissionAccess: "public",
    settings: {},
    description: null,
    successMessage: null,
    successRedirectUrl: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  // Listed OUT of orderIndex order to prove buildColumns sorts by orderIndex.
  listFormFieldsMock.mockResolvedValueOnce([
    {
      id: "f2",
      formId,
      type: "email",
      label: "Email",
      name: "email",
      required: true,
      settings: {},
      orderIndex: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      id: "f1",
      formId,
      type: "text",
      label: "Full name",
      name: "fullName",
      required: false,
      settings: {},
      orderIndex: 0,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ]);
  listSubmissionsMock.mockResolvedValueOnce([
    {
      id: "sub-1",
      formId,
      payload: { fullName: "Ada", email: "ada@example.com" },
      status: "new",
      ip: "203.0.113.7",
      userAgent: "Mozilla/5.0",
      createdAt: new Date("2026-06-28T10:00:00.000Z"),
    },
  ]);
  return buildFormSubmissionsExport(formId, format, now);
};

test("buildFormSubmissionsExport throws form_not_found when the form is missing", async () => {
  getFormMock.mockResolvedValueOnce(null as unknown as Awaited<ReturnType<typeof getForm>>);
  await expect(buildFormSubmissionsExport("missing", "csv")).rejects.toThrow("form_not_found");
});

test("buildFormSubmissionsExport builds the CSV envelope with slugified file name", async () => {
  const result = await buildFormSubmissionsExportWithFakes("form-1", "csv");
  expect(result.contentType).toBe("text/csv");
  expect(result.fileName).toBe("coderso-form-contact-form-submissions-2026-06-28.csv");
  expect(result.totalRows).toBe(1);
  expect(result.content.split("\n")[0]).toBe("Submission ID,Received At,Status,Full name,Email");
  expect(result.content).not.toContain("203.0.113.7");
  expect(result.content).not.toContain("Mozilla");
});

test("buildFormSubmissionsExport builds the JSON envelope and omits PII columns", async () => {
  const result = await buildFormSubmissionsExportWithFakes("form-1", "json");
  expect(result.contentType).toBe("application/json");
  expect(result.fileName).toBe("coderso-form-contact-form-submissions-2026-06-28.json");
  expect(result.totalRows).toBe(1);
  const parsed = JSON.parse(result.content) as Array<Record<string, unknown>>;
  expect(parsed).toHaveLength(1);
  expect(parsed[0]).toEqual({
    id: "sub-1",
    createdAt: "2026-06-28T10:00:00.000Z",
    status: "new",
    data: { fullName: "Ada", email: "ada@example.com" },
  });
});

test("buildFormSubmissionsExport falls back to a safe 'form' slug segment when the slug is unusable", async () => {
  getFormMock.mockResolvedValueOnce({
    id: "form-2",
    name: "Support Desk",
    slug: "",
    status: "draft",
    submissionAccess: "public",
    settings: {},
    description: null,
    successMessage: null,
    successRedirectUrl: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  listFormFieldsMock.mockResolvedValueOnce([]);
  listSubmissionsMock.mockResolvedValueOnce([]);
  const result = await buildFormSubmissionsExport(
    "form-2",
    "csv",
    new Date("2026-06-28T12:00:00.000Z")
  );
  expect(result.fileName).toBe("coderso-form-form-submissions-2026-06-28.csv");
});
