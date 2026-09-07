import { promises as fs, watch, type FSWatcher } from "node:fs";
import path from "node:path";
import process from "node:process";
import { withProjectLock } from "./project-state.js";
import { createInterface } from "node:readline/promises";
import {
  generateProjectDeclarations,
  type ProjectDeclarationSummary,
} from "../declarations/project.js";
import {
  buildGameMakerProject,
  prepareTypeScriptProject,
  StructuralGameMakerChangesError,
  type BuildSummary,
} from "./project.js";

export interface WatchOptions {
  guardConfiguration?: string;
  confirmStructuralChanges?: (changes: readonly string[]) => boolean | Promise<boolean>;
  debounceMs?: number;
  saveSettleMs?: number;
  signal?: AbortSignal;
  onBuild?: (result: BuildSummary | Error) => void;
  onDeclarations?: (result: ProjectDeclarationSummary | Error) => void;
}

export async function watchGameMakerProject(
  projectFile: string,
  options: WatchOptions = {},
): Promise<void> {
  const project = await prepareTypeScriptProject(projectFile);
  const projectPath = path.resolve(projectFile);
  const projectDirectory = path.dirname(projectPath);
  const projectFileName = path.basename(projectPath);
  const debounceMs = options.debounceMs ?? 120;
  const saveSettleMs = options.saveSettleMs ?? 500;
  let sourceTimer: NodeJS.Timeout | undefined;
  let projectTimer: NodeJS.Timeout | undefined;
  let running = false;
  let activeWork: Promise<void> = Promise.resolve();
  let buildQueued = false;
  let declarationsQueued = false;
  let generatedObjectNames = new Set<string>();
  let roomClassNames = new Set<string>();
  let sourceWatcher: FSWatcher | undefined;
  let projectWatcher: FSWatcher | undefined;

  const reportBuild = (result: BuildSummary): void => {
    generatedObjectNames = new Set(result.objects);
    roomClassNames = new Set(result.rooms);
    options.onBuild?.(result);
    options.onDeclarations?.(result.declarations);
    console.log(
      `Built ${result.scripts.length} script(s), ${result.objects.length} object(s), and ${result.rooms.length} room creation code file(s).`,
    );
  };

  const reportFailure = (error: unknown): Error => {
    const failure = error instanceof Error ? error : new Error(String(error));
    options.onBuild?.(failure);
    console.error(failure.message);
    return failure;
  };

  const runQueuedWork = async (): Promise<void> => {
    if (running || options.signal?.aborted) return;
    running = true;
    try {
      while (!options.signal?.aborted && (buildQueued || declarationsQueued)) {
        if (buildQueued) {
          buildQueued = false;
          try {
            const result = await buildGameMakerProject([], projectPath, {
              ...(options.guardConfiguration
                ? { guardConfiguration: options.guardConfiguration }
                : {}),
              guardProfile: "run",
              hotReloadOnly: true,
            });
            reportBuild(result);
          } catch (error) {
            const failure = reportFailure(error);
            if (failure instanceof StructuralGameMakerChangesError) {
              try {
                const confirmed = await (
                  options.confirmStructuralChanges?.(failure.changes) ??
                  confirmSavedGameMakerProject(options.signal)
                );
                if (confirmed && !options.signal?.aborted) {
                  if (saveSettleMs > 0) {
                    await new Promise((resolve) => setTimeout(resolve, saveSettleMs));
                  }
                  if (!options.signal?.aborted) {
                    reportBuild(await buildGameMakerProject([], projectPath, {
                      ...(options.guardConfiguration
                        ? { guardConfiguration: options.guardConfiguration }
                        : {}),
                      guardProfile: "run",
                      ideProjectSaved: true,
                    }));
                  }
                }
              } catch (confirmationError) {
                reportFailure(confirmationError);
              }
            }
          }
          continue;
        }

        declarationsQueued = false;
        try {
          const result = await withProjectLock(projectPath, () => generateProjectDeclarations(projectPath, {
            excludedAssetNames: roomClassNames,
            additionalObjectNames: generatedObjectNames,
          }));
          options.onDeclarations?.(result);
          if (result.written) {
            console.log(`Declared ${result.assets.length} GameMaker IDE asset(s).`);
            buildQueued = true;
          }
        } catch (error) {
          const failure = error instanceof Error ? error : new Error(String(error));
          options.onDeclarations?.(failure);
          console.error(failure.message);
        }
      }
    } finally {
      running = false;
    }
  };

  const scheduleBuild = (event: string, fileName: string | Buffer | null): void => {
    if (fileName) {
      const changedPath = fileName.toString();
      if (!/\.tsx?$/i.test(changedPath) && !/(^|[\\/])tsconfig(?:\.[^\\/]+)?\.json$/i.test(changedPath) && event !== "rename") return;
    }
    if (sourceTimer) clearTimeout(sourceTimer);
    sourceTimer = setTimeout(() => {
      buildQueued = true;
      if (!running) activeWork = runQueuedWork();
    }, debounceMs);
  };

  const scheduleDeclarations = (fileName: string | Buffer | null): void => {
    if (fileName) {
      const changedPath = fileName.toString().replaceAll("\\", "/");
      if (changedPath !== projectFileName && !/\.gml$/i.test(changedPath)) return;
    }
    if (projectTimer) clearTimeout(projectTimer);
    projectTimer = setTimeout(() => {
      declarationsQueued = true;
      if (!running) activeWork = runQueuedWork();
    }, debounceMs);
  };

  // Windows events use long paths. Passing an 8.3 alias to libuv can abort Node
  // when it compares an event's path with the watched directory.
  const [sourceWatchDirectory, projectWatchDirectory] = await Promise.all([
    fs.realpath(project.sourceDirectory),
    fs.realpath(projectDirectory),
  ]);
  sourceWatcher = watch(sourceWatchDirectory, { recursive: true }, (event, fileName) => {
    scheduleBuild(event, fileName);
  });
  projectWatcher = watch(projectWatchDirectory, { recursive: true }, (_event, fileName) => {
    const changed = fileName?.toString().replaceAll("\\", "/");
    if (changed && (changed === "ts2gml.config.json" || changed === ".ts2gml/runtime-selection.json" ||
      /^datafiles\/ts2gml\/types\/.*\.d\.ts$/i.test(changed))) {
      scheduleBuild("rename", null);
      return;
    }
    scheduleDeclarations(fileName);
  });
  console.log(`Watching ${project.sourceDirectory} and ${projectPath}`);
  buildQueued = true;
  activeWork = runQueuedWork();
  await activeWork;

  await new Promise<void>((resolve, reject) => {
    const close = (): void => {
      if (sourceTimer) clearTimeout(sourceTimer);
      if (projectTimer) clearTimeout(projectTimer);
      sourceWatcher?.close();
      projectWatcher?.close();
      resolve();
    };
    sourceWatcher?.once("error", reject);
    projectWatcher?.once("error", reject);
    if (options.signal?.aborted) close();
    else options.signal?.addEventListener("abort", close, { once: true });
  });
  await activeWork;
}

async function confirmSavedGameMakerProject(signal?: AbortSignal): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error(
      "Save the project in GameMaker, then run build --project-saved to apply the pending structural changes.",
    );
    return false;
  }

  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    await terminal.question(
      "\nSave the project in GameMaker and wait for the save to finish, then press Enter to apply these changes. Press Ctrl+C to stop. ",
      { signal },
    );
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).name === "AbortError") return false;
    throw error;
  } finally {
    terminal.close();
  }
}
