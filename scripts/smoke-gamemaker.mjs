import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

if (process.platform !== "win32") {
  console.log("GameMaker Igor smoke test skipped: only the Windows worker is configured.");
  process.exit(0);
}

const runtimePath = process.env.GAMEMAKER_RUNTIME_PATH ?? await findInstalledRuntime();
const igorPath = process.env.GAMEMAKER_IGOR ?? path.join(
  runtimePath,
  "bin",
  "igor",
  "windows",
  "x64",
  "Igor.exe",
);
const runnerPath = process.env.GAMEMAKER_RUNNER ?? path.join(
  runtimePath,
  "windows",
  "x64",
  "Runner.exe",
);
const productName = path.basename(path.resolve(runtimePath, "..", "..", ".."));
const userDirectory = process.env.GAMEMAKER_USER_DIR ?? path.join(
  process.env.APPDATA ?? "",
  productName,
);
const projectPath = path.resolve("TestProject", "TestProject.yyp");
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-igor-"));

try {
  await fs.access(igorPath);
  await fs.access(runnerPath);
  await fs.access(userDirectory);
  await fs.access(projectPath);
  const outputPath = path.join(temporary, "TestProject.win");
  await run(igorPath, [
    `--project=${projectPath}`,
    `--runtimePath=${runtimePath}`,
    `--user=${userDirectory}`,
    `--cache=${path.join(temporary, "cache")}`,
    `--temp=${path.join(temporary, "temp")}`,
    `--of=${outputPath}`,
    "--runtime=VM",
    "--jsonErrors",
    "windows",
    "Compile",
  ]);
  await fs.access(outputPath);
  await run(runnerPath, ["-game", outputPath], 30_000, "TS2GML_SCOPE_CONTEXT_OK");
  console.log(`GameMaker compile and scope-context runtime tests passed with ${path.basename(runtimePath)}.`);
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}

async function findInstalledRuntime() {
  const programData = process.env.ProgramData;
  if (!programData) throw new Error("ProgramData is unavailable; set GAMEMAKER_RUNTIME_PATH.");
  const products = (await fs.readdir(programData, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("GameMakerStudio2"))
    .map((entry) => path.join(programData, entry.name));
  const runtimes = [];
  for (const product of products) {
    const runtimeDirectory = path.join(product, "Cache", "runtimes");
    let entries;
    try {
      entries = await fs.readdir(runtimeDirectory, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("runtime-")) {
        runtimes.push(path.join(runtimeDirectory, entry.name));
      }
    }
  }
  const runtime = runtimes.sort().at(-1);
  if (!runtime) {
    throw new Error("Could not locate an installed GameMaker runtime; set GAMEMAKER_RUNTIME_PATH.");
  }
  return runtime;
}

function run(executable, arguments_, timeoutMs, expectedOutput) {
  return new Promise((resolve, reject) => {
    const output = [];
    const child = spawn(executable, arguments_, {
      stdio: expectedOutput ? ["ignore", "pipe", "pipe"] : "inherit",
      windowsHide: true,
    });
    let settled = false;
    let timeout;
    const finish = (action) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      action();
    };
    const capture = (stream, destination) => {
      stream?.on("data", (chunk) => {
        const text = chunk.toString();
        output.push(text);
        destination.write(text);
      });
    };
    capture(child.stdout, process.stdout);
    capture(child.stderr, process.stderr);
    if (timeoutMs) {
      timeout = setTimeout(() => {
        child.kill();
        finish(() => reject(
          new Error(`${path.basename(executable)} did not exit within ${timeoutMs}ms.`),
        ));
      }, timeoutMs);
    }
    child.once("error", (error) => finish(() => reject(error)));
    child.once("exit", (code, signal) => {
      finish(() => {
        const text = output.join("");
        if (code === 0 && (!expectedOutput || text.includes(expectedOutput))) resolve();
        else reject(new Error(
          signal
            ? `${path.basename(executable)} was terminated by ${signal}.`
            : code !== 0
              ? `${path.basename(executable)} exited with code ${code}.`
              : `${path.basename(executable)} did not report '${expectedOutput}'.`,
        ));
      });
    });
  });
}
