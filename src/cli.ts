#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { compileTypeScript, Ts2GmlError, toJavaScript, validateTypeScriptSource } from "./compiler/compile.js";
import type { DiagnosticResponse } from "./diagnostics.js";
import { readManifest } from "./compiler/manifest.js";
import { withProjectLock } from "./compiler/project-state.js";
import {
  applyRuntimeGuardProfile,
  buildGameMakerProject,
  checkGameMakerProject,
  prepareTypeScriptProject,
  ResourceConflictError,
} from "./compiler/project.js";
import { watchGameMakerProject } from "./compiler/watch.js";
import { detectRuntimeGuardProfile } from "./compiler/runtime-guards.js";
import {
  clearProjectRuntimeSelection,
  discoverInstalledGmlSpecs,
  ensureProjectRuntimeDeclarations,
  generateDeclarations,
  findInstalledGmlSpec,
  saveProjectRuntimeSelection,
  type InstalledGmlSpec,
} from "./declarations/generate.js";
import { generateProjectDeclarations } from "./declarations/project.js";
import { checkForUpdate } from "./update-check.js";
import { VERSION } from "./version.js";
import { atomicWriteFile, sameFilePath } from "./files.js";

async function main(args: string[]): Promise<void> {
  if (Number.parseInt(process.versions.node, 10) < 22) {
    throw new Error("Node.js 22 or newer is required to run ts2gml.");
  }
  const command = args.shift();
  const json = takeFlag(args, "--json");
  if (json && command !== "check" && command !== "diagnose" && command !== "doctor") {
    throw new Error("--json is supported by check, diagnose, and doctor.");
  }
  if (command === "--version" || command === "-v" || command === "version") {
    console.log(VERSION);
    return;
  }
  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "guard-profile") {
    const requestedProfile = args.shift();
    if (requestedProfile !== "run" && requestedProfile !== "build" && requestedProfile !== "auto") {
      throw new Error("guard-profile requires run, build, or auto.");
    }
    const automatic = requestedProfile === "auto";
    const profile = automatic ? detectRuntimeGuardProfile(process.env) : requestedProfile;
    const configuration = takeOption(args, "--configuration");
    const project = await takeProject(args);
    assertNoArguments(args);
    const result = await applyRuntimeGuardProfile(
      project,
      profile,
      {
        ...(configuration ? { configuration } : {}),
        preserveRunProfile: !automatic,
      },
    );
    console.log(
      result.skippedForRun
        ? `Kept the ${result.level} runtime guard profile for this test run.`
        : `Applied the ${result.level} ${result.profile} runtime guard profile${
          result.configuration ? ` for ${result.configuration}` : ""
        }${
          result.written ? "." : " (no file change needed)."
        }`,
    );
    return;
  }

  if (!json && command !== "diagnose") void checkForUpdate(VERSION).then((update) => {
    if (!update) return;
    console.error(
      `New ts2gml update available: ${update.version} (currently ${VERSION}).\nDownload: ${update.url}`,
    );
  });

  if (command === "compile") {
    const input = args.shift();
    if (!input) throw new Error("compile requires a TypeScript input file.");
    if (!/\.[jt]sx?$/i.test(input)) {
      throw new Error("compile requires a .ts, .tsx, .js, or .jsx input file.");
    }
    const output = takeOption(args, "--out") ?? input.replace(/\.[jt]sx?$/i, ".gml");
    assertNoArguments(args);
    const inputPath = await fs.realpath(input);
    const outputPath = await fs.realpath(output).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
      return path.resolve(output);
    });
    if (sameFilePath(inputPath, outputPath)) {
      throw new Error("The GML output must be a different file from the source input.");
    }
    const inputStat = await fs.stat(inputPath);
    const outputStat = await fs.stat(outputPath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
      return undefined;
    });
    if (outputStat && inputStat.ino === outputStat.ino && inputStat.dev === outputStat.dev) {
      throw new Error("The GML output must not be a link to the source input.");
    }
    const source = await fs.readFile(input, "utf8");
    const result = compileTypeScript(source, path.resolve(input));
    await atomicWriteFile(output, result.gml);
    await atomicWriteFile(`${output}.map.json`, `${JSON.stringify({ ...result.sourceMap, generatedFile: path.resolve(output) }, null, 2)}\n`);
    console.log(`Compiled ${input} -> ${output}`);
    return;
  }

  if (command === "build") {
    const overwriteChangedGeneratedFiles = takeFlag(args, "--overwrite-generated");
    const ideProjectSaved = takeFlag(args, "--project-saved");
    const guardConfiguration = takeOption(args, "--configuration");
    const project = await takeProject(args);
    const summary = await buildGameMakerProject(args, project, {
      ...(guardConfiguration ? { guardConfiguration } : {}),
      ideProjectSaved,
      overwriteChangedGeneratedFiles,
    });
    console.log(
      `Built ${summary.scripts.length} script(s), ${summary.objects.length} object(s), and ${summary.rooms.length} room creation code file(s) into ${summary.projectPath}`,
    );
    return;
  }

  if (command === "diagnose") {
    const fileName = args.shift();
    if (!fileName) throw new Error("diagnose requires a source filename and reads source text from standard input.");
    assertNoArguments(args);
    let source = "";
    process.stdin.setEncoding("utf8");
    for await (const chunk of process.stdin) source += chunk;
    validateTypeScriptSource(source, path.resolve(fileName));
    toJavaScript(source, path.resolve(fileName));
    const response: DiagnosticResponse = { protocolVersion: 1, compilerVersion: VERSION, diagnostics: [] };
    console.log(json ? JSON.stringify(response) : `Checked syntax in ${fileName}.`);
    return;
  }

  if (command === "doctor") {
    const project = path.resolve(await takeProject(args));
    assertNoArguments(args);
    const spec = await findInstalledGmlSpec({ projectFile: project });
    const manifest = await readManifest(path.join(path.dirname(project), ".ts2gml", "manifest.json"));
    const summary = await checkGameMakerProject([], project);
    const report = { protocolVersion: 1, compilerVersion: VERSION, nodeVersion: process.versions.node,
      project, runtimeSpec: spec, manifestVersion: manifest.formatVersion,
      previousCompilerVersion: manifest.compilerVersion, ownedFiles: manifest.files.length,
      sourceFiles: summary.sourceFiles, diagnostics: [] };
    console.log(json ? JSON.stringify(report) : JSON.stringify(report, null, 2));
    return;
  }

  if (command === "check") {
    const project = await takeProject(args);
    const summary = await checkGameMakerProject(args, project);
    if (json) {
      const response: DiagnosticResponse = { protocolVersion: 1, compilerVersion: VERSION,
        diagnostics: [], sourceFiles: summary.sourceFiles };
      console.log(JSON.stringify(response));
      return;
    }
    console.log(
      `Checked ${summary.sourceFiles.length} source file(s): ${summary.scripts.length} script(s), ${summary.objects.length} object(s), and ${summary.rooms.length} room creation code file(s) are supported.`,
    );
    return;
  }

  if (command === "init") {
    const project = await takeProject(args);
    assertNoArguments(args);
    const { summary, declarations } = await withProjectLock(project, async () => {
      const summary = await prepareTypeScriptProject(project);
      const declarations = await generateProjectDeclarations(project);
      return { summary, declarations };
    });
    console.log(
      `${summary.createdConfig ? "Created" : "Updated"} TypeScript support in ${summary.sourceDirectory}; declared ${declarations.assets.length} GameMaker IDE asset(s).`,
    );
    return;
  }

  if (command === "watch") {
    const guardConfiguration = takeOption(args, "--configuration");
    const project = await takeProject(args);
    assertNoArguments(args);
    await watchGameMakerProject(project, {
      ...(guardConfiguration ? { guardConfiguration } : {}),
    });
    return;
  }

  if (command === "runtime") {
    const automatic = takeFlag(args, "--auto");
    const requestedInstallation = takeOption(args, "--installation");
    if (automatic && requestedInstallation) {
      throw new Error("runtime accepts either --auto or --installation, not both.");
    }
    const project = await takeProject(args);
    assertNoArguments(args);
    if (automatic) {
      await clearProjectRuntimeSelection(project);
      console.log(`Restored automatic GameMaker runtime selection for ${path.resolve(project)}`);
      return;
    }
    if (process.env.GAMEMAKER_GML_SPEC) {
      throw new Error(
        "GAMEMAKER_GML_SPEC currently overrides project runtime selection. Unset it before choosing an installation.",
      );
    }

    const discovered = await discoverInstalledGmlSpecs({ projectFile: project });
    const installationMap = new Map<string, InstalledGmlSpec>();
    for (const candidate of discovered) {
      const key = process.platform === "win32"
        ? candidate.installationDirectory.toLowerCase()
        : candidate.installationDirectory;
      if (!installationMap.has(key)) installationMap.set(key, candidate);
    }
    const installations = [...installationMap.values()];
    if (installations.length === 0) {
      throw new Error("No installed GameMaker runtime with GmlSpec.xml was found.");
    }

    console.log("Installed GameMaker runtimes:");
    installations.forEach((candidate, index) => {
      const compatibility = candidate.familyMatch ? " — compatible IDE family" : "";
      console.log(
        `  ${index + 1}) ${formatInstallation(candidate)}${compatibility}\n     ${candidate.installationDirectory}`,
      );
    });

    let selected: InstalledGmlSpec | undefined;
    if (requestedInstallation) {
      const requestedPath = path.resolve(requestedInstallation);
      selected = installations.find((candidate) =>
        candidate.installationName.toLowerCase() === requestedInstallation.toLowerCase() ||
        (process.platform === "win32"
          ? candidate.installationDirectory.toLowerCase() === requestedPath.toLowerCase()
          : candidate.installationDirectory === requestedPath)
      );
      if (!selected) {
        throw new Error(
          `No discovered GameMaker installation matches '${requestedInstallation}'.`,
        );
      }
    } else if (installations.length === 1) {
      selected = installations[0];
    } else {
      if (!process.stdin.isTTY || !process.stdout.isTTY) {
        throw new Error(
          "Interactive runtime selection requires a terminal. Pass --installation with one of the names or paths above.",
        );
      }
      const terminal = createInterface({ input: process.stdin, output: process.stdout });
      try {
        while (!selected) {
          const answer = await terminal.question(
            `Select the GameMaker installation for this project [1-${installations.length}]: `,
          );
          const index = Number(answer.trim()) - 1;
          if (Number.isInteger(index) && installations[index]) selected = installations[index];
          else console.error("Enter one of the listed numbers.");
        }
      } finally {
        terminal.close();
      }
    }
    if (!selected) throw new Error("No GameMaker installation was selected.");

    const selectionPath = await saveProjectRuntimeSelection(
      project,
      selected.installationDirectory,
    );
    const declarations = await ensureProjectRuntimeDeclarations(project);
    console.log(
      `Selected ${formatInstallation(selected)}. ${
        declarations.written ? "Updated" : "Verified"
      } runtime declarations; saved the machine-local selection in ${selectionPath}`,
    );
    return;
  }

  if (command === "declarations") {
    const spec = takeOption(args, "--spec");
    const output = takeOption(args, "--out") ?? "types/gamemaker.generated.d.ts";
    assertNoArguments(args);
    const summary = await generateDeclarations(output, spec);
    console.log(
      `Generated ${summary.functions} functions, ${summary.constants} constants, ${summary.variables} variables, ${summary.structures} structs, and ${summary.enumerations} enums from ${summary.specPath}`,
    );
    return;
  }

  throw new Error(`Unknown command '${command}'. Run ts2gml help.`);
}

function takeOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  args.splice(index, 2);
  return value;
}

function takeFlag(args: string[], name: string): boolean {
  const index = args.indexOf(name);
  if (index < 0) return false;
  args.splice(index, 1);
  return true;
}

async function takeProject(args: string[]): Promise<string> {
  const option = takeOption(args, "--project");
  if (option) return option;
  if (args[0]?.toLowerCase().endsWith(".yyp")) return args.shift()!;

  let directory = process.cwd();
  while (true) {
    const projects = (await fs.readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".yyp"))
      .map((entry) => path.join(directory, entry.name));
    if (projects.length === 1) return projects[0]!;
    if (projects.length > 1) {
      throw new Error(`Multiple GameMaker projects found in ${directory}; specify one explicitly.`);
    }
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  throw new Error("No GameMaker .yyp project found; pass its path or use --project.");
}

function assertNoArguments(args: readonly string[]): void {
  if (args.length > 0) throw new Error(`Unexpected argument(s): ${args.join(" ")}`);
}

function printHelp(): void {
  console.log(`typescript-to-gml ${VERSION}

Usage:
  ts2gml declarations [--spec GmlSpec.xml] [--out types/gamemaker.generated.d.ts]
  ts2gml compile source.ts [--out source.gml]
  ts2gml init [Game.yyp]
  ts2gml runtime [Game.yyp] [--installation PATH | --auto]
  ts2gml check [Game.yyp] [--json]
  ts2gml doctor [Game.yyp] [--json]
  ts2gml diagnose source.ts [--json] < source.ts
  ts2gml build [Game.yyp] [--configuration NAME] [--overwrite-generated] [--project-saved]
  ts2gml watch [Game.yyp] [--configuration NAME]
  ts2gml build <custom source paths...> --project Game.yyp`);
}

