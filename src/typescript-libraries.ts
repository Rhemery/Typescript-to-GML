import { readFileSync, realpathSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

export function findTypeScriptLibraries(
  projectDirectory: string,
  environment: NodeJS.ProcessEnv = process.env,
): { directory: string; version: string } {
  const installHint = `Install TypeScript ${ts.versionMajorMinor}.x in the game directory with npm install --save-dev typescript@${ts.versionMajorMinor}, or globally with npm install --global typescript@${ts.versionMajorMinor}.`;
  let directory = environment.TS2GML_TYPESCRIPT_LIB
    ? path.resolve(projectDirectory, environment.TS2GML_TYPESCRIPT_LIB)
    : undefined;

  if (!directory) {
    // Resolve from the game, so the bundled CLI never depends on this repository.
    const resolutionPaths = [
      path.join(path.resolve(projectDirectory), "package.json"),
      ...(environment.PATH ?? environment.Path ?? "").split(path.delimiter).filter(Boolean).map((entry) =>
        path.join(entry.replace(/^"|"$/g, ""), process.platform === "win32" ? "tsc.cmd" : "tsc")),
    ];
    for (const [index, resolutionPath] of resolutionPaths.entries()) {
      try {
        // npm uses a shim on Windows and a symlink into the package on Unix.
        const from = index === 0 ? resolutionPath : realpathSync(resolutionPath);
        const packageFile = createRequire(from).resolve("typescript/package.json");
        directory = path.join(path.dirname(packageFile), "lib");
        break;
      } catch (error) {
        // Unrelated PATH entries may be absent or inaccessible to the current user.
        if (!["MODULE_NOT_FOUND", "ENOENT", "ENOTDIR", "EACCES", "EPERM"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
      }
    }
  }

  if (!directory) {
    throw new Error(`TypeScript standard-library declarations were not found. ${installHint} VS Code's built-in language support alone does not provide a CLI installation. For a custom installation, set TS2GML_TYPESCRIPT_LIB to its lib directory.`);
  }

  let metadata: { name?: string; version?: string };
  try {
    metadata = JSON.parse(readFileSync(path.join(directory, "..", "package.json"), "utf8"));
    if (metadata.name !== "typescript" || typeof metadata.version !== "string" ||
      !["lib.es5.d.ts", "lib.es2022.d.ts"].every((name) => statSync(path.join(directory, name)).isFile())) {
      throw new Error("Missing TypeScript package metadata or standard-library files.");
    }
  } catch (error) {
    throw new Error(`Cannot read TypeScript libraries at '${directory}': ${error instanceof Error ? error.message : String(error)} ${installHint}`);
  }
  if (metadata.version.split(".").slice(0, 2).join(".") !== ts.versionMajorMinor) {
    throw new Error(`TypeScript ${metadata.version} at '${directory}' does not match the compiler's TypeScript ${ts.versionMajorMinor}.x library requirement. ${installHint}`);
  }
  return { directory, version: metadata.version };
}
