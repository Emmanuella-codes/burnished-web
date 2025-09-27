
export class ApiResponse<T = any> {
  status: boolean;
  message: string;
  error?: any;
  data?: T;

  constructor(partial: Partial<ApiResponse<T>>) {
    Object.assign(this, partial);
  }

  static success<T>(message: string, data?: T): ApiResponse<T> {
    return new ApiResponse<T>({
      status: true,
      message,
      error: null,
      data,
    });
  }

  static failure(message: string, error?: any): ApiResponse<null> {
    return new ApiResponse<null>({
      status: false,
      message,
      error,
      data: null,
    });
  }
}