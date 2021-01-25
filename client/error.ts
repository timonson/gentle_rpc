import type { RpcId } from "../json_rpc_types.ts";

export class BadServerDataError extends Error {
  id: RpcId;
  name: string;
  code: number;
  data?: unknown;
  constructor(id: RpcId, message: string, errorCode: number, data?: unknown) {
    super(message);
    this.id = id, this.name = this.constructor.name;
    this.code = errorCode;
    this.data = data;
  }
}
