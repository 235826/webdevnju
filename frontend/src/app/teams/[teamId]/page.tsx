"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchJson } from "../../../lib/api-client";
import type { Team, TeamResponse } from "../../../lib/api-types";

type ViewState =
  | { kind: "loading" }
  | { kind: "success"; team: Team }
  | { kind: "error"; message: string };

export default function TeamDetailPage() {
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId;
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let active = true;

    fetchJson<TeamResponse>(`/api/teams/${teamId}`)
      .then((payload) => {
        if (active) {
          setState({ kind: "success", team: payload.data });
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
  }, [teamId]);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl content-start gap-8 px-6 py-10 sm:px-10 sm:py-16">
      <header className="grid gap-4 border-b border-slate-200 pb-6">
        <Link
          className="w-fit text-sm font-semibold text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          href="/teams"
        >
          返回球队列表
        </Link>
        <h1 className="text-4xl font-bold text-slate-950">
          {state.kind === "success" ? state.team.name : "球队详情"}
        </h1>
      </header>

      {state.kind === "loading" ? (
        <p role="status" className="text-slate-600">
          正在加载球队详情
        </p>
      ) : null}

      {state.kind === "error" ? (
        <p role="alert" className="text-red-700">
          {state.message}
        </p>
      ) : null}

      {state.kind === "success" ? (
        <article className="grid gap-6 rounded border border-slate-200 bg-white p-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailItem label="球队名称" value={state.team.name} />
            <DetailItem label="简称" value={state.team.shortName ?? "暂无"} />
            <DetailItem
              label="OpenLigaDB ID"
              value={String(state.team.openLigaDbTeamId ?? "暂无")}
            />
            <DetailItem
              label="Logo"
              value={state.team.logoUrl ?? "暂无本地 Logo"}
            />
          </dl>
          <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            外部球队资料暂不可用，当前展示本地权威资料。
          </p>
        </article>
      ) : null}
    </main>
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
