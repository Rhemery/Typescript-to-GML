import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { findTypeScriptLibraries } from "../src/typescript-libraries.js";

async function installTypeScript(directory: string, version = ts.version): Promise<string> {
  const library = path.join(directory, "lib");
  await fs.mkdir(library, { recursive: true });
  await fs.writeFile(path.join(directory, "package.json"), JSON.stringify({ name: "typescript", version }));
  for (const name of ["lib.es5.d.ts", "lib.es2022.d.ts"]) await fs.writeFile(path.join(library, name), "");
  return library;
}

test("TypeScript libraries resolve from the game and prefer its installed version", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml typescript local "));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const library = await installTypeScript(path.join(directory, "node_modules", "typescript"));
  const source = path.join(directory, "typescript");
  assert.deepEqual(findTypeScriptLibraries(source, { PATH: "" }), { directory: library, version: ts.version });

  await installTypeScript(path.join(directory, "node_modules", "typescript"), "0.0.0");
  assert.throws(() => findTypeScriptLibraries(source, { PATH: "" }), /TypeScript 0\.0\.0.*does not match/);
});

test("TypeScript libraries resolve through a global npm launcher without executing it", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml typescript global "));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const prefix = path.join(directory, "npm");
  const packageDirectory = path.join(prefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", "typescript");
  const library = await installTypeScript(packageDirectory);
  const bin = process.platform === "win32" ? prefix : path.join(prefix, "bin");
  if (process.platform === "win32") {
    await fs.writeFile(path.join(bin, "tsc.cmd"), "@exit /b 99\r\n");
  } else {
    await fs.mkdir(path.join(packageDirectory, "bin"));
    await fs.writeFile(path.join(packageDirectory, "bin", "tsc"), "#!/bin/sh\nexit 99\n");
    await fs.mkdir(bin);
    await fs.symlink(path.join(packageDirectory, "bin", "tsc"), path.join(bin, "tsc"));
  }
  const environment = { PATH: [path.join(directory, "missing"), bin].join(path.delimiter) };
  assert.deepEqual(findTypeScriptLibraries(path.join(directory, "game"), environment), { directory: library, version: ts.version });

  const localLibrary = await installTypeScript(path.join(directory, "game", "node_modules", "typescript"));
  assert.equal(findTypeScriptLibraries(path.join(directory, "game"), environment).directory, localLibrary);
});

test("explicit TypeScript libraries override discovery and reject incomplete installations", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-typescript-override-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const library = await installTypeScript(path.join(directory, "sdk"));
  await installTypeScript(path.join(directory, "node_modules", "typescript"), "0.0.0");
  const environment = { PATH: "", TS2GML_TYPESCRIPT_LIB: library };
  assert.equal(findTypeScriptLibraries(directory, environment).directory, library);
  await fs.unlink(path.join(library, "lib.es5.d.ts"));
  assert.throws(() => findTypeScriptLibraries(directory, environment), /Cannot read TypeScript libraries.*npm install --save-dev typescript@/);
});

test("missing TypeScript libraries report installation instructions", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-typescript-missing-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  assert.throws(() => findTypeScriptLibraries(directory, { PATH: "" }), /not found.*npm install --global typescript@.*TS2GML_TYPESCRIPT_LIB/);
});
