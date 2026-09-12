import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function successResponse<T>(data: T, status = 200) {
  const body: ApiResponse<T> = {
    success: true,
    data,
  };
  return NextResponse.json(body, { status });
}

export function errorResponse(
  message: string,
  status = 400,
  code = "BAD_REQUEST",
  details?: unknown
) {
  const isProd = process.env.NODE_ENV === "production";
  
  const body: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(isProd ? {} : details ? { details } : {}),
    },
  };

  return NextResponse.json(body, { status });
}
