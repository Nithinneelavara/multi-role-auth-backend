import { Response } from 'express';
import { ApiResponse } from './apiResponse';

export function sendResponse<T>(res: Response, statusCode: number, payload: ApiResponse<T>) {
  return res.status(statusCode).send({
    code: statusCode,                    
    success: payload.success,
    message: payload.message,
    data: payload.data ?? null,
    error: payload.error ?? null,
  });
}