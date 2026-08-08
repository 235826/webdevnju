import { Inject, Provide } from "@midwayjs/core";
import type { ExternalTeamProfileResponse } from "../types/football";
import { NotFoundError, ValidationError } from "../utils/http-errors";
import { FootballRepository } from "./football.repository";
import { OpenLigaDbClient } from "./openligadb-client";

type CacheEntry = {
  expiresAt: number;
  response: ExternalTeamProfileResponse;
};

const CACHE_TTL_MS = 5 * 60 * 1000;

@Provide()
export class TeamExternalProfileService {
  @Inject()
  footballRepository: FootballRepository = new FootballRepository();

  @Inject()
  openLigaDbClient: OpenLigaDbClient = new OpenLigaDbClient();

  private readonly cache = new Map<number, CacheEntry>();

  async getTeamExternalProfile(
    teamId: unknown,
  ): Promise<ExternalTeamProfileResponse> {
    const id = parsePositiveInteger(teamId, "teamId");
    const team = this.footballRepository.findTeam(id);

    if (!team) {
      throw new NotFoundError("球队不存在");
    }

    if (!team.openLigaDbTeamId) {
      return {
        status: "NO_MATCH",
        data: null,
        message: "暂无可匹配的 OpenLigaDB 球队资料",
      };
    }

    const cached = this.cache.get(team.id);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.response;
    }

    const response = await this.loadExternalProfile(team.openLigaDbTeamId);
    this.cache.set(team.id, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      response,
    });

    return response;
  }

  private async loadExternalProfile(
    providerTeamId: number,
  ): Promise<ExternalTeamProfileResponse> {
    try {
      const profile =
        await this.openLigaDbClient.getTeamProfile(providerTeamId);

      if (!profile) {
        return {
          status: "NO_MATCH",
          data: null,
          message: "OpenLigaDB 暂无该球队资料",
        };
      }

      return {
        status: "AVAILABLE",
        data: profile,
        message: null,
      };
    } catch {
      return {
        status: "UNAVAILABLE",
        data: null,
        message: "外部球队资料暂不可用，当前展示本地权威资料",
      };
    }
  }
}

function parsePositiveInteger(value: unknown, field: string): number {
  const normalized = typeof value === "string" ? value.trim() : value;
  const parsed =
    typeof normalized === "number" ? normalized : Number(normalized);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ValidationError("请求参数不合法", [
      { field, reason: "positiveInteger" },
    ]);
  }

  return parsed;
}
