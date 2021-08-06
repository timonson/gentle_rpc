export class CustomError extends Error {
  name: string;
  code: number;
  data: any;

  constructor(code: number, message: string, data?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.data = data;
  }
}
