# Closure regression coverage

`npm run verify` runs the compiler tests, compares the portable closure fixture with JavaScript, regenerates `TestProject`, and executes the same fixture plus native context tests in the GameMaker Windows VM. Compiler output checks alone are not treated as runtime evidence.

| Area | Cases | Evidence |
| --- | --- | --- |
| Deep scopes | 16 nested factories mixing arrows and ordinary functions; leaf callbacks capture every level; sibling branches share ancestors but keep their own locals; independent root calls | JavaScript and VM |
| Compiler depth | 1, 8, 32, and 64 nested parameter scopes, with arrows, functions, and mixed forms; deterministic output | Compiler and JavaScript |
| Binding identity | Parameter mutation, dependent defaults, multiple declarators, `var`, delayed initialization, same-name parameters at different levels, mutually recursive callback variables | JavaScript and VM |
| Receivers | Base/derived constructors, inherited static methods, fields, struct and array literals, detached/copied/destructured callbacks, live receiver mutations, parameters named `self` and `other` | JavaScript and VM |
| Call forms | Returned-function chains, indexed callbacks, computed members, ordinary and captured methods with spread arguments, optional spread calls with local or computed receivers, factories inside arguments, callback selection before argument side effects | JavaScript and VM |
| Expressions and control flow | Lazy logical branches, indexed compound assignments, single evaluation of side effects, return/throw through `finally`, callbacks created in loops using function-body bindings | JavaScript and VM |
| Native context changes | Eight nested object arrows, invocation by a foreign instance or struct, `method_call`, an explicitly bound bridge, three nested `gm_with` blocks, factories created inside `gm_with`, typed `gm_self`, native instance-variable writes | VM |
| Captures across `gm_with` | Weapon parameter captured by a stored projectile callback; shared parameter reassignment; captured `self`/`other` parameters and direct locals; separate environments per selected instance; lexical `this` distinct from native `self`; three nested blocks and escaped nested functions; later Alarm invocation; pure captures after destruction | VM, plus compilation through eight nested blocks |
| Asset name collisions | Captured parameters and locals named `weapon` coexist with a generated `weapon` script; dependent parameter defaults and repeated builds | Project generation and VM |
| Caller restoration | `self` and `other` before/after callbacks and in indirect-call arguments, exceptions caught by the caller, noncapturing functions returned from capturing functions | VM |
| Native callback APIs | `array_map`, `array_filter`, `array_foreach`, and `array_sort`, including mutation and lexical receiver access | VM |
| Lifetime | Global initialization, Create-to-Alarm storage, collision references copied to locals, inactive/reactivated/destroyed creators, pure callbacks independent of instance lifetime | VM |
| Explicit method binding | Capturing projectile callback executed by a real Step event; inline arrows/functions and stored callbacks; instance/struct receivers; repeated rebinding with shared mutation; unchanged original receiver; lexical `this` separate from native variables; nested factories; pure captures; `method(undefined, callback)` in instance and struct calls; aliases, spread arguments, `self`/`other` receivers, exceptions | Compiler and VM |
| Rejected boundaries | Ordinary loop/block/catch/destructuring captures, parameter initializers, `super` arguments, native `other`, collision parameters, local function bindings, forward references, redeclarations, context-dependent defaults, dynamic `this` below ordinary functions, expression-level local writes in callback arguments | Source-located compiler diagnostics, including deep nesting |

The portable runtime fixture is `TestProject/typescript/closure_contract.ts`; existing closure cases also remain in `semantic_contract.ts`. Native scope and event cases live in `scope_context.ts`. `test/closures.test.ts` checks the portable fixture against JavaScript and exercises deep compilation and rejection cases. `test/compiler.test.ts` and `test/project.test.ts` retain focused lowering, source-map, project-generation, and idempotence regressions.

The VM smoke test requires all five markers: `TS2GML_CLOSURE_CONTRACT_OK`, `TS2GML_CLOSURE_CONTEXT_OK`, `TS2GML_WITH_CLOSURE_OK`, `TS2GML_METHOD_CLOSURE_OK`, and `TS2GML_SCOPE_CONTEXT_OK`. A missing suite fails verification. Successful suite markers and the actual runtime version are recorded in `output/gamemaker-verification.json`.

These tests cover the documented subset and context boundaries; they do not establish compatibility with every JavaScript program or other GameMaker targets. Context-dependent closures follow native `with` lifetime behavior: an inactive or destroyed instance is skipped and the callback returns `undefined`. Pure captured callbacks remain callable. See [supported closures](Supported-Language.md#closures) for the authoring limits.
