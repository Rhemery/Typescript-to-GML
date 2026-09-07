# Generated files and ownership

The compiler separates source-owned, compiler-owned, and IDE-owned data. Understanding this boundary is essential before using it on an existing project.

## Ownership table

| Path or field | Owner | Compiler behavior |
| --- | --- | --- |
| `typescript/**/*.ts` | User | Read only |
| `typescript/tsconfig.json` | User after initialization | Created when absent; kept compatible by `init` |
| `ts2gml.config.json` | User after initialization | Defines run/build runtime guard levels and GameMaker configuration overrides |
| `datafiles/ts2gml/**` | Installed package | Executed/read; updated by installing a newer package |
| `.ts2gml/manifest.json` | Compiler | Updated after a successful build; records managed paths and hashes |
| `.ts2gml/runtime-selection.json` | User/machine | Written by `runtime`; selects one local GameMaker installation and should not be committed |
| `pre_project_step.*`, `pre_run_step.*`, `pre_build_step.*` | Compiler | Applies the configured guard profile through GameMaker's compiler hooks; existing unmanaged hook files are never overwritten |
| Generated Script `.gml` and `.yy` | Compiler | Refreshed from TypeScript, including after external edits or deletion |
| Generated Object event `.gml` | Compiler | Contains the compiled event body and updates during watch |
| Generated Object `.yy` compiler fields | Compiler | Refreshed from TypeScript |
| Object `.yy` visual/physics/resource settings | GameMaker IDE | Preserved during merge |
| Manual Object Variables | GameMaker IDE | Preserved unless they conflict with a source field |
| Existing room `.yy` | GameMaker IDE | Only the creation-code link is managed while a matching room class exists |
| Generated room creation `.gml` | Compiler | Contains the compiled creation-code body |
| Unmanaged GML resources | GameMaker IDE/user | Parsed for declarations; never adopted, overwritten, or deleted |
| `.yyp` resource/folder references | Shared | Deterministically updated while preserving unmanaged entries |

## Conflicting ownership

Assets recorded in the manifest remain owned by ts2gml even when GameMaker edits or recreates their files. TypeScript determines their generated content.

An asset created in GameMaker is unmanaged. If TypeScript tries to generate the same name or resource path, `check`, `build`, and `watch` reject it and report both paths. To let ts2gml manage that asset, delete it in GameMaker and save the project before rebuilding. Alternatively, rename the TypeScript asset. The compiler does not delete either side of a collision or adopt existing unmanaged files.

## Generated content follows TypeScript

Builds automatically replace external edits to compiler-owned output, recreate missing output, and remove stale files recorded in the manifest. Make lasting code changes in TypeScript. The legacy `--overwrite-generated` flag is accepted for compatibility but is no longer required and never permits taking over unmanaged assets.

Unchanged files retain their timestamps. GameMaker-only JSON formatting changes and existing resource/folder order are preserved to avoid repeated rewrites after IDE saves.

Object `.yy` files are not treated as opaque generated text because users need to configure them in the IDE. The compiler merges documented IDE-owned fields while replacing compiler-owned fields.

## Live editing boundary

`watch` may change existing compiler-owned `.gml` files for Scripts, Object events, and room creation code. Editing a TypeScript method body does not rewrite the corresponding Object or room `.yy` resource.

Adding or removing a resource, event, field, room link, or generated folder is structural. Watch mode checks the complete planned output before writing any generated GameMaker asset. It asks the user to save GameMaker and confirm with Enter, then recompiles against the saved files and applies the update. The compiler cannot detect unsaved IDE memory, so confirmation is the user's assertion that saving has finished. Closing GameMaker remains the safest alternative.

## Stale resource cleanup

When a TypeScript asset is removed or renamed, the compiler removes only stale files recorded in its own manifest. It also removes compiler-created empty Asset Browser folders. A folder with any unmanaged resource remains.

Room assets are never stale compiler resources. Removing a `GMRoom` class removes only compiler-owned creation code and restores the prior link state.

## Version control

Commit the following together:

- TypeScript source changes.
- Generated `.gml` and `.yy` changes.
- `.yyp` and resource-order changes.
- `.ts2gml/manifest.json`.
- Project declaration changes if the tool distribution is tracked.

The repository's `TestProject/.ts2gml/manifest.json` is intentionally tracked even though ordinary `.ts2gml` state is ignored. It makes the integration fixture reflect the same ownership guarantees as a real generated project.

Do not commit `.ts2gml/runtime-selection.json`; its absolute installation path is specific to one development machine. Each contributor can run `ts2gml runtime` when automatic selection is ambiguous.

Avoid resolving generated conflicts blindly. Resolve the TypeScript source first, rebuild, then review the resulting GameMaker resource changes.

## Interrupted and concurrent builds

Project checks and builds serialize through `.ts2gml/build.lock`. Resource writes use temporary files, flush their contents, and replace each destination by rename. `.ts2gml/pending-write.json` records the previous and proposed contents before a commit begins. A subsequent command detects a dead writer and restores the previous generation before proceeding. This protects against process interruption; it is not a filesystem snapshot or a guarantee against power-loss behavior on every filesystem.

Recovery preflights every destination. If an IDE edit differs from both journal versions, recovery stops and identifies the file. Preserve the journal, reconcile that file with the recorded versions, and retry. Never delete the manifest to resolve a recovery problem. Live or incomplete locks time out with their owner/path instead of stealing an active build.

Manifest format 1 records `formatVersion`, `compilerVersion`, owned paths, and content hashes. Legacy unversioned manifests migrate deterministically; corrupt records and unknown future versions fail before resource writes. The lock and journal are local state and should remain ignored.

Generated `.gml.map.json` sidecars are owned alongside their GML files. They use project-relative TypeScript paths and statement-level source positions; compiler-generated scaffolding may map to its enclosing statement. They support navigation and diagnosis, not breakpoint debugging. Commit these sidecars with the generated assets.
