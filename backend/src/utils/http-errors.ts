export type ErrorDetail = {
  field: string;
  reason: string;
};

export class ValidationError extends Error {
  readonly code = "VALIDATION_FAILED" as const;
  readonly status = 400;

  constructor(
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

type ValidationErrorLike = {
  code: "VALIDATION_FAILED";
  status: 400;
  message: string;
  details?: ErrorDetail[];
};

export function buildApiErrorResponse(
  error: unknown,
  requestId: string,
): {
  status: 400 | 500;
  errorCode: "VALIDATION_FAILED" | "INTERNAL_ERROR";
  body: {
    error: {
      code: "VALIDATION_FAILED" | "INTERNAL_ERROR";
      message: string;
      details?: ErrorDetail[];
    };
    requestId: string;
  };
} {
  if (isValidationError(error)) {
    return {
      status: 400,
      errorCode: error.code,
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        requestId,
      },
    };
  }

  return {
    status: 500,
    errorCode: "INTERNAL_ERROR",
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "服务器开小差了，请稍后再试",
      },
      requestId,
    },
  };
}

function isValidationError(error: unknown): error is ValidationErrorLike {
  return (
    error instanceof ValidationError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "VALIDATION_FAILED" &&
      "status" in error &&
      error.status === 400 &&
      "message" in error &&
      typeof error.message === "string")
  );
}
