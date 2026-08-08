import { Provide } from "@midwayjs/core";
import type { ExternalTeamProfile } from "../types/football";

type OpenLigaDbTeam = {
  teamId?: unknown;
  teamName?: unknown;
  shortName?: unknown;
  teamIconUrl?: unknown;
  teamWebsite?: unknown;
};

@Provide()
export class OpenLigaDbClient {
  private readonly baseUrl =
    process.env.OPENLIGADB_BASE_URL ?? "https://api.openligadb.de";
  private readonly leagueShortcut =
    process.env.OPENLIGADB_LEAGUE_SHORTCUT ?? "bl1";
  private readonly leagueSeason = Number(
    process.env.OPENLIGADB_LEAGUE_SEASON ?? 2024,
  );
  private readonly timeoutMs = Number(
    process.env.OPENLIGADB_TIMEOUT_MS ?? 2500,
  );

  async getTeamProfile(
    providerTeamId: number,
  ): Promise<ExternalTeamProfile | null> {
    const response = await fetch(
      `${this.baseUrl}/getavailableteams/${this.leagueShortcut}/${this.leagueSeason}`,
      {
        signal: AbortSignal.timeout(this.timeoutMs),
      },
    );

    if (!response.ok) {
      throw new Error("OpenLigaDB request failed");
    }

    const payload = (await response.json()) as unknown;

    if (!Array.isArray(payload)) {
      throw new Error("OpenLigaDB returned an invalid teams payload");
    }

    const team = payload.find((candidate) => {
      if (typeof candidate !== "object" || candidate === null) {
        throw new Error("OpenLigaDB returned an invalid team payload");
      }

      return (
        readNumber((candidate as OpenLigaDbTeam).teamId) === providerTeamId
      );
    });

    return team ? parseOpenLigaDbTeam(team) : null;
  }
}

function parseOpenLigaDbTeam(payload: unknown): ExternalTeamProfile | null {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("OpenLigaDB returned an invalid team payload");
  }

  const team = payload as OpenLigaDbTeam;
  const providerTeamId = readNumber(team.teamId);
  const name = readString(team.teamName);

  if (providerTeamId === null || name === null) {
    throw new Error("OpenLigaDB returned an invalid team payload");
  }

  return {
    provider: "OpenLigaDB",
    providerTeamId,
    name,
    shortName: readOptionalString(team.shortName),
    logoUrl: readOptionalString(team.teamIconUrl),
    websiteUrl: readOptionalString(team.teamWebsite),
  };
}

function readNumber(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}
