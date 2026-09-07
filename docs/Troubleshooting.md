# Troubleshooting

Run `node datafiles/ts2gml/cli.cjs doctor Game.yyp --json` to collect the compiler version, Node version, selected runtime, manifest format, and project diagnostics. For an interrupted write, follow the recovery message and preserve `.ts2gml/pending-write.json`; see [file ownership and recovery](Generated-Files-and-Ownership.md).

Start with the first failure, not the last symptom. Preserve the complete `TS2GML` diagnostic and inspect GameMaker compiler/runtime logs before deciding whether lowering or game code is at fault.

## `node` is not recognized

Install Node.js 22 or newer and reopen the terminal so `PATH` refreshes. Confirm with:

```powershell
node --version
```

## No `.yyp` project was found

Run the batch file from inside the game tree or pass the project explicitly:

```bat
datafiles\ts2gml\ts2gml.bat build C:\Games\MyGame\MyGame.yyp
```

If multiple `.yyp` files are found in one directory, an explicit path is required.

## TypeScript cannot find GameMaker names

Run `init` and check that `typescript/tsconfig.json` includes `../datafiles/ts2gml/types/**/*.d.ts`. If the distribution was moved, restore it to `datafiles/ts2gml`. Run `build` or `watch` to regenerate project asset declarations.

Restart the editor's TypeScript language service only after confirming those files exist; an editor restart cannot repair an incorrect path.

## A `TS2GML` diagnostic appears

Read its hint and source location. Check [Supported language](Supported-Language.md) before attempting a workaround. Do not bypass the diagnostic by casting to `any`: casts erase, while the unsupported runtime syntax remains.

If documented supported syntax fails, reduce it to the smallest source file and report the compiler version, diagnostic code, source, and expected GML.

## A generated file was modified or deleted

The next build refreshes compiler-owned output from TypeScript automatically. Move any change you want to keep into TypeScript. If an older distribution still reports that a file changed outside ts2gml, update the project-local tool; `--overwrite-generated` is no longer required.

Equivalent GameMaker JSON formatting and existing project resource/folder order are preserved, so an unchanged build does not rewrite those files. If an already-open IDE retains stale unsaved state, save and close GameMaker, rebuild, and reopen it. The compiler cannot clear the IDE's in-memory unsaved indicator.

## GameMaker and TypeScript both claim a resource

This means an unmanaged GameMaker asset has the name or path TypeScript is about to generate. No generated asset was changed. Delete the conflicting asset in GameMaker and save the project if you want ts2gml to manage it, or rename the TypeScript asset. Then rebuild; in watch mode, save the TypeScript source to retry. The compiler does not delete either copy for you. Preserve `.ts2gml/manifest.json`, which identifies assets already owned by ts2gml.

## GameMaker reports a compiler error

1. Run `check` and confirm it succeeds.
2. Save the exact generated `.gml` path and GameMaker error line.
3. Inspect GameMaker's compiler output/log for the first error.
4. Compare the generated GML with the TypeScript source.
5. Reproduce with the same GameMaker IDE/runtime and target.

An accepted source that produces invalid GML is a compiler bug. Include the smallest TypeScript input, emitted GML, compiler version, GameMaker runtime, target, and log excerpt in the report.

## The game compiles but crashes or behaves differently

Inspect the GameMaker runner log first. Add `show_debug_message` around the smallest suspect expression and verify the runtime shapes used by spread, iteration, `in`, `instanceof`, or a typed `other`. Runtime guards cover only their documented boundaries; other TypeScript types erase.

A `ts2gml runtime type guard` exception reports the operation and expected type. Fix the incorrect assertion or the untyped GameMaker/GML value entering that boundary. Do not disable guards merely to hide a reproducible mismatch.

Report a minimal case if generated GML behavior differs from the supported TypeScript semantics.

## A compiler hook already exists

ts2gml does not overwrite an unmanaged `pre_project_step`, `pre_run_step`, or `pre_build_step` file. Relocate the existing logic to a GameMaker extension hook or another build integration, remove the conflicting root hook, and rebuild. GameMaker owns each well-known root hook name, so two independent files cannot both occupy it.

## GameMaker does not show a generated resource

New resources and events are structural. Save GameMaker, confirm the watcher prompt, then inspect the `.yyp` diff. Alternatively, close GameMaker and run `build`, or save it and run `build --project-saved`. Confirm that the resource files exist and the build completed successfully. A name collision with an unmanaged asset should have failed before writing; preserve that diagnostic if present.

Existing event-body changes are emitted directly into the event's `.gml` file. If that file changed on disk but the IDE did not refresh it, inspect `ui.log` for the first File Watcher exception and include it with the GameMaker version in a bug report.

## Watch reports a structural GameMaker change

No generated GameMaker assets were changed before this prompt. Save the project in GameMaker, wait for the save to finish, and press Enter in the watcher terminal. If the watcher has no interactive input, run:

```bat
datafiles\ts2gml\ts2gml.bat build --project-saved
```

`--project-saved` is an assertion that all IDE changes have been written to disk. Structural changes include new or removed TypeScript files, objects, events, Object Variables, source folders, and room creation-code links. Closing GameMaker before a normal `build` remains the safest fallback.

## YYMPS import fails

Confirm the download is a `.yymps` file rather than a browser error page. Try **Tools > Import Local Package** and inspect the IDE log. Record the GameMaker IDE version. As a fallback, build or download the distribution folder and copy it directly to `<game>/datafiles/ts2gml`; this installs the same files without the package-import step.
