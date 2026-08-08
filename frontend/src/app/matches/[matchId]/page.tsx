"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchJson } from "../../../lib/api-client";
import type { Match, MatchResponse } from "../../../lib/api-types";

type ViewState =
  | { kind: "loading" }
  | { kind: "success"; match: Match }
  | { kind: "error"; message: string };

export default function MatchDetailPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let active = true;

    fetchJson<MatchResponse>(`/api/matches/${matchId}`)
      .then((payload) => {
        if (active) {
          setState({ kind: "success", match: payload.data });
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
        <article className="grid gap-6 rounded border border-slate-200 bg-white p-6">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              {state.match.competition.name} · {state.match.stage.name}
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-950">
              {state.match.homeTeam.name} vs {state.match.awayTeam.name}
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

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
