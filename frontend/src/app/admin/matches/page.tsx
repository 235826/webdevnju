"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ApiClientError,
  fetchJson,
  sendEmpty,
  sendJson,
} from "../../../lib/api-client";
import type {
  AuthResponse,
  Competition,
  CompetitionListResponse,
  CompetitionResponse,
  CompetitionWriteRequest,
  Match,
  MatchListResponse,
  MatchResponse,
  MatchStatus,
  MatchWriteRequest,
  Stage,
  StageListResponse,
  StageResponse,
  StageType,
  StageWriteRequest,
  Team,
  TeamListResponse,
  TeamResponse,
  TeamWriteRequest,
  User,
} from "../../../lib/api-types";

type ViewState =
  | { kind: "loading" }
  | {
      kind: "ready";
      currentUser: User;
      competitions: Competition[];
      stages: Stage[];
      teams: Team[];
      matches: Match[];
    }
  | { kind: "error"; message: string };

type Notice = { kind: "idle" | "saving" | "error"; message: string | null };

const inputClassName =
  "rounded border border-slate-300 px-3 py-2 text-base text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";
const buttonClassName =
  "rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400";
const secondaryButtonClassName =
  "rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950 hover:border-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

export default function AdminMatchesPage() {
  const [viewState, setViewState] = useState<ViewState>({ kind: "loading" });
  const [notice, setNotice] = useState<Notice>({
    kind: "idle",
    message: null,
  });
  const [createdMatchId, setCreatedMatchId] = useState<number | null>(null);

  const [competitionName, setCompetitionName] = useState("管理测试赛事");
  const [competitionDescription, setCompetitionDescription] =
    useState("后台创建的赛事");

  const [stageCompetitionId, setStageCompetitionId] = useState("1");
  const [stageName, setStageName] = useState("管理测试阶段");
  const [stageType, setStageType] = useState<StageType>("LEAGUE");
  const [stageGroupName, setStageGroupName] = useState("");
  const [stageSortOrder, setStageSortOrder] = useState("200");

  const [teamName, setTeamName] = useState("管理测试球队");
  const [teamShortName, setTeamShortName] = useState("测试队");
  const [teamLogoUrl, setTeamLogoUrl] = useState("");
  const [teamOpenLigaDbTeamId, setTeamOpenLigaDbTeamId] = useState("");

  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [matchStageId, setMatchStageId] = useState("1");
  const [homeTeamId, setHomeTeamId] = useState("2");
  const [awayTeamId, setAwayTeamId] = useState("4");
  const [startsAt, setStartsAt] = useState("2026-11-15T10:00");
  const [status, setStatus] = useState<MatchStatus>("SCHEDULED");
  const [groupName, setGroupName] = useState("");
  const [knockoutRound, setKnockoutRound] = useState("");
  const [bracketPosition, setBracketPosition] = useState("");

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setViewState({ kind: "loading" });

    try {
      const [
        userPayload,
        competitionsPayload,
        stagesPayload,
        teamsPayload,
        matchesPayload,
      ] = await Promise.all([
        fetchJson<AuthResponse>("/api/auth/me"),
        fetchJson<CompetitionListResponse>("/api/competitions"),
        fetchJson<StageListResponse>("/api/stages"),
        fetchJson<TeamListResponse>("/api/teams"),
        fetchJson<MatchListResponse>("/api/matches"),
      ]);

      if (userPayload.data.role !== "ADMIN") {
        setViewState({ kind: "error", message: "没有权限执行该操作" });
        return;
      }

      setViewState({
        kind: "ready",
        currentUser: userPayload.data,
        competitions: competitionsPayload.data,
        stages: stagesPayload.data,
        teams: teamsPayload.data,
        matches: matchesPayload.data,
      });
      setStageCompetitionId(String(competitionsPayload.data[0]?.id ?? 1));
      setMatchStageId(String(stagesPayload.data[0]?.id ?? 1));
      setHomeTeamId(String(teamsPayload.data[0]?.id ?? 1));
      setAwayTeamId(
        String(teamsPayload.data[1]?.id ?? teamsPayload.data[0]?.id ?? 1),
      );
    } catch (error) {
      setViewState({
        kind: "error",
        message: error instanceof Error ? error.message : "管理页面加载失败",
      });
    }
  }

  const teamOptions = viewState.kind === "ready" ? viewState.teams : [];
  const stageOptions = viewState.kind === "ready" ? viewState.stages : [];
  const competitionOptions =
    viewState.kind === "ready" ? viewState.competitions : [];
  const matchRows = useMemo(
    () => (viewState.kind === "ready" ? viewState.matches : []),
    [viewState],
  );

  async function submitCompetition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAdminAction("正在保存赛事", "赛事已保存", async () => {
      await sendJson<CompetitionResponse>("/api/admin/competitions", "POST", {
        name: competitionName,
        description: competitionDescription,
      } satisfies CompetitionWriteRequest);
      await loadData();
    });
  }

  async function submitStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAdminAction("正在保存阶段", "阶段已保存", async () => {
      await sendJson<StageResponse>("/api/admin/stages", "POST", {
        competitionId: Number(stageCompetitionId),
        name: stageName,
        type: stageType,
        groupName: nullableText(stageGroupName),
        sortOrder: Number(stageSortOrder),
      } satisfies StageWriteRequest);
      await loadData();
    });
  }

  async function submitTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAdminAction("正在保存球队", "球队已保存", async () => {
      await sendJson<TeamResponse>("/api/admin/teams", "POST", {
        name: teamName,
        shortName: nullableText(teamShortName),
        logoUrl: nullableText(teamLogoUrl),
        openLigaDbTeamId:
          teamOpenLigaDbTeamId.trim() === ""
            ? null
            : Number(teamOpenLigaDbTeamId),
      } satisfies TeamWriteRequest);
      await loadData();
    });
  }

  async function submitMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAdminAction(
      editingMatchId ? "正在更新比赛" : "正在创建比赛",
      editingMatchId ? "比赛已更新" : "比赛已创建",
      async () => {
        const payload = await sendJson<MatchResponse>(
          editingMatchId
            ? `/api/admin/matches/${editingMatchId}`
            : "/api/admin/matches",
          editingMatchId ? "PUT" : "POST",
          buildMatchRequest(),
        );
        setCreatedMatchId(payload.data.id);
        setEditingMatchId(null);
        await loadData();
      },
    );
  }

  async function deleteMatch(matchId: number) {
    await runAdminAction("正在删除比赛", "比赛已删除", async () => {
      await sendEmpty(`/api/admin/matches/${matchId}`, "DELETE");
      if (createdMatchId === matchId) {
        setCreatedMatchId(null);
      }
      if (editingMatchId === matchId) {
        setEditingMatchId(null);
      }
      await loadData();
    });
  }

  async function deleteCompetition(competitionId: number) {
    await runAdminAction("正在删除赛事", "赛事已删除", async () => {
      await sendEmpty(`/api/admin/competitions/${competitionId}`, "DELETE");
      await loadData();
    });
  }

  async function deleteStage(stageId: number) {
    await runAdminAction("正在删除阶段", "阶段已删除", async () => {
      await sendEmpty(`/api/admin/stages/${stageId}`, "DELETE");
      await loadData();
    });
  }

  async function deleteTeam(teamId: number) {
    await runAdminAction("正在删除球队", "球队已删除", async () => {
      await sendEmpty(`/api/admin/teams/${teamId}`, "DELETE");
      await loadData();
    });
  }

  async function runAdminAction(
    savingMessage: string,
    successMessage: string,
    action: () => Promise<void>,
  ) {
    setNotice({ kind: "saving", message: savingMessage });

    try {
      await action();
      setNotice({ kind: "idle", message: successMessage });
    } catch (error) {
      setNotice({
        kind: "error",
        message:
          error instanceof ApiClientError || error instanceof Error
            ? error.message
            : "操作失败",
      });
    }
  }

  function buildMatchRequest(): MatchWriteRequest {
    return {
      stageId: Number(matchStageId),
      homeTeamId: Number(homeTeamId),
      awayTeamId: Number(awayTeamId),
      startsAt: new Date(startsAt).toISOString(),
      status,
      groupName: nullableText(groupName),
      knockoutRound: nullableText(knockoutRound),
      bracketPosition:
        bracketPosition.trim() === "" ? null : Number(bracketPosition),
    };
  }

  function startEditMatch(match: Match) {
    setEditingMatchId(match.id);
    setMatchStageId(String(match.stage.id));
    setHomeTeamId(String(match.homeTeam.id));
    setAwayTeamId(String(match.awayTeam.id));
    setStartsAt(toLocalDateTime(match.startsAt));
    setStatus(match.status);
    setGroupName(match.groupName ?? "");
    setKnockoutRound(match.knockoutRound ?? "");
    setBracketPosition(
      match.bracketPosition === null ? "" : String(match.bracketPosition),
    );
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl content-start gap-8 px-6 py-10 sm:px-10 sm:py-16">
      <header className="grid gap-4 border-b border-slate-200 pb-6">
        <Link
          className="w-fit text-sm font-semibold text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          href="/"
        >
          返回首页
        </Link>
        <h1 className="text-4xl font-bold text-slate-950">后台数据管理</h1>
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
        <>
          <p
            className={
              notice.kind === "error" ? "text-red-700" : "text-slate-600"
            }
            role={notice.kind === "error" ? "alert" : "status"}
          >
            {notice.message ?? `已登录为 ${viewState.currentUser.username}`}
          </p>

          <section className="grid gap-4 lg:grid-cols-3">
            <form
              className="grid gap-4 rounded border border-slate-200 bg-white p-5"
              onSubmit={submitCompetition}
            >
              <h2 className="text-xl font-semibold text-slate-950">赛事</h2>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                赛事名称
                <input
                  className={inputClassName}
                  value={competitionName}
                  onChange={(event) => setCompetitionName(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                赛事描述
                <textarea
                  className={inputClassName}
                  value={competitionDescription}
                  onChange={(event) =>
                    setCompetitionDescription(event.target.value)
                  }
                  rows={3}
                />
              </label>
              <button
                className={buttonClassName}
                type="submit"
                disabled={notice.kind === "saving"}
              >
                创建赛事
              </button>
            </form>

            <form
              className="grid gap-4 rounded border border-slate-200 bg-white p-5"
              onSubmit={submitStage}
            >
              <h2 className="text-xl font-semibold text-slate-950">阶段</h2>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                所属赛事
                <select
                  className={inputClassName}
                  value={stageCompetitionId}
                  onChange={(event) =>
                    setStageCompetitionId(event.target.value)
                  }
                  required
                >
                  {competitionOptions.map((competition) => (
                    <option key={competition.id} value={competition.id}>
                      {competition.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                阶段名称
                <input
                  className={inputClassName}
                  value={stageName}
                  onChange={(event) => setStageName(event.target.value)}
                  required
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  类型
                  <select
                    className={inputClassName}
                    value={stageType}
                    onChange={(event) =>
                      setStageType(event.target.value as StageType)
                    }
                  >
                    <option value="GROUP">小组赛</option>
                    <option value="LEAGUE">联赛</option>
                    <option value="KNOCKOUT">淘汰赛</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  小组
                  <input
                    className={inputClassName}
                    value={stageGroupName}
                    onChange={(event) => setStageGroupName(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  排序
                  <input
                    className={inputClassName}
                    min={0}
                    type="number"
                    value={stageSortOrder}
                    onChange={(event) => setStageSortOrder(event.target.value)}
                    required
                  />
                </label>
              </div>
              <button
                className={buttonClassName}
                type="submit"
                disabled={notice.kind === "saving"}
              >
                创建阶段
              </button>
            </form>

            <form
              className="grid gap-4 rounded border border-slate-200 bg-white p-5"
              onSubmit={submitTeam}
            >
              <h2 className="text-xl font-semibold text-slate-950">球队</h2>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                球队名称
                <input
                  className={inputClassName}
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  required
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  简称
                  <input
                    className={inputClassName}
                    value={teamShortName}
                    onChange={(event) => setTeamShortName(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  OpenLigaDB ID
                  <input
                    className={inputClassName}
                    min={1}
                    type="number"
                    value={teamOpenLigaDbTeamId}
                    onChange={(event) =>
                      setTeamOpenLigaDbTeamId(event.target.value)
                    }
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Logo URL
                <input
                  className={inputClassName}
                  value={teamLogoUrl}
                  onChange={(event) => setTeamLogoUrl(event.target.value)}
                />
              </label>
              <button
                className={buttonClassName}
                type="submit"
                disabled={notice.kind === "saving"}
              >
                创建球队
              </button>
            </form>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <form
              className="grid gap-5 rounded border border-slate-200 bg-white p-5"
              onSubmit={submitMatch}
            >
              <h2 className="text-2xl font-semibold text-slate-950">
                {editingMatchId ? "编辑比赛" : "新增比赛"}
              </h2>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                阶段
                <select
                  className={inputClassName}
                  name="stageId"
                  value={matchStageId}
                  onChange={(event) => setMatchStageId(event.target.value)}
                  required
                >
                  {stageOptions.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name} ·{" "}
                      {competitionNameById(
                        competitionOptions,
                        stage.competitionId,
                      )}
                    </option>
                  ))}
                </select>
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
                    {teamOptions.map((team) => (
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
                    {teamOptions.map((team) => (
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

              <div className="flex flex-wrap gap-3">
                <button
                  className={buttonClassName}
                  type="submit"
                  disabled={notice.kind === "saving"}
                >
                  {editingMatchId ? "保存比赛" : "创建比赛"}
                </button>
                {editingMatchId ? (
                  <button
                    className={secondaryButtonClassName}
                    type="button"
                    onClick={() => setEditingMatchId(null)}
                  >
                    取消编辑
                  </button>
                ) : null}
                {createdMatchId ? (
                  <Link
                    className={secondaryButtonClassName}
                    href={`/matches/${createdMatchId}`}
                  >
                    查看新比赛
                  </Link>
                ) : null}
              </div>
            </form>

            <aside className="grid content-start gap-4 rounded border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-semibold text-slate-950">基础数据</h2>
              <DataList
                title="赛事"
                rows={competitionOptions.map((competition) => ({
                  id: competition.id,
                  label: competition.name,
                  onDelete: () => deleteCompetition(competition.id),
                }))}
              />
              <DataList
                title="阶段"
                rows={stageOptions.map((stage) => ({
                  id: stage.id,
                  label: `${stage.name} · ${stage.type}`,
                  onDelete: () => deleteStage(stage.id),
                }))}
              />
              <DataList
                title="球队"
                rows={teamOptions.map((team) => ({
                  id: team.id,
                  label: team.name,
                  onDelete: () => deleteTeam(team.id),
                }))}
              />
            </aside>
          </section>

          <section className="grid gap-4">
            <h2 className="text-2xl font-semibold text-slate-950">比赛列表</h2>
            <ul className="grid gap-3">
              {matchRows.map((match) => (
                <li
                  className="grid gap-3 rounded border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_auto]"
                  key={match.id}
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {match.homeTeam.name} vs {match.awayTeam.name}
                    </p>
                    <p className="text-sm text-slate-600">
                      {match.competition.name} · {match.stage.name} ·{" "}
                      {new Date(match.startsAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    <Link
                      className={secondaryButtonClassName}
                      href={`/matches/${match.id}`}
                    >
                      查看
                    </Link>
                    <button
                      className={secondaryButtonClassName}
                      type="button"
                      onClick={() => startEditMatch(match)}
                    >
                      编辑
                    </button>
                    <button
                      className={secondaryButtonClassName}
                      type="button"
                      onClick={() => void deleteMatch(match.id)}
                    >
                      删除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </main>
  );
}

function DataList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ id: number; label: string; onDelete: () => void }>;
}) {
  return (
    <section className="grid gap-2">
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <ul className="grid gap-2 text-sm text-slate-700">
        {rows.map((row) => (
          <li
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
            key={row.id}
          >
            <span className="min-w-0">
              <span className="font-semibold text-slate-950">{row.id}</span>{" "}
              {row.label}
            </span>
            <button
              className="text-sm font-semibold text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
              type="button"
              onClick={row.onDelete}
            >
              删除
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toLocalDateTime(value: string): string {
  return value.slice(0, 16);
}

function competitionNameById(
  competitions: Competition[],
  competitionId: number,
): string {
  return (
    competitions.find((competition) => competition.id === competitionId)
      ?.name ?? `赛事 ${competitionId}`
  );
}
