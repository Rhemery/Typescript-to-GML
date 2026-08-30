# Contributing

Thanks for helping make TypeScript to GML safer. Small, focused changes with executable tests are preferred.

## Before changing code

- Read [How the compiler works](docs/How-It-Works.md) and [Supported language](docs/Supported-Language.md).
- Search existing issues and tests.
- For a GameMaker compile or runtime problem, inspect the GameMaker logs and reduce the failure before changing lowering.
- `types/gamemaker.generated.d.ts` is ignored and must not be committed. Generate the local verification copy with `npm run declarations`; never edit it manually.

## Change requirements

- Preserve the TypeScript type-erasure then JavaScript-AST-to-GML pipeline.
- Reject unsupported behavior with a source-located diagnostic rather than emitting suspect GML.
- Keep project generation deterministic and remove only manifest-owned stale files.
- Add or update a test for every translation rule and asset schema change.
- Keep transformations readable and reuse existing helpers when they already express the operation.

## Verify

Run `npm run verify:release` on every platform. If a compatible GameMaker runtime is installed, also run `npm run verify` for Igor compilation and VM execution. Before submitting, run `git diff --check` and include relevant GameMaker compiler or runner log evidence for runtime fixes.

Bug reports should include the compiler version, GameMaker IDE/runtime and target, smallest TypeScript reproduction, actual diagnostic or generated GML, expected result, and the first relevant log error. Do not attach proprietary projects or secrets.
