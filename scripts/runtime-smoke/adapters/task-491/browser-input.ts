import { SmokeError } from "../../contracts";
import { TASK_491_DESCRIPTOR_SHA256, type Task491ScenarioDescriptor } from "./descriptors";
import type { Task491InstallOutput } from "./worker-operations";

function boundedCredential(value: string | undefined): string | null {
  return typeof value === "string" &&
    value.length > 0 &&
    Buffer.byteLength(value) <= 8 * 1024 &&
    !value.includes("\0")
    ? value
    : null;
}

export function projectTask491AdminAuthEnvironment(
  source: NodeJS.ProcessEnv
): Readonly<Record<string, string>> {
  const email = boundedCredential(
    source.CODERSO_PLAYWRIGHT_EMAIL ?? source.PLAYWRIGHT_ADMIN_EMAIL ?? source.ADMIN_EMAIL
  );
  const password = boundedCredential(
    source.CODERSO_PLAYWRIGHT_PASSWORD ?? source.PLAYWRIGHT_ADMIN_PASSWORD ?? source.ADMIN_PASSWORD
  );
  if (email === null || password === null) {
    throw new SmokeError("smoke_argument_invalid", "TASK-491 admin credentials are incomplete");
  }
  return Object.freeze({
    CODERSO_PLAYWRIGHT_EMAIL: email,
    CODERSO_PLAYWRIGHT_PASSWORD: password,
  });
}

export function buildTask491BrowserInput(input: {
  readonly descriptor: Task491ScenarioDescriptor;
  readonly evidenceScreenshotPath: string;
  readonly absoluteScreenshotPath: string;
  readonly fixture: Task491InstallOutput;
  readonly email: string;
  readonly password: string;
}) {
  const { descriptor, fixture } = input;
  return Object.freeze({
    scenarioId: descriptor.id,
    descriptorSha256: TASK_491_DESCRIPTOR_SHA256,
    installedDigest: fixture.installedDigest,
    canonicalUrl: descriptor.url,
    physicalUrl: descriptor.url,
    viewport: descriptor.viewport,
    adminBase: "http://127.0.0.1:5173/admin",
    frontOrigin: "http://127.0.0.1:3000",
    assertions: descriptor.assertions.map(({ id, kind, target, property }) => ({
      id,
      kind,
      target,
      property,
    })),
    screenshotPath: input.evidenceScreenshotPath,
    absoluteScreenshotPath: input.absoluteScreenshotPath,
    email: input.email,
    password: input.password,
    fixture: {
      gaId: fixture.gaId,
      sentryId: fixture.sentryId,
      measurementId: fixture.measurementId,
    },
  });
}
