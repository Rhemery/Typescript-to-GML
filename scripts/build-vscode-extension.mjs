import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { build } from "esbuild";
import { copyPackageLicenses } from "./copy-package-licenses.mjs";

const repositoryDirectory = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outputDirectory = path.join(repositoryDirectory, "vscode-extension", "dist");
await fs.rm(outputDirectory, { recursive: true, force: true });
await fs.mkdir(outputDirectory, { recursive: true });
await build({
  absWorkingDir: repositoryDirectory,
  entryPoints: [path.join(repositoryDirectory, "vscode-extension", "src", "extension.ts")],
  outfile: path.join(outputDirectory, "extension.cjs"),
  bundle: true,
  external: ["vscode"],
  platform: "node",
  format: "cjs",
  target: "node22",
  legalComments: "none",
  sourcemap: true,
});
await copyPackageLicenses(path.join(outputDirectory, "licenses"));
