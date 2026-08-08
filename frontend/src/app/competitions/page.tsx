"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson } from "../../lib/api-client";
import type { Competition, CompetitionListResponse } from "../../lib/api-types";

type ViewState =
  | { kind: "loading" }
  | { kind: "success"; competitions: Competition[] }
  | { kind: "error"; message: string };

export default function CompetitionsPage() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let active = true;

    fetchJson<CompetitionListResponse>("/api/competitions")
      .then((payload) => {
        if (active) {
          setState({ kind: "success", competitions: payload.data });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            kind: "error",
            message: error instanceof Error ? error.message : "赛事加载失败",
          });
        }
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
        <h1 className="text-4xl font-bold text-slate-950">赛事列表</h1>
      </header>

      {state.kind === "loading" ? (
        <p role="status" className="text-slate-600">
          正在加载赛事
        </p>
      ) : null}

      {state.kind === "error" ? (
        <p role="alert" className="text-red-700">
          {state.message}
        </p>
      ) : null}

      {state.kind === "success" && state.competitions.length === 0 ? (
        <p className="text-slate-600">暂无赛事。</p>
      ) : null}

      {state.kind === "success" && state.competitions.length > 0 ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {state.competitions.map((competition) => (
            <li
              className="rounded border border-slate-200 bg-white p-5"
              key={competition.id}
            >
              <Link
                className="grid gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
                href={`/competitions/${competition.id}`}
              >
                <span className="text-xl font-semibold text-slate-950">
                  {competition.name}
                </span>
                <span className="leading-7 text-slate-600">
                  {competition.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
