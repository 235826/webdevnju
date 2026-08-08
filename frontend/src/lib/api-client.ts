import type { ErrorResponse } from "./api-types";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiClientError(
      await readSafeError(response),
      response.status,
      response.headers.get("X-Request-Id") ?? undefined,
    );
  }

  return (await response.json()) as T;
}

export async function sendJson<T>(
  path: string,
  method: "POST" | "PUT",
  body: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ApiClientError(
      await readSafeError(response),
      response.status,
      response.headers.get("X-Request-Id") ?? undefined,
    );
  }

  return (await response.json()) as T;
}

async function readSafeError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ErrorResponse;
    return payload.error.message;
  } catch {
    return "请求失败，请稍后重试";
  }
}
