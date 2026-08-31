# CLI reference

The release is project-local. On Windows, use `datafiles\ts2gml\ts2gml.bat`; on another operating system, invoke `node datafiles/ts2gml/cli.cjs` with the same arguments.

The recommended Windows workflow is to open the GameMaker project folder in Visual Studio Code and run `.\datafiles\ts2gml\ts2gml.bat watch` from its integrated terminal. Keep that terminal visible so structural-save prompts and diagnostics are noticed immediately. Double-clicking the batch file is also supported and starts watch mode with no arguments.

When no project path is supplied, the CLI searches the current directory and then its parents for exactly one `.yyp`. Pass an explicit path when a directory contains more than one project.

Every project command checks `datafiles/ts2gml/types/gamemaker.generated.d.ts` against the installed `GmlSpec.xml` selected for the project's GameMaker IDE family. A missing, changed, outdated, or incomplete declaration file is generated locally before TypeScript is checked; no runtime declaration snapshot is packaged. First use therefore requires a compatible installed runtime or `GAMEMAKER_GML_SPEC`. A previously generated local copy remains usable if GameMaker is temporarily unavailable. Equally compatible Beta, Stable, or LTS installations with different specifications produce an explicit selection error instead of silently choosing one.

## Project commands

### `init [Game.yyp]`

Creates or updates `typescript/tsconfig.json` and generates declarations for current GameMaker project assets and unmanaged GML scripts. It does not compile TypeScript assets.

### `runtime [Game.yyp] [--installation PATH | --auto]`

Lists discovered GameMaker installations and interactively selects the one this project uses. The choice is stored as machine-local state in `.ts2gml/runtime-selection.json`; later commands follow that installation's active runtime as it is updated.

Use `--installation` with a listed directory name or absolute path for scripts and non-interactive terminals. Use `--auto` to forget the saved choice and restore automatic IDE-family matching. `GAMEMAKER_GML_SPEC` remains the highest-priority exact-file override and must be unset before using this selector.

```bat
datafiles\ts2gml\ts2gml.bat runtime
datafiles\ts2gml\ts2gml.bat runtime --installation GameMakerStudio2-Beta
datafiles\ts2gml\ts2gml.bat runtime --auto
```

### `check [Game.yyp]`

Runs strict TypeScript checking, validates and lowers all source in memory, checks resource names and conflicts, and exits without writing generated project assets. Use this in CI and before committing.

Additional source paths can precede `--project` when a custom layout is needed:

```bat
datafiles\ts2gml\ts2gml.bat check source shared --project MyGame.yyp
```

### `build [Game.yyp] [--overwrite-generated] [--project-saved]`

Runs the same checks as `check`, then updates generated GML/resources, project declarations, the `.yyp`, folders, and `.ts2gml/manifest.json`.

When GameMaker has the project open, save it before a build that adds, removes, renames, reparents, or otherwise changes resources, events, Object Variables, or room creation-code links. On Windows, the compiler detects the matching open project and refuses such structural changes before writing anything unless `--project-saved` is present. That flag is an explicit assertion from the user; the compiler cannot inspect GameMaker's in-memory dirty state. Closing GameMaker remains the safest alternative.

Code-only changes to existing generated `.gml` files remain safe while the IDE is open and do not require the flag.

Builds compare generated content before writing. Unchanged `.gml`, `.yy`, `.yyp`, and manifest files retain their timestamps, reducing GameMaker file-watcher reloads on every operating system.

`--overwrite-generated` intentionally ignores content-fingerprint protection for compiler-owned generated files. Use it only after reviewing or moving external edits; it can discard those changes.

### `watch [Game.yyp]`

Initializes, performs a hot-reload-safe build, then watches TypeScript source plus relevant GameMaker project files. Existing Script, Object-event, and room-creation `.gml` bodies update while GameMaker remains open without rewriting their `.yy` resources.

Source diagnostics do not stop the watcher. When a structural change is detected, no generated GameMaker asset is changed yet. The watcher asks the user to save the project in GameMaker and press Enter, waits briefly for that save to settle, then recompiles and applies the complete update. If standard input is unavailable, save GameMaker and run `build --project-saved`. Changes to unmanaged Script assets or the project inventory continue to refresh project declarations.

### `compile source.ts [--out source.gml]`

Compiles one isolated file without a GameMaker project. This command cannot perform project asset checks or generate `GMObject`/`GMRoom` resources. Prefer project-aware commands for game code.

### `--version`

Prints the bundled compiler version.

### `help`

Prints command syntax.

## Declaration-maintainer command

The repository CLI also supports:

```powershell
node dist/src/cli.js declarations --spec path/to/GmlSpec.xml --out types/gamemaker.generated.d.ts
```

Without `--spec`, it discovers an installed GameMaker runtime specification. This explicit command creates the ignored local declaration used by the repository's full verification suite; project commands perform their own project-local synchronization automatically.

## Repository packaging commands

These commands run from a source checkout:

```powershell
npm run build
npm run package:yymps
npm run verify:release
npm run verify
```

`package:yymps` builds the distribution and creates `release/typescript-to-gml-<version>.yymps`. Optional package metadata can be supplied directly to the builder:

```powershell
npm run build:yymps -- --out release/custom.yymps --ide-version 2026.0.0.16 --publisher Rhemery
```

The builder verifies archive entries, Included File records, and every manifest MD5 before succeeding. Unknown arguments and non-`.yymps` outputs fail.

All CLI failures use a nonzero exit code. Compiler failures use source-located `TS2GML` diagnostics where possible; infrastructure failures print a concise error message.
