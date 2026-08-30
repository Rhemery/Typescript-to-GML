import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { test } from "node:test";
import { isGameMakerProjectOpen } from "../src/compiler/gamemaker-ide.js";

async function recordCurrentProject(
  roamingDirectory: string,
  productName: string,
  projectPath: string,
): Promise<void> {
  const productDirectory = path.join(roamingDirectory, productName);
  await fs.mkdir(productDirectory, { recursive: true });
  await fs.writeFile(path.join(productDirectory, "currentProject.txt"), projectPath);
}

test("detects the matching open GameMaker project without controlling the IDE", async () => {
  const roamingDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-ide-"));
  await recordCurrentProject(
    roamingDirectory,
    "GameMakerStudio2-LTS2026",
    "C:\\Games\\Fixture\\Fixture.yyp",
  );
  await recordCurrentProject(
    roamingDirectory,
    "GameMakerStudio2-Beta",
    "C:\\Games\\Other\\Other.yyp",
  );
  const requestedProcesses: string[] = [];

  const result = await isGameMakerProjectOpen("c:/games/fixture/FIXTURE.yyp", {
    platform: "win32",
    roamingDirectory,
    isWindowsProcessRunning: async (processName) => {
      requestedProcesses.push(processName);
      return true;
    },
  });

  assert.equal(result, true);
  assert.deepEqual(requestedProcesses, ["GameMaker-LTS2026"]);
});

test("ignores another project and stale GameMaker product state", async () => {
  const roamingDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-ide-stale-"));
  await recordCurrentProject(
    roamingDirectory,
    "GameMakerStudio2-Beta",
    "C:\\Games\\Fixture\\Fixture.yyp",
  );
  await recordCurrentProject(
    roamingDirectory,
    "GameMakerStudio2-LTS2026",
    "C:\\Games\\Other\\Other.yyp",
  );

  const result = await isGameMakerProjectOpen("C:\\Games\\Fixture\\Fixture.yyp", {
    platform: "win32",
    roamingDirectory,
    isWindowsProcessRunning: async () => false,
  });

  assert.equal(result, false);
});

test("does not inspect processes on unsupported platforms", async () => {
  let requested = false;
  const result = await isGameMakerProjectOpen("/games/Fixture/Fixture.yyp", {
    platform: "darwin",
    isWindowsProcessRunning: async () => {
      requested = true;
      return true;
    },
  });

  assert.equal(result, false);
  assert.equal(requested, false);
});

test("passes the GameMaker product process name to the Windows check", {
  skip: process.platform !== "win32",
}, async () => {
  const roamingDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-ide-process-"));
  const executable = path.join(roamingDirectory, "GameMaker-BridgeFixture.exe");
  await fs.copyFile(path.join(process.env.SystemRoot!, "System32", "ping.exe"), executable);
  await recordCurrentProject(
    roamingDirectory,
    "GameMakerStudio2-BridgeFixture",
    "C:\\Games\\Fixture\\Fixture.yyp",
  );
  const child = spawn(executable, ["127.0.0.1", "-t"], {
    stdio: "ignore",
    windowsHide: true,
  });
  await once(child, "spawn");

  try {
    assert.equal(
      await isGameMakerProjectOpen("C:\\Games\\Fixture\\Fixture.yyp", { roamingDirectory }),
      true,
    );
  } finally {
    child.kill();
    if (child.exitCode === null) await once(child, "exit");
  }
});
