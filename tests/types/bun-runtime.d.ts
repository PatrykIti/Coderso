declare module "bun:test" {
  export {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    mock,
    test,
    vi,
  } from "vitest";
}

interface ImportMeta {
  readonly dir: string;
}

declare namespace Bun {
  // Minimal FileWriter shape used by the TASK-511-06 backup sink (chunk pump +
  // flush on end). The production FileWriter also returns a write() byte count;
  // the stub only needs what core actually calls.
  type FileWriter = {
    write(chunk: Uint8Array): void;
    end(): Promise<void> | void;
  };

  type BunFile = Blob & {
    readonly type: string;
    exists(): Promise<boolean>;
    text(): Promise<string>;
    writer(): FileWriter;
  };

  type SpawnOptions = {
    cmd?: string[];
    cwd?: string;
    env?: Record<string, string | undefined>;
    stdin?: "inherit" | "ignore" | "pipe";
    stdout?: "inherit" | "ignore" | "pipe";
    stderr?: "inherit" | "ignore" | "pipe";
  };

  type Subprocess = {
    readonly exited: Promise<number>;
    readonly stdout: BodyInit;
    readonly stderr: BodyInit;
    kill(signal?: string | number): void;
  };

  type Server = {
    readonly port: number;
    stop(force?: boolean): void;
  };

  type ServeOptions = {
    port?: number;
    fetch(request: Request): Response | Promise<Response>;
  };

  const argv: string[];

  function spawn(command: string[], options?: SpawnOptions): Subprocess;
  function spawn(options: SpawnOptions & { cmd: string[] }): Subprocess;
  function file(path: string): BunFile;
  function write(path: string, data: string): Promise<number>;
  function serve(options: ServeOptions): Server;
}
