"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ApiClientError, fetchJson, sendJson } from "../../../lib/api-client";
import type {
  Match,
  MatchResponse,
  NullablePredictionResponse,
  Prediction,
  PredictionResponse,
} from "../../../lib/api-types";

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
        <>
          <article className="grid gap-6 rounded border border-slate-200 bg-white p-6">
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                {state.match.competition.name} · {state.match.stage.name}
              </p>
              <h2 className="mt-2 flex flex-wrap items-center gap-2 text-3xl font-bold text-slate-950">
                <Link
                  className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
                  href={`/teams/${state.match.homeTeam.id}`}
                >
                  {state.match.homeTeam.name}
                </Link>
                <span>vs</span>
                <Link
                  className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
                  href={`/teams/${state.match.awayTeam.id}`}
                >
                  {state.match.awayTeam.name}
                </Link>
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
          <PredictionPanel match={state.match} />
        </>
      ) : null}
    </main>
  );
}

type PredictionState =
  | { kind: "loading" }
  | { kind: "unauthenticated"; message: string }
  | { kind: "ready"; prediction: Prediction | null; message: string | null }
  | { kind: "error"; message: string };

function PredictionPanel({ match }: { match: Match }) {
  const [state, setState] = useState<PredictionState>({ kind: "loading" });
  const [homeScore, setHomeScore] = useState("1");
  const [awayScore, setAwayScore] = useState("0");
  const locked = match.status !== "SCHEDULED";

  useEffect(() => {
    let active = true;

    fetchJson<NullablePredictionResponse>(`/api/matches/${match.id}/prediction`)
      .then((payload) => {
        if (!active) {
          return;
        }

        setState({
          kind: "ready",
          prediction: payload.data,
          message: payload.data ? "已加载你的预测" : "暂无预测",
        });

        if (payload.data) {
          setHomeScore(String(payload.data.homeScore));
          setAwayScore(String(payload.data.awayScore));
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 401) {
          setState({
            kind: "unauthenticated",
            message: "登录后可以提交预测。",
          });
          return;
        }

        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "预测加载失败",
        });
      });

    return () => {
      active = false;
    };
  }, [match.id]);

  async function submitPrediction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (locked || state.kind !== "ready") {
      return;
    }

    const existingPrediction = state.prediction;
    setState({
      kind: "ready",
      prediction: existingPrediction,
      message: "正在保存预测",
    });

    try {
      const payload = await sendJson<PredictionResponse>(
        existingPrediction
          ? `/api/matches/${match.id}/prediction`
          : `/api/matches/${match.id}/predictions`,
        existingPrediction ? "PUT" : "POST",
        {
          homeScore: Number(homeScore),
          awayScore: Number(awayScore),
        },
      );

      setState({
        kind: "ready",
        prediction: payload.data,
        message: existingPrediction ? "预测已修改" : "预测已提交",
      });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "预测保存失败",
      });
    }
  }

  return (
    <section className="grid gap-5 rounded border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-slate-950">我的预测</h2>
        <Link
          className="text-sm font-semibold text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          href="/me/predictions"
        >
          查看我的预测
        </Link>
      </div>

      {state.kind === "loading" ? (
        <p role="status" className="text-slate-600">
          正在加载预测
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

      {locked ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          比赛已经开始，预测已锁定。
        </p>
      ) : null}

      {state.kind === "ready" ? (
        <form
          className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={submitPrediction}
        >
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            主队进球
            <input
              className="rounded border border-slate-300 px-3 py-2 text-base text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              min={0}
              name="homeScore"
              onChange={(event) => setHomeScore(event.target.value)}
              required
              step={1}
              type="number"
              value={homeScore}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            客队进球
            <input
              className="rounded border border-slate-300 px-3 py-2 text-base text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              min={0}
              name="awayScore"
              onChange={(event) => setAwayScore(event.target.value)}
              required
              step={1}
              type="number"
              value={awayScore}
            />
          </label>
          <button
            className="self-end rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={locked}
            type="submit"
          >
            {state.prediction ? "修改预测" : "提交预测"}
          </button>
          <p className="text-sm text-slate-600 sm:col-span-3" role="status">
            {state.prediction
              ? `当前预测：${state.prediction.homeScore} : ${state.prediction.awayScore}`
              : state.message}
          </p>
        </form>
      ) : null}
    </section>
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
