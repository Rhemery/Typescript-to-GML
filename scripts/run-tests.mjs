import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const testDirectory = path.resolve("dist", "test");
const testFiles = (await fs.readdir(testDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".test.js"))
  .map((entry) => path.join(testDirectory, entry.name))
  .sort();

if (testFiles.length === 0) {
  throw new Error(`No compiled test files were found in ${testDirectory}.`);
}

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
