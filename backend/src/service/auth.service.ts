import { Inject, Provide } from "@midwayjs/core";
import { randomBytes } from "node:crypto";
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "../utils/http-errors";
import {
  AuthResponse,
  LoginRequest,
  PublicUser,
  RegisterRequest,
} from "../types/auth";
import { PasswordService } from "./password.service";
import { UserRepository } from "./user.repository";

type Session = {
  userId: number;
  createdAt: string;
};

const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;
const sessions = new Map<string, Session>();

@Provide()
export class AuthService {
  @Inject()
  userRepository: UserRepository = new UserRepository();

  @Inject()
  passwordService: PasswordService = new PasswordService();

  register(request: RegisterRequest): AuthResponse {
    assertKnownFields(request, ["username", "password"]);

    const username = normalizeRequiredString(request.username, "username");
    const password = normalizeRequiredString(request.password, "password");

    if (username.length < 3 || username.length > 40) {
      throw new ValidationError("用户名长度必须为 3 到 40 个字符", [
        { field: "username", reason: "length" },
      ]);
    }

    if (!USERNAME_PATTERN.test(username)) {
      throw new ValidationError("用户名只能包含字母、数字和下划线", [
        { field: "username", reason: "pattern" },
      ]);
    }

    if (password.length < 8 || password.length > 72) {
      throw new ValidationError("密码长度必须为 8 到 72 个字符", [
        { field: "password", reason: "length" },
      ]);
    }

    if (this.userRepository.findByUsername(username)) {
      throw new ConflictError("用户名已存在");
    }

    return {
      data: toPublicUser(
        this.userRepository.createUser(username, password, "USER"),
      ),
    };
  }

  login(request: LoginRequest): { response: AuthResponse; sessionId: string } {
    assertKnownFields(request, ["username", "password"]);

    const username = normalizeRequiredString(request.username, "username");
    const password = normalizeRequiredString(request.password, "password");

    if (username.length > 40 || password.length > 72) {
      throw new ValidationError("用户名或密码不符合要求", [
        { field: "credentials", reason: "invalid" },
      ]);
    }

    const user = this.userRepository.findByUsername(username);

    if (
      !user ||
      !this.passwordService.verifyPassword(password, user.passwordHash)
    ) {
      throw new UnauthorizedError("用户名或密码错误");
    }

    const sessionId = randomBytes(32).toString("hex");
    sessions.set(sessionId, {
      userId: user.id,
      createdAt: new Date().toISOString(),
    });

    return {
      sessionId,
      response: { data: toPublicUser(user) },
    };
  }

  logout(sessionId: string | undefined): void {
    if (!sessionId || !sessions.delete(sessionId)) {
      throw new UnauthorizedError();
    }
  }

  getCurrentUser(sessionId: string | undefined): AuthResponse {
    const user = this.requireUser(sessionId);

    return { data: user };
  }

  requireUser(sessionId: string | undefined): PublicUser {
    if (!sessionId) {
      throw new UnauthorizedError();
    }

    const session = sessions.get(sessionId);

    if (!session) {
      throw new UnauthorizedError();
    }

    const user = this.userRepository.findById(session.userId);

    if (!user) {
      sessions.delete(sessionId);
      throw new UnauthorizedError();
    }

    return toPublicUser(user);
  }

  requireAdmin(sessionId: string | undefined): PublicUser {
    const user = this.requireUser(sessionId);

    if (user.role !== "ADMIN") {
      throw new ForbiddenError();
    }

    return user;
  }
}

function assertKnownFields(request: unknown, knownFields: string[]): void {
  if (
    typeof request !== "object" ||
    request === null ||
    Array.isArray(request)
  ) {
    throw new ValidationError("请求参数不合法", [
      { field: "body", reason: "object" },
    ]);
  }

  const unknownField = Object.keys(request).find(
    (field) => !knownFields.includes(field),
  );

  if (unknownField) {
    throw new ValidationError("请求参数不合法", [
      { field: unknownField, reason: "unknown" },
    ]);
  }
}

function normalizeRequiredString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new ValidationError("请求参数不合法", [
      { field, reason: "required" },
    ]);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new ValidationError("请求参数不合法", [
      { field, reason: "required" },
    ]);
  }

  return trimmed;
}

function toPublicUser(user: PublicUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
  };
}
