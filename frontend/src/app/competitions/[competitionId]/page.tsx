"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "../../../lib/api-client";
import type {
  Competition,
  CompetitionResponse,
  Match,
  MatchListResponse,
} from "../../../lib/api-types";

type ViewState =
  | { kind: "loading" }
  | { kind: "success"; competition: Competition; matches: Match[] }
  | { kind: "error"; message: string };

export default function CompetitionDetailPage() {
  const params = useParams<{ competitionId: string }>();
  const competitionId = params.competitionId;
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchJson<CompetitionResponse>(`/api/competitions/${competitionId}`),
      fetchJson<MatchListResponse>(
        `/api/matches?competitionId=${competitionId}`,
      ),
    ])
      .then(([competitionPayload, matchesPayload]) => {
        if (active) {
          setState({
            kind: "success",
            competition: competitionPayload.data,
            matches: matchesPayload.data,
          });
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
  }, [competitionId]);

  const groupedMatches = useMemo(() => {
    if (state.kind !== "success") {
      return [];
    }

    const groups = new Map<number, Match[]>();

    for (const match of state.matches) {
      groups.set(match.stage.id, [
        ...(groups.get(match.stage.id) ?? []),
        match,
      ]);
    }

    return [...groups.values()].sort(
      (left, right) =>
        left[0].stage.sortOrder - right[0].stage.sortOrder ||
        left[0].stage.id - right[0].stage.id,
    );
  }, [state]);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl content-start gap-8 px-6 py-10 sm:px-10 sm:py-16">
      <header className="grid gap-4 border-b border-slate-200 pb-6">
        <Link
          className="w-fit text-sm font-semibold text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          href="/competitions"
        >
          返回赛事列表
        </Link>
        <h1 className="text-4xl font-bold text-slate-950">
          {state.kind === "success" ? state.competition.name : "赛事详情"}
        </h1>
        {state.kind === "success" ? (
          <p className="max-w-3xl leading-7 text-slate-600">
            {state.competition.description}
          </p>
        ) : null}
      </header>

      {state.kind === "loading" ? (
        <p role="status" className="text-slate-600">
          正在加载比赛
        </p>
      ) : null}

      {state.kind === "error" ? (
        <p role="alert" className="text-red-700">
          {state.message}
        </p>
      ) : null}

      {state.kind === "success" && state.matches.length === 0 ? (
        <p className="text-slate-600">该赛事暂无比赛。</p>
      ) : null}

      {groupedMatches.map((matches) => (
        <section className="grid gap-4" key={matches[0].stage.id}>
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              {matches[0].stage.name}
            </h2>
            <p className="text-sm text-slate-500">
              {stageTypeLabel(matches[0].stage.type)}
            </p>
          </div>
          <ul className="grid gap-3">
            {matches.map((match) => (
              <li
                className="rounded border border-slate-200 bg-white p-4"
                key={match.id}
              >
                <Link
                  className="grid gap-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 md:grid-cols-[1fr_auto]"
                  href={`/matches/${match.id}`}
                >
                  <span className="font-semibold text-slate-950">
                    {match.homeTeam.name} vs {match.awayTeam.name}
                  </span>
                  <span className="text-sm text-slate-600">
                    {formatDateTime(match.startsAt)} ·{" "}
                    {matchStatusLabel(match.status)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
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
