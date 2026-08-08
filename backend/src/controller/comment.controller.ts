import {
  Body,
  Controller,
  Del,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
} from "@midwayjs/core";
import type { Context } from "@midwayjs/koa";
import { AuthService } from "../service/auth.service";
import { CommentService } from "../service/comment.service";
import { CommentListQuery, CommentWriteRequest } from "../types/football";
import { buildApiErrorResponse } from "../utils/http-errors";
import { normalizeRequestId } from "../utils/request-id";

const SESSION_COOKIE = "sid";

@Controller("/api")
export class CommentController {
  @Inject()
  ctx?: Context;

  @Inject()
  authService: AuthService = new AuthService();

  @Inject()
  commentService: CommentService = new CommentService();

  @Get("/matches/:matchId/comments")
  async listMatchComments(
    @Param("matchId") matchId: string,
    @Query() query: CommentListQuery,
  ) {
    const requestId = this.prepareRequest();

    try {
      return this.commentService.listMatchComments(matchId, query);
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Post("/matches/:matchId/comments")
  async createMatchComment(
    @Param("matchId") matchId: string,
    @Body() body: CommentWriteRequest,
  ) {
    const requestId = this.prepareRequest();

    try {
      const user = this.authService.requireUser(this.getSessionId());
      const response = this.commentService.createMatchComment(
        user,
        matchId,
        body,
      );

      this.setStatus(201);
      this.ctx?.set("Location", `/api/comments/${response.data.id}`);
      return response;
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Put("/comments/:commentId")
  async updateComment(
    @Param("commentId") commentId: string,
    @Body() body: CommentWriteRequest,
  ) {
    const requestId = this.prepareRequest();

    try {
      const user = this.authService.requireUser(this.getSessionId());
      return this.commentService.updateComment(user, commentId, body);
    } catch (error) {
      return this.handleError(error, requestId);
    }
  }

  @Del("/comments/:commentId")
  async deleteComment(@Param("commentId") commentId: string) {
    const requestId = this.prepareRequest();

    try {
      const user = this.authService.requireUser(this.getSessionId());
      this.commentService.deleteComment(user, commentId);
      this.setStatus(204);
      return undefined;
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
