import { createHash } from "node:crypto";

import { SmokeError, type SmokeProfileId } from "../../contracts";
import type { PlainJsonValue } from "../../workers/contracts";

/**
 * TASK-491 runtime-smoke descriptors.
 *
 * Five scenarios cover the integrations runtime wiring end to end:
 *  1. `admin-login`          - form login establishes a session and renders the
 *                              Integrations admin page (light theme).
 *  2. `connect-ga-drawer`    - Google Analytics connect drawer PATCHes the
 *                              integration (status 200) and the card flips to
 *                              Connected / Not checked.
 *  3. `health-states`        - drawer Test connection transitions GA to
 *                              Healthy and Sentry (invalid DSN) to Issue with
 *                              the machine-readable `dsn_invalid` last error.
 *  4. `public-ga-tag`        - the public home page head carries the GA4 gtag
 *                              snippet for G-WF491SMOKE and the inline script
 *                              really executed (window.dataLayer config event).
 *  5. `dark-parity`          - the same admin surface renders in dark mode
 *                              (`:root.dark` token flip) with the same card
 *                              state and zero console errors.
 *
 * Every scenario carries exactly one manifestable variant; the admin light
 * (1-3) and admin dark (5) variants together satisfy the smoke-evidence
 * admin light+dark coverage rule, and scenario 4 is the public surface.
 */

export type Task491AssertionKind = "aria" | "computed-style" | "dom-state" | "geometry";

export interface Task491Viewport {
  readonly width: number;
  readonly height: number;
}

export interface Task491AssertionDescriptor {
  readonly id: string;
  readonly kind: Task491AssertionKind;
  readonly target: string;
  readonly property: string;
  readonly expected: PlainJsonValue;
  readonly expectedLabel: string;
}

export interface Task491VariantDescriptor {
  readonly id: string;
  readonly surface: "admin" | "public";
  readonly theme: "light" | "dark";
  readonly viewport: Task491Viewport;
}

export interface Task491ScenarioDescriptor {
  readonly number: number;
  readonly id: string;
  readonly logicalGroup: "wf491smoke";
  readonly url: string;
  readonly viewport: Task491Viewport;
  readonly title: string;
  readonly variant: Task491VariantDescriptor;
  readonly assertions: readonly Task491AssertionDescriptor[];
}

export const TASK491_MEASUREMENT_ID = "G-WF491SMOKE";

export const TASK491_GA_ID = "google-analytics";
export const TASK491_SENTRY_ID = "sentry";
export const TASK491_SENTRY_DSN = "https://public@o0.invalid.sentry.io/0";

export const TASK491_ADMIN_ORIGIN = "http://127.0.0.1:5173";
export const TASK491_ADMIN_BASE = `${TASK491_ADMIN_ORIGIN}/admin`;
export const TASK491_FRONT_ORIGIN = "http://127.0.0.1:3000";

const VIEWPORT: Task491Viewport = Object.freeze({ width: 1440, height: 1000 });

const eq = (value: PlainJsonValue): PlainJsonValue => Object.freeze({ $equals: value });
const min = (value: number): PlainJsonValue => Object.freeze({ $min: value });
const max = (value: number): PlainJsonValue => Object.freeze({ $max: value });

function assertion(
  id: string,
  kind: Task491AssertionKind,
  target: string,
  property: string,
  expected: PlainJsonValue,
  expectedLabel: string
): Task491AssertionDescriptor {
  return Object.freeze({ id, kind, target, property, expected, expectedLabel });
}

function scenario(
  number: number,
  id: string,
  url: string,
  title: string,
  variant: Task491VariantDescriptor,
  assertions: readonly Task491AssertionDescriptor[]
): Task491ScenarioDescriptor {
  return Object.freeze({
    number,
    id,
    logicalGroup: "wf491smoke",
    url,
    viewport: Object.freeze({ ...VIEWPORT }),
    title,
    variant: Object.freeze({
      ...variant,
      viewport: Object.freeze({ ...variant.viewport }),
    }),
    assertions: Object.freeze([...assertions]),
  });
}

const ADMIN_INTEGRATIONS_URL = `${TASK491_ADMIN_BASE}/settings/integrations`;
const PUBLIC_HOME_URL = `${TASK491_FRONT_ORIGIN}/`;

function adminVariant(theme: "light" | "dark"): Task491VariantDescriptor {
  return Object.freeze({
    id: theme === "dark" ? "admin-dark" : "admin-light",
    surface: "admin",
    theme,
    viewport: Object.freeze({ ...VIEWPORT }),
  });
}

const PUBLIC_VARIANT: Task491VariantDescriptor = Object.freeze({
  id: "public-light",
  surface: "public",
  theme: "light",
  viewport: Object.freeze({ ...VIEWPORT }),
});

