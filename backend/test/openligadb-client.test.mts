import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { after, test } from "node:test";

process.env.MIDWAY_TS_MODE = "false";
process.env.NODE_ENV = "unittest";
process.env.OPENLIGADB_BASE_URL = "https://openligadb.test";
process.env.OPENLIGADB_LEAGUE_SHORTCUT = "bl1";
process.env.OPENLIGADB_LEAGUE_SEASON = "2024";
process.env.OPENLIGADB_TIMEOUT_MS = "1000";

const require = createRequire(import.meta.url);
const { OpenLigaDbClient } =
  require("../dist/service/openligadb-client.js") as typeof import("../src/service/openligadb-client.ts");

const originalFetch = globalThis.fetch;

after(() => {
  globalThis.fetch = originalFetch;
});

test("009 OpenLigaDB client loads available teams and maps the selected team", async () => {
  let requestedUrl = "";
  globalThis.fetch = async (input: string | URL | Request) => {
    requestedUrl = String(input);

    return new Response(
      JSON.stringify([
        {
          teamId: 40,
          teamName: "FC Bayern München",
          shortName: "Bayern",
          teamIconUrl:
            "https://upload.wikimedia.org/wikipedia/commons/1/1f/Logo_FC_Bayern_M%C3%BCnchen_%282002%E2%80%932017%29.svg",
          teamGroupName: null,
        },
      ]),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const profile = await new OpenLigaDbClient().getTeamProfile(40);

  assert.equal(
    requestedUrl,
    "https://openligadb.test/getavailableteams/bl1/2024",
  );
  assert.equal(profile?.provider, "OpenLigaDB");
  assert.equal(profile?.providerTeamId, 40);
  assert.equal(profile?.name, "FC Bayern München");
  assert.equal(profile?.shortName, "Bayern");
  assert.equal(profile?.websiteUrl, null);
});

test("009 OpenLigaDB client returns null when the selected team is absent", async () => {
  globalThis.fetch = async () => {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const profile = await new OpenLigaDbClient().getTeamProfile(40);

  assert.equal(profile, null);
});
