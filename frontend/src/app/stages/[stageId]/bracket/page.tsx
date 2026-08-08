"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchJson } from "../../../../lib/api-client";
import type { BracketResponse, Match } from "../../../../lib/api-types";

type ViewState =
  | { kind: "loading" }
  | { kind: "success"; bracket: BracketResponse }
  | { kind: "error"; message: string };

export default function BracketPage() {
  const params = useParams<{ stageId: string }>();
  const stageId = params.stageId;
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let active = true;

    fetchJson<BracketResponse>(`/api/stages/${stageId}/bracket`)
      .then((bracket) => {
        if (active) {
          setState({ kind: "success", bracket });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            kind: "error",
            message:
              error instanceof Error ? error.message : "淘汰赛图加载失败",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [stageId]);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl content-start gap-8 px-6 py-10 sm:px-10 sm:py-16">
      <header className="grid gap-4 border-b border-slate-200 pb-6">
        <Link
          className="w-fit text-sm font-semibold text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          href="/competitions"
        >
          返回赛事列表
        </Link>
        <h1 className="text-4xl font-bold text-slate-950">淘汰赛图</h1>
      </header>

      {state.kind === "loading" ? (
        <p role="status" className="text-slate-600">
          正在加载淘汰赛图
        </p>
      ) : null}

      {state.kind === "error" ? (
        <p role="alert" className="text-red-700">
          {state.message}
        </p>
      ) : null}

      {state.kind === "success" && state.bracket.rounds.length === 0 ? (
        <p className="text-slate-600">该阶段暂无淘汰赛对阵。</p>
      ) : null}

      {state.kind === "success" ? (
        <div className="grid gap-6 md:grid-flow-col md:auto-cols-fr md:items-start">
          {state.bracket.rounds.map((round) => (
            <section className="grid gap-3" key={round.round}>
              <h2 className="text-2xl font-semibold text-slate-950">
                {round.round}
              </h2>
              <div className="grid gap-3">
                {round.matches.map((match) => (
                  <MatchCard match={match} key={match.id} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </main>
  );
}

function MatchCard({ match }: { match: Match }) {
  return (
    <Link
      className="grid gap-3 rounded border border-slate-200 bg-white p-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
      href={`/matches/${match.id}`}
    >
      <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
        <span>位置 {match.bracketPosition ?? "-"}</span>
        <span>{matchStatusLabel(match.status)}</span>
      </div>
      <div className="grid gap-2">
        <TeamLine
          name={match.homeTeam.name}
          score={match.result?.homeScore ?? null}
        />
        <TeamLine
          name={match.awayTeam.name}
          score={match.result?.awayScore ?? null}
        />
      </div>
      <p className="text-sm text-slate-500">{formatDateTime(match.startsAt)}</p>
    </Link>
  );
}

function TeamLine({ name, score }: { name: string; score: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-semibold text-slate-950">{name}</span>
      <span className="text-lg font-bold text-slate-950">
        {score === null ? "-" : score}
      </span>
    </div>
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
