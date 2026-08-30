import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { strFromU8, unzipSync } from "fflate";

const execFileAsync = promisify(execFile);

test("builds a deterministic YYMPS containing only the distribution", async (context) => {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-yymps-"));
  context.after(() => fs.rm(temporaryDirectory, { recursive: true, force: true }));
  const firstOutput = path.join(temporaryDirectory, "first.yymps");
  const secondOutput = path.join(temporaryDirectory, "second.yymps");

  for (const output of [firstOutput, secondOutput]) {
    await execFileAsync(process.execPath, ["scripts/build-yymps.mjs", "--out", output]);
  }

  const firstArchive = await fs.readFile(firstOutput);
  const secondArchive = await fs.readFile(secondOutput);
  assert.deepEqual(firstArchive, secondArchive);

  const files = unzipSync(firstArchive);
  const packageJson = JSON.parse(await fs.readFile("package.json", "utf8")) as {
    version: string;
  };
  const metadata = JSON.parse(strFromU8(files["metadata.json"]!)) as {
    package_id: string;
    version: string;
    ide_version: string;
  };
  assert.equal(metadata.package_id, "ts2gml");
  assert.equal(metadata.version, packageJson.version);
  assert.equal(metadata.ide_version, "2026.0.0.16");

  const projectName = "TypeScript to GML.yyp";
  const project = JSON.parse(strFromU8(files[projectName]!)) as {
    IncludedFiles: Array<{ filePath: string; name: string }>;
    MetaData: { IDEVersion: string; PackageVersion: string };
    resources: unknown[];
  };
  assert.equal(project.MetaData.IDEVersion, metadata.ide_version);
  assert.equal(project.MetaData.PackageVersion, packageJson.version);
  const includedPaths = project.IncludedFiles.map(
    (file) => `${file.filePath}/${file.name}`,
  );
  assert.equal(project.resources.length, 0);
  assert.ok(includedPaths.includes("datafiles/ts2gml/cli.cjs"));
  assert.ok(includedPaths.includes("datafiles/ts2gml/README.txt"));
  assert.ok(includedPaths.includes("datafiles/ts2gml/docs/Known-Issues.md"));
  assert.ok(includedPaths.includes("datafiles/ts2gml/types/core.d.ts"));
  assert.ok(!includedPaths.includes("datafiles/ts2gml/types/gamemaker.generated.d.ts"));
  assert.ok(!includedPaths.some((file) => file.endsWith("gamemaker.project.generated.d.ts")));
  assert.deepEqual([...files["yymanifest.xml"]!.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
});
