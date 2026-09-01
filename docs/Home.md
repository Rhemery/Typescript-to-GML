# TypeScript to GML wiki

TypeScript to GML is a project-local compiler and declaration library for authoring GameMaker code with TypeScript tooling. It does not embed JavaScript into a game. TypeScript first erases the types, then the compiler translates a supported JavaScript AST into native GML and GameMaker resources.

The current release candidate is `0.2.0-beta.3`. It is best described as a production-capable beta: the tested lowering paths compile and execute in the GameMaker VM integration fixture, but target coverage and real-project mileage are still limited. Teams adopting it should pin the version, keep generated assets under source control, and retain ordinary GameMaker builds as a release gate.

## What it provides

- Type declarations generated from the installed GameMaker `GmlSpec.xml`.
- Project declarations for existing assets and unmanaged GML scripts.
- TypeScript-to-GML lowering with explicit diagnostics for unsupported semantics.
- Script assets from top-level functions and ordinary constructor classes.
- Object assets and events from `GMObject` subclasses.
- Room creation code from `GMRoom` subclasses.
- Typed authoring intrinsics for macros, `with`, `other`, `self`, and `global`.
- Deterministic project updates with ownership and external-edit protection.
- A self-contained distribution stored in each game's `datafiles/ts2gml` folder.

## Read next

| Page | Purpose |
| --- | --- |
| [Getting started](Getting-Started.md) | Install the package and build the first source file. |
| [How it works](How-It-Works.md) | Understand the compiler pipeline and project model. |
| [Authoring guide](Authoring-Guide.md) | Write scripts, structs, constructors, objects, rooms, macros, and `with` blocks. |
| [Supported language](Supported-Language.md) | See what is lowered and what is rejected. |
| [CLI reference](CLI-Reference.md) | Use every project-local and maintainer command. |
| [Generated files and ownership](Generated-Files-and-Ownership.md) | Know which files the compiler may update or remove. |
| [Known issues](Known-Issues.md) | Evaluate adoption risks and current limitations. |
| [Troubleshooting](Troubleshooting.md) | Diagnose compiler, IDE, and GameMaker failures. |
| [Development and releasing](Development-and-Releasing.md) | Contribute, verify, and create release artifacts. |

## Project status

- Package version: `0.2.0-beta.3`.
- Node.js requirement: 20 or newer.
- Primary user package: `.yymps` local asset package.
- Fully exercised integration target: Windows VM, GameMaker runtime `2026.0.0.23`.
- Portable CI gate: TypeScript checks, compiler/project tests, generated fixture, distribution smoke test, and YYMPS validation.
- License: MIT.

The repository is being published quietly to gather controlled experience before wider community promotion. Bug reports with small reproductions are especially valuable.
