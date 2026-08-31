#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { compileTypeScript, Ts2GmlError } from "./compiler/compile.js";
import {
  buildGameMakerProject,
  checkGameMakerProject,
  prepareTypeScriptProject,
} from "./compiler/project.js";
import { watchGameMakerProject } from "./compiler/watch.js";
import {
  clearProjectRuntimeSelection,
  discoverInstalledGmlSpecs,
  ensureProjectRuntimeDeclarations,
  generateDeclarations,
  saveProjectRuntimeSelection,
  type InstalledGmlSpec,
} from "./declarations/generate.js";
import { generateProjectDeclarations } from "./declarations/project.js";
import { checkForUpdate } from "./update-check.js";
import { VERSION } from "./version.js";

async function main(args: string[]): Promise<void> {
  if (Number.parseInt(process.versions.node, 10) < 20) {
    throw new Error("Node.js 20 or newer is required to run ts2gml.");
  }
  const command = args.shift();
  if (command === "--version" || command === "-v" || command === "version") {
    console.log(VERSION);
    return;
  }
  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  void checkForUpdate(VERSION).then((update) => {
    if (!update) return;
    console.error(
      `New ts2gml update available: ${update.version} (currently ${VERSION}).\nDownload: ${update.url}`,
    );
  });

  if (command === "compile") {
    const input = args.shift();
    if (!input) throw new Error("compile requires a TypeScript input file.");
    const output = takeOption(args, "--out") ?? input.replace(/\.tsx?$/, ".gml");
    assertNoArguments(args);
    const source = await fs.readFile(input, "utf8");
    const result = compileTypeScript(source, path.resolve(input));
    await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
    await fs.writeFile(output, result.gml, "utf8");
    console.log(`Compiled ${input} -> ${output}`);
    return;
  }

  if (command === "build") {
    const overwriteChangedGeneratedFiles = takeFlag(args, "--overwrite-generated");
    const ideProjectSaved = takeFlag(args, "--project-saved");
    const project = await takeProject(args);
    const summary = await buildGameMakerProject(args, project, {
      ideProjectSaved,
      overwriteChangedGeneratedFiles,
    });
    console.log(
      `Built ${summary.scripts.length} script(s), ${summary.objects.length} object(s), and ${summary.rooms.length} room creation code file(s) into ${summary.projectPath}`,
    );
    return;
  }

  if (command === "check") {
    const project = await takeProject(args);
    const summary = await checkGameMakerProject(args, project);
    console.log(
      `Checked ${summary.sourceFiles.length} source file(s): ${summary.scripts.length} script(s), ${summary.objects.length} object(s), and ${summary.rooms.length} room creation code file(s) are supported.`,
    );
    return;
  }

  if (command === "init") {
    const project = await takeProject(args);
    assertNoArguments(args);
    const summary = await prepareTypeScriptProject(project);
    const declarations = await generateProjectDeclarations(project);
    console.log(
      `${summary.createdConfig ? "Created" : "Updated"} TypeScript support in ${summary.sourceDirectory}; declared ${declarations.assets.length} GameMaker IDE asset(s).`,
    );
    return;
  }

  if (command === "watch") {
    const project = await takeProject(args);
    assertNoArguments(args);
    await watchGameMakerProject(project);
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
  ts2gml check [Game.yyp]
  ts2gml build [Game.yyp] [--overwrite-generated] [--project-saved]
  ts2gml watch [Game.yyp]
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
  if (error instanceof Ts2GmlError) console.error(error.message);
  else console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
