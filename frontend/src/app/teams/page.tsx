"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson } from "../../lib/api-client";
import type { Team, TeamListResponse } from "../../lib/api-types";

type ViewState =
  | { kind: "loading" }
  | { kind: "success"; teams: Team[] }
  | { kind: "error"; message: string };

export default function TeamsPage() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let active = true;

    fetchJson<TeamListResponse>("/api/teams")
      .then((payload) => {
        if (active) {
          setState({ kind: "success", teams: payload.data });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            kind: "error",
            message: error instanceof Error ? error.message : "球队加载失败",
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
        <h1 className="text-4xl font-bold text-slate-950">球队资料</h1>
      </header>

      {state.kind === "loading" ? (
        <p role="status" className="text-slate-600">
          正在加载球队
        </p>
      ) : null}

      {state.kind === "error" ? (
        <p role="alert" className="text-red-700">
          {state.message}
        </p>
      ) : null}

      {state.kind === "success" && state.teams.length === 0 ? (
        <p className="text-slate-600">暂无球队。</p>
      ) : null}

      {state.kind === "success" && state.teams.length > 0 ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {state.teams.map((team) => (
            <li
              className="rounded border border-slate-200 bg-white p-5"
              key={team.id}
            >
              <Link
                className="grid gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
                href={`/teams/${team.id}`}
              >
                <span className="text-xl font-semibold text-slate-950">
                  {team.name}
                </span>
                <span className="text-sm text-slate-600">
                  简称：{team.shortName ?? "暂无"} · 外部 ID：
                  {team.openLigaDbTeamId ?? "暂无"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
