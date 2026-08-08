import { randomUUID } from "node:crypto";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;

export function normalizeRequestId(value: unknown): string {
  if (typeof value === "string" && REQUEST_ID_PATTERN.test(value)) {
    return value;
  }

  return `req-${randomUUID()}`;
}
