import {
  PROFILE_IDS,
  SUITE_IDS,
  SmokeError,
  type SmokeInput,
  type SmokeProfileId,
  type SmokeSuiteId,
} from "./contracts";

const SESSION_PATTERN = /^[a-z][a-z0-9-]{2,63}$/u;
const EXPECTED_OPTIONS = new Set(["--suite", "--profile", "--session"]);

const SUPPORTED_PROFILES: Readonly<Record<SmokeSuiteId, readonly SmokeProfileId[]>> = {
  "task-540": ["fast", "certification"],
  "task-547": ["fast", "certification"],
  "task-554": ["fast", "certification"],
  "widget-contract": ["fast"],
  "production-boundary": ["certification"],
  "task-487": ["fast"],
  "task-488": ["fast"],
  "task-490": ["fast"],
  "task-491": ["fast"],
  "task-492": ["fast"],
  "task-511": ["fast"],
  "task-517": ["fast"],
  "task-493": ["fast", "certification"],
  "detail-page-v2": ["fast"],
};

function invalid(message: string): never {
  throw new SmokeError("smoke_argument_invalid", message);
}

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some(
    (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
  );
}

export function parseRuntimeSmokeArgs(argv: readonly string[]): SmokeInput {
  if (argv[0] !== "run") invalid("the only supported command is run");
  if (argv.length !== 7) invalid("run requires exactly --suite, --profile, and --session");

  const parsed = new Map<string, string>();
  for (let index = 1; index < argv.length; index += 2) {
    const option = argv[index];
    const value = argv[index + 1];
    if (option === undefined || !EXPECTED_OPTIONS.has(option)) invalid("unknown option");
    if (parsed.has(option)) invalid("duplicate option");
    if (value === undefined || value.startsWith("--") || hasControlCharacters(value)) {
      invalid("option value is missing or invalid");
    }
    parsed.set(option, value);
  }

  const suite = parsed.get("--suite");
  const profile = parsed.get("--profile");
  const session = parsed.get("--session");
  if (!SUITE_IDS.includes(suite as SmokeSuiteId)) invalid("unsupported suite");
  if (!PROFILE_IDS.includes(profile as SmokeProfileId)) invalid("unsupported profile");
  if (session === undefined || !SESSION_PATTERN.test(session) || /[./\\]/u.test(session)) {
    invalid("session name is invalid");
  }
  const typedSuite = suite as SmokeSuiteId;
  const typedProfile = profile as SmokeProfileId;
  if (!SUPPORTED_PROFILES[typedSuite].includes(typedProfile)) {
    invalid("profile is not supported by the selected suite");
  }

  return Object.freeze({ command: "run", suite: typedSuite, profile: typedProfile, session });
}
