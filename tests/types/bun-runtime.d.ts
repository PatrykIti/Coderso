declare module "bun:test" {
  export {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    test,
  } from "vitest";
}

interface ImportMeta {
  readonly dir: string;
}

declare namespace Bun {
  type BunFile = Blob & {
    readonly type: string;
    exists(): Promise<boolean>;
    text(): Promise<string>;
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
