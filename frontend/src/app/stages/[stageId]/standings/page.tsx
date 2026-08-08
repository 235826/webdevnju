"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchJson } from "../../../../lib/api-client";
import type { StandingsResponse } from "../../../../lib/api-types";

type ViewState =
  | { kind: "loading" }
  | { kind: "success"; standings: StandingsResponse }
  | { kind: "error"; message: string };

export default function StandingsPage() {
  const params = useParams<{ stageId: string }>();
  const stageId = params.stageId;
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let active = true;

    fetchJson<StandingsResponse>(`/api/stages/${stageId}/standings`)
      .then((standings) => {
        if (active) {
          setState({ kind: "success", standings });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            kind: "error",
            message: error instanceof Error ? error.message : "积分榜加载失败",
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
        <h1 className="text-4xl font-bold text-slate-950">积分榜</h1>
      </header>

      {state.kind === "loading" ? (
        <p role="status" className="text-slate-600">
          正在加载积分榜
        </p>
      ) : null}

      {state.kind === "error" ? (
        <p role="alert" className="text-red-700">
          {state.message}
        </p>
      ) : null}

      {state.kind === "success" && state.standings.groups.length === 0 ? (
        <p className="text-slate-600">该阶段暂无积分榜数据。</p>
      ) : null}

      {state.kind === "success"
        ? state.standings.groups.map((group) => (
            <section className="grid gap-3" key={group.groupName ?? "league"}>
              <h2 className="text-2xl font-semibold text-slate-950">
                {group.groupName ? `${group.groupName} 组` : "联赛积分榜"}
              </h2>
              <div className="overflow-x-auto rounded border border-slate-200 bg-white">
                <table className="min-w-[760px] w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-3">排名</th>
                      <th className="px-3 py-3">球队</th>
                      <th className="px-3 py-3">场</th>
                      <th className="px-3 py-3">胜</th>
                      <th className="px-3 py-3">平</th>
                      <th className="px-3 py-3">负</th>
                      <th className="px-3 py-3">进</th>
                      <th className="px-3 py-3">失</th>
                      <th className="px-3 py-3">净胜</th>
                      <th className="px-3 py-3">积分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr
                        className="border-t border-slate-100"
                        key={row.team.id}
                      >
                        <td className="px-3 py-3 font-semibold text-slate-950">
                          {row.rank}
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            className="font-semibold text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                            href={`/teams/${row.team.id}`}
                          >
                            {row.team.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3">{row.played}</td>
                        <td className="px-3 py-3">{row.won}</td>
                        <td className="px-3 py-3">{row.drawn}</td>
                        <td className="px-3 py-3">{row.lost}</td>
                        <td className="px-3 py-3">{row.goalsFor}</td>
                        <td className="px-3 py-3">{row.goalsAgainst}</td>
                        <td className="px-3 py-3">{row.goalDifference}</td>
                        <td className="px-3 py-3 font-semibold text-slate-950">
                          {row.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        : null}
    </main>
  );
}
