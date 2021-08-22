import type { JsonValue } from "../json_rpc_types.ts";

export class CustomError extends Error {
  name: string;
  code: number;
  data: JsonValue | undefined;
  constructor(code: number, message: string, data?: JsonValue) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.data = data;
  }
}
