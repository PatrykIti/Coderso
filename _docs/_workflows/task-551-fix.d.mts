type Task551LogicalArgvDescriptor = Readonly<{
  contractId: string;
  sha256: string;
  argCount: number;
  envFile: string;
}>;
type Task551CommandReceipt = Readonly<{
  logicalArgv: Task551LogicalArgvDescriptor;
  readonly [key: string]: unknown;
}>;

export function requireTask551CommandReceiptV1(value: unknown): true;
export function requireTask551LogicalArgvPreimageV1(
  bytes: Uint8Array
): Task551LogicalArgvDescriptor;
export function runTask551BoundedChild(input: unknown): Promise<
  Readonly<{
    commandReceipt: Task551CommandReceipt;
    readonly [key: string]: unknown;
  }>
>;