export const TASK_491_SCENARIOS: readonly Task491ScenarioDescriptor[] = Object.freeze([
  scenario(
    1,
    "admin-login",
    ADMIN_INTEGRATIONS_URL,
    "Admin login establishes a session and renders the Integrations page",
    adminVariant("light"),
    Object.freeze([
      assertion("login-form-absent", "dom-state", "input#email", "count", eq(0), "0"),
      assertion(
        "integrations-heading",
        "dom-state",
        "Integrations page heading",
        "visible",
        eq(true),
        "true"
      ),
      assertion("app-shell-scroll", "dom-state", "[data-app-scroll]", "visible", eq(true), "true"),
      assertion(
        "theme-light-background",
        "computed-style",
        "body",
        "background-luminance",
        min(0.6),
        ">= 0.6"
      ),
    ])
  ),
  scenario(
    2,
    "connect-ga-drawer",
    ADMIN_INTEGRATIONS_URL,
    "Connect Google Analytics drawer saves a measurement ID (PATCH 200) and flips the card to Connected",
    adminVariant("light"),
    Object.freeze([
      assertion(
        "ga-card-before",
        "dom-state",
        "Google Analytics card",
        "status-badge",
        eq("Not connected"),
        "Not connected"
      ),
      assertion(
        "drawer-opened",
        "geometry",
        '[data-slot="sheet-content"]',
        "width",
        min(400),
        ">= 400"
      ),
      assertion(
        "measurement-field-label",
        "dom-state",
        "Measurement ID field",
        "label-visible",
        eq(true),
        "true"
      ),
      assertion(
        "patch-status",
        "dom-state",
        "PATCH /settings/integrations/google-analytics",
        "status",
        eq(200),
        "200"
      ),
      assertion(
        "ga-card-after",
        "dom-state",
        "Google Analytics card",
        "status-badge",
        eq("Connected"),
        "Connected"
      ),
      assertion(
        "ga-health-after",
        "dom-state",
        "Google Analytics card",
        "health-badge",
        eq("Not checked"),
        "Not checked"
      ),
    ])
  ),
  scenario(
    3,
    "health-states",
    ADMIN_INTEGRATIONS_URL,
    "Integration drawer Test connection transitions GA to Healthy and Sentry to Issue",
    adminVariant("light"),
    Object.freeze([
      assertion(
        "ga-card-health-before",
        "dom-state",
        "Google Analytics card",
        "health-badge",
        eq("Not checked"),
        "Not checked"
      ),
      assertion(
        "sentry-card-health-before",
        "dom-state",
        "Sentry card",
        "health-badge",
        eq("Not checked"),
        "Not checked"
      ),
      assertion(
        "ga-drawer-health-before",
        "dom-state",
        "Google Analytics drawer",
        "health-label",
        eq("Not checked"),
        "Not checked"
      ),
      assertion(
        "ga-drawer-health-after",
        "dom-state",
        "Google Analytics drawer",
        "health-label",
        eq("Healthy"),
        "Healthy"
      ),
      assertion(
        "ga-drawer-last-checked",
        "dom-state",
        "Google Analytics drawer",
        "last-checked-present",
        eq(true),
        "true"
      ),
      assertion(
        "sentry-drawer-health-before",
        "dom-state",
        "Sentry drawer",
        "health-label",
        eq("Not checked"),
        "Not checked"
      ),
      assertion(
        "sentry-drawer-health-after",
        "dom-state",
        "Sentry drawer",
        "health-label",
        eq("Issue"),
        "Issue"
      ),
      assertion(
        "sentry-drawer-last-error",
        "dom-state",
        "Sentry drawer",
        "last-error",
        eq("dsn_invalid"),
        "dsn_invalid"
      ),
      assertion(
        "drawer-closed",
        "geometry",
        '[data-slot="sheet-content"]',
        "visible-count",
        eq(0),
        "0"
      ),
    ])
  ),
  scenario(
    4,
    "public-ga-tag",
    PUBLIC_HOME_URL,
    "Public home page head injects the GA4 gtag snippet and the inline script populates dataLayer",
    PUBLIC_VARIANT,
    Object.freeze([
      assertion("head-gtag-script", "dom-state", "public <head> gtag script", "count", eq(1), "1"),
      assertion(
        "inline-config-script",
        "dom-state",
        "inline gtag config script",
        "count",
        eq(1),
        "1"
      ),
      assertion(
        "data-layer-config",
        "dom-state",
        "window.dataLayer",
        "config-event",
        eq(true),
        "true"
      ),
      assertion("public-page-rendered", "dom-state", "public page h1", "visible", eq(true), "true"),
    ])
  ),
  scenario(
    5,
    "dark-parity",
    ADMIN_INTEGRATIONS_URL,
    "Integrations admin surface renders in dark mode with identical card state",
    adminVariant("dark"),
    Object.freeze([
      assertion("html-dark-class", "dom-state", "html", "dark-class", eq(true), "true"),
      assertion(
        "theme-dark-background",
        "computed-style",
        "body",
        "background-luminance",
        max(0.15),
        "<= 0.15"
      ),
      assertion(
        "ga-card-dark-status",
        "dom-state",
        "Google Analytics card",
        "status-badge",
        eq("Connected"),
        "Connected"
      ),
      assertion(
        "ga-card-dark-health",
        "dom-state",
        "Google Analytics card",
        "health-badge",
        eq("Not checked"),
        "Not checked"
      ),
      assertion(
        "drawer-dark-opens",
        "geometry",
        '[data-slot="sheet-content"]',
        "width",
        min(400),
        ">= 400"
      ),
    ])
  ),
]);

export const TASK_491_DESCRIPTOR_SHA256 = createHash("sha256")
  .update(JSON.stringify(TASK_491_SCENARIOS))
  .digest("hex");

export function task491ScenarioDescriptors(
  profile: SmokeProfileId
): readonly Task491ScenarioDescriptor[] {
  if (profile !== "fast" && profile !== "certification") {
    throw new SmokeError("smoke_argument_invalid", "TASK-491 profile is unsupported");
  }
  return TASK_491_SCENARIOS;
}

export function requireTask491Descriptor(id: string): Task491ScenarioDescriptor {
  const found = TASK_491_SCENARIOS.find((item) => item.id === id);
  if (found === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-491 scenario is unregistered");
  }
  return found;
}
