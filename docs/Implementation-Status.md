# Evaluation implementation status

Updated 2026-09-26. The working tree targets **0.2.0-beta.7**, with companion VSIX **0.2.7**. It builds on the beta.5 stabilization milestone from [the evaluation](Tool-Evaluation.md) and beta.6's external TypeScript library support. Beta.7 remains local and unpublished.

## Next-version scope and readiness

Beta.7 adds named interfaces for native GML constructors and member inference for native global struct literals. Primitive literals, arrays, nested structs, and documented or defaulted constructor parameters contribute types; unresolved expressions retain permissive fallbacks. Regression tests cover type errors, scope exclusions, semicolonless GML, and declaration refresh/idempotence. Compiler, lockfile, CLI, extension, documentation, and generated-project versions advance together.

The remaining publication gates are importing the exact beta.7 YYMPS into a disposable GameMaker project and checking interactive VS Code activation, diagnostics, and navigation. Automated package validation and CLI installation are separate evidence. The feature roadmap below does not block this beta; broader target claims and a stable release still need real-game use and additional executed coverage.

## Immediate fixes

| Finding | Implemented result |
| --- | --- |
| F01 | Standalone output cannot replace its input through default naming, explicit paths, casing, symlinks, or hard links. Supported extensions are checked. |
| F02 | Runtime access distinguishes arrays, strings, structs, and instances; length writes resize arrays; bracket/parenthesized collection calls lower consistently. Checker planning preserves native arrays such as `alarm`. |
| F03 | Unicode literals and template chunks retain non-BMP characters accepted by GameMaker. String indexing follows the documented GameMaker character contract. |
| F04 | Optional collection slots are checked before indexing. Defaults for includes, indexOf, join, and sort are explicit. |
| F05 | Conditions use explicit truth conversion; logical expressions return selected operands and defer the right-hand side. Immediate generated functions explicitly receive needed local values. |
| F06 | Null and undefined are distinct; defaults test undefined; strict equality preserves supported type distinctions. Native predicates declared boolean are normalized. Coercive equality is rejected. |
| F07 | Round/random references use wrappers; min/max also handle zero/one/multiple arguments. Other Math members retain documented native numerical-domain behavior. |
| F08 | Arrays require a comparator and sort stably, including fractional comparator results. Native sorting remains available explicitly. |
| F09 | Receiver types distinguish authored members from unimplemented standard-library methods. |

Additional executed fixes include decimal emission for scientific/hexadecimal/binary/octal numeric literals, collection destruction/reuse protection, and retrying temporary Windows file-sharing failures without deleting the old destination.

## Hardening

| Finding | Status and evidence |
| --- | --- |
| H01 | Added a shared JavaScript/GameMaker fixture with 48 deterministic comparisons, plus expanded GameMaker boundary/lifecycle tests. The complete suite has 99 tests, including native struct inference coverage. Exhaustive family-by-family differential coverage and generated-expression fuzzing remain future test work. |
| H02 | Implemented cross-process locking, flushed atomic replacements, a recovery journal, rollback, and preflight refusal to overwrite post-crash edits. Tests cover injected rename/write failure, abrupt process exit, concurrent processes, and successful recovery. |
| H03 | CLI/build minimum is Node 22; CI covers Node 22/24 on Windows/Linux, and release tooling uses Node 24. Local execution here used Windows/Node 24.1.0; the new CI matrix has not been executed from this session. |
| H04 | VSIX identity is 0.2.7 and records compiler beta.7. Packaging validates versions and API minimum. Actual CLI installation/upgrade from 0.2.6 to 0.2.7 passed in an isolated VS Code 1.139.1 profile. |
| H05 | Editor validation runs asynchronously through each project's CLI and diagnostic protocol. Tests verify two independently pinned compiler versions and unsaved text transport. Interactive extension-host performance still needs observation in a larger game. |
| H06 | Watch tests now exercise declaration-only edits, tsconfig changes, guard config, and unmanaged GML signatures. Runtime selection/distributed declarations also trigger builds. See the explicit dependency table and external-config limit in [Compatibility](Compatibility.md). |
| H07 | Inline TypeScript provenance restores original diagnostics. Generated statement-level `.gml.map.json` files support editor navigation. Full breakpoint/debugger integration remains separate work. |
| H08 | Runtime discovery is shared with declaration generation; supported smoke target parameters and exact local execution evidence are recorded. Other targets and automated licensed release workers remain unclaimed. |
| H09 | Common native arrays now have generic boundaries. Collection cleanup is shallow and explicit, double destruction is safe, and native-storage access after destruction fails clearly. Key equality/ordering/native interop differences are documented. |
| H10 | Versioned manifest format 1 validates ownership paths, hashes, and variable records; legacy migration and malformed/future state have regression tests. |
| H11 | Corrected stale statics, collections, finally, exports, ownership, Node, and editor messages. Added a compiler-derived catalog of 76 diagnostic codes. Support documentation states deliberate target differences. |

