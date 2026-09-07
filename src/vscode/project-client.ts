import { spawn } from "node:child_process";
import path from "node:path";
import { promises as fs } from "node:fs";
import { readDiagnosticResponse, type DiagnosticResponse } from "../diagnostics.js";
import { readManifest } from "../compiler/manifest.js";
import { sameFilePath } from "../files.js";
import type { GmlSourceMap } from "../compiler/source-maps.js";

export async function findGeneratedLocation(projectFile: string, sourceFile: string, line: number): Promise<{
  fileName: string; line: number;
} | undefined> {
  const directory = path.dirname(path.resolve(projectFile));
  const manifest = await readManifest(path.join(directory, ".ts2gml/manifest.json"));
  const candidates: Array<{ fileName: string; line: number; distance: number }> = [];
  for (const file of manifest.files.filter((file) => file.endsWith(".gml.map.json"))) {
    const map = JSON.parse(await fs.readFile(path.join(directory, file), "utf8")) as GmlSourceMap;
    if (map.formatVersion !== 1 || !Array.isArray(map.mappings) ||
      map.generatedFile !== file.slice(0, -".map.json".length) || !manifest.files.includes(map.generatedFile)) continue;
    for (const mapping of map.mappings) {
      if (typeof mapping.source !== "string" || !Number.isSafeInteger(mapping.generatedLine) || mapping.generatedLine < 1 ||
        !Number.isSafeInteger(mapping.line) || !sameFilePath(path.resolve(directory, mapping.source), sourceFile)) continue;
      candidates.push({ fileName: path.join(directory, map.generatedFile), line: mapping.generatedLine,
        distance: Math.abs(mapping.line - line) });
    }
  }
  return candidates.sort((left, right) => left.distance - right.distance)[0];
}

export async function checkWithProjectCompiler(
  projectFile: string,
  document?: { fileName: string; source: string },
  signal?: AbortSignal,
): Promise<DiagnosticResponse> {
  const directory = path.dirname(path.resolve(projectFile));
  const cli = path.join(directory, "datafiles", "ts2gml", "cli.cjs");
  const args = document
    ? [cli, "diagnose", document.fileName, "--json"]
    : [cli, "check", path.resolve(projectFile), "--json"];
  return new Promise((resolve, reject) => {
    // VS Code's process.execPath is Electron; use the project's documented Node runtime.
    const child = spawn("node", args, { cwd: directory, windowsHide: true, signal,
      stdio: ["pipe", "pipe", "pipe"], timeout: 120_000 });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      stdout += chunk;
      if (stdout.length > 8_000_000) child.kill();
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr = (stderr + chunk).slice(-32_000);
    });
    child.once("error", reject);
    child.stdin.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code !== "EPIPE") reject(error);
    });
    child.stdin.end(document?.source ?? "");
    child.once("close", (code) => {
      try {
        if (!stdout.trim() || (code !== 0 && code !== 1)) {
          throw new Error(`Project compiler failed (${cli}): ${stderr.trim() || `exit ${code}`}. Install Node 22+ and a project-local compiler supporting --json.`);
        }
        resolve(readDiagnosticResponse(stdout));
      } catch (error) { reject(error); }
    });
  });
}
