import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export class AppError extends Error {
  constructor(
    public readonly statusCode: ContentfulStatusCode,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toErrorResponse(error: unknown): {
  statusCode: ContentfulStatusCode;
  body: ErrorResponse;
} {
  if (error instanceof AppError) {
    const errorBody: ErrorResponse["error"] = {
      code: error.code,
      message: error.message,
    };

    if (error.statusCode < 500 && error.details !== undefined) {
      errorBody.details = error.details;
    }

    return {
      statusCode: error.statusCode,
      body: { error: errorBody },
    };
  }

  if (error instanceof HTTPException) {
    return {
      statusCode: error.status as ContentfulStatusCode,
      body: {
        error: {
          code: "HTTP_ERROR",
          message: error.message,
        },
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
      },
    },
  };
}
