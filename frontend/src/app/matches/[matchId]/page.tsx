"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ApiClientError,
  fetchJson,
  sendEmpty,
  sendJson,
} from "../../../lib/api-client";
import type {
  AuthResponse,
  Comment,
  CommentModerationStatus,
  CommentPageResponse,
  CommentResponse,
  FavoriteListResponse,
  FavoriteResponse,
  Match,
  MatchResponse,
  NullablePredictionResponse,
  Prediction,
  PredictionResponse,
  User,
} from "../../../lib/api-types";

type ViewState =
  | { kind: "loading" }
  | { kind: "success"; match: Match; currentUser: User | null }
  | { kind: "error"; message: string };

export default function MatchDetailPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchJson<MatchResponse>(`/api/matches/${matchId}`),
      fetchJson<AuthResponse>("/api/auth/me").catch((error: unknown) => {
        if (error instanceof ApiClientError && error.status === 401) {
          return { data: null };
        }

        throw error;
      }),
    ])
      .then(([matchPayload, userPayload]) => {
        if (active) {
          setState({
            kind: "success",
            match: matchPayload.data,
            currentUser: userPayload.data,
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            kind: "error",
            message: error instanceof Error ? error.message : "比赛加载失败",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [matchId]);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl content-start gap-8 px-6 py-10 sm:px-10 sm:py-16">
      <header className="grid gap-4 border-b border-slate-200 pb-6">
        <Link
          className="w-fit text-sm font-semibold text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          href={
            state.kind === "success"
              ? `/competitions/${state.match.competition.id}`
              : "/competitions"
          }
        >
          返回赛事
        </Link>
        <h1 className="text-4xl font-bold text-slate-950">比赛详情</h1>
      </header>

      {state.kind === "loading" ? (
        <p role="status" className="text-slate-600">
          正在加载比赛详情
        </p>
      ) : null}

      {state.kind === "error" ? (
        <p role="alert" className="text-red-700">
          {state.message}
        </p>
      ) : null}

      {state.kind === "success" ? (
        <>
          <article className="grid gap-6 rounded border border-slate-200 bg-white p-6">
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                {state.match.competition.name} · {state.match.stage.name}
              </p>
              <h2 className="mt-2 flex flex-wrap items-center gap-2 text-3xl font-bold text-slate-950">
                <Link
                  className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
                  href={`/teams/${state.match.homeTeam.id}`}
                >
                  {state.match.homeTeam.name}
                </Link>
                <span>vs</span>
                <Link
                  className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
                  href={`/teams/${state.match.awayTeam.id}`}
                >
                  {state.match.awayTeam.name}
                </Link>
              </h2>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailItem
                label="开赛时间"
                value={formatDateTime(state.match.startsAt)}
              />
              <DetailItem
                label="比赛状态"
                value={matchStatusLabel(state.match.status)}
              />
              <DetailItem label="主队" value={state.match.homeTeam.name} />
              <DetailItem label="客队" value={state.match.awayTeam.name} />
              <DetailItem
                label="比分"
                value={
                  state.match.result
                    ? `${state.match.result.homeScore} : ${state.match.result.awayScore}`
                    : "暂无结果"
                }
              />
              <DetailItem
                label="阶段类型"
                value={stageTypeLabel(state.match.stage.type)}
              />
            </dl>
          </article>
          <FavoritePanel match={state.match} />
          <CommentPanel currentUser={state.currentUser} match={state.match} />
          <PredictionPanel match={state.match} />
          <AdminResultPanel
            currentUser={state.currentUser}
            match={state.match}
            onMatchUpdated={(match) =>
              setState({
                kind: "success",
                match,
                currentUser: state.currentUser,
              })
            }
          />
        </>
      ) : null}
    </main>
  );
}

type CommentState =
  | { kind: "loading" }
  | {
      kind: "ready";
      comments: Comment[];
      page: number;
      pageSize: number;
      total: number;
      message: string | null;
    }
  | { kind: "error"; message: string };

function CommentPanel({
  currentUser,
  match,
}: {
  currentUser: User | null;
  match: Match;
}) {
  const [state, setState] = useState<CommentState>({ kind: "loading" });
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const pageSize = 5;

  useEffect(() => {
    void loadComments(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id]);

  async function loadComments(page: number) {
    setState({ kind: "loading" });

    try {
      const payload = await fetchJson<CommentPageResponse>(
        `/api/matches/${match.id}/comments?page=${page}&pageSize=${pageSize}`,
      );
      setState({
        kind: "ready",
        comments: payload.data,
        page: payload.pagination.page,
        pageSize: payload.pagination.pageSize,
        total: payload.pagination.total,
        message: payload.data.length === 0 ? "暂无评论。" : null,
      });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "评论加载失败",
      });
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser) {
      return;
    }

    const previousState = state;
    setState(commentSavingState(previousState, "正在发表评论"));

    try {
      await sendJson<CommentResponse>(
        `/api/matches/${match.id}/comments`,
        "POST",
        { content },
      );
      setContent("");
      await loadComments(1);
    } catch (error) {
      setState(commentErrorState(previousState, error, "评论发布失败"));
    }
  }

  async function submitEdit(commentId: number) {
    if (!currentUser) {
      return;
    }

    const previousState = state;
    setState(commentSavingState(previousState, "正在保存评论"));

    try {
      await sendJson<CommentResponse>(`/api/comments/${commentId}`, "PUT", {
        content: editingContent,
      });
      setEditingId(null);
      setEditingContent("");
      await loadComments(
        previousState.kind === "ready" ? previousState.page : 1,
      );
    } catch (error) {
      setState(commentErrorState(previousState, error, "评论保存失败"));
    }
  }

  async function deleteComment(commentId: number) {
    const previousState = state;
    setState(commentSavingState(previousState, "正在删除评论"));

    try {
      await sendEmpty(`/api/comments/${commentId}`, "DELETE");
      await loadComments(
        previousState.kind === "ready" ? previousState.page : 1,
      );
    } catch (error) {
      setState(commentErrorState(previousState, error, "评论删除失败"));
    }
  }

  async function moderateComment(
    commentId: number,
    moderationStatus: CommentModerationStatus,
  ) {
    const previousState = state;
    setState(commentSavingState(previousState, "正在审核评论"));

    try {
      await sendJson<CommentResponse>(
        `/api/admin/comments/${commentId}/moderation`,
        "PUT",
        { moderationStatus },
      );
      await loadComments(
        previousState.kind === "ready" ? previousState.page : 1,
      );
    } catch (error) {
      setState(commentErrorState(previousState, error, "评论审核失败"));
    }
  }

  const page = state.kind === "ready" ? state.page : 1;
  const pageCount =
    state.kind === "ready"
      ? Math.max(1, Math.ceil(state.total / state.pageSize))
      : 1;

  return (
    <section className="grid gap-5 rounded border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-slate-950">评论讨论</h2>
        <p className="text-sm text-slate-500">
          第 {page} / {pageCount} 页
        </p>
      </div>

      {currentUser ? (
        <form className="grid gap-3" onSubmit={submitComment}>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            评论内容
            <textarea
              className="min-h-24 rounded border border-slate-300 px-3 py-2 text-base text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              maxLength={1000}
              name="commentContent"
              onChange={(event) => setContent(event.target.value)}
              required
              value={content}
            />
          </label>
          <button
            className="w-fit rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={state.kind === "loading"}
            type="submit"
          >
            发表评论
          </button>
        </form>
      ) : (
        <p className="text-slate-600">登录后可以发表评论。</p>
      )}

      {state.kind === "loading" ? (
        <p role="status" className="text-slate-600">
          正在加载评论
        </p>
      ) : null}

      {state.kind === "error" ? (
        <p role="alert" className="text-red-700">
          {state.message}
        </p>
      ) : null}

      {state.kind === "ready" && state.message ? (
        <p role="status" className="text-slate-600">
          {state.message}
        </p>
      ) : null}

      {state.kind === "ready" && state.comments.length > 0 ? (
        <ul className="grid gap-3">
          {state.comments.map((comment) => {
            const canEdit = currentUser?.id === comment.author.id;
            const canModerate = currentUser?.role === "ADMIN";
            const isEditing = editingId === comment.id;

            return (
              <li
                className="grid gap-3 rounded border border-slate-200 p-4"
                key={comment.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {comment.author.username}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatDateTime(comment.createdAt)} ·{" "}
                      {moderationStatusLabel(comment.moderationStatus)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canEdit ? (
                      <>
                        <button
                          className="rounded border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-950 hover:border-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditingContent(comment.content);
                          }}
                          type="button"
                        >
                          编辑
                        </button>
                        <button
                          className="rounded border border-red-300 px-3 py-1 text-sm font-semibold text-red-700 hover:border-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                          onClick={() => deleteComment(comment.id)}
                          type="button"
                        >
                          删除
                        </button>
                      </>
                    ) : null}
                    {canModerate ? (
                      <>
                        <button
                          className="rounded border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-950 hover:border-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                          onClick={() =>
                            moderateComment(comment.id, "APPROVED")
                          }
                          type="button"
                        >
                          通过
                        </button>
                        <button
                          className="rounded border border-red-300 px-3 py-1 text-sm font-semibold text-red-700 hover:border-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                          onClick={() =>
                            moderateComment(comment.id, "REJECTED")
                          }
                          type="button"
                        >
                          驳回
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
                {isEditing ? (
                  <form
                    className="grid gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitEdit(comment.id);
                    }}
                  >
                    <textarea
                      className="min-h-20 rounded border border-slate-300 px-3 py-2 text-base text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                      maxLength={1000}
                      onChange={(event) =>
                        setEditingContent(event.target.value)
                      }
                      required
                      value={editingContent}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                        type="submit"
                      >
                        保存评论
                      </button>
                      <button
                        className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:border-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                        onClick={() => setEditingId(null)}
                        type="button"
                      >
                        取消
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="whitespace-pre-wrap leading-7 text-slate-700">
                    {comment.content}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {state.kind === "ready" ? (
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:border-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:text-slate-400"
            disabled={state.page <= 1}
            onClick={() => loadComments(state.page - 1)}
            type="button"
          >
            上一页
          </button>
          <button
            className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:border-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:text-slate-400"
            disabled={state.page >= pageCount}
            onClick={() => loadComments(state.page + 1)}
            type="button"
          >
            下一页
          </button>
        </div>
      ) : null}
    </section>
  );
}

function commentSavingState(
  state: CommentState,
  message: string,
): CommentState {
  if (state.kind !== "ready") {
    return state;
  }

  return { ...state, message };
}

function commentErrorState(
  state: CommentState,
  error: unknown,
  fallback: string,
): CommentState {
  const message = error instanceof Error ? error.message : fallback;

  if (state.kind !== "ready") {
    return { kind: "error", message };
  }

  return { ...state, message };
}

type FavoriteState =
  | { kind: "loading" }
  | { kind: "unauthenticated"; message: string }
  | { kind: "ready"; isFavorite: boolean; message: string | null }
  | { kind: "saving"; isFavorite: boolean; message: string }
  | { kind: "error"; isFavorite: boolean; message: string };

function FavoritePanel({ match }: { match: Match }) {
  const [state, setState] = useState<FavoriteState>({ kind: "loading" });

  useEffect(() => {
    let active = true;

    fetchJson<FavoriteListResponse>("/api/users/me/favorites")
      .then((payload) => {
        if (active) {
          setState({
            kind: "ready",
            isFavorite: payload.data.some(
              (favorite) => favorite.match.id === match.id,
            ),
            message: null,
          });
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 401) {
          setState({
            kind: "unauthenticated",
            message: "登录后可以收藏比赛。",
          });
          return;
        }

        setState({
          kind: "error",
          isFavorite: false,
          message: error instanceof Error ? error.message : "收藏状态加载失败",
        });
      });

    return () => {
      active = false;
    };
  }, [match.id]);

  async function toggleFavorite() {
    if (state.kind !== "ready" && state.kind !== "error") {
      return;
    }

    const wasFavorite = state.isFavorite;
    setState({
      kind: "saving",
      isFavorite: wasFavorite,
      message: wasFavorite ? "正在取消收藏" : "正在收藏",
    });

    try {
      if (wasFavorite) {
        await sendEmpty(`/api/matches/${match.id}/favorite`, "DELETE");
        setState({
          kind: "ready",
          isFavorite: false,
          message: "已取消收藏",
        });
        return;
      }

      await sendJson<FavoriteResponse>(
        `/api/matches/${match.id}/favorite`,
        "POST",
        {},
      );
      setState({
        kind: "ready",
        isFavorite: true,
        message: "已收藏比赛",
      });
    } catch (error) {
      setState({
        kind: "error",
        isFavorite: wasFavorite,
        message: error instanceof Error ? error.message : "收藏操作失败",
      });
    }
  }

  return (
    <section className="grid gap-4 rounded border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-slate-950">我的收藏</h2>
        <Link
          className="text-sm font-semibold text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          href="/me/favorites"
        >
          查看我的收藏
        </Link>
      </div>

      {state.kind === "loading" ? (
        <p role="status" className="text-slate-600">
          正在加载收藏状态
        </p>
      ) : null}

      {state.kind === "unauthenticated" ? (
        <p className="text-slate-600">{state.message}</p>
      ) : null}

      {state.kind !== "loading" && state.kind !== "unauthenticated" ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={state.kind === "saving"}
            onClick={toggleFavorite}
            type="button"
          >
            {state.isFavorite ? "取消收藏" : "收藏比赛"}
          </button>
          {state.message ? (
            <p
              className={
                state.kind === "error" ? "text-red-700" : "text-slate-600"
              }
              role={state.kind === "error" ? "alert" : "status"}
            >
              {state.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

type AdminResultState =
  | { kind: "idle"; message: string | null }
  | { kind: "saving"; message: string }
  | { kind: "error"; message: string };

function AdminResultPanel({
  currentUser,
  match,
  onMatchUpdated,
}: {
  currentUser: User | null;
  match: Match;
  onMatchUpdated: (match: Match) => void;
}) {
  const [homeScore, setHomeScore] = useState(
    String(match.result?.homeScore ?? 0),
  );
  const [awayScore, setAwayScore] = useState(
    String(match.result?.awayScore ?? 0),
  );
  const [state, setState] = useState<AdminResultState>({
    kind: "idle",
    message: null,
  });

  if (currentUser?.role !== "ADMIN") {
    return null;
  }

  async function submitResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "saving", message: "正在保存比赛结果" });

    try {
      const payload = await sendJson<MatchResponse>(
        `/api/admin/matches/${match.id}/result`,
        "PUT",
        {
          homeScore: Number(homeScore),
          awayScore: Number(awayScore),
        },
      );

      onMatchUpdated(payload.data);
      setState({ kind: "idle", message: "比赛结果已保存" });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "结果保存失败",
      });
    }
  }

  return (
    <section className="grid gap-5 rounded border border-slate-200 bg-white p-6">
      <h2 className="text-2xl font-semibold text-slate-950">结果录入</h2>
      <form
        className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={submitResult}
      >
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          主队比分
          <input
            className="rounded border border-slate-300 px-3 py-2 text-base text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            min={0}
            name="homeResultScore"
            onChange={(event) => setHomeScore(event.target.value)}
            required
            step={1}
            type="number"
            value={homeScore}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          客队比分
          <input
            className="rounded border border-slate-300 px-3 py-2 text-base text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            min={0}
            name="awayResultScore"
            onChange={(event) => setAwayScore(event.target.value)}
            required
            step={1}
            type="number"
            value={awayScore}
          />
        </label>
        <button
          className="self-end rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={state.kind === "saving"}
          type="submit"
        >
          保存结果
        </button>
      </form>
      {state.message ? (
        <p
          className={state.kind === "error" ? "text-red-700" : "text-slate-600"}
          role={state.kind === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </section>
  );
}

type PredictionState =
  | { kind: "loading" }
  | { kind: "unauthenticated"; message: string }
  | { kind: "ready"; prediction: Prediction | null; message: string | null }
  | { kind: "error"; message: string };

function PredictionPanel({ match }: { match: Match }) {
  const [state, setState] = useState<PredictionState>({ kind: "loading" });
  const [homeScore, setHomeScore] = useState("1");
  const [awayScore, setAwayScore] = useState("0");
  const locked = match.status !== "SCHEDULED";

  useEffect(() => {
    let active = true;

    fetchJson<NullablePredictionResponse>(`/api/matches/${match.id}/prediction`)
      .then((payload) => {
        if (!active) {
          return;
        }

        setState({
          kind: "ready",
          prediction: payload.data,
          message: payload.data ? "已加载你的预测" : "暂无预测",
        });

        if (payload.data) {
          setHomeScore(String(payload.data.homeScore));
          setAwayScore(String(payload.data.awayScore));
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 401) {
          setState({
            kind: "unauthenticated",
            message: "登录后可以提交预测。",
          });
          return;
        }

        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "预测加载失败",
        });
      });

    return () => {
      active = false;
    };
  }, [match.id]);

  async function submitPrediction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (locked || state.kind !== "ready") {
      return;
    }

    const existingPrediction = state.prediction;
    setState({
      kind: "ready",
      prediction: existingPrediction,
      message: "正在保存预测",
    });

    try {
      const payload = await sendJson<PredictionResponse>(
        existingPrediction
          ? `/api/matches/${match.id}/prediction`
          : `/api/matches/${match.id}/predictions`,
        existingPrediction ? "PUT" : "POST",
        {
          homeScore: Number(homeScore),
          awayScore: Number(awayScore),
        },
      );

      setState({
        kind: "ready",
        prediction: payload.data,
        message: existingPrediction ? "预测已修改" : "预测已提交",
      });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "预测保存失败",
      });
    }
  }

  return (
    <section className="grid gap-5 rounded border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-slate-950">我的预测</h2>
        <Link
          className="text-sm font-semibold text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          href="/me/predictions"
        >
          查看我的预测
        </Link>
      </div>

      {state.kind === "loading" ? (
        <p role="status" className="text-slate-600">
          正在加载预测
        </p>
      ) : null}

      {state.kind === "unauthenticated" ? (
        <p className="text-slate-600">{state.message}</p>
      ) : null}

      {state.kind === "error" ? (
        <p role="alert" className="text-red-700">
          {state.message}
        </p>
      ) : null}

      {locked ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          比赛已经开始，预测已锁定。
        </p>
      ) : null}

      {state.kind === "ready" ? (
        <form
          className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={submitPrediction}
        >
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            主队进球
            <input
              className="rounded border border-slate-300 px-3 py-2 text-base text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              min={0}
              name="homeScore"
              onChange={(event) => setHomeScore(event.target.value)}
              required
              step={1}
              type="number"
              value={homeScore}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            客队进球
            <input
              className="rounded border border-slate-300 px-3 py-2 text-base text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              min={0}
              name="awayScore"
              onChange={(event) => setAwayScore(event.target.value)}
              required
              step={1}
              type="number"
              value={awayScore}
            />
          </label>
          <button
            className="self-end rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={locked}
            type="submit"
          >
            {state.prediction ? "修改预测" : "提交预测"}
          </button>
          <p className="text-sm text-slate-600 sm:col-span-3" role="status">
            {state.prediction
              ? `当前预测：${state.prediction.homeScore} : ${state.prediction.awayScore}`
              : state.message}
          </p>
        </form>
      ) : null}
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-base font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function stageTypeLabel(type: string): string {
  return (
    {
      GROUP: "小组赛",
      LEAGUE: "联赛",
      KNOCKOUT: "淘汰赛",
    }[type] ?? type
  );
}

function matchStatusLabel(status: string): string {
  return (
    {
      SCHEDULED: "未开始",
      LIVE: "进行中",
      FINISHED: "已结束",
    }[status] ?? status
  );
}

function moderationStatusLabel(status: string): string {
  return (
    {
      PENDING: "待审核",
      APPROVED: "已通过",
      REJECTED: "已驳回",
    }[status] ?? status
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
