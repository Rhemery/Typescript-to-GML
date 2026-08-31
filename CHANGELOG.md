# Changelog

All notable changes to this project are documented here.

## Unreleased

- Expose GameMaker constants as their GML-named global values, including time-source constants; strongly distinguish constant, asset, ID, and pointer categories during type checking; and repair stale or incomplete runtime declaration caches automatically.

## 0.2.0-beta.2 - 2026-08-30

- Generate each installed project's runtime declarations locally on first use from the active GameMaker runtime's `GmlSpec.xml`, refresh them when that specification changes, and provide a persistent interactive selector for ambiguous Beta, Stable, and LTS installations. Runtime-generated declarations are no longer committed or packaged.
- Removed IDE focus/save/reload automation; generated Object events and room creation code once again contain their compiled GML directly.
- Made watch mode preflight structural changes, ask the user to save GameMaker, and apply the complete pending update only after confirmation. Added `build --project-saved` for the same explicit contract outside interactive watch mode.
- Compare GameMaker JSON resources semantically and leave unchanged generated/project files untouched during incremental builds.

## 0.2.0-beta.1 - 2026-08-28

- Added a deterministic, checksummed YYMPS package builder, a manual artifact workflow, and an importable project-local release layout.
- Added a versioned user wiki, explicit beta and compatibility warnings, troubleshooting, contribution guidance, and release documentation.
- Added manifest fingerprints that stop builds before externally edited or deleted generated files are overwritten, with an explicit `build --overwrite-generated` recovery option.
- Removed `GMObjectConfig`; generated objects now preserve IDE-authored resource settings, and class fields initialize in PreCreate before Create runs.
- Added JSDoc generated from the installed runtime's `GmlSpec.xml` for documented functions, parameters, constants, variables, structure fields, and enumeration members.
- Moved the project-local tool location to `datafiles/ts2gml` to match conventional GameMaker tool layouts.
- Added typed `gm_with` blocks with automatic caller inference through `this.gm_with`, typed collision-event `other` parameters, and `gm_other<T>()` assertions for instance-aware IntelliSense.
- Added typed `gm_macro` declarations that emit raw GML `#macro` values and configuration overrides.
- Added TypeScript-authored creation code for existing GameMaker rooms.
- Added the complete current GameMaker object event inventory, readable keyboard event names, and project-aware collision event declarations.
- Made variable context explicit across fields, locals, lexical arrows, object initialization, and nested `gm_with` blocks, with compiler rejection for unsafe shadowing and an executable GameMaker VM scope suite.
- Hardened lowering with valid GML `do...while` and bindingless `catch` output, receiver-safe spread method calls, explicit top-level global initialization, strict GML identifier and runtime-name collision checks, and diagnostics for generator, `debugger`, `finally` control flow, unsafe constructor inheritance, runtime exports, and other syntax that was previously emitted incorrectly or dropped.
- Added an executable lowering matrix that compiles with Igor and runs in the GameMaker VM alongside the scope-context fixture.

## 0.1.0 - 2026-08-26

- Added GameMaker runtime declarations generated from `GmlSpec.xml`.
- Added TypeScript-to-GML compilation for the documented supported subset.
- Added deterministic script, object, event, folder, and manifest generation.
- Added project-local `init`, `check`, `build`, and `watch` workflows.
- Added source-located `TS2GML` diagnostics for unsupported semantics.
- Added portable distribution, project type checking, and release smoke tests.
- Added watcher-driven TypeScript declarations, including parameter names, optional defaults, Feather JSDoc types, and descriptions, for functions and globals in unmanaged GML Script assets.
