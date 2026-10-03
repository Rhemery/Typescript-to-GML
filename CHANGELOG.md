# Changelog

All notable changes to this project are documented here.

## 0.2.0-beta.8 - 2026-10-03

- Add `gm_static(() => expression)` for native GML static storage on ordinary instance fields. Initialize once on first construction, preserve instance shadowing and shared struct references, and reject unsupported factories and GameMaker asset usage with source-located diagnostics.
- Preserve TypeScript static field creation order, including inherited reads before child initialization, missing-field reads, and uninitialized declarations that overwrite earlier initializer writes. Keep TypeScript class storage separate from native instance statics.
- Add JavaScript comparison, compiler, project-generation, type, and GameMaker VM regression coverage for both static models. Require both static runtime completion markers during verification.
- Explicitly group nested conditional expressions for valid GML, preserving JavaScript truthiness, lazy branch evaluation, and side-effect order. Cover nested conditions and both branches in compiler, JavaScript comparison, and GameMaker VM tests.
- Accept authored classes and interfaces in native array inputs, preserve element types and callback signatures across more array functions, and accept readonly arrays for non-mutating operations. Automatically refresh cached runtime declarations for the updated signatures.
- Advance the companion VSIX to `0.2.8` with matching compiler metadata.

## 0.2.0-beta.7 - 2026-09-29

- Support numeric, string, mixed, and const enums, including reverse mappings, computed members, same-file merging, local captures, and access across scripts and object events. Add compiler, project-generation, and GameMaker runtime coverage.
- Preserve closure environments across authored `method(receiver, callback)` calls, including repeated binding, aliases, spread arguments, and unbound callbacks. Keep shared capture cells and arrow lexical `this`, give closure-factory parameters private names, and test the rebound projectile callback in a real GameMaker Step event.
- Support closures over plain parameters and function-body locals, preserving shared mutation, nested captures, and lexical `this`. Add compiler and GameMaker VM coverage for returned callbacks, event lifetimes, receiver binding, and unsupported capture diagnostics.
- Extend closure regression coverage to deep mixed scopes, nested native context changes, call forms, constructor/static receivers, and instance lifetimes. Preserve lexical `this` through lowered descendants, protect generated context names from parameter renaming, and preserve callable bindings and evaluation order in indirect calls. Require closure-suite completion markers in VM verification.
- Support stored callbacks capturing enclosing bindings and `gm_with` parameters/locals, with fresh block environments per selected instance. Preserve native instance context separately from arrow lexical `this`, and give captured parameters private names to avoid script-asset collisions. Add projectile, nested-with, delayed-event, and asset-collision regressions.
- Initialize `gm_with` aliases from native `self` and `other` even when callback parameters use those names, including nested blocks.
- Make `GMObject` events public and reject direct event calls and references through compiler diagnostics instead of requiring `protected` declarations.
- Apply pending structural changes in the IDE pre-project hook before GameMaker loads assets, so saved field/event/resource changes no longer block Run or Build. Preserve IDE-owned settings, retain live-update restrictions on later hooks, and discard stale run markers for package builds. Add regression coverage for both profiles, stale IDE metadata, additions/removals, and repeated builds.
- Infer named TypeScript interfaces for constructors in unmanaged GML scripts, including members initialized from primitive literals, arrays, nested structs, and documented or defaulted parameters.
- Infer members of native global struct literals for `gm_global` access. Keep unresolved expressions permissive and preserve dynamic `GMStruct` member access.
- Add regression coverage for field type checking, constructor defaults, scope exclusions, semicolonless GML, and declaration refresh/idempotence. Include the native constructor and global struct integration fixture.
- Advance the companion VSIX to `0.2.7` with matching compiler metadata.

## 0.2.0-beta.6 - 2026-09-25

