import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { test } from "node:test";
import { commitProjectFiles, recoverProjectFiles, withProjectLock } from "../src/compiler/project-state.js";
import { readManifest } from "../src/compiler/manifest.js";
import { atomicWriteFile } from "../src/files.js";

const execFileAsync = promisify(execFile);
const stateModule = pathToFileURL(path.resolve("dist/src/compiler/project-state.js")).href;

test("atomic replacement tolerates temporary sharing locks without deleting the old file", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-sharing-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, "owned.gml");
  await fs.writeFile(file, "before");
  const rename = fs.rename.bind(fs);
  let attempts = 0;
  context.mock.method(fs, "rename", async (...args: Parameters<typeof fs.rename>) => {
    if (++attempts <= 2) {
      assert.equal(await fs.readFile(file, "utf8"), "before");
      throw Object.assign(new Error("injected sharing violation"), { code: "EPERM" });
    }
    return rename(...args);
  });
  await atomicWriteFile(file, "after");
  assert.equal(attempts, 3);
  assert.equal(await fs.readFile(file, "utf8"), "after");
  assert.deepEqual(await fs.readdir(directory), ["owned.gml"]);
});

test("project transactions roll back writes and deletions on failure", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-transaction-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(path.join(directory, "old.gml"), "old");
  await fs.writeFile(path.join(directory, "stale.gml"), "stale");
  const writes = new Map([["new.gml", "new"], ["old.gml", "changed"]]);
  await assert.rejects(withProjectLock(path.join(directory, "Game.yyp"), () =>
    commitProjectFiles(directory, writes, ["stale.gml"], (file) => {
      if (file === "stale.gml") throw new Error("injected write failure");
    })), /injected write failure/);
  assert.equal(await fs.readFile(path.join(directory, "old.gml"), "utf8"), "old");
  assert.equal(await fs.readFile(path.join(directory, "stale.gml"), "utf8"), "stale");
  await assert.rejects(fs.access(path.join(directory, "new.gml")), { code: "ENOENT" });
  await withProjectLock(path.join(directory, "Game.yyp"), () => commitProjectFiles(directory, writes, ["stale.gml"]));
  assert.equal(await fs.readFile(path.join(directory, "old.gml"), "utf8"), "changed");
  await assert.rejects(fs.access(path.join(directory, "stale.gml")), { code: "ENOENT" });
});

test("a new process recovers a writer terminated between commit stages", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-crash-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(path.join(directory, "owned.gml"), "before");
  const script = `import {withProjectLock,commitProjectFiles} from ${JSON.stringify(stateModule)};
    const directory = process.argv[1];
    await withProjectLock(directory + '/Game.yyp', () => commitProjectFiles(directory,
      new Map([['owned.gml', 'after'], ['new.gml', 'new']]), [], () => process.exit(17)));`;
  await assert.rejects(execFileAsync(process.execPath, ["--input-type=module", "-e", script, directory]), { code: 17 });
  assert.equal(await fs.readFile(path.join(directory, "owned.gml"), "utf8"), "after");
  await withProjectLock(path.join(directory, "Game.yyp"), async () => {
    assert.equal(await fs.readFile(path.join(directory, "owned.gml"), "utf8"), "before");
  });
  await assert.rejects(fs.access(path.join(directory, ".ts2gml/pending-write.json")), { code: "ENOENT" });
});

test("independent compiler processes serialize their entire critical sections", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-lock-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const script = `import {withProjectLock} from ${JSON.stringify(stateModule)};
    import {promises as fs} from 'node:fs';
    const directory = process.argv[1];
    await withProjectLock(directory + '/Game.yyp', async () => {
      await fs.appendFile(directory + '/order', process.pid + ':start\\n');
      await new Promise(resolve => setTimeout(resolve, 150));
      await fs.appendFile(directory + '/order', process.pid + ':end\\n');
    });`;
  await Promise.all([1, 2, 3].map(() => execFileAsync(process.execPath,
    ["--input-type=module", "-e", script, directory])));
  const lines = (await fs.readFile(path.join(directory, "order"), "utf8")).trim().split("\n");
  assert.equal(lines.length, 6);
  for (let index = 0; index < lines.length; index += 2) {
    assert.equal(lines[index]!.replace(":start", ":end"), lines[index + 1]);
  }
});

test("recovery preflights all destinations and preserves files edited after a crash", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-recovery-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.mkdir(path.join(directory, ".ts2gml"));
  await fs.writeFile(path.join(directory, "owned.gml"), "IDE edit");
  await fs.writeFile(path.join(directory, ".ts2gml/pending-write.json"), JSON.stringify({ version: 1,
    entries: [{ path: "owned.gml", before: "old", after: "new" }] }));
  await assert.rejects(recoverProjectFiles(directory), /changed after the interrupted build/);
  assert.equal(await fs.readFile(path.join(directory, "owned.gml"), "utf8"), "IDE edit");
  await fs.writeFile(path.join(directory, ".ts2gml/pending-write.json"), JSON.stringify({ version: 1,
    entries: [{ path: "../outside", before: null, after: "new" }] }));
  await assert.rejects(recoverProjectFiles(directory), /escapes/);
});

test("manifest versions migrate deterministically and reject corrupt ownership fields", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-manifest-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, "manifest.json");
  await fs.writeFile(file, JSON.stringify({ files: ["scripts/owned/owned.gml"] }));
  assert.equal((await readManifest(file)).formatVersion, 1);
  for (const invalid of [null, [], { formatVersion: 2 }, { files: [7] }, { files: ["../outside"] },
    { files: ["C:/outside"] }, { generatedFileHashes: { owned: "bad" } }, { objectVariables: { obj: [7] } }]) {
    await fs.writeFile(file, JSON.stringify(invalid));
    await assert.rejects(readManifest(file));
  }
});
