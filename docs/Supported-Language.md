# Supported language subset

This is not a JavaScript compatibility layer. A feature is supported only when its runtime behavior can be represented safely in GML. TypeScript syntax used only for types is normally erased before lowering.

## Supported forms

| Area | Supported |
| --- | --- |
| Declarations | Functions, variables, ordinary classes, object classes, room classes, type-erased interfaces and type aliases |
| Control flow | Blocks, `if`, `switch`, `while`, `do...while`, classic `for`, `for...of`, `for...in`, `break`, `continue`, `return`, `throw`, `try`/`catch`/`finally` |
| Expressions | Literals, calls, property and element access, unary/binary/conditional expressions, assignments supported by GML, template strings |
| Data | Typed GameMaker data structures, JavaScript-style collections, arrays, struct literals, nested destructuring declarations, declaration defaults and rest bindings |
| Spread | Array spread, object spread, and spread calls |
| Functions | Named functions, class methods, supported arrows and nested functions without unsafe captures |
| Class statics | Static fields and methods on ordinary and `GMObject` classes, inherited statics, class aliases, and literal member access |
| Operators | JavaScript `instanceof`, `in`, `typeof`, `void`, and collection/property `delete` through defined GML lowering |
| Null access | Property-only optional chains such as `player?.transform?.position.x` |
| Modules | Type-only imports/exports; named exported declarations become GameMaker globals without module isolation |
| Compiler forms | `gm_macro`, `gm_with`, `gm_self`, `gm_other`, `GMObject`, and `GMRoom` |

Typed `gm_self<T>()` and `gm_other<T>()` context assertions receive runtime object guards by default. Repeated assertions of the same context and object type are checked once at the containing function or event boundary. The `maximum` runtime guard level additionally checks reifiable values inserted through typed arrays and compiler collections. Guard profiles come from the project-level `ts2gml.config.json`; see [runtime type guards](Runtime-Guards.md).

`for...of` expects a GameMaker array at runtime. `for...in` enumerates a struct's own variable names. Spread operands similarly need GameMaker arrays, structs, and callable scripts or methods of the appropriate kind.

Class `static` members belong to the class and are available before creating an instance:

```ts
class Counter {
  static count = 0;
  static increment(): number {
    this.count += 1;
    return this.count;
  }
}

function nextCount(): number {
  return Counter.increment();
}
```

The compiler initializes a shared class struct at the class declaration, installs methods before evaluating field initializers, and preserves field initializer order. This also works for `GMObject` classes without creating an instance or running an event. Inherited static methods receive the class used to call them as `this`; arrows capture their defining class context. Static and instance members can share a name. GML's native `static` initializes on the first function call, so TypeScript class statics require this additional lowering. Ordinary instance methods continue to use native GML constructor statics.

Use `Counter.count` or `Counter["count"]` for static member access. Dynamic static member keys, static initialization blocks, static accessors, and `super.member` remain unsupported. `GMRoom` classes still only define their room creation event. Startup initializers follow GameMaker's script initialization order; keep classes with dependent static initializers together, with parents before children.

## Rejected forms

The compiler reports a source-located diagnostic for these known unsupported forms:

- Runtime ES module imports, re-exports, default export expressions, dynamic `import()`, and `import.meta`.
- Async functions, promises as a JavaScript runtime assumption, generators, and `yield`.
- Regular expression and bigint literals.
- JavaScript `using` declarations, decorators, namespaces, and runtime enums.
- JavaScript private fields, class accessors, auto-accessors, and static initialization blocks.
- Rest parameters and destructuring parameters or assignment expressions.
- Optional calls and optional element access.
- Spread arguments in constructor calls.
- Object method/accessor shorthand and computed property names.
- Labeled statements and labeled `break` or `continue`.
- `debugger`, and `return`/`break`/`continue` from inside a `finally` block.
- Coercive `==`/`!=` comparisons; use `===`/`!==` with explicit operand conversion (`TS2GML1069`).
- Increment/decrement used as an expression value; update in a separate statement.
- Nested class declarations and unsafe constructor inheritance.
- Ordinary functions whose behavior depends on dynamic call-site `this`.
- Arrows or nested functions that capture an enclosing local, `arguments`, `super`, or `new.target`, except the special inline `gm_with` block.
- Block-scoped shadowing that would collapse into one function-scoped GML local.

Diagnostics have stable `TS2GML` codes, a source range, the source line, and a hint where a safe authoring alternative exists.

## Typed data structures and collections

All native GameMaker data-structure handles preserve their contents in the type system. `GM.Id.DsList<T>`, `GM.Id.DsGrid<T>`, `GM.Id.DsPriority<T>`, `GM.Id.DsQueue<T>`, and `GM.Id.DsStack<T>` carry one value type; `GM.Id.DsMap<K, V>` carries separate key and value types. Their create functions accept the same generic arguments, for example:

```ts
const names = ds_list_create<string>();
const scores = ds_map_create<string, number>();
```

An omitted generic defaults to `unknown`, so values read from an untyped structure must be narrowed before use. Native add, set, find, copy, and removal functions retain the handle's declared types.

The compiler also supplies JavaScript-style constructors backed by the corresponding native GameMaker implementation:

| Authoring API | Runtime storage |
| --- | --- |
| `List<T>` | DS list |
| `Map<K, V>` | DS map |
| `Set<T>` | DS list with unique values |
| `Grid<T>` | DS grid |
| `Queue<T>` | DS queue |
| `Stack<T>` | DS stack |
| `PriorityQueue<T>` | DS priority queue |

Constructors accept GameMaker arrays for initial values. Collection methods such as `get`, `set`, `add`, `remove`, `has`, `push`, `pop`, `enqueue`, and `dequeue` retain their generic types. `Map`, `Set`, and array/list iteration helpers return GameMaker arrays at runtime, so they work with the supported `for...of` and spread lowering.

