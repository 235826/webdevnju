"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiClientError, fetchJson } from "../../../lib/api-client";
import type {
  Prediction,
  PredictionListResponse,
} from "../../../lib/api-types";

type ViewState =
  | { kind: "loading" }
  | { kind: "unauthenticated"; message: string }
  | { kind: "success"; predictions: Prediction[] }
  | { kind: "error"; message: string };

export default function MyPredictionsPage() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let active = true;

    fetchJson<PredictionListResponse>("/api/users/me/predictions")
      .then((payload) => {
        if (active) {
          setState({ kind: "success", predictions: payload.data });
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 401) {
          setState({
            kind: "unauthenticated",
            message: "登录后可以查看预测。",
          });
          return;
        }

        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "预测列表加载失败",
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
        <h1 className="text-4xl font-bold text-slate-950">我的预测</h1>
      </header>

      {state.kind === "loading" ? (
        <p role="status" className="text-slate-600">
          正在加载我的预测
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

      {state.kind === "success" && state.predictions.length === 0 ? (
        <p className="text-slate-600">暂无预测。</p>
      ) : null}

      {state.kind === "success" && state.predictions.length > 0 ? (
        <ul className="grid gap-4">
          {state.predictions.map((prediction) => (
            <li
              className="rounded border border-slate-200 bg-white p-5"
              key={prediction.id}
            >
              <Link
                className="grid gap-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
                href={`/matches/${prediction.matchId}`}
              >
                <span className="text-lg font-semibold text-slate-950">
                  比赛 #{prediction.matchId}
                </span>
                <span className="text-sm text-slate-600">
                  预测比分：{prediction.homeScore} : {prediction.awayScore}
                </span>
                <span className="text-sm text-slate-500">
                  提交时间：{formatDateTime(prediction.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
