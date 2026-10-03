import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import { compileTypeScript, Ts2GmlError } from "../src/compiler/compile.js";

test("static initialization fixture agrees with JavaScript before and after construction", async () => {
  const source = await fs.readFile("TestProject/typescript/static_contract.ts", "utf8");
  let comparisons = 0;
  runInNewContext(`${ts.transpile(source, { target: ts.ScriptTarget.ESNext })}\nstaticContractRun();`, {
    scopeContextExpect: (name: string, actual: unknown, expected: unknown) => {
      comparisons++;
      assert.equal(actual, expected, name);
    },
    show_debug_message: () => {},
  });
  assert.ok(comparisons >= 10);
  const { gml } = compileTypeScript(source, "static_contract.ts");
  assert.ok(gml.indexOf("self.before =") < gml.indexOf("self.value = 20;"));
  assert.doesNotMatch(gml, /self\.(?:value|missing|before) = undefined;/);
  assert.match(gml, /variable_struct_get\(__ts2gml_class_statics\(self\.__ts2gml_class\), "missing"\)/);
});

test("native static fields erase only their factory and retain instance access", () => {
  const { javascript, gml } = compileTypeScript(`
class Native {
  seed = 4;
  value = gm_static<number>(() => 4);
  data = gm_static(() => ({ count: 0 }));
  list = gm_static(() => [1, 2]);
  static value = 100;
  read() { return this.value; }
  increment() { this.value += 1; }
}
`, "native-static.ts");
  assert.match(javascript, /gm_static\(\(\) => 4\)/);
  assert.match(gml, /static value = 4;/);
  assert.match(gml, /static data = \(?\{ count: 0 \}/);
  assert.match(gml, /static list = \[1, 2\];/);
  assert.match(gml, /return self.value;/);
  assert.match(gml, /self.value \+= 1;/);
  assert.match(gml, /self.value = 100;/);
  assert.doesNotMatch(gml, /gm_static|=>|static value = (?:method|function)/);
});

test("static field reads are safe while calls, assignment, updates, and aliases keep their receiver", () => {
  const { gml } = compileTypeScript(`
class State {
  static count = 1;
  static read() { return this.count; }
}
function use() {
  const Alias = State;
  State.count = 2;
  State["count"] += 3;
  ++State.count;
  State["count"]--;
  return [State.count, Alias["count"], State.read(), Alias["read"]()];
}
`);
  assert.match(gml, /__ts2gml_class_statics\(State\)\.count = 2;/);
  assert.match(gml, /__ts2gml_class_statics\(State\)\.count \+= 3;/);
  assert.match(gml, /__ts2gml_class_statics\(State\)\.count \+= 1;/);
  assert.match(gml, /__ts2gml_class_statics\(State\)\.count -= 1;/);
  assert.match(gml, /variable_struct_get\(__ts2gml_class_statics\(State\), "count"\)/);
  assert.match(gml, /variable_struct_get\(__ts2gml_class_statics\(Alias\), "count"\)/);
  assert.match(gml, /__ts2gml_class_statics\(Alias\)\.read\(\)/);
});

test("unsupported native static forms have source-located diagnostics", () => {
  for (const source of [
    "const value = gm_static(() => 1);",
    "function use() { return gm_static(() => 1); }",
    "const alias = gm_static;",
    "class State { static value = gm_static(() => 1); }",
    "class State { value = gm_static(1); }",
    "class State { value = gm_static(() => 1, () => 2); }",
    "class State { value = gm_static((seed) => seed); }",
    "class State { value = gm_static(() => { return 1; }); }",
    "class State { value = gm_static(() => () => 1); }",
    "class State { value = gm_static(() => ({ callback: function() {} })); }",
    "class State { value = gm_static(factory); }",
    "class State { seed = 4; value = gm_static(() => this.seed); }",
    "class State { value = gm_static(() => gm_self()); }",
    "class State { value = gm_static(() => other); }",
  ]) {
    assert.throws(() => compileTypeScript(source, "native-static-invalid.ts"),
      (error: unknown) => error instanceof Ts2GmlError && error.diagnostics.some((diagnostic) =>
        diagnostic.code === "TS2GML1071" && diagnostic.fileName === "native-static-invalid.ts" &&
        diagnostic.line > 0 && diagnostic.column > 0));
  }
  assert.throws(() => compileTypeScript("function use(gm_static) {}"),
    (error: unknown) => error instanceof Ts2GmlError && error.diagnostics.some((item) => item.code === "TS2GML1056"));
});
