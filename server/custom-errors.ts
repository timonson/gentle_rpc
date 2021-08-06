export class CustomError extends Error {
  errorCode: number;
  errorMessage: string;
  errorData: any;

  constructor(errorCode: number, errorMessage: string, errorData?: any) {
    super(errorMessage);
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
    this.errorData = errorData;
  }
}
