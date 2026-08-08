"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ApiClientError, fetchJson, sendJson } from "../../../lib/api-client";
import type {
  AuthResponse,
  MatchResponse,
  MatchStatus,
  MatchWriteRequest,
  Team,
  TeamListResponse,
  User,
} from "../../../lib/api-types";

type ViewState =
  | { kind: "loading" }
  | { kind: "ready"; currentUser: User; teams: Team[] }
  | { kind: "error"; message: string };

type SubmitState =
  | { kind: "idle"; message: string | null; matchId: number | null }
  | { kind: "saving"; message: string; matchId: number | null }
  | { kind: "error"; message: string; matchId: number | null };

export default function AdminMatchesPage() {
  const [viewState, setViewState] = useState<ViewState>({ kind: "loading" });
  const [submitState, setSubmitState] = useState<SubmitState>({
    kind: "idle",
    message: null,
    matchId: null,
  });
  const [stageId, setStageId] = useState("1");
  const [homeTeamId, setHomeTeamId] = useState("2");
  const [awayTeamId, setAwayTeamId] = useState("4");
  const [startsAt, setStartsAt] = useState("2026-11-15T10:00");
  const [status, setStatus] = useState<MatchStatus>("SCHEDULED");
  const [groupName, setGroupName] = useState("");
  const [knockoutRound, setKnockoutRound] = useState("");
  const [bracketPosition, setBracketPosition] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchJson<AuthResponse>("/api/auth/me"),
      fetchJson<TeamListResponse>("/api/teams"),
    ])
      .then(([userPayload, teamsPayload]) => {
        if (!active) {
          return;
        }

        if (userPayload.data.role !== "ADMIN") {
          setViewState({ kind: "error", message: "没有权限执行该操作" });
          return;
        }

        setViewState({
          kind: "ready",
          currentUser: userPayload.data,
          teams: teamsPayload.data,
        });
      })
      .catch((error: unknown) => {
        if (active) {
          setViewState({
            kind: "error",
            message:
              error instanceof Error ? error.message : "管理页面加载失败",
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function submitMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState({
      kind: "saving",
      message: "正在创建比赛",
      matchId: submitState.matchId,
    });

    try {
      const payload = await sendJson<MatchResponse>(
        "/api/admin/matches",
        "POST",
        buildMatchRequest(),
      );
      setSubmitState({
        kind: "idle",
        message: "比赛已创建",
        matchId: payload.data.id,
      });
    } catch (error) {
      setSubmitState({
        kind: "error",
        message:
          error instanceof ApiClientError || error instanceof Error
            ? error.message
            : "比赛创建失败",
        matchId: submitState.matchId,
      });
    }
  }

  function buildMatchRequest(): MatchWriteRequest {
    return {
      stageId: Number(stageId),
      homeTeamId: Number(homeTeamId),
      awayTeamId: Number(awayTeamId),
      startsAt: new Date(startsAt).toISOString(),
      status,
      groupName: groupName.trim() === "" ? null : groupName.trim(),
      knockoutRound: knockoutRound.trim() === "" ? null : knockoutRound.trim(),
      bracketPosition:
        bracketPosition.trim() === "" ? null : Number(bracketPosition),
    };
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl content-start gap-8 px-6 py-10 sm:px-10 sm:py-16">
      <header className="grid gap-4 border-b border-slate-200 pb-6">
        <Link
          className="w-fit text-sm font-semibold text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          href="/"
        >
          返回首页
        </Link>
        <h1 className="text-4xl font-bold text-slate-950">管理比赛</h1>
      </header>

      {viewState.kind === "loading" ? (
        <p role="status" className="text-slate-600">
          正在加载管理数据
        </p>
      ) : null}

      {viewState.kind === "error" ? (
        <p role="alert" className="text-red-700">
          {viewState.message}
        </p>
      ) : null}

      {viewState.kind === "ready" ? (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <form
            className="grid gap-5 rounded border border-slate-200 bg-white p-5"
            onSubmit={submitMatch}
          >
            <h2 className="text-2xl font-semibold text-slate-950">新增比赛</h2>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              阶段 ID
              <input
                className={inputClassName}
                min={1}
                name="stageId"
                type="number"
                value={stageId}
                onChange={(event) => setStageId(event.target.value)}
                required
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                主队
                <select
                  className={inputClassName}
                  name="homeTeamId"
                  value={homeTeamId}
                  onChange={(event) => setHomeTeamId(event.target.value)}
                  required
                >
                  {viewState.teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                客队
                <select
                  className={inputClassName}
                  name="awayTeamId"
                  value={awayTeamId}
                  onChange={(event) => setAwayTeamId(event.target.value)}
                  required
                >
                  {viewState.teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                开赛时间
                <input
                  className={inputClassName}
                  name="startsAt"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                比赛状态
                <select
                  className={inputClassName}
                  name="status"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as MatchStatus)
                  }
                  required
                >
                  <option value="SCHEDULED">未开始</option>
                  <option value="LIVE">进行中</option>
                  <option value="FINISHED">已结束</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                小组名
                <input
                  className={inputClassName}
                  maxLength={40}
                  name="groupName"
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                淘汰轮次
                <input
                  className={inputClassName}
                  maxLength={40}
                  name="knockoutRound"
                  value={knockoutRound}
                  onChange={(event) => setKnockoutRound(event.target.value)}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                签位
                <input
                  className={inputClassName}
                  min={1}
                  name="bracketPosition"
                  type="number"
                  value={bracketPosition}
                  onChange={(event) => setBracketPosition(event.target.value)}
                />
              </label>
            </div>

            <button
              className="rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              type="submit"
              disabled={submitState.kind === "saving"}
            >
              创建比赛
            </button>

            {submitState.message ? (
              <p
                className={
                  submitState.kind === "error"
                    ? "text-red-700"
                    : "text-slate-600"
                }
                role={submitState.kind === "error" ? "alert" : "status"}
              >
                {submitState.message}
              </p>
            ) : null}

            {submitState.matchId ? (
              <Link
                className="w-fit text-sm font-semibold text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                href={`/matches/${submitState.matchId}`}
              >
                查看新比赛
              </Link>
            ) : null}
          </form>

          <aside className="grid content-start gap-4 rounded border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-semibold text-slate-950">可选球队</h2>
            <ul className="grid gap-2 text-sm text-slate-700">
              {viewState.teams.map((team) => (
                <li key={team.id}>
                  <span className="font-semibold text-slate-950">
                    {team.id}
                  </span>{" "}
                  {team.name}
                </li>
              ))}
            </ul>
          </aside>
        </section>
      ) : null}
    </main>
  );
}

const inputClassName =
  "rounded border border-slate-300 px-3 py-2 text-base text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";
