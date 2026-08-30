# Development and releasing

## Repository setup

```powershell
npm ci
npm run check
npm test
```

Use Node.js 20 or newer. The repository commits `package-lock.json`, but intentionally ignores `types/gamemaker.generated.d.ts` because it depends on the locally installed GameMaker runtime.

Generate the local declaration used by the full verification suite from the installed runtime specification. Do not edit or commit it:

```powershell
npm run declarations
```

Add or update tests for every lowering rule and GameMaker asset-schema change. `test/compiler.test.ts` exercises isolated lowering and diagnostics; `test/project.test.ts` covers project generation and ownership; `TestProject/` is the executable integration fixture.

## Verification levels

```powershell
npm run check
npm test
npm run verify:release
npm run verify
```

`verify:release` is portable and runs strict tool type checking, compiler/project tests, distribution smoke checks, and YYMPS construction/validation. Its project tests create isolated local declaration fixtures; the release artifacts contain no runtime declaration snapshot.

`verify` additionally regenerates and type-checks declarations from the installed GameMaker runtime, regenerates and checks `TestProject`, and uses that runtime to compile and run the game. On Windows, successful VM execution prints `TS2GML_SCOPE_CONTEXT_OK`. Runtime discovery can be overridden with `GAMEMAKER_GML_SPEC`, `GAMEMAKER_RUNTIME_PATH`, `GAMEMAKER_IGOR`, `GAMEMAKER_RUNNER`, and `GAMEMAKER_USER_DIR`.

## Versioning

Before a release, keep these values identical:

- `package.json` and the lockfile root package version.
- `src/version.ts`.
- The release heading in `CHANGELOG.md`.

Use semantic versioning. Until compatibility and target coverage are broader, publish prereleases such as `0.2.0-beta.1`.

## Create a YYMPS package from the CLI

The tested GameMaker 2026 LTS Igor CLI does not expose local asset package creation. The repository therefore provides a deterministic builder for the package format emitted by the IDE:

```powershell
npm run package:yymps
```

It builds `dist/ts2gml`, creates `release/typescript-to-gml-<version>.yymps`, and verifies:

- the exact archive inventory;
- every `GMIncludedFile` record in the package project;
- every uppercase MD5 in `yymanifest.xml`;
- package version and metadata generated from `package.json`.

Repeated builds from identical inputs produce identical bytes. The archive uses a fixed timestamp and sorted paths.

GameMaker still owns the format and may change it. Before attaching a release artifact:

1. Import the generated `.yymps` into a disposable GameMaker project using the target IDE version.
2. Confirm all files land under `datafiles/ts2gml`.
3. Run `ts2gml.bat --version`, `init`, `check`, and `build` there.
4. Close and reopen the GameMaker project and compile the test game.
5. If compatibility fails, create a local package manually with **Tools > Create Local Package** from the same `dist/ts2gml` contents and attach that IDE-produced file instead.

The official [Local Asset Packages documentation](https://manual.gamemaker.io/monthly/en/IDE_Tools/Local_Asset_Packages.htm) remains authoritative for the IDE workflow.

Optional builder metadata:

```powershell
npm run build:yymps -- --out release/custom.yymps --ide-version 2026.0.0.16 --publisher Rhemery
```

The `.yymps` output and `release/` directory are ignored; attach the artifact to a release instead of committing the binary.

## Publish checks

Run:

```powershell
npm run verify
npm audit
npm pack --dry-run
git diff --check
```

Inspect `git status`, the changelog, generated TestProject changes, and the package inventory. The npm package is useful to library consumers, while the `.yymps` file should be the primary GameMaker user download.

The manual GitHub Actions workflow builds a validated YYMPS artifact without publishing a release. Download it, perform the IDE import check, then attach the tested file to a prerelease with the matching version tag.

The canonical source repository is [Rhemery/Typescript-to-GML](https://github.com/Rhemery/Typescript-to-GML). Keep the `repository`, `homepage`, and `bugs` fields in `package.json` pointed at that repository when publishing to npm.
