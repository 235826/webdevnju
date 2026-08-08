import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import type { ExternalTeamProfile, Team } from "../src/types/football.ts";

process.env.MIDWAY_TS_MODE = "false";
process.env.NODE_ENV = "unittest";

const require = createRequire(import.meta.url);
const { TeamExternalProfileService } =
  require("../dist/service/team-external-profile.service.js") as typeof import("../src/service/team-external-profile.service.ts");

const baseTeam: Team = {
  id: 100,
  name: "本地球队",
  shortName: "本地",
  logoUrl: null,
  openLigaDbTeamId: 42,
  createdAt: "2026-08-08T00:00:00.000Z",
  updatedAt: "2026-08-08T00:00:00.000Z",
};

test("009 AC-01 returns available OpenLigaDB profile and caches it", async () => {
  const profile: ExternalTeamProfile = {
    provider: "OpenLigaDB",
    providerTeamId: 42,
    name: "External Team",
    shortName: "EXT",
    logoUrl: "https://example.test/logo.png",
    websiteUrl: "https://example.test",
  };
  let calls = 0;
  const service = createService(baseTeam, async () => {
    calls += 1;
    return profile;
  });

  const first = await service.getTeamExternalProfile("100");
  const second = await service.getTeamExternalProfile("100");

  assert.equal(first.status, "AVAILABLE");
  assert.deepEqual(first.data, profile);
  assert.equal(second.status, "AVAILABLE");
  assert.equal(calls, 1);
});

test("009 AC-02 returns unavailable status when OpenLigaDB fails", async () => {
  const service = createService(baseTeam, async () => {
    throw new Error("socket timeout with internal details");
  });

  const response = await service.getTeamExternalProfile("100");

  assert.equal(response.status, "UNAVAILABLE");
  assert.equal(response.data, null);
  assert.doesNotMatch(JSON.stringify(response), /socket|timeout|internal/i);
});

test("009 AC-03 returns no match when local team has no provider id or provider returns empty", async () => {
  const noProviderId = createService(
    { ...baseTeam, openLigaDbTeamId: null },
    async () => {
      throw new Error("should not call provider");
    },
  );
  const emptyProvider = createService(baseTeam, async () => null);

  const noProviderResponse = await noProviderId.getTeamExternalProfile("100");
  const emptyProviderResponse =
    await emptyProvider.getTeamExternalProfile("100");

  assert.equal(noProviderResponse.status, "NO_MATCH");
  assert.equal(emptyProviderResponse.status, "NO_MATCH");
  assert.equal(noProviderResponse.data, null);
  assert.equal(emptyProviderResponse.data, null);
});

test("009 AC-04 hides invalid external payload details from users", async () => {
  const service = createService(baseTeam, async () => {
    throw new Error("OpenLigaDB returned an invalid team payload");
  });

  const response = await service.getTeamExternalProfile("100");

  assert.equal(response.status, "UNAVAILABLE");
  assert.doesNotMatch(JSON.stringify(response), /invalid team payload/i);
});

test("009 external profile validates local team id and missing team", async () => {
  const service = createService(undefined, async () => null);

  await assert.rejects(() => service.getTeamExternalProfile("0"), {
    code: "VALIDATION_FAILED",
    status: 400,
  });
  await assert.rejects(() => service.getTeamExternalProfile("999"), {
    code: "NOT_FOUND",
    status: 404,
  });
});

function createService(
  team: Team | undefined,
  getTeamProfile: (
    providerTeamId: number,
  ) => Promise<ExternalTeamProfile | null>,
): InstanceType<typeof TeamExternalProfileService> {
  const service = new TeamExternalProfileService();

  service.footballRepository = {
    findTeam(id: number) {
      return team && id === team.id ? team : undefined;
    },
  } as never;
  service.openLigaDbClient = {
    getTeamProfile,
  } as never;

  return service;
}
