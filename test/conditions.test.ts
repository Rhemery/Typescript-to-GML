import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { compileTypeScript } from "../src/compiler/compile.js";
import { valueRuntimeGml, usesValueRuntime } from "../src/compiler/values.js";

const primitives = {
  pointer_null: null,
  is_bool: (value: unknown) => typeof value === "boolean",
  is_numeric: (value: unknown) => typeof value === "number" || typeof value === "boolean",
  is_nan: Number.isNaN,
  is_string: (value: unknown) => typeof value === "string",
  is_undefined: (value: unknown) => value === undefined,
  is_ptr: (value: unknown) => value === null,
  is_callable: (value: unknown) => typeof value === "function",
  string_length: (value: string) => value.length,
};

test("boolean contexts preserve short-circuit order without allocating closures", () => {
  const source = `function choose(a, b, c) {
    if (a() && (b() || c())) return 1;
    return 0;
  }
  function negate(a, b) { return !(a() && b()); }
  function loop(read) {
    let count = 0;
    while (count < 3 && read()) count++;
    for (let i = 0; i < 3 && read(); i++) count++;
    do { count++; } while (count < 10 && read());
    return count;
  }
  function compare(a, b) { return a > 0 && b <= 5; }
  function pick(a, b) { return (a() || b()) ? 2 : 3; }`;
  const { gml } = compileTypeScript(source);
  assert.doesNotMatch(gml, /__ts2gml_logical|function\s*\(/);
  assert.match(gml, /return a > 0 && b <= 5;/);
  assert.doesNotMatch(gml, /__ts2gml_value_truthy\(count <|__ts2gml_value_truthy\(i </);
  const context = { ...primitives };
  runInNewContext(gml, context);
  // This emitted subset is valid in JS as well as GML; native integration also
  // exercises GML's short-circuit operators and primitive type predicates.
  const functions = context as unknown as {
    choose(a: () => unknown, b: () => unknown, c: () => unknown): number;
    negate(a: () => unknown, b: () => unknown): boolean;
    pick(a: () => unknown, b: () => unknown): number;
    loop(read: () => unknown): number;
  };
  for (const a of [false, 0, -0, NaN, "", null, undefined, -1, 0.1, "a", [], {}]) {
    for (const b of [false, -2, "", "b"]) {
      const calls: string[] = [];
      const left = () => { calls.push("a"); return a; };
      const middle = () => { calls.push("b"); return b; };
      const right = () => { calls.push("c"); return true; };
      assert.equal(functions.choose(left, middle, right), a && (b || true) ? 1 : 0);
      assert.deepEqual(calls, a ? b ? ["a", "b"] : ["a", "b", "c"] : ["a"]);
      calls.length = 0;
      assert.equal(functions.negate(left, middle), !(a && b));
      assert.deepEqual(calls, a ? ["a", "b"] : ["a"]);
      calls.length = 0;
      assert.equal(functions.pick(left, middle), a || b ? 2 : 3);
      assert.deepEqual(calls, a ? ["a"] : ["a", "b"]);
    }
  }
  let reads = 0;
  assert.equal(functions.loop(() => { reads++; return -1; }), 10);
  assert.equal(reads, 9);
});

test("value contexts still return logical operands and typeof uses a shared helper", () => {
  const { gml } = compileTypeScript(`function fallback(a, b) { return a || b; }
    function both(a, b) { return a && b; }
    function missing(a, b) { return a ?? b; }
    function kind(read) { return typeof read(); }`);
  assert.match(gml, /__ts2gml_logical/);
  assert.match(gml, /return __ts2gml_value_typeof\(read\(\)\);/);
  assert.doesNotMatch(gml, /__ts2gml_typeof_value/);
  assert.ok(usesValueRuntime(gml));
  const context = { ...primitives };
  runInNewContext(gml, context);
  const functions = context as unknown as {
    fallback(a: unknown, b: unknown): unknown;
    both(a: unknown, b: unknown): unknown;
    missing(a: unknown, b: unknown): unknown;
    kind(read: () => unknown): string;
  };
  for (const value of [false, 0, -0, NaN, "", null, undefined, -1, "a", [], {}, () => 1]) {
    assert.equal(functions.fallback(value, "fallback"), value || "fallback");
    assert.equal(functions.both(value, "right"), value && "right");
    assert.equal(functions.missing(value, "missing"), value ?? "missing");
    let reads = 0;
    assert.equal(functions.kind(() => { reads++; return value; }), typeof value);
    assert.equal(reads, 1);
  }
  assert.match(valueRuntimeGml, /function __ts2gml_value_typeof\(_value\)/);
});

test("primitive runtime fast paths preserve strict equality and truthiness", () => {
  const context = { ...primitives };
  runInNewContext(valueRuntimeGml, context);
  const runtime = context as unknown as {
    __ts2gml_value_equal(a: unknown, b: unknown): boolean;
    __ts2gml_value_truthy(value: unknown): boolean;
    __ts2gml_value_typeof(value: unknown): string;
  };
  const values = [false, true, 0, -0, 1, -1, 0.1, NaN, Infinity, -Infinity, "", "1", null, undefined, [], [], {}, {}, () => 1];
  for (const left of values) {
    assert.equal(runtime.__ts2gml_value_truthy(left), Boolean(left));
    assert.equal(runtime.__ts2gml_value_typeof(left), typeof left);
    for (const right of values) assert.equal(runtime.__ts2gml_value_equal(left, right), left === right);
  }
});

test("object spread and rest share their copy implementation without a local function", () => {
  const { gml } = compileTypeScript(`function combine(left, right) { return { ...left, ...right, final: 7 }; }
    function remaining(source) { const { skip, ...rest } = source; return rest; }`);
  assert.doesNotMatch(gml, /function\s*\(/);
  assert.match(gml, /__ts2gml_value_copy\(\[left, right,/);
  const context = { ...primitives, array_length: (array: unknown[]) => array.length,
    array_contains: (array: unknown[], item: unknown) => array.includes(item),
    variable_struct_get_names: Object.keys,
    variable_struct_get: (object: Record<string, unknown>, key: string) => object[key],
    variable_struct_set: (object: Record<string, unknown>, key: string, value: unknown) => { object[key] = value; } };
  runInNewContext(gml, context);
  const functions = context as unknown as {
    combine(left: unknown, right: unknown): Record<string, unknown>;
    remaining(source: unknown): Record<string, unknown>;
  };
  const left = { a: 1, shared: 2, child: {} };
  const right = { b: 3, shared: 4 };
  const combined = functions.combine(left, right);
  assert.deepEqual({ ...combined }, { ...left, ...right, final: 7 });
  assert.notEqual(combined, left);
  assert.equal(combined.child, left.child);
  assert.deepEqual({ ...functions.combine(null, undefined) }, { final: 7 });
  assert.deepEqual({ ...functions.remaining({ skip: 1, keep: 2 }) }, { keep: 2 });
});

test("literal equality checks one operand without coercion or duplicate evaluation", () => {
  const literals = ["0", "-1", '"1"', "true", "false"];
  const values = [false, true, 0, -0, 1, -1, NaN, Infinity, "", "1", null, undefined, [], {}];
  for (const literal of literals) {
    const { gml } = compileTypeScript(`function right(read) { return read() === ${literal}; }
      function left(read) { return ${literal} === read(); }
      function different(read) { return read() !== ${literal}; }`);
    const context = { ...primitives };
    runInNewContext(gml, context);
    const functions = context as unknown as {
      right(read: () => unknown): boolean;
      left(read: () => unknown): boolean;
      different(read: () => unknown): boolean;
    };
    const expected = runInNewContext(literal) as unknown;
    for (const value of values) {
      let reads = 0;
      const read = () => { reads++; return value; };
      assert.equal(functions.right(read), value === expected);
      assert.equal(functions.left(read), value === expected);
      assert.equal(functions.different(read), value !== expected);
      assert.equal(reads, 3);
    }
  }
});

test("primitive logical fallbacks avoid closures while effectful fallbacks stay lazy", () => {
  const { gml } = compileTypeScript(`function defaulted(read) { return read() ?? -1; }
    function alternate(read) { return read() || "fallback"; }
    function selected(read) { return read() && null; }`);
  assert.doesNotMatch(gml, /function\s*\(/);
  const context = { ...primitives };
  runInNewContext(gml, context);
  const functions = context as unknown as {
    defaulted(read: () => unknown): unknown;
    alternate(read: () => unknown): unknown;
    selected(read: () => unknown): unknown;
  };
  for (const value of [false, 0, -0, -1, NaN, "", "a", null, undefined, [], {}]) {
    let calls = 0;
    const read = () => { calls++; return value; };
    assert.equal(functions.defaulted(read), value ?? -1);
    assert.equal(functions.alternate(read), value || "fallback");
    assert.equal(functions.selected(read), value && null);
    assert.equal(calls, 3);
  }
  for (const fallback of ['write()', 'read()[0]', '{ fresh: true }', '[]']) {
    const { gml: lazy } = compileTypeScript('function lazy(read, write) { return read() ?? ' + fallback + '; }');
    assert.match(lazy, /__ts2gml_logical/);
  }
});

test("typed boolean conditions and same-kind primitive comparisons need no runtime helpers", () => {
  const { gml } = compileTypeScript(`function choose(enabled: boolean, left: number, right: number, mode: string) {
    if (enabled && left === right && mode !== "idle") return 1;
    return 0;
  }
  function both(left: boolean, right: boolean) { return left && right; }
  function either(left: boolean, right: boolean) { return left || right; }
  function negate(value: boolean) { return !value; }
  function equal(left: number, right: number) { return left === right; }
  function different(left: number, right: number) { return left !== right; }
  function loop(enabled: boolean) {
    let count = 0;
    while (enabled && count < 2) count++;
    for (let index = 0; enabled && index < 2; index++) count++;
    do { count++; } while (!enabled && count < 1);
    return enabled ? count : 0;
  }`);
  assert.doesNotMatch(gml, /__ts2gml_(?:guard|value|native)_|function\s*\(/);
  assert.match(gml, /enabled && left == right && !\(mode == "idle"\)/);
  const context: Record<string, any> = {};
  runInNewContext(gml, context);
  for (const enabled of [false, true]) {
    for (const left of [0, -0, -1, NaN, Infinity, -Infinity]) {
      for (const right of [0, -1, NaN, Infinity]) {
        assert.equal(context.choose(enabled, left, right, "active"), enabled && left === right ? 1 : 0);
        assert.equal(context.choose(enabled, left, right, "idle"), 0);
        assert.equal(context.equal(left, right), left === right);
        assert.equal(context.different(left, right), left !== right);
      }
    }
    assert.equal(context.negate(enabled), !enabled);
    assert.equal(context.loop(enabled), enabled ? 5 : 0);
    for (const right of [false, true]) {
      assert.equal(context.both(enabled, right), enabled && right);
      assert.equal(context.either(enabled, right), enabled || right);
    }
  }
});

test("mixed and nullable primitive types keep strict equality and nonboolean truthiness", () => {
  const { gml } = compileTypeScript(`function equal(value: number | boolean) { return value === 1; }
    function present(value: boolean | undefined) { return value ? 1 : 0; }
    function numeric(value: number) { return value ? 1 : 0; }`);
  assert.match(gml, /__ts2gml_value_equal_number/);
  assert.match(gml, /__ts2gml_value_truthy\(value\)/);
  const context: Record<string, any> = { ...primitives };
  runInNewContext(gml, context);
  assert.equal(context.equal(true), false);
  assert.equal(context.equal(1), true);
  assert.equal(context.present(undefined), 0);
  assert.equal(context.present(false), 0);
  assert.equal(context.present(true), 1);
  for (const value of [-1, 0.1, 0, NaN]) assert.equal(context.numeric(value), value ? 1 : 0);
});
