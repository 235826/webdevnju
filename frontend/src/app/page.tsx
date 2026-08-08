"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { AuthResponse, ErrorResponse, User } from "../lib/api-types";

type AuthMode = "login" | "register";
type RemoteState = "idle" | "loading" | "success" | "error";

export default function Home() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [status, setStatus] = useState<RemoteState>("loading");
  const [message, setMessage] = useState("正在识别当前用户");

  useEffect(() => {
    void loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    setStatus("loading");
    setMessage("正在识别当前用户");

    const response = await fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
    });

    if (response.ok) {
      const payload = (await response.json()) as AuthResponse;
      setCurrentUser(payload.data);
      setStatus("success");
      setMessage("已登录");
      return;
    }

    setCurrentUser(null);

    if (response.status === 401) {
      setStatus("idle");
      setMessage("未登录");
      return;
    }

    setStatus("error");
    setMessage(await readSafeError(response));
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage(mode === "login" ? "正在登录" : "正在注册");

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      setStatus("error");
      setMessage(await readSafeError(response));
      return;
    }

    const payload = (await response.json()) as AuthResponse;
    setCurrentUser(mode === "login" ? payload.data : null);
    setStatus("success");
    setMessage(
      mode === "login"
        ? `已登录为 ${payload.data.username}`
        : `注册成功，请使用 ${payload.data.username} 登录`,
    );

    if (mode === "register") {
      setMode("login");
    }
  }

  async function logout() {
    setStatus("loading");
    setMessage("正在登出");

    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      setStatus("error");
      setMessage(await readSafeError(response));
      return;
    }

    setCurrentUser(null);
    setStatus("idle");
    setMessage("已登出");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-10 sm:py-16">
      <header className="grid gap-5 border-b border-slate-200 pb-8">
        <p className="text-sm font-semibold text-emerald-700 uppercase">
          Football match platform
        </p>
        <h1 className="max-w-4xl text-4xl font-bold text-slate-950 sm:text-5xl">
          足球赛事信息与互动预测平台
        </h1>
      </header>

      <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid content-start gap-5">
          <h2 className="text-2xl font-semibold text-slate-950">账户状态</h2>
          {status === "loading" ? (
            <p role="status" className="text-slate-600">
              {message}
            </p>
          ) : null}
          {status !== "loading" ? (
            <p
              className={status === "error" ? "text-red-700" : "text-slate-600"}
              role={status === "error" ? "alert" : "status"}
            >
              {message}
            </p>
          ) : null}

          {currentUser ? (
            <dl className="grid max-w-md grid-cols-[7rem_1fr] gap-3 rounded border border-slate-200 bg-white p-5 text-sm">
              <dt className="font-medium text-slate-500">用户名</dt>
              <dd className="text-slate-950">{currentUser.username}</dd>
              <dt className="font-medium text-slate-500">角色</dt>
              <dd className="text-slate-950">{currentUser.role}</dd>
              <dt className="font-medium text-slate-500">创建时间</dt>
              <dd className="text-slate-950">
                {new Date(currentUser.createdAt).toLocaleString("zh-CN")}
              </dd>
            </dl>
          ) : (
            <p className="max-w-2xl leading-7 text-slate-600">
              登录后可继续使用预测、收藏和评论等个人化能力。管理员账号由后端种子数据提供。
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:border-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              type="button"
              onClick={loadCurrentUser}
            >
              刷新当前用户
            </button>
            <a
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:border-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              href="/api/health"
            >
              检查 API
            </a>
            <Link
              className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              href="/competitions"
            >
              浏览赛事
            </Link>
            <Link
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:border-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              href="/teams"
            >
              球队资料
            </Link>
            <Link
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:border-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              href="/me/predictions"
            >
              我的预测
            </Link>
            {currentUser ? (
              <button
                className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                type="button"
                onClick={logout}
              >
                登出
              </button>
            ) : null}
          </div>
        </div>

        <form
          className="grid content-start gap-5 rounded border border-slate-200 bg-white p-5"
          onSubmit={submitAuth}
        >
          <div className="flex rounded border border-slate-300 p-1">
            <button
              className={modeButtonClass(mode === "login")}
              type="button"
              onClick={() => setMode("login")}
            >
              登录
            </button>
            <button
              className={modeButtonClass(mode === "register")}
              type="button"
              onClick={() => setMode("register")}
            >
              注册
            </button>
          </div>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            用户名
            <input
              className="rounded border border-slate-300 px-3 py-2 text-base text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={mode === "register" ? 3 : 1}
              maxLength={40}
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            密码
            <input
              className="rounded border border-slate-300 px-3 py-2 text-base text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={mode === "register" ? 8 : 1}
              maxLength={72}
              required
            />
          </label>

          <button
            className="rounded bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="submit"
            disabled={status === "loading"}
          >
            {mode === "login" ? "登录" : "注册"}
          </button>
        </form>
      </section>

      <footer className="mt-auto pt-8 text-sm text-slate-500">
        Next.js · Midway.js · OpenAPI
      </footer>
    </main>
  );
}

async function readSafeError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ErrorResponse;
    return `${payload.error.message}（请求 ${payload.requestId}）`;
  } catch {
    return "请求失败，请稍后重试";
  }
}

function modeButtonClass(active: boolean): string {
  const base =
    "flex-1 rounded px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

  return active
    ? `${base} bg-slate-950 text-white`
    : `${base} bg-white text-slate-700 hover:text-emerald-700`;
}
