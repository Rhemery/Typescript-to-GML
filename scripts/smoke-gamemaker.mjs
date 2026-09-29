import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { findInstalledGmlSpec } from "../dist/src/declarations/generate.js";

if (process.platform !== "win32") {
  console.log("GameMaker Igor smoke test skipped: only the Windows worker is configured.");
  process.exit(0);
}

const projectPath = path.resolve(process.env.GAMEMAKER_PROJECT ?? "TestProject/TestProject.yyp");
const target = process.env.GAMEMAKER_TARGET ?? "windows";
const runtime = process.env.GAMEMAKER_COMPILER ?? "VM";
if (target !== "windows" || runtime !== "VM") {
  throw new Error(`The executable fixture currently supports windows/VM; ${target}/${runtime} needs a target-specific runner before it can be claimed as tested.`);
}
const runtimePath = process.env.GAMEMAKER_RUNTIME_PATH ?? path.dirname(await findInstalledGmlSpec({ projectFile: projectPath }));
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
    `--runtime=${runtime}`,
    "--jsonErrors",
    target,
    "Compile",
  ]);
  await fs.access(outputPath);
  const expectedOutput = ["TS2GML_ENUM_CONTRACT_OK", "TS2GML_CLOSURE_CONTRACT_OK", "TS2GML_CLOSURE_CONTEXT_OK", "TS2GML_WITH_CLOSURE_OK", "TS2GML_METHOD_CLOSURE_OK", "TS2GML_SCOPE_CONTEXT_OK"];
  await run(runnerPath, ["-game", outputPath], 30_000, expectedOutput);
  const evidence = { compilerVersion: JSON.parse(await fs.readFile("package.json", "utf8")).version,
    project: projectPath, runtime: path.basename(runtimePath), target, compiler: runtime,
    nodeVersion: process.versions.node, platform: process.platform, passedAt: new Date().toISOString(), passedSuites: expectedOutput };
  await fs.mkdir("output", { recursive: true });
  await fs.writeFile("output/gamemaker-verification.json", JSON.stringify(evidence, null, 2) + "\n");
  console.log(`GameMaker compile and runtime tests passed: ${target}/${runtime}, ${path.basename(runtimePath)}.`);
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
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
        const missing = (expectedOutput ?? []).filter((marker) => !text.includes(marker));
        if (code === 0 && missing.length === 0) resolve();
        else reject(new Error(
          signal
            ? `${path.basename(executable)} was terminated by ${signal}.`
            : code !== 0
              ? `${path.basename(executable)} exited with code ${code}.`
              : `${path.basename(executable)} did not report '${missing.join("', '")}'.`,
        ));
      });
    });
  });
}
