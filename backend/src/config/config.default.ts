import { MidwayConfig } from "@midwayjs/core";

export default {
  keys: process.env.COOKIE_SECRET ?? "football-platform-development-key",
  koa: {
    port: Number(process.env.BACKEND_PORT ?? 7001),
  },
  database: {
    path: process.env.DATABASE_PATH ?? "./data/football-platform.sqlite",
  },
} as MidwayConfig;