Collection runtime text, value helpers, access planning, project transactions, and source mapping now have separate focused modules. Existing entry points were preserved; analyzer-only dead-code guesses were not used for deletion.

The distribution and YYMPS no longer include TypeScript's 100 standard-library declaration files (3.14 MB uncompressed). Project commands read a separately installed TypeScript 5.9.x package, preferring project dependencies over global `tsc` on `PATH`, with `TS2GML_TYPESCRIPT_LIB` for custom installations. Missing, incomplete, or incompatible libraries produce installation instructions; `doctor` reports the selected directory and version. Both explicit `lib` settings and target-selected default libraries use that installation. The bundled compiler engine and compiler authoring declarations remain part of the tool. Setup and upgrade documentation describe the new prerequisite and cleanup of old Included File entries. The integration project's obsolete library Included File records have been removed.

## Verification

- `npm run verify` passed for beta.7 on 2026-09-26: local declaration generation, strict tool/editor/runtime/game type checking, 99 tests, YYMPS/VSIX packaging, distribution smoke checks, example generation, and GameMaker Igor/VM execution.
- The runner printed `TS2GML_SCOPE_CONTEXT_OK` on Windows VM, runtime `2026.0.0.23`.
- The real VS Code 1.139.1 CLI upgraded `rhemery.typescript-to-gml@0.2.6` to `0.2.7` in an isolated profile and listed the new installed version.
- The integration fixture now declares `infer_class` with numeric `__var` and string `a`, and `gm_global.infer_struct` with numeric `__ee` and string `b`. Tests also reject incorrect member assignments and refresh declarations after GML edits.
- `doctor --json` reports beta.7 and the external TypeScript 5.9.3 installation with no diagnostics. Beta.6's missing default-library regression remains covered.
- `npm audit` reported zero vulnerabilities on 2026-09-26.
- Earlier local benchmark: five-file project checks took 1,381 / 1,039 / 894 ms; 100/500-function synthetic inputs took 343 / 660 ms. This remains the baseline before program-cache optimization; it was not rerun for beta.7.
- Local evidence: `output/beta7-verify.log`, `output/gamemaker-verification.json`, `output/beta7-vsix-before.log`, `output/beta7-vsix-after.log`, `output/beta7-doctor.json`, `output/beta7-audit.json`, and `output/benchmark.json`.

GameMaker IDE YYMPS import, interactive VS Code activation, minimum-Node execution, and non-Windows-VM target runs have not been performed here. These should not be inferred from package structure or protocol tests.

## Remaining product roadmap

The evaluation's later milestones remain planned. They are not advertised as beta.7 features:

1. **Dependency-ordered startup:** split declarations from initializers, build an explicit dependency graph, diagnose cycles, and test reversed filenames/resource order. This should precede module support.
2. **Static runtime modules:** define import/export resolution and deterministic symbol naming on top of startup ordering. Preserve global native GameMaker APIs and reject unsupported module behavior.
3. **Convenience syntax:** extend optional calls beyond standalone method-call statements, add optional elements, destructuring parameters/assignment, rest parameters, and selected array methods one family at a time, with lazy evaluation and mutation tests.
4. **Captured callbacks:** plain parameters and function-body locals now use shared capture environments, including nested closures and lexical `this`. Extend block/loop lifetimes and native context support only with defined semantics and execution tests; unsupported cases still fail clearly.
5. **Larger-project feedback:** measure watch latency and helper sizes on real games; add TypeScript program/source-hash reuse only where the measurements justify it.
6. **Adoption:** doctor, JSON diagnostics, GML navigation, and an upgrade procedure are implemented. A separate small playable tutorial showing events, cleanup, collections, and native interop remains to be authored; TestProject remains the executable compiler integration fixture.
7. **Stable release evidence:** accumulate real-game use, complete manual import/editor checks, and add licensed CI runners for every newly claimed GameMaker target. Keep the tool in beta until its published contract meets those gates.

General JavaScript runtime emulation, arbitrary npm packages, async/promises, decorators, proxies, and broad resource authoring remain intentionally deferred as recommended in the evaluation.
