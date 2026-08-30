# Supported language subset

This is not a JavaScript compatibility layer. A feature is supported only when its runtime behavior can be represented safely in GML. TypeScript syntax used only for types is normally erased before lowering.

## Supported forms

| Area | Supported |
| --- | --- |
| Declarations | Functions, variables, ordinary classes, object classes, room classes, type-erased interfaces and type aliases |
| Control flow | Blocks, `if`, `switch`, `while`, `do...while`, classic `for`, `for...of`, `for...in`, `break`, `continue`, `return`, `throw`, `try`/`catch` without `finally` |
| Expressions | Literals, calls, property and element access, unary/binary/conditional expressions, assignments supported by GML, template strings |
| Data | Arrays, struct literals, nested destructuring declarations, declaration defaults and rest bindings |
| Spread | Array spread, object spread, and spread calls |
| Functions | Named functions, class methods, supported arrows and nested functions without unsafe captures |
| Operators | JavaScript `instanceof`, `in`, `typeof`, and `void` through defined GML lowering |
| Null access | Property-only optional chains such as `player?.transform?.position.x` |
| Modules | `import type` and imports/exports containing only erased type specifiers |
| Compiler forms | `gm_macro`, `gm_with`, `gm_other`, `GMObject`, and `GMRoom` |

`for...of` expects a GameMaker array at runtime. `for...in` enumerates a struct's own variable names. Spread operands similarly need GameMaker arrays, structs, and callable scripts or methods of the appropriate kind.

## Rejected forms

The compiler reports a source-located diagnostic for these known unsupported forms:

- Runtime ES module imports, exports, re-exports, dynamic `import()`, and `import.meta`.
- Async functions, promises as a JavaScript runtime assumption, generators, and `yield`.
- Regular expression and bigint literals.
- JavaScript `using` declarations, decorators, namespaces, and runtime enums.
- JavaScript private fields, class accessors, auto-accessors, and static class members.
- Rest parameters and destructuring parameters or assignment expressions.
- Optional calls and optional element access.
- Spread arguments in constructor calls.
- Object method/accessor shorthand and computed property names.
- Labeled statements and labeled `break` or `continue`.
- `debugger` and `try` statements with `finally`.
- Nested class declarations and unsafe constructor inheritance.
- Ordinary functions whose behavior depends on dynamic call-site `this`.
- Arrows or nested functions that capture an enclosing local, `arguments`, `super`, or `new.target`, except the special inline `gm_with` block.
- Block-scoped shadowing that would collapse into one function-scoped GML local.

Diagnostics have stable `TS2GML` codes, a source range, the source line, and a hint where a safe authoring alternative exists.

## JavaScript APIs are not GameMaker APIs

The TypeScript standard library helps the compiler understand syntax, but JavaScript runtime objects do not exist in GML. Built-ins such as `Promise`, `Map`, `Set`, `Date`, `JSON`, and typed arrays are rejected unless the source declares its own binding with that name.

JavaScript array and string instance APIs such as `.length`, `.push()`, `.map()`, and `.substring()` are rejected. Use GameMaker functions such as `array_length`, `array_push`, `array_map`, and `string_copy`.

`Math` and `console` are compiler-recognized only for members with explicit GameMaker translations. An unknown member is not passed through.

## Scope differences

GML locals are function-scoped; TypeScript `let` and `const` are block-scoped. The compiler accepts block scopes only when they preserve observable binding behavior. Shadowing that would create two TypeScript variables with one emitted GML name fails.

`this.member` emits explicit `self.member`. Lexical arrows with a supported object or struct `this` capture the intended value explicitly. Top-level runtime variables emit on `global` and must be referenced through `gm_global`.

## Identifier rules

Source and generated asset names must be ASCII GameMaker identifiers no longer than 64 characters. The `__ts2gml_` prefix is reserved for compiler temporaries. Project-aware checking also rejects names that collide with GameMaker runtime functions, constants, macros, or existing assets.

Standalone `compile` does not know project symbols and is intended only for isolated scripts and ordinary constructors. Use `check` or `build` for real projects, object classes, and room classes.
