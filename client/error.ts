import type { RpcId } from "../json_rpc_types.ts";

export class BadServerDataError extends Error {
  id: RpcId;
  code: number | null;
  data?: unknown;
  constructor(
    id: RpcId,
    message: string,
    errorCode: number | null,
    data?: unknown,
  ) {
    super(message);
    this.id = id;
    this.code = errorCode;
    this.data = data;
  }
}
