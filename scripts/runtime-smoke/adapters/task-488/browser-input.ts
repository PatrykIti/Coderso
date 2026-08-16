import { SmokeError } from "../../contracts";
import type {
  Task488AssertionDescriptor,
  Task488ScenarioDescriptor,
  Task488VariantDescriptor,
} from "./descriptors";
import type { Task488FixtureSpec } from "./fixture";

/**
 * TASK-488 browser input contract: the immutable per-segment configuration
 * embedded into each run-code action source. Values are validated and frozen
 * before materialization so the action source never sees a half-built cfg.
 */

export const TASK_488_ADMIN_ORIGIN = "http://127.0.0.1:5173";
export const TASK_488_API_ORIGIN = "http://127.0.0.1:3000";

export interface Task488BrowserCredentials {
  readonly email: string;
  readonly password: string;
}

export interface Task488BrowserInput {
  readonly schemaVersion: 1;
  readonly scenarioId: string;
  readonly variantId: "light" | "dark";
  readonly theme: "light" | "dark";
  readonly viewport: Readonly<{ readonly width: number; readonly height: number }>;
  readonly adminOrigin: string;
  readonly apiOrigin: string;
  readonly adminPath: string;
  readonly descriptorSha256: string;
  readonly fixtureDigest: string;
  readonly fixture: Readonly<{
    readonly marker: string;
    readonly productSlug: string;
    readonly productTitle: string;
    readonly productPriceAmount: number;
    readonly productCurrency: string;
    readonly collectionName: string;
    readonly collectionSlug: string;
    readonly collectionDescription: string;
    readonly variantTitle: string;
    readonly variantSku: string;
  }>;
  readonly credentials: Task488BrowserCredentials;
  readonly assertions: readonly Task488AssertionDescriptor[];
  readonly absoluteScreenshotPath: string;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/u;

function bounded(value: string | undefined): string | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    Buffer.byteLength(value) > 8 * 1024 ||
    value.includes("\0")
  ) {
    return null;
  }
  return value;
}

export function task488AdminCredentials(source: NodeJS.ProcessEnv): Task488BrowserCredentials {
  const email = bounded(
    source.CODERSO_PLAYWRIGHT_EMAIL ?? source.PLAYWRIGHT_ADMIN_EMAIL ?? source.ADMIN_EMAIL
  );
  const password = bounded(
    source.CODERSO_PLAYWRIGHT_PASSWORD ?? source.PLAYWRIGHT_ADMIN_PASSWORD ?? source.ADMIN_PASSWORD
  );
  if (email === null || password === null || !EMAIL.test(email)) {
    throw new SmokeError(
      "smoke_authentication_failed",
      "TASK-488 admin credentials are missing from the environment"
    );
  }
  return Object.freeze({ email, password });
}

export function buildTask488BrowserInput(input: {
  readonly descriptor: Task488ScenarioDescriptor;
  readonly variant: Task488VariantDescriptor;
  readonly fixture: Task488FixtureSpec;
  readonly credentials: Task488BrowserCredentials;
  readonly descriptorSha256: string;
  readonly fixtureDigest: string;
  readonly screenshotPath: string;
  readonly adminOrigin?: string;
  readonly apiOrigin?: string;
}): Task488BrowserInput {
  if (
    input.descriptor.number < 1 ||
    input.descriptor.number > 5 ||
    (input.variant.id !== "light" && input.variant.id !== "dark") ||
    input.variant.theme !== input.variant.id
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-488 browser input is invalid");
  }
  const adminOrigin = input.adminOrigin ?? TASK_488_ADMIN_ORIGIN;
  const apiOrigin = input.apiOrigin ?? TASK_488_API_ORIGIN;
  if (
    !/^https?:\/\/127\.0\.0\.1:\d+$/u.test(adminOrigin) ||
    !/^https?:\/\/127\.0\.0\.1:\d+$/u.test(apiOrigin)
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-488 browser origins are invalid");
  }
  const adminPath = input.fixture.adminPath;
  if (
    adminPath.length === 0 ||
    !adminPath.startsWith("/") ||
    adminPath.includes("\0") ||
    adminPath.includes("..") ||
    input.screenshotPath.length === 0 ||
    input.screenshotPath.includes("\0")
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-488 browser path is invalid");
  }
  return Object.freeze({
    schemaVersion: 1,
    scenarioId: input.descriptor.id,
    variantId: input.variant.id,
    theme: input.variant.theme,
    viewport: Object.freeze({ ...input.variant.viewport }),
    adminOrigin,
    apiOrigin,
    adminPath,
    descriptorSha256: input.descriptorSha256,
    fixtureDigest: input.fixtureDigest,
    fixture: Object.freeze({
      marker: input.fixture.marker,
      productSlug: input.fixture.productSlug,
      productTitle: input.fixture.productTitle,
      productPriceAmount: input.fixture.productPriceAmount,
      productCurrency: input.fixture.productCurrency,
      collectionName: input.fixture.collectionName,
      collectionSlug: input.fixture.collectionSlug,
      collectionDescription: input.fixture.collectionDescription,
      variantTitle: input.fixture.variantTitle,
      variantSku: input.fixture.variantSku,
    }),
    credentials: Object.freeze({ ...input.credentials }),
    assertions: Object.freeze([...input.variant.assertions]),
    absoluteScreenshotPath: input.screenshotPath,
  });
}
