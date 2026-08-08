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

export class UnauthorizedError extends Error {
  readonly code = "UNAUTHORIZED" as const;
  readonly status = 401;

  constructor(message = "请先登录") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN" as const;
  readonly status = 403;

  constructor(message = "没有权限执行该操作") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;
  readonly status = 404;

  constructor(message = "请求的资源不存在") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  readonly code = "CONFLICT" as const;
  readonly status = 409;

  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class PredictionLockedError extends Error {
  readonly code = "PREDICTION_LOCKED" as const;
  readonly status = 409;

  constructor(message = "比赛已经开始，预测已锁定") {
    super(message);
    this.name = "PredictionLockedError";
  }
}

export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PREDICTION_LOCKED"
  | "UNSUPPORTED_STAGE_TYPE"
  | "INTERNAL_ERROR";

type ApiErrorLike = {
  code: ApiErrorCode;
  status: 400 | 401 | 403 | 404 | 409;
  message: string;
  details?: ErrorDetail[];
};

export function buildApiErrorResponse(
  error: unknown,
  requestId: string,
): {
  status: 400 | 401 | 403 | 404 | 409 | 500;
  errorCode: ApiErrorCode;
  body: {
    error: {
      code: ApiErrorCode;
      message: string;
      details?: ErrorDetail[];
    };
    requestId: string;
  };
} {
  if (isApiError(error)) {
    return {
      status: error.status,
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

function isApiError(error: unknown): error is ApiErrorLike {
  return (
    error instanceof ValidationError ||
    error instanceof UnauthorizedError ||
    error instanceof ForbiddenError ||
    error instanceof NotFoundError ||
    error instanceof ConflictError ||
    error instanceof PredictionLockedError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string" &&
      "status" in error &&
      isApiErrorStatus(error.status) &&
      "message" in error &&
      typeof error.message === "string")
  );
}

function isApiErrorStatus(status: unknown): status is ApiErrorLike["status"] {
  return (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 409
  );
}
