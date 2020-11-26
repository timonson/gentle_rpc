export class BadServerDataError extends Error {
  name: string;
  code: number;
  data?: unknown;
  constructor(message: string, errorCode: number, data?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = errorCode;
    this.data = data;
  }
}
