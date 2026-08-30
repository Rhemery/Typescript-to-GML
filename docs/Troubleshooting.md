# Troubleshooting

Start with the first failure, not the last symptom. Preserve the complete `TS2GML` diagnostic and inspect GameMaker compiler/runtime logs before deciding whether lowering or game code is at fault.

## `node` is not recognized

Install Node.js 20 or newer and reopen the terminal so `PATH` refreshes. Confirm with:

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

The compiler stopped to protect an external edit. Inspect the version-control diff. Move the change into TypeScript or restore the generated file. Only use:

```bat
datafiles\ts2gml\ts2gml.bat build --overwrite-generated
```

when discarding the external change is intentional.

## GameMaker reports a compiler error

1. Run `check` and confirm it succeeds.
2. Save the exact generated `.gml` path and GameMaker error line.
3. Inspect GameMaker's compiler output/log for the first error.
4. Compare the generated GML with the TypeScript source.
5. Reproduce with the same GameMaker IDE/runtime and target.

An accepted source that produces invalid GML is a compiler bug. Include the smallest TypeScript input, emitted GML, compiler version, GameMaker runtime, target, and log excerpt in the report.

## The game compiles but crashes or behaves differently

Inspect the GameMaker runner log first. Add `show_debug_message` around the smallest suspect expression and verify the runtime shapes used by spread, iteration, `in`, `instanceof`, or a typed `other`. TypeScript types do not validate dynamic GameMaker values.

Report a minimal case if generated GML behavior differs from the supported TypeScript semantics.

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
