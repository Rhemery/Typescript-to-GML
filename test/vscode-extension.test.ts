import assert from "node:assert/strict";
import { test } from "node:test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { checkWithProjectCompiler, findGeneratedLocation } from "../src/vscode/project-client.js";
import { readDiagnosticResponse } from "../src/diagnostics.js";
import {
  collectManualLinkRanges,
  collectManualTopics,
  collectRuntimeBuiltIns,
  gameMakerManualIndexUrl,
  gameMakerManualUrl,
} from "../src/vscode/manual-links.js";

test("editor diagnostics come from each project's pinned compiler", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-editor-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  for (const version of ["0.2.0-beta.5", "0.3.0-beta.1"]) {
    const projectDirectory = path.join(directory, version);
    const toolDirectory = path.join(projectDirectory, "datafiles/ts2gml");
    await fs.mkdir(toolDirectory, { recursive: true });
    await fs.writeFile(path.join(toolDirectory, "cli.cjs"), `
      let input = '';
      process.stdin.setEncoding('utf8').on('data', chunk => input += chunk).on('end', () => {
        console.log(JSON.stringify({ protocolVersion: 1, compilerVersion: ${JSON.stringify(version)},
          sourceFiles: [input || process.argv[2]], diagnostics: [] }));
      });`);
    const project = path.join(projectDirectory, "Game.yyp");
    assert.equal((await checkWithProjectCompiler(project)).compilerVersion, version);
    assert.deepEqual((await checkWithProjectCompiler(project, { fileName: "unsaved.ts", source: "unsaved text" })).sourceFiles, ["unsaved text"]);
  }
  assert.throws(() => readDiagnosticResponse('{"protocolVersion":2}'), /unsupported diagnostic protocol/);
});

test("the real CLI reports unsaved source diagnostics through its JSON protocol", async () => {
  const run = promisify(execFile);
  const cli = path.resolve("dist/src/cli.js");
  const child = execFile(process.execPath, [cli, "diagnose", "unsaved.ts", "--json"]);
  const result = new Promise<string>((resolve, reject) => {
    let output = "";
    child.stdout!.on("data", (chunk) => output += chunk);
    child.once("error", reject);
    child.once("close", (code) => { assert.equal(code, 1); resolve(output); });
  });
  child.stdin!.end("async function unsupported() {}\n");
  const diagnostics = readDiagnosticResponse(await result).diagnostics;
  assert.ok(diagnostics.length > 0);
  assert.equal(diagnostics[0]!.line, 1);
  assert.match(diagnostics[0]!.fileName, /unsaved\.ts$/);
  await assert.rejects(run(process.execPath, [cli, "check", "missing.yyp", "--json"]), (error: unknown) => {
    const response = readDiagnosticResponse((error as { stdout: string }).stdout);
    return typeof response.error === "string" && response.diagnostics.length === 0;
  });
});

test("generated navigation uses only owned source maps and the closest original line", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-navigation-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.mkdir(path.join(directory, ".ts2gml"));
  await fs.mkdir(path.join(directory, "scripts/example"), { recursive: true });
  const generated = "scripts/example/example.gml";
  await fs.writeFile(path.join(directory, ".ts2gml/manifest.json"), JSON.stringify({ files: [generated, `${generated}.map.json`] }));
  await fs.writeFile(path.join(directory, `${generated}.map.json`), JSON.stringify({ formatVersion: 1,
    generatedFile: generated, mappings: [{ source: "typescript/example.ts", line: 7, generatedLine: 2 },
      { source: "typescript/example.ts", line: 14, generatedLine: 9 }] }));
  assert.equal((await findGeneratedLocation(path.join(directory, "Game.yyp"), path.join(directory, "typescript/example.ts"), 13))?.line, 9);
  assert.equal(await findGeneratedLocation(path.join(directory, "Game.yyp"), path.join(directory, "typescript/other.ts"), 13), undefined);
});

test("collects only runtime globals and instance members as manual built-ins", () => {
  const builtIns = collectRuntimeBuiltIns(`
declare function instance_create_layer(x: number): number;
declare const c_white: number;
declare const gm_global: GMGlobal;
declare enum buffer_type { u8 = 1 }
interface GMObject { x: number; user_event(): void; }
declare namespace GM { type RuntimeReference = number; }
`);

  assert.deepEqual([...builtIns], [
    ["instance_create_layer", "instance_create_layer"],
    ["c_white", "c_white"],
    ["gm_global", "global"],
    ["buffer_type", "buffer_type"],
    ["u8", "u8"],
    ["x", "x"],
    ["user_event", "user_event"],
  ]);
  assert.equal(builtIns.has("RuntimeReference"), false);
});

test("creates manual links for code tokens without linking comments or strings", () => {
  const source = `instance_create_layer(0);\n// instance_create_layer\n"c_white";\nthis.x = c_white;`;
  const builtIns = new Map([
    ["instance_create_layer", "instance_create_layer"],
    ["c_white", "c_white"],
    ["x", "x"],
  ]);
  const manualTopics = collectManualTopics({
    "GameMaker_Language/GML_Reference/Asset_Management/Instances/instance_create_layer.htm":
      "instance_create_layer",
    "GameMaker_Language/GML_Reference/Asset_Management/Instances/Instance_Variables/x.htm":
      "x",
  });
  const links = collectManualLinkRanges(source, builtIns, manualTopics);

  assert.deepEqual(links.map((link) => source.slice(link.start, link.end)), [
    "instance_create_layer",
    "x",
  ]);
  assert.equal(
    gameMakerManualUrl(manualTopics.get("x")!, "lts"),
    "https://manual.gamemaker.io/lts/en/#t=GameMaker_Language%2FGML_Reference%2FAsset_Management%2FInstances%2FInstance_Variables%2Fx.htm",
  );
  assert.equal(
    gameMakerManualIndexUrl("monthly"),
    "https://manual.gamemaker.io/monthly/en/helpdocs_tags.json",
  );
});

test("prefers a manual topic whose page name exactly matches an ambiguous tag", () => {
  const topics = collectManualTopics({
    "GameMaker_Language/GML_Reference/Paths/path_get_y.htm": "path_get_x",
    "GameMaker_Language/GML_Reference/Paths/path_get_x.htm": "path_get_x",
    "https://example.com/not-a-manual-page.htm": "invalid",
    "../outside.htm": "outside",
  });

  assert.equal(
    topics.get("path_get_x"),
    "GameMaker_Language/GML_Reference/Paths/path_get_x.htm",
  );
  assert.equal(topics.has("invalid"), false);
  assert.equal(topics.has("outside"), false);
});
