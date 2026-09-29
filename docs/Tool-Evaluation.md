# Tool evaluation and proposed roadmap

Assessment date: 2026-09-07. Historical baseline: the working tree, including uncommitted changes, based on commit `4b0033b`, package `0.2.0-beta.4`.

**Implementation update:** the working tree has advanced to `0.2.0-beta.7`. See [implementation status](Implementation-Status.md) for completed fixes, current verification evidence, release gates, measured feedback time, and the remaining roadmap. The findings below preserve the original assessment and its evidence.

## Recommendation

Keep the tool in public beta. Use **`0.2.0-beta.5` for the next corrected release**, after addressing the release blockers below. The current version family fits the product's maturity: it has a working end-to-end authoring workflow, but accepted TypeScript can still produce invalid GML or different runtime behavior.

The best direction is **a dependable TypeScript authoring tool for GameMaker, with a precise supported language contract and readable generated GML**. Preserve the existing TypeScript -> JavaScript -> GML pipeline, native GameMaker APIs, project-local distribution, and explicit ownership model.

There is enough functionality to build bounded game systems today. Most of the missing work is correctness, verification, and workflow resilience. Full JavaScript compatibility is outside the repository's declared purpose; implementing every rejected feature would be an unsuitable completion criterion.

The recommendation follows the existing `0.2.0` prerelease series. A version number communicates compatibility and stability, not percentage completion. SemVer reserves `0.y.z` for development and permits unstable prereleases. A future `1.0.0` can support a deliberately limited language and platform set, provided that contract is stable. [Semantic Versioning](https://semver.org/)

## What is already present, and how much is missing

| Area | Current evidence | Remaining gap |
| --- | --- | --- |
| GameMaker API inventory | Local generation reported 2,357 functions, 886 constants, 210 variables, 33 structs, and 13 enums from runtime `2026.0.0.23`. | Inventory coverage does not establish signature precision or compatibility with other runtimes. |
| Type declarations | Branded asset/ID categories, generic DS handles, authoring declarations, and strict type checks exist. | 188 of 2,362 generated top-level function signatures contain `any`; some are necessarily dynamic. Audit common array and interop signatures first. This is an AST count of signatures, including overloads, not a type-safety score. |
| Compiler | Functions, classes, inheritance, statics, objects/events, room creation code, control flow, destructuring, spread, collections, and diagnostics exist. | Several ordinary accepted expressions still miscompile. This is the largest immediate gap. |
| Asset generation | Deterministic output, manifest ownership, collision rejection, stale cleanup, IDE setting preservation, and idempotence tests exist. | Writes are not a recoverable transaction; independent compiler processes are not serialized. |
| Daily workflow | Project initialization, build/check/watch, runtime selection, compiler hooks, and an editor extension exist. | Watch invalidation and editor/compiler version consistency need attention. |
| Distribution | Bundled project-local CLI, YYMPS, VSIX, license copying, and distribution smoke checks exist. | Build runtime requirements and extension versioning need a coherent release policy; manual import/install checks remain necessary. |
| Verification | All 77 tests and full local Windows VM verification passed. | Targeted additional probes exposed failures that the passing suite misses. No equivalent execution evidence for YYC, HTML5, mobile, console, or other desktops. |
| Larger projects | Multiple source files and type-only imports are supported. | Runtime module imports/exports, explicit startup dependency ordering, and reusable captured callbacks remain absent or restricted. |

There is no defined denominator for a credible overall completion percentage. The concrete remaining scope is **nine immediate fix groups**, **eleven hardening tasks**, and a smaller set of optional language/product extensions below. The counts describe this review's findings, not an exhaustive inventory of all possible defects.

## Verification and confidence

- Read existing logs first. `output/ownership-verify.log` records a successful earlier Windows VM run; `debug.log` contains Crashpad access errors, which were not treated as compiler evidence.
- Ran `npm run verify` successfully: declaration generation, declaration/tool/editor/game type checking, 77 tests, release packages, distribution smoke checks, example generation, and Igor/VM execution. The runner printed `TS2GML_SCOPE_CONTEXT_OK` on runtime `2026.0.0.23`.
- The initial sandboxed attempt failed in esbuild because of directory access restrictions. The same full command passed after approval to run outside that sandbox. That initial failure is not listed as a product defect.
- Compiled additional source through the project compiler and ran Igor/VM against disposable copies under `output/`. The invalid-output cases passed the TypeScript/project build before GameMaker rejected them.
- Ran fallow health, dead-code, and duplication analysis, then checked its findings against actual entry points.
- Verification used local Node `24.1.0`. Node 20 execution, other GameMaker targets, IDE package import, and a live VS Code extension-host session were not tested in this assessment.

Local evidence is retained in ignored output files:

| Evidence | Location |
| --- | --- |
| Full verification | `output/tool-evaluation-verify.log` |
| Probe harness | `output/evaluate-semantics.mjs` |
| Runtime results and exact caught errors | `output/tool-evaluation-runtime.log` |
| Emoji/bracket-call compile errors | `output/tool-evaluation-semantics.log` |
| Array-length compile errors | `output/tool-evaluation-invalid.log` |
| CLI input-overwrite reproduction | `output/tool-evaluation-cli.json` |

The minimal examples and observed results below make the findings reviewable without these local files. The probe harness records compiler/runner outcomes; its process exit alone is not a regression-test verdict.

## Immediate fixes

Treat F01-F09 as blockers for promoting the current supported-language claims. Each needs a regression test for both successful behavior and safe rejection, as applicable. Fixing the implementation or rejecting the unsafe form with an actionable source-located diagnostic are both valid near-term resolutions.

### F01 — Prevent standalone compilation from overwriting its source

**Confirmed input loss.** `compile output/evaluation-cli-input.js` exited successfully and reported the same input and output path. It replaced `const` with emitted GML `var` inside that source file. The default output expression only replaces a lowercase `.ts`/`.tsx` suffix, and the write has no same-file guard.

Evidence: `src/cli.ts:81`, `src/cli.ts:86`.

Fix: validate supported input extensions, derive a separate `.gml` destination, and reject input/output identity before writing. Include explicit `--out`, uppercase extensions, equivalent relative paths, and Windows path casing in regression coverage. If JavaScript input is intentionally unsupported by the command, reject it before reading/writing output.

### F02 — Distinguish property reads, writes, and runtime representations

**Confirmed compilation and runtime failures.**

| Accepted TypeScript | Observed GML/result |
| --- | --- |
| `function trim(values: number[]) { values.length = 1; }` | Emits `__ts2gml_collection_length(values) = 1;`; Igor reports malformed assignment. |
| `function first(value: string) { return value[0]; }` | Emits ordinary indexing; VM reports that the value is not an array. |
| `function field(value: Record<string, number>, key: string) { return value[key]; }`, called with `{ score: 7 }, "score"` | VM attempts to convert `"score"` to an integer. |
| `function append(values: number[]) { return values["push"](1); }` | Bracket syntax bypasses member lowering; Igor rejects the string lookup. |

Evidence: the general property/element handling in `src/compiler/compile.ts:3095`, the `.length` rewrite around `src/compiler/compile.ts:3169`, and the emitted project probe scripts.

Fix: plan access lowering using the TypeScript checker before type erasure, as existing guard/static planning already does. Carry only the required representation information into JavaScript lowering. Use struct accessors for dynamic fields, an explicit string-index contract, array resizing for supported length writes, and identical validation for dot/bracket/parenthesized member forms. Reject ambiguous forms that cannot be represented safely. Include authored objects with a writable `length` field.

### F03 — Emit non-BMP string characters safely

**Confirmed compilation failure.** An accepted `"😀"` literal becomes `"\uD83D\uDE00"`. Igor rejects the surrogate escapes as invalid Unicode values. This affects ordinary game text, not only advanced language features.

Evidence: TypeScript printer string emission in `src/compiler/compile.ts:3384`; the disposable room's generated string and Igor errors.

Fix: emit string literals according to GML's escaping rules rather than assuming the TypeScript printer's escapes are accepted. Cover emoji, escaped Unicode, quotes, backslashes, control characters, and template text. Separately define whether string indexing/length follows JavaScript UTF-16 units or GameMaker character behavior.

### F04 — Handle absent collection arguments before indexing argument arrays

**Confirmed runtime exceptions.** `[2, 10, 1].sort()` and `[1, 2].join()` access `_arguments[0]` when the array is empty. `[1, 2].includes(1)` accesses `_arguments[1]` when only one argument exists. The VM throws an out-of-range error before the helper's `is_undefined` fallback can run.

Evidence: collection helpers in `src/compiler/compile.ts:177`, `:190`, `:202`, and `:264`.

Fix: bounds-check optional slots or pass explicit defaults at call lowering. Apply the same rule to every helper consuming the argument array, including fallback calls on authored members. Cover zero, minimum, optional, and spread argument counts. Empty-array `.pop()` passed the extra runtime probe and should remain a regression case.

### F05 — Preserve logical results and condition truthiness

**Confirmed silent behavior changes.** Probe parameters avoid TypeScript constant-expression diagnostics.

| Expression in a function | Input | JavaScript result | VM result |
| --- | --- | --- | --- |
| `value \|\| 5` | `0` | `5` | `1` |
| `flag && 42` | `true` | `42` | `1` |
| `value ? 1 : 0` | `-2` | `1` | `0` |
| `value ? 1 : 0` | `0.25` | `1` | `0` |

Evidence: binary operators pass through in `src/compiler/compile.ts:3358`; condition operands are not normalized. JavaScript logical operators return a selected operand, which need not be a boolean. [ECMAScript logical operators](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-binary-logical-operators)

Fix: provide single-evaluation, short-circuit lowering with explicit truth conversion, or temporarily constrain these forms to boolean operands. Apply the chosen condition rule to `if`, loops, ternaries, and `!`. Test side effects, negative/fractional values, empty/nonempty strings, and nullable objects.

### F06 — Resolve strict equality and null/default semantics

**Confirmed silent behavior changes.** A function accepting `number | boolean` and returning `value === 1` returns true in GML when passed `true`; JavaScript returns false. A destructuring default `const { value = 5 } = data` returns `5` for `{ value: null }`; JavaScript preserves `null`.

Evidence: `null` becomes `undefined` at `src/compiler/compile.ts:3324`, strict equality becomes ordinary equality at `:3358`, and destructuring defaults use `??`.

Fix: define the supported value model first. Preserve type-sensitive equality where types remain distinguishable, and either represent null separately or reject/document forms that require distinguishing it from undefined. Defaults must test the intended missing-value condition. Extend coverage to equality, optional access, function defaults, and destructuring together so they agree.

### F07 — Audit Math intrinsics, including references to intrinsics

**Confirmed rounding mismatch.** `Math.round(2.5)` lowers to `round(2.5)` and returns `2`; JavaScript returns `3`. GameMaker explicitly uses ties-to-even rounding. [GameMaker round](https://manual.gamemaker.io/lts/en/GameMaker_Language/GML_Reference/Maths_And_Numbers/Number_Functions/round.htm)

**Confirmed unsafe alias lowering.** `const next = Math.random; return next();` becomes a reference to GML `random` followed by a zero-argument call. The direct-call rewrite supplies `1`, but the reference path does not. The VM probe logged `0.00`; the missing bound is the code-level defect, rather than a statistical claim about one random sample.

Evidence: `mathFunctions` in `src/compiler/compile.ts:34`, and Math handling around `:3280`.

Fix: review semantics and arity of every supported Math member. Wrap or reject references whose native signature differs. Include half-integers of both signs, zero-argument calls, aliases, spreads, and callback use in the intrinsic test matrix.

### F08 — Define array sort behavior beyond fixing its optional argument

**Confirmed implementation mismatch; additional runtime tests needed.** Once F04 is repaired, no-comparator `.sort()` still selects `array_sort(values, true)`, which orders numbers numerically. JavaScript's default sorting compares string forms, so `[2, 10, 1].sort()` should produce `[1, 10, 2]`. GameMaker also documents different stability/comparator constraints. [GameMaker array_sort](https://manual.gamemaker.io/lts/en/GameMaker_Language/GML_Reference/Variable_Functions/array_sort.htm), [ECMAScript Array.prototype.sort](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.sort)

Fix: implement the promised JavaScript behavior or require an explicit comparator and document remaining target restrictions. Add numeric-default, string, equal-key stability, fractional comparator, and side-effect tests. The fractional comparator example used in this audit happened to pass on the current VM; it is not reported as a reproduced failure.

### F09 — Make rejection depend on the receiver, not only a member name

**Confirmed false rejection.** `class Worker { map(value: number) { return value; } }` is accepted, but calling `worker.map(2)` is rejected with `TS2GML1051` because `map` appears in the JavaScript member blacklist. Other names such as `filter`, `find`, and `toString` use the same rule. Authored collection-like methods have special support only for some names.

Evidence: `unsupportedJavaScriptInstanceMembers` at `src/compiler/compile.ts:488`, validation at `:1738`.

Fix: reuse the representation planning from F02 to distinguish authored members from unsupported standard-library operations. Cover `this`, other receivers, aliases, parenthesized calls, and bracket calls consistently. Avoid growing a list of spelling-based exceptions.

## Hardening before a stable release

These are source-review findings and missing safeguards unless explicitly marked reproduced. They should not be confused with the executed failures above.

| ID | Priority | Finding and proposed change | Acceptance evidence |
| --- | --- | --- | --- |
| H01 | High | **Add semantic conformance tests.** Current string/regex output assertions and the executable lowering matrix miss common default arguments and value behavior. Run matching pure examples in JavaScript and GML; compare values, evaluation counts, mutations, and exceptions. Keep intentional GML differences in a separate documented expectation set. | F01-F09 have regression coverage; every supported lowering family has positive, negative, and boundary execution cases. Add small generated-expression tests after deterministic cases. |
| H02 | High | **Make project writes recoverable and serialize writers.** `project.ts:1262` writes individual files, then project metadata, removes stale files, and writes the manifest last. `writeFileIfChanged` uses direct writes. A failure or overlapping watcher/hook/build can leave a partial generation. Stage output, atomically replace individual files where supported, retain a recovery journal, and use a per-project lock across processes. | Inject write/rename failures and terminate between commit stages; restart recovers without adopting unmanaged files. Concurrent commands serialize. No crash recovery failure was intentionally injected during this audit. |
| H03 | High | **Align Node requirements and CI.** Both workflows pin Node 20, while ten locked Azure/TypeSpec build dependencies require Node `>=22.0.0`. This is a declared compatibility mismatch, not a reproduced Node 20 crash. Move release tooling to Node 24 LTS and test a declared supported minimum; decide separately whether the shipped CLI retains Node 20 compatibility. | Clean installs, packaging, and smoke checks on the documented build/runtime versions. Node 20 is EOL; 22 and 24 are LTS at the assessment date. [Node release status](https://nodejs.org/en/about/previous-releases) |
| H04 | High | **Version the VSIX independently and monotonically.** `vscode-extension/package.json:5` remains `0.2.0`; changing the outer artifact filename does not change extension identity. Choose distinct numeric versions for each build/release and record the matching compiler version. | Install a prior VSIX and upgrade to the next one. Validate manifest version and minimum VS Code API compatibility in packaging. VS Code supports numeric extension versions and selects updates by those versions. [Extension publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#pre-release-extensions) |
| H05 | High | **Use the project's compiler version in editor checks.** The extension bundles imports from the repository compiler and calls them directly. A newer global extension can therefore report different support or generated declarations from an older project-local CLI. Delegate project checks to the pinned local compiler, or enforce a compatibility handshake. Move full checks off the extension host's synchronous execution path. | Two projects with different compiler versions produce the same diagnostics in editor and CLI; typing stays responsive while checking a larger project. |
| H06 | Medium | **Complete watch invalidation.** `watch.ts:131` ignores `.d.ts` edits; content changes to tsconfig and guard config do not queue a source build. Project events queue declaration extraction for `.yyp`/GML changes but do not automatically queue a compiler recheck when those declarations change. Add an explicit dependency/invalidation table. | Editing a type-only declaration, tsconfig, runtime/guard selection, or unmanaged GML signature triggers the appropriate recheck/build without touching a `.ts` file. Respect the existing structural-save confirmation contract. |
| H07 | Medium | **Preserve source provenance.** `compile.ts:713` disables source maps, and later validation works on reparsed emitted JavaScript. Existing pre-erasure checks already give useful locations, but they do not establish reliable runtime GML -> original TS mapping. Carry origin ranges through lowering and emit a sidecar map. | Compiler-generated errors after type erasure and runtime guard failures resolve to the original TS location. Full TS breakpoint debugging can follow later. |
| H08 | High for new target claims | **Publish and enforce a compatibility matrix.** Portable CI runs on Windows/Linux; GameMaker execution is currently Windows VM only. Parameterize the smoke runner and share runtime-selection logic: `smoke-gamemaker.mjs` currently chooses the lexicographically last installed runtime, unlike project declaration discovery. | Record exact runtime/IDE/target combinations. Require the supported Windows VM run before releases; add YYC and then HTML5 only with executed fixtures. |
| H09 | Medium | **Strengthen boundaries in declarations and collections.** Use inventory-based checks and targeted generic overloads for common native array functions that still expose `any`. Specify collection key equality, ordering, ownership, and lifecycle. Test destroy/reuse, missing values, nested arrays, and native/typed interop. | Type tests reject wrong values at chosen typed boundaries; runtime fixtures exercise lifetime behavior. Keep intentionally dynamic APIs expressive. |
| H10 | Medium | **Version and validate manifest state.** `manifest.ts` has no format/compiler version and accepts some array fields without element validation. Add explicit schema migration and preflight validation before writes; retain the rule that only recorded owned files may be removed. | Corrupt/old manifests fail clearly or migrate deterministically; upgrades preserve IDE-owned settings and unmanaged files. |
| H11 | Medium | **Bring docs and editor messages into agreement.** `Authoring-Guide.md:33` still says statics are unsupported; `Known-Issues.md:17` broadly says instance methods are not translated despite the documented collection subset. The extension conflict message tells users to choose a copy through CLI even though the current flow rejects unmanaged collisions. | Examples compile against the declared release. Derive a language-support table and stable diagnostic catalog from a shared fixture inventory; release docs distinguish current support from planned fixes. |

## Product direction after stabilization

| Order | Addition | Why it earns a place |
| --- | --- | --- |
| 1 | A precise language and runtime contract | For each construct, specify supported operands, representation, side effects, failure behavior, and deliberate GML differences. This makes both user expectations and compiler tests tractable. |
| 2 | Deterministic startup dependencies | Cross-file globals and static fields currently depend on GameMaker script initialization order, and docs require users to keep dependent classes together. Add a dependency-ordered initialization phase with a cycle diagnostic. Verify reversed filenames and resource order. |
| 3 | Static runtime modules | Add a deliberately limited import/export subset with deterministic symbol naming and integration into startup ordering. Type-only imports already exist. This enables reusable gameplay libraries without relying entirely on global names. |
| 4 | Small high-value language extensions | Optional element access/calls, destructuring parameters/assignment, rest parameters, and selected array operations reduce frequent friction. Prioritize from real game examples; each feature needs a complete semantic rule and tests. |
| 5 | Safe captured callbacks | Explicit capture environments could unlock common callback patterns. Support a narrow, well-defined subset first, preserving the readable call stack and lexical `this` rules. |
| 6 | Faster project feedback | Measure cold/warm build time, watch latency, generated helper size, and editor responsiveness on larger projects. Reuse TypeScript programs and source hashes where measurements show repeated work. Gate on correctness before optimizing. |
| 7 | Easier adoption and maintenance | Add a diagnostic/doctor command, machine-readable check output, generated GML preview/navigation, and a documented project-local tool upgrade path. Provide one small playable example showing events, cleanup, typed collections, and GML interop. |

Defer a general JavaScript runtime, arbitrary npm compatibility, async/promises, decorators, proxies, and broad automatic resource authoring. These would expand the compatibility surface substantially. Native GameMaker functions and IDE-owned sprites/rooms/resources are already useful parts of the product model.

## Code health findings

Fallow `2.102.0` analyzed 45 files and 1,335 functions. It reported 137 functions above its configured complexity thresholds. `compile.ts` is 4,309 lines, with `validateJavaScript` reported at 529 lines and `gmlTransformer` at 367 lines. These are review hotspots, not proof of defects; AST visitors naturally contain many branches.

Default dead-code analysis flagged 15 files, two exports, and the `vscode` import. Manual inspection found the flagged files were CLI/test/game entry points, the exports are used by CLI/tests, and `vscode` is supplied by the extension host. **Do not delete these or add the npm `vscode` package based on that output.** Configure the analyzer's entry points before using it as a gate. It reported no circular dependencies or unused dependencies in that analysis.

The top ten duplication groups were dominated by repetitive test assertions. Preserve readable tests rather than extracting helpers solely to reduce a metric. Useful structural work is to move collection runtime text and related lowering responsibilities into cohesive modules, and reuse representation/access planning across F02/F09. Keep direct control flow; avoid a function per syntax branch or single-use wrappers. No coverage was supplied to fallow, so its estimated risk metrics are not measured runtime coverage.

## Suggested release sequence

| Release | Scope and exit criteria |
| --- | --- |
| `0.2.0-beta.5` | Fix or safely reject F01-F09, add their regression cases, correct the build/extension version policy and stale support claims. Re-run full verification and import/install the actual YYMPS/VSIX artifacts. Do not publish the current unchanged snapshot under a new number merely to imply improved readiness. |
| Further `0.2.0-beta.N`, then `0.2.0` | Harden writes, manifests, editor parity, and watch behavior. Freeze the supported Windows VM subset and document any deliberate GML semantics. Release only with no known defects in that advertised contract. |
| `0.3.0` development cycle | Deterministic startup, static modules, better source navigation, and selected convenience syntax. Use prereleases while behavior changes. Broaden target claims as evidence becomes available. |
| `1.0.0` | Stable authoring/CLI/library/config contracts, tested migrations, demonstrated use in real game projects, recoverable generation, and an enforced test matrix for every claimed target. Full JavaScript coverage and every GameMaker target are not prerequisites. |

Use one authoritative compiler version source and validate package, lockfile, CLI, changelog, artifact metadata, and the documented compiler-to-extension mapping together. Keep the existing Windows-first installation and no-argument batch workflow working throughout these changes.
