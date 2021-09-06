import type { JsonValue, RpcId } from "../json_rpc_types.ts";

export class BadServerDataError extends Error {
  id: RpcId;
  code?: number | undefined;
  data?: JsonValue | undefined;
  constructor(
    id: RpcId,
    message: string,
    errorCode?: number,
    data?: JsonValue,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.id = id;
    this.code = errorCode;
    this.data = data;
  }
}
