# How the compiler works

The tool has two related layers: declaration generation for editor/type-checking support, and project compilation for executable GML.

## Compilation pipeline

```text
typescript/*.ts
      |
      v
TypeScript program and strict type checking
      |
      v
Type erasure to JavaScript AST
      |
      v
Supported-subset validation and GML lowering
      |
      v
In-memory scripts, objects, events, and room code
      |
      v
Conflict and ownership checks
      |
      v
Deterministic .gml, .yy, .yyp, folder, declaration, and manifest updates
```

This ordering is important. Type annotations and type-only imports are gone before GML is emitted, but runtime JavaScript semantics are still validated. A construct is accepted only when the compiler has a defined GML representation with compatible behavior.

`check` performs the pipeline through conflict checking without writing generated project assets. `build` performs the same work and then applies the project update. No partially lowered source should be written after a diagnostic.

## Declaration layers

`types/core.d.ts` defines compiler authoring concepts such as `GMObject`, `GMRoom`, `GMInstance`, `gm_macro`, `gm_with`, and `gm_other`.

`types/gamemaker.generated.d.ts` is generated from an installed runtime's `GmlSpec.xml`. It contains runtime functions, GML-named constant values, global variables, structures, enums, asset types, and object instance variables. It is neither committed nor packaged. On first use, the standalone compiler finds the active runtime compatible with the `.yyp` IDE family and creates the project-local copy; later commands refresh it when the XML SHA-256 or declaration format changes, and repair incomplete output. Equally compatible installations require a machine-local choice through `ts2gml runtime`; the compiler never guesses between differing Beta, Stable, or LTS specifications. Never edit this generated file by hand.

`datafiles/ts2gml/types/gamemaker.project.generated.d.ts` is generated for one game. It declares project assets and reads top-level functions, macros, enums, and globals from unmanaged GML Script resources. The watcher refreshes it when relevant GameMaker resources change.

## Resource mapping

| TypeScript form | GameMaker output |
| --- | --- |
| File with top-level functions | Script `.gml` and `.yy` resource |
| Ordinary class | GML constructor function in the file's Script resource |
| Class extending `GMObject` | Object `.yy`, direct event `.gml` files, and Object Variables |
| Class extending another authored object | Child Object resource with `parentObjectId` and inherited Create call |
| Class extending `GMRoom` | Direct creation-code `.gml` linked to an existing room |
| Top-level `gm_macro` declaration | GML `#macro` definitions |
| Top-level runtime variable | Initialization on GameMaker's `global` struct |

Source subdirectories are mirrored as virtual Asset Browser folders. Moving a source moves the generated resource. Compiler-created empty folders are removed, while folders containing unmanaged resources are retained.

## Safety model

Before writing, the project compiler checks for source-name collisions, invalid GML identifiers, collisions with GameMaker runtime symbols and project assets, and conflicts with unmanaged resources. It records generated paths and content fingerprints in `.ts2gml/manifest.json`.

On the next build, a compiler-owned file whose fingerprint changed or which was deleted externally stops the build. This protects an IDE hotfix from being silently erased. Object `.yy` resources are merged differently: documented IDE-owned settings and manual Object Variables are preserved while compiler-owned identity, inheritance, fields, and events are refreshed.

Watch mode adds another boundary: it may update existing generated `.gml` files, but it preflights every resource-structure change before writing. The user must save GameMaker and confirm the pending update because no external process can inspect unsaved IDE memory. The confirmed build recompiles against the newly saved resources and applies the structure as one update.

Only stale files recorded by the tool's manifest are candidates for deletion. Removing a TypeScript source never authorizes deletion of an unrelated IDE-created asset.

See [Generated files and ownership](Generated-Files-and-Ownership.md) for the exact rules.
