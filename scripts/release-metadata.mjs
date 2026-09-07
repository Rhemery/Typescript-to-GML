import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export async function readReleaseMetadata() {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const read = async (file) => JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
  const [compiler, lock, extension, vscodeTypes] = await Promise.all([
    read("package.json"), read("package-lock.json"), read("vscode-extension/package.json"),
    read("node_modules/@types/vscode/package.json"),
  ]);
  assert.equal(lock.version, compiler.version, "Lockfile version must match package.json");
  assert.equal(lock.packages[""].version, compiler.version, "Lockfile root package version is stale");
  assert.equal(extension.ts2gmlCompilerVersion, compiler.version, "VSIX compiler metadata is stale");
  assert.match(extension.version, /^\d+\.\d+\.\d+$/, "VSIX requires its own numeric version");
  assert.equal(extension.engines.vscode, `^${vscodeTypes.version}`, "VS Code API declarations must match the minimum host version");
  const versionSource = await fs.readFile(path.join(root, "src/version.ts"), "utf8");
  assert.equal(/VERSION = "([^"]+)"/.exec(versionSource)?.[1], compiler.version, "CLI version is stale");
  const changelog = await fs.readFile(path.join(root, "CHANGELOG.md"), "utf8");
  assert.ok(changelog.includes(`## ${compiler.version}`), "Changelog must contain the current version");
  return { compiler, extension };
}
