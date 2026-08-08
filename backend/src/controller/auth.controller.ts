import { Body, Controller, Get, Inject, Post } from "@midwayjs/core";
import type { Context } from "@midwayjs/koa";
import { AuthService } from "../service/auth.service";
import { LoginRequest, RegisterRequest } from "../types/auth";
import { buildApiErrorResponse } from "../utils/http-errors";
import { normalizeRequestId } from "../utils/request-id";

const SESSION_COOKIE = "sid";

@Controller("/api/auth")
export class AuthController {
  @Inject()
  ctx?: Context;

  @Inject()
  authService: AuthService = new AuthService();

  @Post("/register")
  async register(@Body() body: RegisterRequest) {
    const requestId = this.prepareRequest();

    try {
      this.setStatus(201);
      return this.authService.register(body);
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Post("/login")
  async login(@Body() body: LoginRequest) {
    const requestId = this.prepareRequest();

    try {
      const result = this.authService.login(body);
      this.ctx?.cookies.set(SESSION_COOKIE, result.sessionId, {
        httpOnly: true,
        sameSite: "lax",
        overwrite: true,
      });
      return result.response;
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Post("/logout")
  async logout() {
    const requestId = this.prepareRequest();

    try {
      this.authService.logout(this.getSessionId());
      this.ctx?.cookies.set(SESSION_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 0,
        overwrite: true,
      });
      this.setStatus(204);
      return undefined;
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Get("/me")
  async me() {
    const requestId = this.prepareRequest();

    try {
      return this.authService.getCurrentUser(this.getSessionId());
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  private prepareRequest(): string {
    const requestId = normalizeRequestId(this.ctx?.get("X-Request-Id"));
    this.ctx?.set("X-Request-Id", requestId);
    return requestId;
  }

  private getSessionId(): string | undefined {
    return this.ctx?.cookies.get(SESSION_COOKIE);
  }

  private setStatus(status: number): void {
    if (this.ctx) {
      this.ctx.status = status;
    }
  }

  private handleError(error: unknown, requestId: string) {
    const response = buildApiErrorResponse(error, requestId);
    this.setStatus(response.status);
    return response.body;
  }
}
