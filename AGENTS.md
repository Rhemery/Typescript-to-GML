# Repository purpose

This repository is `typescript-to-gml`: a TypeScript declaration library for the complete GameMaker Language API and a compiler that turns a deliberately supported TypeScript/JavaScript subset into valid GML.

The project has two layers:

1. `types/` provides compiler authoring declarations and a scaffold for GameMaker runtime declarations. `types/gamemaker.generated.d.ts` is ignored and generated locally from the installed GameMaker runtime's `GmlSpec.xml`; never edit or commit it.
2. `src/` implements the TypeScript -> JavaScript -> GML pipeline and GameMaker asset generation. Normal classes become GML constructor functions. Classes derived from `GMObject` become GameMaker object assets with event `.gml` files and `.yy` metadata.

## Design rules

- Use the installed runtime specification as the canonical API inventory. The online manual may clarify semantics, but do not copy its prose into this repository.
- Preserve the explicit compiler pipeline: TypeScript first has its types erased by the TypeScript compiler, then the resulting JavaScript AST is lowered to GML.
- Reject unsupported JavaScript constructs with a source location. Never emit code that is known to be invalid GML.
- Generated GameMaker resources must be deterministic and builds must be idempotent. Only remove stale files recorded in the tool's own manifest.
- Keep compiler transformations small and readable. Reuse helpers when they have multiple callers; do not introduce single-use abstraction layers.
- Inspect GameMaker/compiler logs before diagnosing a build or runtime failure.
- Add or update tests for every translation rule and asset-schema change.
- `TestProject/` is the local GameMaker integration fixture. Its game source lives in `TestProject/typescript/`; generated GameMaker resources are tracked by `.ts2gml/manifest.json`.
- A game must remain self-contained. The distributable `dist/ts2gml/` folder is copied to `<game>/datafiles/ts2gml/` and contains `ts2gml.bat`, the bundled CLI, and compiler authoring declarations. The first project command generates the runtime declarations locally. Game source stays in `<game>/typescript/`, whose config references `../datafiles/ts2gml/types/`.
- The no-argument batch workflow initializes the TypeScript directory, performs one build, and watches for changes. Keep `init`, `build`, and `watch` usable as explicit batch commands.

## Verification

Run `npm run verify` for declaration generation, strict tool and game type checking, compiler tests, and project-generation tests. Run `npm run example` to regenerate the integration assets in `TestProject/`.
