import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { test } from "node:test";
import { checkForUpdate, findAvailableUpdate } from "../src/update-check.js";

test("selects the newest release newer than the installed prerelease", () => {
  const update = findAvailableUpdate("0.2.0-beta.2", [
    {
      tag_name: "v0.2.0-beta.3",
      html_url: "https://github.com/Rhemery/Typescript-to-GML/releases/tag/v0.2.0-beta.3",
      prerelease: true,
    },
    {
      tag_name: "0.3.0-beta.1",
      html_url: "https://github.com/Rhemery/Typescript-to-GML/releases/tag/0.3.0-beta.1",
      prerelease: true,
    },
    { tag_name: "0.2.0-beta.1", prerelease: true },
    { tag_name: "nightly", prerelease: true },
    { tag_name: "9.0.0", draft: true },
  ]);

  assert.deepEqual(update, {
    version: "0.3.0-beta.1",
    url: "https://github.com/Rhemery/Typescript-to-GML/releases/tag/0.3.0-beta.1",
  });
});

test("stable installations ignore prerelease updates", () => {
  assert.equal(
    findAvailableUpdate("1.0.0", [
      { tag_name: "2.0.0-beta.1", prerelease: true },
      {
        tag_name: "1.1.0",
        html_url: "https://github.com/Rhemery/Typescript-to-GML/releases/tag/1.1.0",
      },
    ])?.version,
    "1.1.0",
  );
  assert.equal(
    findAvailableUpdate("1.1.0", [{ tag_name: "2.0.0-beta.1", prerelease: true }]),
    undefined,
  );
});

test("caches the release check and fails silently when it is unavailable", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-update-test-"));
  const cachePath = path.join(temporary, "update-check.json");
  let requests = 0;
  const fetcher: typeof fetch = async () => {
    requests += 1;
    return new Response(JSON.stringify([
      {
        tag_name: "0.2.0-beta.3",
        html_url: "https://github.com/Rhemery/Typescript-to-GML/releases/tag/0.2.0-beta.3",
        prerelease: true,
      },
    ]));
  };

  const first = await checkForUpdate("0.2.0-beta.2", {
    cachePath,
    fetcher,
    now: 1_000,
  });
  const cached = await checkForUpdate("0.2.0-beta.2", {
    cachePath,
    fetcher,
    now: 2_000,
  });

  assert.equal(first?.version, "0.2.0-beta.3");
  assert.deepEqual(cached, first);
  assert.equal(requests, 1);

  assert.equal(
    await checkForUpdate("0.2.0-beta.2", {
      cachePath: path.join(temporary, "offline.json"),
      fetcher: async () => {
        throw new Error("offline");
      },
      now: 1_000,
    }),
    undefined,
  );
});

test("the CLI prints an available update after a tool command", async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-update-cli-test-"));
  const cacheDirectory = path.join(temporary, "typescript-to-gml");
  await fs.mkdir(cacheDirectory);
  await fs.writeFile(
    path.join(cacheDirectory, "update-check.json"),
    JSON.stringify({
      checkedAt: Date.now(),
      releases: [{
        tag_name: "0.2.0-beta.3",
        html_url: "https://github.com/Rhemery/Typescript-to-GML/releases/tag/0.2.0-beta.3",
        prerelease: true,
      }],
    }),
  );

  const result = spawnSync(
    process.execPath,
    [path.resolve("dist", "src", "cli.js"), "unknown-command"],
    {
      encoding: "utf8",
      env: { ...process.env, TEMP: temporary, TMP: temporary, TMPDIR: temporary },
    },
  );

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /New ts2gml update available: 0\.2\.0-beta\.3 \(currently 0\.2\.0-beta\.2\)\./,
  );
  assert.match(result.stderr, /https:\/\/github\.com\/Rhemery\/Typescript-to-GML\/releases\/tag/);
});
