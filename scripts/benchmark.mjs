import { promises as fs } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { checkGameMakerProject } from "../dist/src/compiler/project.js";
import { compileTypeScript } from "../dist/src/compiler/compile.js";
import { readManifest } from "../dist/src/compiler/manifest.js";

const project = path.resolve(process.argv[2] ?? "TestProject/TestProject.yyp");
const samples = [];
let files = 0;
for (let index = 0; index < 3; index += 1) {
  const start = performance.now();
  files = (await checkGameMakerProject([], project)).sourceFiles.length;
  samples.push(Math.round(performance.now() - start));
}
const synthetic = [];
for (const count of [100, 500]) {
  const source = Array.from({ length: count }, (_, index) =>
    `function benchmark_${index}(value: number): number { return value ? Math.round(value) : ${index}; }`).join("\n");
  const start = performance.now();
  const result = compileTypeScript(source, "benchmark.ts");
  synthetic.push({ functions: count, milliseconds: Math.round(performance.now() - start), bytes: Buffer.byteLength(result.gml) });
}
const directory = path.dirname(project);
const manifest = await readManifest(path.join(directory, ".ts2gml/manifest.json"));
let generatedGmlBytes = 0;
for (const file of manifest.files.filter((file) => file.endsWith(".gml"))) {
  generatedGmlBytes += (await fs.stat(path.join(directory, file))).size;
}
const report = { node: process.versions.node, platform: process.platform, sourceFiles: files,
  projectCheckMilliseconds: samples, generatedGmlBytes, synthetic };
await fs.mkdir("output", { recursive: true });
await fs.writeFile("output/benchmark.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
