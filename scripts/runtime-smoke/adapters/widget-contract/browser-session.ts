import { PlaywrightCliDispatcher } from "../../browser/playwright-cli-dispatcher";
import { SmokeError } from "../../contracts";
import type { RuntimeSmokeContext } from "../../lifecycle";
import type { PlainJsonValue } from "../../workers/contracts";

const MAXIMUM_PROBE_OUTPUT_BYTES = 1024 * 1024;

export interface WidgetBrowserProbeInput {
  readonly context: RuntimeSmokeContext;
  readonly session: string;
  readonly workspace: string;
  readonly segmentId: string;
  readonly source: string;
  readonly storageStatePath?: string;
}

export interface WidgetBrowserProbeResult {
  readonly output: PlainJsonValue;
  readonly elapsedMs: number;
  readonly dispatches: 1;
}

function framedProbeSource(source: string): string {
  return `async (page) => {
    const output = await (${source})(page);
    return (typeof output === "string" ? output : JSON.stringify(output)) + "\\n";
  }`;
}

function decodeProbeOutput(bytes: Uint8Array): PlainJsonValue {
  let outer: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!text.endsWith("\n") || text.slice(0, -1).includes("\n")) throw new Error("shape");
    outer = JSON.parse(text.slice(0, -1)) as unknown;
  } catch (error) {
    throw new SmokeError("smoke_output_invalid", "widget browser output is malformed", {
      cause: error,
    });
  }
  if (typeof outer !== "string" || !outer.endsWith("\n") || outer.includes("\0")) {
    throw new SmokeError("smoke_output_invalid", "widget browser output frame is invalid");
  }
  try {
    return JSON.parse(outer.slice(0, -1)) as PlainJsonValue;
  } catch (error) {
    throw new SmokeError("smoke_output_invalid", "widget browser result is not JSON", {
      cause: error,
    });
  }
}

export async function runWidgetBrowserProbe(
  input: WidgetBrowserProbeInput
): Promise<WidgetBrowserProbeResult> {
  const dispatcher = new PlaywrightCliDispatcher({
    context: input.context,
    session: input.session,
    workspace: input.workspace,
    segments: [input.segmentId],
  });
  input.context.lifecycle.register(dispatcher);
  const started = performance.now();
  try {
    if (input.storageStatePath !== undefined) {
      await dispatcher.loadStorageState(input.storageStatePath);
    }
    const bytes = await dispatcher.dispatch({
      session: input.session,
      segmentId: input.segmentId,
      source: framedProbeSource(input.source),
      maximumOutputBytes: MAXIMUM_PROBE_OUTPUT_BYTES,
    });
    return Object.freeze({
      output: decodeProbeOutput(bytes),
      elapsedMs: Math.ceil(performance.now() - started),
      dispatches: 1 as const,
    });
  } finally {
    await input.context.timing.measure("cleanup", `widget-browser-${input.segmentId}`, () =>
      dispatcher.close()
    );
  }
}