function formatInstallation(candidate: InstalledGmlSpec): string {
  const name = candidate.installationName.toLowerCase();
  const channel = name.includes("beta")
    ? "Beta"
    : name.includes("lts")
      ? "LTS"
      : "Stable";
  return `${channel} runtime ${candidate.runtimeVersion}`;
}

main(process.argv.slice(2)).catch((error: unknown) => {
  if (process.argv.includes("--json")) {
    const response: DiagnosticResponse = {
      protocolVersion: 1, compilerVersion: VERSION,
      diagnostics: error instanceof Ts2GmlError ? error.diagnostics : error instanceof ResourceConflictError
        ? error.conflicts.map((conflict) => ({ code: "TS2GML_RESOURCE_CONFLICT", severity: "error",
          fileName: conflict.typeScriptFile, line: 1, column: 1, endLine: 1, endColumn: 2,
          message: `GameMaker (${conflict.gameMakerResourcePath}) and TypeScript both claim '${conflict.assetName}'.`,
          suggestion: "Delete the conflicting asset in GameMaker and save the project, or rename the TypeScript asset." })) : [],
      error: error instanceof Error ? error.message : String(error),
    };
    console.log(JSON.stringify(response));
  } else if (error instanceof Ts2GmlError) console.error(error.message);
  else console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
