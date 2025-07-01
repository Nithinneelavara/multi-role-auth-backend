export interface ApiResponse<T = any> {
  code?: number;
  success: boolean;
  message: string;
  data?: T;
  totalMessagesSentByAdmin?: number;
  page?: number;
  limit?: number;
  error?: any;
}