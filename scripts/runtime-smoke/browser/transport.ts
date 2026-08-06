import type { LifecycleResource } from "../lifecycle";
import { SmokeError } from "../contracts";
import {
  DEFAULT_BROWSER_FRAME_BYTES,
  type BrowserActionFrame,
  type BrowserFrameExpectation,
  type BrowserTransportCounters,
  type BrowserTransportDispatcher,
  type MaterializedBrowserSegment,
} from "./contracts";
import { buildBatchRunCodeSource, decodePlaywrightBatchOutput } from "./action-frames";

const SESSION = /^[a-z0-9][a-z0-9_-]{2,63}$/u;

export class BrowserTransport implements LifecycleResource {
  readonly name = "browser-transport";
  readonly #session: string;
  readonly #dispatcher: BrowserTransportDispatcher;
  #closed = false;
  #active = false;
  #clientProcesses = 0;
  #segments = 0;
  #frames = 0;

  constructor(session: string, dispatcher: BrowserTransportDispatcher) {
    if (!SESSION.test(session)) {
      throw new SmokeError("smoke_argument_invalid", "browser session name is invalid");
    }
    this.#session = session;
    this.#dispatcher = dispatcher;
  }

  counters(): BrowserTransportCounters {
    return Object.freeze({
      clientProcesses: this.#clientProcesses,
      segments: this.#segments,
      frames: this.#frames,
      fallbacks: 0,
      retries: 0,
    });
  }

  async runSegment(
    materialized: MaterializedBrowserSegment,
    expectation: BrowserFrameExpectation,
    maximumOutputBytes = DEFAULT_BROWSER_FRAME_BYTES
  ): Promise<readonly BrowserActionFrame[]> {
    if (this.#closed || this.#active) {
      throw new SmokeError("smoke_process_failed", "browser transport is unavailable");
    }
    if (
      materialized.segment.segmentId !== expectation.segmentId ||
      materialized.segment.scenarioId !== expectation.scenarioId ||
      materialized.segment.actionIds.length !== expectation.actionIds.length ||
      materialized.segment.actionIds.some((id, index) => id !== expectation.actionIds[index])
    ) {
      throw new SmokeError("smoke_output_invalid", "browser segment expectation drifted");
    }
    this.#active = true;
    try {
      const source = buildBatchRunCodeSource({ expectation, actions: materialized.actions });
      this.#clientProcesses += 1;
      const stdout = await this.#dispatcher.dispatch({
        session: this.#session,
        segmentId: expectation.segmentId,
        source,
        maximumOutputBytes,
      });
      const frames = decodePlaywrightBatchOutput(stdout, expectation);
      this.#segments += 1;
      this.#frames += frames.length;
      return frames;
    } finally {
      this.#active = false;
    }
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    await this.#dispatcher.close();
  }

  async proveAbsent(): Promise<boolean> {
    return this.#closed && !this.#active && (await this.#dispatcher.proveAbsent());
  }
}
