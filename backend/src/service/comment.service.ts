import { Inject, Provide } from "@midwayjs/core";
import type { PublicUser } from "../types/auth";
import {
  Comment,
  CommentListQuery,
  CommentModerationStatus,
  CommentPageResponse,
  CommentResponse,
  CommentWriteRequest,
  ModerateCommentRequest,
} from "../types/football";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../utils/http-errors";
import { FootballRepository } from "./football.repository";
import { UserRepository } from "./user.repository";

type StoredComment = {
  id: number;
  matchId: number;
  authorId: number;
  content: string;
  moderationStatus: CommentModerationStatus;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
};

const comments: StoredComment[] = [];
let nextCommentId = 1;
const MODERATION_STATUSES: CommentModerationStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
];

@Provide()
export class CommentService {
  @Inject()
  footballRepository: FootballRepository = new FootballRepository();

  @Inject()
  userRepository: UserRepository = new UserRepository();

  listMatchComments(
    matchId: unknown,
    query: CommentListQuery,
  ): CommentPageResponse {
    const id = parsePositiveInteger(matchId, "matchId");
    this.requireMatch(id);
    assertKnownFields(query, ["page", "pageSize"]);

    const page =
      query.page === undefined ? 1 : parsePositiveInteger(query.page, "page");
    const pageSize =
      query.pageSize === undefined
        ? 20
        : parsePageSize(query.pageSize, "pageSize");
    const visibleComments = comments
      .filter((comment) => comment.matchId === id && comment.visible)
      .sort(compareComments);
    const start = (page - 1) * pageSize;

    return {
      data: visibleComments
        .slice(start, start + pageSize)
        .map((comment) => this.toComment(comment)),
      pagination: {
        page,
        pageSize,
        total: visibleComments.length,
      },
    };
  }

  createMatchComment(
    user: PublicUser,
    matchId: unknown,
    request: CommentWriteRequest,
  ): CommentResponse {
    const id = parsePositiveInteger(matchId, "matchId");
    this.requireMatch(id);
    const content = parseCommentContent(request);
    const now = new Date().toISOString();
    const comment: StoredComment = {
      id: nextCommentId,
      matchId: id,
      authorId: user.id,
      content,
      moderationStatus: "PENDING",
      visible: true,
      createdAt: now,
      updatedAt: now,
    };

    nextCommentId += 1;
    comments.push(comment);

    return { data: this.toComment(comment) };
  }

  updateComment(
    user: PublicUser,
    commentId: unknown,
    request: CommentWriteRequest,
  ): CommentResponse {
    const comment = this.requireComment(commentId);

    if (comment.authorId !== user.id) {
      throw new ForbiddenError();
    }

    comment.content = parseCommentContent(request);
    comment.updatedAt = new Date().toISOString();

    return { data: this.toComment(comment) };
  }

  deleteComment(user: PublicUser, commentId: unknown): void {
    const comment = this.requireComment(commentId);

    if (comment.authorId !== user.id) {
      throw new ForbiddenError();
    }

    comments.splice(comments.indexOf(comment), 1);
  }

  moderateComment(
    commentId: unknown,
    request: ModerateCommentRequest,
  ): CommentResponse {
    const comment = this.requireComment(commentId);
    const moderationStatus = parseModerationStatus(request);

    comment.moderationStatus = moderationStatus;
    comment.visible = moderationStatus !== "REJECTED";
    comment.updatedAt = new Date().toISOString();

    return { data: this.toComment(comment) };
  }

  private requireMatch(matchId: number) {
    const match = this.footballRepository.findMatch(matchId);

    if (!match) {
      throw new NotFoundError("比赛不存在");
    }

    return match;
  }

  private requireComment(commentId: unknown): StoredComment {
    const id = parsePositiveInteger(commentId, "commentId");
    const comment = comments.find((candidate) => candidate.id === id);

    if (!comment) {
      throw new NotFoundError("评论不存在");
    }

    return comment;
  }

  private toComment(comment: StoredComment): Comment {
    const author = this.userRepository.findById(comment.authorId);

    if (!author) {
      throw new NotFoundError("评论作者不存在");
    }

    return {
      id: comment.id,
      matchId: comment.matchId,
      author: {
        id: author.id,
        username: author.username,
        role: author.role,
        createdAt: author.createdAt,
      },
      content: comment.content,
      moderationStatus: comment.moderationStatus,
      visible: comment.visible,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}

function parsePositiveInteger(value: unknown, field: string): number {
  const normalized = typeof value === "string" ? value.trim() : value;
  const parsed =
    typeof normalized === "number" ? normalized : Number(normalized);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ValidationError("请求参数不合法", [
      { field, reason: "positiveInteger" },
    ]);
  }

  return parsed;
}

function parsePageSize(value: unknown, field: string): number {
  const parsed = parsePositiveInteger(value, field);

  if (parsed > 100) {
    throw new ValidationError("请求参数不合法", [{ field, reason: "maximum" }]);
  }

  return parsed;
}

function parseCommentContent(request: CommentWriteRequest): string {
  assertKnownFields(request, ["content"]);

  if (typeof request.content !== "string") {
    throw new ValidationError("请求参数不合法", [
      { field: "content", reason: "required" },
    ]);
  }

  const content = request.content.trim();

  if (content.length < 1 || content.length > 1000) {
    throw new ValidationError("评论内容长度必须为 1 到 1000 个字符", [
      { field: "content", reason: "length" },
    ]);
  }

  return content;
}

function parseModerationStatus(
  request: ModerateCommentRequest,
): CommentModerationStatus {
  assertKnownFields(request, ["moderationStatus"]);

  if (
    typeof request.moderationStatus !== "string" ||
    !MODERATION_STATUSES.includes(
      request.moderationStatus as CommentModerationStatus,
    )
  ) {
    throw new ValidationError("请求参数不合法", [
      { field: "moderationStatus", reason: "enum" },
    ]);
  }

  return request.moderationStatus as CommentModerationStatus;
}

function assertKnownFields(
  request: unknown,
  knownFields: string[],
): asserts request is Record<string, unknown> {
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

function compareComments(left: StoredComment, right: StoredComment): number {
  return (
    Date.parse(left.createdAt) - Date.parse(right.createdAt) ||
    left.id - right.id
  );
}
