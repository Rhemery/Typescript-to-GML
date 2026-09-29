import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import { compileTypeScript, Ts2GmlError } from "../src/compiler/compile.js";

test("closure runtime matrix also satisfies the JavaScript contract", async (context) => {
  const source = await fs.readFile("TestProject/typescript/closure_contract.ts", "utf8");
  const labels = new Set<string>();
  runInNewContext(`${ts.transpile(source)}\nclosureContractRun();`, {
    scopeContextExpect: (label: string, actual: unknown, expected: unknown) => {
      assert.ok(!labels.has(label), `Duplicate closure assertion: ${label}`);
      labels.add(label);
      assert.equal(actual, expected, label);
    },
  });
  assert.ok(labels.size >= 50, `Only ${labels.size} closure comparisons ran`);
  context.diagnostic(`Compared ${labels.size} distinct closure assertions against JavaScript.`);
  const result = compileTypeScript(source, "closure_contract.ts");
  assert.match(result.gml, /function closureContractDeep/);
  assert.doesNotMatch(result.gml, /=>/);
  assert.ok(result.sourceMap.mappings.length > 50);
  assert.equal(compileTypeScript(source, "closure_contract.ts").gml, result.gml);
});

for (const depth of [1, 8, 32, 64]) {
  for (const form of ["arrows", "functions", "mixed"] as const) {
    test(`compiles ${depth} nested ${form} with captures across every scope`, () => {
      let expression = `() => seed + ${Array.from({ length: depth }, (_, index) => `level${index}`).join(" + ")}`;
      for (let index = depth - 1; index >= 0; index--) {
        expression = form === "functions" || (form === "mixed" && index % 2 === 0)
          ? `function (level${index}: number) { return ${expression}; }`
          : `(level${index}: number) => ${expression}`;
      }
      const source = `function deep(seed: number) { return ${expression}; }`;
      const calls = Array.from({ length: depth }, (_, index) => `(${index + 1})`).join("");
      assert.equal(runInNewContext(`${ts.transpile(source)}\ndeep(100)${calls}();`),
        100 + depth * (depth + 1) / 2);
      const result = compileTypeScript(source, `deep-${form}-${depth}.ts`);
      assert.equal((result.gml.match(/return method\(/g) ?? []).length, depth + 1);
      assert.doesNotMatch(result.gml, /with \(|__ts2gml_receiver/);
      assert.equal(compileTypeScript(source, `deep-${form}-${depth}.ts`).gml, result.gml);
    });
  }
}

const rejected = [
  ["for let", "function factory() { for (let value = 0; value < 2; value++) { use(() => () => value); } }"],
  ["for const of", "function factory() { for (const value of [1, 2]) { use(() => () => value); } }"],
  ["for in", "function factory() { for (const key in values) { use(() => () => key); } }"],
  ["while block", "function factory() { while (ready()) { const value = 1; use(() => () => value); } }"],
  ["catch", "function factory() { try { run(); } catch (error) { return () => () => error; } }"],
  ["switch block", "function factory() { switch (kind) { case 1: const value = 1; return () => () => value; } }"],
  ["destructure array", "function factory() { const [value] = values; return () => () => value; }"],
  ["destructure object", "function factory() { const { value } = item; return () => () => value; }"],
  ["parameter initializer", "function factory(value, read = () => () => value) { return read; }"],
  ["nested parameter initializer", "function factory(value) { return () => (read = () => value) => read; }"],
  ["super argument", "class Base {} class Child extends Base { constructor(value) { super(() => () => value); } }"],
  ["native other", "function factory(value) { return () => () => value + gm_other().value; }"],
  ["native raw other", "function factory(value) { return () => () => value + other.value; }"],
  ["collision parameter", "class Owner { onCollision_target(other) { this.read = () => () => other.value; } }"],
  ["local function binding", "function factory(value) { function read() { return value; } return () => () => read(); }"],
  ["function before declaration", "function factory(value) { use(read); function read() { return value; } }"],
  ["redeclared variable", "function factory() { var value = 1; var value; return () => () => value; }"],
  ["context default", "class Owner { factory(value) { return () => (amount = this.value) => value + amount; } }"],
] as const;

for (const [name, source] of rejected) {
  test(`rejects deep unsupported closure boundary: ${name}`, () => {
    assert.throws(() => compileTypeScript(`interface Erased {}\n\n${source}`, "closure-boundary.ts"),
      (error: unknown) => error instanceof Ts2GmlError && error.diagnostics.some((item) =>
        item.code === "TS2GML1014" && item.fileName === "closure-boundary.ts" && item.line === 3 &&
        Boolean(item.sourceLine?.includes(source)) && item.column > 0));
  });
}

test("keeps lexical this through a factory whose only this use is in a captured descendant", () => {
  const source = `class Owner {
    value = 10;
    factories() { return { create: (amount: number) => () => () => this.value + amount }; }
  }`;
  const { gml } = compileTypeScript(source, "nested-lexical-this.ts");
  assert.match(gml, /create: method\(self, function \(__ts2gml_capture_1_parameter\)/);
  assert.match(gml, /method_get_self\(function/);
});

test("keeps lexical this diagnostics at ordinary-function boundaries deep inside arrows", () => {
  const arrows = "() => ".repeat(12);
  assert.throws(() => compileTypeScript(`class Owner { value = 1; make(amount) {
    return ${arrows}function () { return () => this.value + amount; };
  } }`, "deep-dynamic-this.ts"), (error: unknown) =>
    error instanceof Ts2GmlError && error.diagnostics.some((item) => item.code === "TS2GML1018"));
});

test("keeps generated GML self distinct from captured parameters named self and other", () => {
  const { gml } = compileTypeScript(`class Owner {
    value = 10;
    make(self: number, other: number) { return () => this.value + self + other; }
  }`, "context-parameter-names.ts");
  assert.match(gml, /function\(__ts2gml_capture_1_parameter, __ts2gml_capture_2_parameter\)/);
  assert.match(gml, /__ts2gml_capture_1: __ts2gml_capture_1_parameter/);
  assert.match(gml, /__ts2gml_capture_2: __ts2gml_capture_2_parameter/);
  assert.match(gml, /var __ts2gml_env_\d+ = self\.__ts2gml_env_\d+/);
  assert.doesNotMatch(gml, /_self\.__ts2gml/);
});

test("uses binding-preserving dynamic calls for returned, indexed, and spread callbacks", () => {
  const { gml } = compileTypeScript(`function run(factory: () => () => number, callbacks: Array<() => number>) {
    const packet = { read: factory() };
    const args: [] = [];
    return factory()() + callbacks[0]!() + packet.read(...args);
  }`, "callback-calls.ts");
  assert.doesNotMatch(gml, /factory\(\)\(\)|__ts2gml_value_get\(callbacks, 0\)\(\)/);
  assert.match(gml, /method_call\(__ts2gml_callable, __ts2gml_arguments\)/);
  assert.match(gml, /var __ts2gml_method = __ts2gml_receiver\.read/);
  assert.match(gml, /is_method\(__ts2gml_method\) && !is_undefined\(method_get_self\(__ts2gml_method\)\)/);
});

test("rejects expression-level local writes in indirect callback arguments", () => {
  for (const [call, code] of [
    ["callback(...[value++])", "TS2GML1055"],
    ["callbacks[0](value += 1)", "TS2GML1047"],
  ]) {
    assert.throws(() => compileTypeScript(`function run(callback, callbacks) {
      let value = 0;
      return ${call};
    }`, "argument-write.ts"), (error: unknown) => error instanceof Ts2GmlError &&
      error.diagnostics.some((item) => item.code === code && item.fileName === "argument-write.ts" && item.line === 3));
  }
});

test("compiles the projectile callback capturing its weapon across gm_with", async () => {
  const source = await fs.readFile("TestProject/typescript/gameplay/obj_test_player.ts", "utf8");
  // Compile the same method body as a normal constructor; object asset emission
  // and the actual source file are also exercised by the integration build.
  const { gml } = compileTypeScript(source.replace("extends GMObject", ""), "weapon-capture.ts");
  assert.match(gml, /with \(instance_create_depth/);
  assert.match(gml, /(__ts2gml_capture_\d+): \1_parameter/);
  assert.match(gml, /x \+= lengthdir_x\(__ts2gml_env_\d+\.__ts2gml_capture_\d+\.projectile_speed/);
  assert.match(gml, /\? other : self\.__ts2gml_receiver\)/);
});

for (const depth of [1, 3, 8]) {
  test(`captures across ${depth} inline with scopes and nested runtime functions`, () => {
    let body = "selected0.read = () => () => amount + selected0.value;";
    for (let index = depth - 1; index >= 0; index--) {
      body = `gm_with(target, selected${index} => { ${body} });`;
    }
    const { gml } = compileTypeScript(`function setup(amount) { return () => { ${body} }; }`, "nested-with-capture.ts");
    assert.equal((gml.match(/with \(target\)/g) ?? []).length, depth);
    assert.match(gml, /(__ts2gml_capture_\d+): \1_parameter/);
    assert.match(gml, /__ts2gml_capture_\d+: __ts2gml_with_self_/);
  });
}

for (const expression of [
  "method(target, callback)",
  "method(target, function () { x += amount; return x; })",
  "method(target, () => { x += amount; return x; })",
  "method(target, method(otherTarget, callback))",
  "method(undefined, callback)",
  "method(...([target, callback] as [any, () => number]))",
]) {
  test(`preserves closure storage when binding ${expression}`, () => {
    const source = `function make(target, otherTarget, amount) {
      const callback = function () { x += amount; return x; };
      return ${expression};
    }`;
    const { gml } = compileTypeScript(source, "method-capture.ts");
    assert.match(gml, /__ts2gml_closure: true/);
    assert.match(gml, /function __ts2gml_value_method\(/);
    assert.match(gml, /__ts2gml_value_method(?:\(|;)/);
    assert.doesNotMatch(gml, /return method\((?:target|undefined|otherTarget),/);
    assert.match(gml, /\? other : self\.__ts2gml_receiver\)/);
  });
}

test("adapts aliases of native method without rewriting authored member names", () => {
  const { gml } = compileTypeScript(`function setup(target, callback) {
    const bind = method;
    const helpers = { bind: method, method: callback };
    return bind(target, helpers.method);
  }`, "method-alias.ts");
  assert.match(gml, /var bind = __ts2gml_value_method;/);
  assert.match(gml, /bind: __ts2gml_value_method, method: callback/);
  assert.match(gml, /function __ts2gml_value_method\(/);
});

