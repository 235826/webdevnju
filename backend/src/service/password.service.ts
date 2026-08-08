import { Provide } from "@midwayjs/core";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const ITERATIONS = 120_000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

@Provide()
export class PasswordService {
  hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = pbkdf2Sync(
      password,
      salt,
      ITERATIONS,
      KEY_LENGTH,
      DIGEST,
    ).toString("hex");

    return `pbkdf2:${ITERATIONS}:${salt}:${hash}`;
  }

  verifyPassword(password: string, storedHash: string): boolean {
    const parts = storedHash.split(":");

    if (parts.length !== 4 || parts[0] !== "pbkdf2") {
      return false;
    }

    const iterations = Number(parts[1]);
    const salt = parts[2];
    const expected = Buffer.from(parts[3], "hex");

    if (!Number.isInteger(iterations) || expected.length === 0) {
      return false;
    }

    const actual = pbkdf2Sync(
      password,
      salt,
      iterations,
      expected.length,
      DIGEST,
    );

    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }
}
