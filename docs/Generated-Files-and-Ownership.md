# Generated files and ownership

The compiler separates source-owned, compiler-owned, and IDE-owned data. Understanding this boundary is essential before using it on an existing project.

## Ownership table

| Path or field | Owner | Compiler behavior |
| --- | --- | --- |
| `typescript/**/*.ts` | User | Read only |
| `typescript/tsconfig.json` | User after initialization | Created when absent; kept compatible by `init` |
| `datafiles/ts2gml/**` | Installed package | Executed/read; updated by installing a newer package |
| `.ts2gml/manifest.json` | Compiler | Updated after a successful build; records managed paths and hashes |
| `.ts2gml/runtime-selection.json` | User/machine | Written by `runtime`; selects one local GameMaker installation and should not be committed |
| Generated Script `.gml` and `.yy` | Compiler | Replaced only when ownership and fingerprints are valid |
| Generated Object event `.gml` | Compiler | Contains the compiled event body and updates during watch |
| Generated Object `.yy` compiler fields | Compiler | Refreshed from TypeScript |
| Object `.yy` visual/physics/resource settings | GameMaker IDE | Preserved during merge |
| Manual Object Variables | GameMaker IDE | Preserved unless they conflict with a source field |
| Existing room `.yy` | GameMaker IDE | Only the creation-code link is managed while a matching room class exists |
| Generated room creation `.gml` | Compiler | Contains the compiled creation-code body |
| Unmanaged GML resources | GameMaker IDE/user | Parsed for declarations; never adopted, overwritten, or deleted |
| `.yyp` resource/folder references | Shared | Deterministically updated while preserving unmanaged entries |

## External edit protection

The manifest fingerprints fully generated `.gml` files and Script `.yy` files. Before refreshing or deleting one, the compiler compares its current contents with the last successful build.

If a generated file was edited or deleted externally, the build stops. Choose one of these recoveries:

1. Move the intended change into its TypeScript source and restore the generated file from version control.
2. Restore the generated file without keeping the edit.
3. After reviewing the loss, run `build --overwrite-generated` to deliberately replace it.

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
