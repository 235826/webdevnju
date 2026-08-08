"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiClientError, fetchJson } from "../../../lib/api-client";
import type { Favorite, FavoriteListResponse } from "../../../lib/api-types";

type ViewState =
  | { kind: "loading" }
  | { kind: "unauthenticated"; message: string }
  | { kind: "success"; favorites: Favorite[] }
  | { kind: "error"; message: string };

export default function MyFavoritesPage() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let active = true;

    fetchJson<FavoriteListResponse>("/api/users/me/favorites")
      .then((payload) => {
        if (active) {
          setState({ kind: "success", favorites: payload.data });
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 401) {
          setState({
            kind: "unauthenticated",
            message: "登录后可以查看收藏。",
          });
          return;
        }

        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "收藏列表加载失败",
        });
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl content-start gap-8 px-6 py-10 sm:px-10 sm:py-16">
      <header className="grid gap-4 border-b border-slate-200 pb-6">
        <Link
          className="w-fit text-sm font-semibold text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          href="/"
        >
          返回首页
        </Link>
        <h1 className="text-4xl font-bold text-slate-950">我的收藏</h1>
      </header>

      {state.kind === "loading" ? (
        <p role="status" className="text-slate-600">
          正在加载我的收藏
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

      {state.kind === "success" && state.favorites.length === 0 ? (
        <p className="text-slate-600">暂无收藏。</p>
      ) : null}

      {state.kind === "success" && state.favorites.length > 0 ? (
        <ul className="grid gap-4">
          {state.favorites.map((favorite) => (
            <li
              className="rounded border border-slate-200 bg-white p-5"
              key={favorite.id}
            >
              <Link
                className="grid gap-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
                href={`/matches/${favorite.match.id}`}
              >
                <span className="text-lg font-semibold text-slate-950">
                  {favorite.match.homeTeam.name} vs{" "}
                  {favorite.match.awayTeam.name}
                </span>
                <span className="text-sm text-slate-600">
                  {favorite.match.competition.name} ·{" "}
                  {favorite.match.stage.name} ·{" "}
                  {matchStatusLabel(favorite.match.status)}
                </span>
                <span className="text-sm text-slate-500">
                  开赛时间：{formatDateTime(favorite.match.startsAt)}
                </span>
                <span className="text-sm text-slate-500">
                  收藏时间：{formatDateTime(favorite.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
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

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
