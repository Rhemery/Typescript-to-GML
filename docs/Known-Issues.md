# Known issues and beta warnings

> [!CAUTION]
> This is a beta compiler that writes GameMaker project resources. Use source control, test imports and builds on a copy first, and do not make it the only copy of game logic. Unsupported syntax should fail safely, but undiscovered semantic differences may still exist.

## Compatibility limits

- End-to-end compiler validation currently covers Windows, the VM runner, and GameMaker runtime `2026.0.0.23`. YYC, HTML5, mobile, console, and other desktop runners have not received equivalent automated execution coverage.
- Runtime declarations are generated locally on first use and follow that machine's selected GameMaker runtime. They refresh when its `GmlSpec.xml` changes; switching to a different runtime may add, remove, or change APIs.
- Node.js 22 or newer is required on every development machine and CI runner using the compiler.
- Project commands also require TypeScript 5.9.x installed separately. VS Code's built-in language service alone does not satisfy the CLI requirement; see [setup](Getting-Started.md#requirements). Restart watch mode after changing that installation.
- The included launcher is a Windows batch file. The bundled `cli.cjs` can be invoked with Node on other operating systems, but project workflows there have less real-world coverage.
- The generated YYMPS is an unsigned local asset package. Its ZIP structure, Included File records, and MD5 manifest are validated, but every release should still be import-tested in the intended GameMaker IDE before distribution.

## Language and runtime limits

- Only the subset in [Supported language](Supported-Language.md) is implemented. This is not Node.js, a browser runtime, or general TypeScript-to-GML compatibility.
- The documented array/string collection subset is translated. Other standard-library members require explicit GameMaker functions; declared authored methods remain callable.
- Runtime validation is limited to the explicit boundaries described in [runtime type guards](Runtime-Guards.md). Other generics, casts, non-null assertions, structural interfaces, `any`, and `unknown` still erase without a runtime check.
- Spread, destructuring, `for...of`, `for...in`, `in`, and `instanceof` require operands with the expected GameMaker runtime representation. The compiler cannot prove every dynamic value.
- Property optional chaining and standalone calls such as `weapon?.onEndStep()` are supported. Optional calls used as values, optional callable invocation (`callback?.()`), and optional element access remain unsupported.
- Closures support plain parameters, function-body locals, and direct `gm_with` bindings with shared mutation and lexical `this`. Ordinary nested block/loop captures and native `other` inside capturing callbacks remain restricted; see [closure support and limits](Supported-Language.md#closures).
- GML's function-scoped locals mean some legal TypeScript shadowing is rejected.
- A script reference can be represented numerically by GameMaker. Code that depends on JavaScript's `typeof` distinctions around callable values may not have identical semantics; prefer direct calls or explicit GameMaker predicates.
- Runtime imports are unsupported. GameMaker functions and assets are globals supplied by declarations, while reusable TypeScript-only types may use type-only imports.

## Project-model limits

- `GMObject` and `GMRoom` require project-aware `check` or `build`; standalone `compile` cannot create or inspect assets.
- Room classes can only attach creation code to an existing room and may define only `onCreate`.
- Object resource settings should be edited only after the first generated object exists. The compiler preserves supported IDE-owned fields, but unusual future GameMaker schema fields may require an update.
- An authored asset cannot reuse an unmanaged resource name automatically. Delete the conflicting asset in GameMaker and save the project before rebuilding if you want ts2gml to manage it, or rename the TypeScript asset.
- Asset and source names are limited to GameMaker's ASCII identifier rules and 64-character limit.
- Watch mode can hot-reload existing generated `.gml` bodies without touching Object or room `.yy` resources. Resource/event/field/folder changes pause before writing and require the user to save GameMaker and confirm. GameMaker exposes no documented cross-platform dirty-state API, so the compiler cannot verify that assertion itself; closing the IDE remains the safest option.
- Project declaration extraction from unmanaged GML is intentionally syntactic and conservative. Complex metaprogramming may be typed as `any` or omitted.

## Adoption recommendation

For a serious project, use it first in a bounded feature or branch. Pin `0.2.0-beta.7`, keep the generated GML reviewable, run `check` in CI, build the game normally in GameMaker, and exercise every shipping target. Avoid converting irreplaceable or deadline-critical systems until the project has accumulated successful production use.

Report a minimal source example whenever accepted TypeScript emits invalid GML, GameMaker compilation fails, runtime behavior differs, or the compiler crashes. Those are release-blocking classes of defect.
