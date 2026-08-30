import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));
const packageLock = JSON.parse(await fs.readFile("package-lock.json", "utf8"));
const api = await import(pathToFileURL(path.resolve("dist", "src", "index.js")));
const packageApi = await import("typescript-to-gml");

assert.equal(api.VERSION, packageJson.version);
assert.equal(packageApi.VERSION, packageJson.version);
assert.equal(packageLock.version, packageJson.version);
assert.equal(packageLock.packages[""].version, packageJson.version);
assert.equal(typeof api.compileTypeScript, "function");
assert.equal(typeof api.buildGameMakerProject, "function");
for (const documentationPath of [
  "README.md",
  "CHANGELOG.md",
  "docs/Home.md",
  "docs/Known-Issues.md",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
]) {
  assert.match(
    await fs.readFile(documentationPath, "utf8"),
    new RegExp(packageJson.version.replaceAll(".", "\\.")),
    `${documentationPath} does not mention the package version`,
  );
}
await fs.access(path.resolve(packageJson.types));
await fs.access(path.resolve("dist", "ts2gml", "typescript", "lib", "lib.es2022.d.ts"));
await assert.rejects(
  fs.access(path.resolve("dist", "ts2gml", "types", "gamemaker.generated.d.ts")),
  (error) => error.code === "ENOENT",
);

const cli = path.resolve("dist", "ts2gml", "cli.cjs");
const version = await execFileAsync(process.execPath, [cli, "--version"]);
assert.equal(version.stdout.trim(), packageJson.version);
const help = await execFileAsync(process.execPath, [cli, "--help"]);
assert.match(help.stdout, new RegExp(`typescript-to-gml ${packageJson.version}`));
assert.match(help.stdout, /ts2gml check/);
assert.match(help.stdout, /ts2gml runtime/);

console.log(`Distribution smoke test passed for typescript-to-gml ${packageJson.version}.`);
