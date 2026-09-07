import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createVSIX } from "@vscode/vsce";
import { readReleaseMetadata } from "./release-metadata.mjs";
import { unzipSync, strFromU8 } from "fflate";
import assert from "node:assert/strict";

const repositoryDirectory = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { compiler: metadata, extension } = await readReleaseMetadata();
const releaseDirectory = path.join(repositoryDirectory, "release");
const packagePath = path.join(
  releaseDirectory,
  `typescript-to-gml-vscode-${metadata.version}.vsix`,
);
await fs.mkdir(releaseDirectory, { recursive: true });
await createVSIX({
  cwd: path.join(repositoryDirectory, "vscode-extension"),
  packagePath,
  preRelease: true,
});
const archive = unzipSync(await fs.readFile(packagePath));
const packaged = JSON.parse(strFromU8(archive["extension/package.json"]));
assert.equal(packaged.version, extension.version);
assert.equal(packaged.ts2gmlCompilerVersion, metadata.version);
assert.equal(packaged.engines.vscode, extension.engines.vscode);
console.log(`Created ${packagePath}`);