- Stop shipping TypeScript standard-library declarations in the distribution and YYMPS. Resolve a compatible project or global TypeScript installation, support `TS2GML_TYPESCRIPT_LIB`, and report setup errors and the selected libraries through the CLI.
- Resolve watch directories to their full paths to prevent native Node crashes on Windows 8.3 aliases, including hosted CI temporary directories.
- Resolve target-selected default libraries from the same external TypeScript installation when a game's tsconfig omits `lib`.
- Advance the companion VSIX to `0.2.6` with matching compiler metadata and document the external TypeScript installation and upgrade requirements.

## 0.2.0-beta.5 - 2026-09-07

- Protect standalone source files from output collisions, including links and Windows path casing.
- Correct logical values and truthiness, strict equality, null/default handling, Unicode literals, indexed access and writes, omitted collection arguments, and Math rounding/random aliases. Require explicit array sort comparators with stable ordering.
- Validate instance methods by their receiver type and retain direct access to native GameMaker arrays such as `alarm`.
- Serialize project writers, atomically replace files, recover interrupted writes, and validate versioned manifests.
- Use each game's local compiler for asynchronous editor checks. Add JSON diagnostics, `doctor`, and source maps for generated GML.
- Require Node 22 or newer; use Node 24 for release tooling and check Node 22/24 in CI. Version the companion extension as `0.2.5`, with explicit compiler metadata and a matching minimum VS Code API.
- Recheck declaration/configuration changes in watch mode and strengthen common native array type signatures.
- Normalize native predicate booleans, emit finite scientific and other numeric literal formats as valid decimal GML, and reject coercive equality with a source-located diagnostic.
- Make wrapper destruction idempotent and reject operations on destroyed native storage. Retry temporary Windows sharing locks during atomic replacement.
- Add generated GML navigation, a reproducible benchmark command, and a compiler-derived diagnostic catalog.

- Support static fields and methods on ordinary and `GMObject` classes, with initialization before construction, inherited class state, class aliases, and lexical `this` in static arrows.
- Require protected object events so TypeScript rejects external calls while preserving child overrides; reject direct event calls and references inside object code during project checks.

## 0.2.0-beta.4 - 2026-09-04

- Preserve the native `self` and `other` runtime declarations without aliasing either to the compiler-owned `gm_self<T>()` and `gm_other<T>()` context assertions.
- Add project-configured `off`, `standard`, and `maximum` runtime type guards with separate Run and Build profiles, GameMaker configuration overrides, deduplicated `gm_self<T>()`/`gm_other<T>()` checks, strict typed collection mutations, and generated compiler hooks that regenerate guards directly in place.
- Make `gm_self<T>()` and `gm_other<T>()` symmetrical typed context assertions that emit bare GML `self` and `other`.
- Make all GameMaker DS handles strict generic types defaulting to `unknown`; add native-backed `List`, `Map`, `Set`, `Grid`, `Queue`, `Stack`, and `PriorityQueue` authoring APIs; lower common array collection methods without hijacking same-named authored members; and support `delete` for arrays, structs, maps, sets, and native removable DS values.
- Add a companion Visual Studio Code extension that displays `TS2GML` diagnostics while editing, runs project checks on save, and opens the exact official GameMaker manual topic when a runtime built-in is middle-clicked without permanently underlining built-ins.
- Keep manifest-owned generated content authoritative: automatically refresh externally edited or deleted output without requiring `--overwrite-generated`, while preserving IDE-owned Object settings. Reject unmanaged asset collisions with both paths and instructions to delete the GameMaker asset and save before allowing ts2gml to manage it.
- Preserve GameMaker's existing resource/folder order and equivalent resource formatting across repeated saves to avoid unnecessary project rewrites.

## 0.2.0-beta.3 - 2026-09-01

- Expose GameMaker constants as their GML-named global values, including time-source constants; strongly distinguish constant, asset, ID, and pointer categories during type checking; and repair stale or incomplete runtime declaration caches automatically.
- Check for newer compatible GitHub releases in the background, cache the result for 24 hours, and notify CLI users without interrupting compiler commands when the network is unavailable.

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