These structures own native DS resources. Call `.destroy()` when a JavaScript-style collection is no longer needed, just as direct users must call the matching `ds_*_destroy` function.

Destroying a wrapper twice is harmless. Later operations that access its destroyed native storage throw a clear error; construct a new wrapper to reuse storage. Destruction is shallow: nested collections require their own cleanup. Map keys and List/Set equality follow their native DS backing, including numeric/boolean key equivalence. Map enumeration order is unspecified; Set/List retain DS list order. Direct native mutations do not update a wrapper's cached size: use either its methods or an independently owned native handle.

`delete record.property` removes a struct field. `delete values[index]` removes and shifts an array entry. `delete map[key]` and `delete set[value]` call their native-backed `remove` method. JavaScript's `map.delete(key)` and `set.delete(value)` remain valid authoring forms, but are emitted as compiler-internal removal calls so the reserved word `delete` never becomes a GML member name. Direct `ds_map_delete`/`ds_list_delete` calls remain available.

Supported JavaScript array operations with native GameMaker lowering include `.length`, `.concat()`, `.entries()`, `.includes()`, `.indexOf()`, `.join()`, `.keys()`, `.pop()`, `.push()`, `.reverse()`, `.shift()`, `.sort()`, `.unshift()`, and `.values()`.

Array `.sort()` requires an explicit comparator, such as `values.sort((left, right) => left - right)`. It is stable and accepts fractional comparison results. The current insertion-sort implementation favors predictable behavior for small gameplay arrays; use native `array_sort` explicitly when you want native ordering and performance. An omitted comparator fails at the TypeScript location (`TS2GML1051`).

Common native array functions preserve element types, including `array_create`, `array_get`, `array_set`, `array_push`, `array_pop`, `array_map`, `array_filter`, and `array_sort`. In-place mapping must retain the element type. APIs outside this targeted specialization retain the runtime specification's types.

## Values and deliberate target differences

| Construct | Contract |
| --- | --- |
| `null` / `undefined` | Distinct values. `null` uses GML `pointer_null`; native `pointer_null` and authored null are therefore equivalent. Defaults substitute only for undefined. |
| `===` / `!==` | Distinguish booleans, numbers, strings, pointers, and undefined; NaN is unequal to itself. Native GameMaker reference categories retain their target representation. |
| Native predicates | Project-aware lowering normalizes calls declared boolean in the installed runtime inventory, including numeric flags returned by native DS predicates. |
| Conditions and `!` | Zero, NaN, empty strings, null, and undefined are false; negative/fractional nonzero numbers and nonempty strings are true. |
| `&&`, `||`, `??` | Return the selected operand, evaluate the left once, and defer the right until needed. |
| Array indices | Numeric indices; absent reads yield undefined. Indexed writes can extend arrays, filling intervening slots with undefined. Native GameMaker arrays such as `alarm` retain direct native indexing and its bounds rules. |
| Array `.length` | Nonnegative integer assignment truncates or extends with undefined; authored writable `length` fields remain fields. |
| Struct indices | Dynamic keys use struct accessors. |
| Strings | Unicode text is emitted directly, including emoji and template chunks. Indexing and length use **GameMaker characters**, rather than JavaScript UTF-16 code units. No promise of grapheme-cluster indexing. |
| Numeric literals | Finite values use decimal GML spelling, including scientific, hexadecimal, binary, octal, and separator syntax in TypeScript. Overflowing literals are rejected (`TS2GML1070`). |
| `.includes()` / `.indexOf()` | Arrays use type-sensitive equality; includes also matches NaN. Default and negative offsets are supported. |
| `.join()` / templates | Default separator is a comma. Value-to-text conversion otherwise follows GameMaker; use explicit formatting for non-string game data. |
| `Math` | `round` uses ties toward positive infinity; `random` supplies its bound for direct calls and references; `min`/`max` support zero, one, and multiple arguments. Other listed intrinsics use native numerical functions and their domain behavior. |

The compiler remains a GameMaker authoring subset. Native resource references, pointer identity, DS equality, string units, numeric domain errors, and value formatting are target contracts, not a general JavaScript runtime.

## Other JavaScript APIs are not GameMaker APIs

The TypeScript standard library helps the compiler understand syntax, but unsupported JavaScript runtime objects do not exist in GML. Built-ins such as `Promise`, `Date`, `JSON`, and typed arrays are rejected unless the source declares its own binding with that name. `Map` and `Set` are compiler-provided collection intrinsics and cannot be shadowed.

JavaScript array and string instance APIs without an explicit lowering, such as `.map()` and `.substring()`, are rejected. Use GameMaker functions such as `array_map` and `string_copy` for unsupported members.

`Math` and `console` are compiler-recognized only for members with explicit GameMaker translations. An unknown member is not passed through.

## Scope differences

GML locals are function-scoped; TypeScript `let` and `const` are block-scoped. The compiler accepts block scopes only when they preserve observable binding behavior. Shadowing that would create two TypeScript variables with one emitted GML name fails.

`this.member` emits explicit `self.member`. Lexical arrows with a supported object or struct `this` capture the intended value explicitly. Top-level runtime variables emit on `global` and must be referenced through `gm_global`.

## Identifier rules

Source and generated asset names must be ASCII GameMaker identifiers no longer than 64 characters. The `__ts2gml_` prefix is reserved for compiler temporaries. Project-aware checking also rejects names that collide with GameMaker runtime functions, constants, macros, or existing assets.

Standalone `compile` does not know project symbols and is intended only for isolated scripts and ordinary constructors. Use `check` or `build` for real projects, object classes, and room classes.
