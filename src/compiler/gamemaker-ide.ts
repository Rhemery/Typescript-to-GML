import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

type WindowsProcessCheck = (processName: string) => Promise<boolean>;

export interface GameMakerIdeOptions {
  platform?: NodeJS.Platform;
  roamingDirectory?: string;
  isWindowsProcessRunning?: WindowsProcessCheck;
}

export async function isGameMakerProjectOpen(
  projectFile: string,
  options: GameMakerIdeOptions = {},
): Promise<boolean> {
  if ((options.platform ?? process.platform) !== "win32") return false;
  const roamingDirectory = options.roamingDirectory ?? process.env.APPDATA;
  if (!roamingDirectory) return false;

  const targetProject = normalizeWindowsPath(projectFile);
  const checkProcess = options.isWindowsProcessRunning ?? isWindowsProcessRunning;
  for (const productDirectory of await findGameMakerProductDirectories(roamingDirectory)) {
    const currentProject = await readCurrentProject(productDirectory);
    if (!currentProject || normalizeWindowsPath(currentProject) !== targetProject) continue;
    const processName = path.basename(productDirectory).replace(/^GameMakerStudio2/i, "GameMaker");
    if (await checkProcess(processName)) return true;
  }
  return false;
}

async function findGameMakerProductDirectories(roamingDirectory: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(roamingDirectory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isDirectory() && /^GameMakerStudio2(?:-|$)/i.test(entry.name))
    .map((entry) => path.join(roamingDirectory, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

async function readCurrentProject(productDirectory: string): Promise<string | undefined> {
  try {
    const contents = await fs.readFile(path.join(productDirectory, "currentProject.txt"), "utf8");
    return contents.split(/\r?\n/, 1)[0]?.trim() || undefined;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function normalizeWindowsPath(fileName: string): string {
  return path.win32.resolve(fileName).toLowerCase();
}

function isWindowsProcessRunning(processName: string): Promise<boolean> {
  const systemRoot = process.env.SystemRoot ?? process.env.SYSTEMROOT;
  const powershell = systemRoot
    ? path.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
    : "powershell.exe";
  const script = [
    "$process = Get-Process -Name $env:TS2GML_GAME_MAKER_PROCESS -ErrorAction SilentlyContinue",
    "if ($null -eq $process) { exit 2 }",
  ].join("; ");

  return new Promise((resolve, reject) => {
    execFile(
      powershell,
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script],
      {
        windowsHide: true,
        env: { ...process.env, TS2GML_GAME_MAKER_PROCESS: processName },
      },
      (error) => {
        if (!error) {
          resolve(true);
          return;
        }
        if (error.code === 2) {
          resolve(false);
          return;
        }
        reject(new Error("Could not determine whether GameMaker has the project open.", {
          cause: error,
        }));
      },
    );
  });
}
