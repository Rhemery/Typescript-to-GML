import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { build } from "esbuild";

const require = createRequire(import.meta.url);
const outputDirectory = path.resolve("dist", "ts2gml");
await fs.rm(outputDirectory, { recursive: true, force: true });
await fs.mkdir(path.join(outputDirectory, "types"), { recursive: true });

await build({
  absWorkingDir: process.cwd(),
  entryPoints: ["./src/cli.ts"],
  outfile: "./dist/ts2gml/cli.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  legalComments: "none",
});

for (const fileName of ["core.d.ts", "index.d.ts"]) {
  await fs.copyFile(
    path.resolve("types", fileName),
    path.join(outputDirectory, "types", fileName),
  );
}

const typescriptLibDirectory = path.dirname(require.resolve("typescript"));
const distributedTypeScriptLib = path.join(outputDirectory, "typescript", "lib");
await fs.mkdir(distributedTypeScriptLib, { recursive: true });
const typeScriptLibraries = (await fs.readdir(typescriptLibDirectory))
  .filter((fileName) => /^lib(?:\..+)?\.d\.ts$/.test(fileName))
  .sort();
await Promise.all(
  typeScriptLibraries.map((fileName) =>
    fs.copyFile(
      path.join(typescriptLibDirectory, fileName),
      path.join(distributedTypeScriptLib, fileName),
    ),
  ),
);

await fs.copyFile("LICENSE", path.join(outputDirectory, "LICENSE"));
await fs.copyFile("docs/Datafiles-README.txt", path.join(outputDirectory, "README.txt"));
await fs.cp("docs", path.join(outputDirectory, "docs"), { recursive: true });
const licenseDirectory = path.join(outputDirectory, "licenses");
await fs.mkdir(licenseDirectory, { recursive: true });
for (const [packageName, licenseFiles] of [
  ["typescript", ["LICENSE.txt", "ThirdPartyNoticeText.txt"]],
  ["json5", ["LICENSE.md"]],
  ["fast-xml-parser", ["LICENSE"]],
  ["strnum", ["LICENSE"]],
]) {
  let packageDirectory = path.dirname(require.resolve(packageName));
  while (path.dirname(packageDirectory) !== packageDirectory) {
    try {
      const metadata = JSON.parse(
        await fs.readFile(path.join(packageDirectory, "package.json"), "utf8"),
      );
      if (metadata.name === packageName) break;
    } catch {
      // Continue toward the package root.
    }
    packageDirectory = path.dirname(packageDirectory);
  }
  for (const licenseFile of licenseFiles) {
    await fs.copyFile(
      path.join(packageDirectory, licenseFile),
      path.join(licenseDirectory, `${packageName}-${licenseFile}`),
    );
  }
}

const batch = `@echo off\r
setlocal\r
where node >nul 2>nul\r
if errorlevel 1 (\r
  echo Node.js 20 or newer is required to run ts2gml.\r
  pause\r
  exit /b 1\r
)\r
set "TS2GML_DIR=%~dp0"\r
pushd "%TS2GML_DIR%..\\.."\r
if "%~1"=="" (\r
  node "%TS2GML_DIR%cli.cjs" watch\r
) else (\r
  node "%TS2GML_DIR%cli.cjs" %*\r
)\r
set "TS2GML_EXIT=%ERRORLEVEL%"\r
popd\r
exit /b %TS2GML_EXIT%\r
`;
await fs.writeFile(path.join(outputDirectory, "ts2gml.bat"), batch, "utf8");
