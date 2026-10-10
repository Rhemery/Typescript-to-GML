import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import { compileTypeScript, Ts2GmlError } from "../src/compiler/compile.js";

const execFileAsync = promisify(execFile);

for (const [name, source, expected] of [
  ["false-branch chain", `function amount(kind, v) {
    const amount = kind === "health" ? v.drop_health
      : kind === "energy" ? v.drop_energy
      : kind === "experience" ? v.drop_experience : v.drop_coins;
    return amount;
  }`, `var amount = (__ts2gml_value_equal_string(kind, "health") ? v.drop_health
    : (__ts2gml_value_equal_string(kind, "energy") ? v.drop_energy
    : (__ts2gml_value_equal_string(kind, "experience") ? v.drop_experience : v.drop_coins)));`],
  ["true branch", "function choose(a, b, c, d, e) { return a ? b ? c : d : e; }",
    "return (__ts2gml_value_truthy(a) ? (__ts2gml_value_truthy(b) ? c : d) : e);"],
  ["condition", "function choose(a, b, c, d, e) { return (a ? b : c) ? d : e; }",
    "return ((__ts2gml_value_truthy((__ts2gml_value_truthy(a) ? b : c))) ? d : e);"],
] as const) {
  test(`explicitly groups conditional expressions in the ${name}`, () => {
    const { gml } = compileTypeScript(source, "conditional.ts");
    assert.ok(gml.replace(/\s+/g, " ").includes(expected.replace(/\s+/g, " ")), gml);
  });
}

test("the GameMaker semantic fixture also satisfies the JavaScript contract", async () => {
  const source = await fs.readFile("TestProject/typescript/semantic_contract.ts", "utf8");
  let comparisons = 0;
  let conditionalComparisons = 0;
  runInNewContext(`${ts.transpile(source)}\nsemanticContractRun();`, {
    all: 0,
    instance_exists: () => true,
    is_bool: (value: unknown) => typeof value === "boolean",
    scopeContextExpect: (name: string, actual: unknown, expected: unknown) => {
      comparisons++;
      if (name.startsWith("conditional ")) conditionalComparisons++;
      assert.equal(actual, expected, name);
    },
  });
  assert.ok(comparisons >= 30);
  assert.equal(conditionalComparisons, 48);
  const { gml } = compileTypeScript(source, "semantic_contract.ts");
  assert.match(gml, /"😀"/u);
  assert.doesNotMatch(gml, /\\uD83D|\\uDE00/);
  assert.doesNotMatch(gml, /\b1e\+?100\b/);
  assert.match(gml, /__ts2gml_value_set_length\(values, 2\)/);
  assert.match(gml, /return worker\.map|worker\.map\(2\)/);
});

test("requires a comparator for arrays while allowing authored sort methods", () => {
  assert.throws(() => compileTypeScript("function sort(values: number[]) { values.sort(); }"),
    (error: unknown) => error instanceof Ts2GmlError && /explicit comparator/.test(error.message));
  assert.doesNotThrow(() => compileTypeScript("class Sorter { sort() { return 1; } } function run(value: Sorter) { return value.sort(); }"));
  assert.throws(() => compileTypeScript("function compare(value: number | string) { return value == 1; }"),
    (error: unknown) => error instanceof Ts2GmlError && error.diagnostics[0]?.code === "TS2GML1069");
});

test("post-erasure diagnostics and generated mappings refer to the original TypeScript", () => {
  const source = "interface Erased {\n  value: number;\n}\n\nexport function mapped(value: number) {\n  return value + 1;\n}\n";
  const result = compileTypeScript(source, path.resolve("mapped.ts"));
  assert.doesNotMatch(result.gml, /export|@ts2gml-source|sourceMappingURL/);
  const returned = result.sourceMap.mappings.find((mapping) => mapping.line === 6);
  assert.ok(returned);
  assert.match(result.gml.split("\n")[returned.generatedLine - 1]!, /return value \+ 1/);
  assert.equal(returned.source, "mapped.ts");
  assert.throws(() => compileTypeScript("interface Erased { value: number; }\n\nfunction bad() {\n return /regex/;\n}\n"),
    (error: unknown) => error instanceof Ts2GmlError && error.diagnostics.some((item) => item.line === 4 && item.sourceLine?.includes("/regex/")));
});

test("standalone CLI never replaces its input, including linked and differently cased paths", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ts2gml-cli-input-"));
  const input = path.join(directory, "source.JS");
  const source = "function answer() { const value = 42; return value; }\n";
  await fs.writeFile(input, source);
  const cli = path.resolve("dist/src/cli.js");
  try {
    await execFileAsync(process.execPath, [cli, "compile", input]);
    assert.equal(await fs.readFile(input, "utf8"), source);
    assert.match(await fs.readFile(path.join(directory, "source.gml"), "utf8"), /var value/);
    const link = path.join(directory, "linked.gml");
    await fs.link(input, link);
    const outputs = [input, path.join(directory, ".", "source.JS"), link];
    if (process.platform === "win32") outputs.push(input.toLowerCase());
    for (const output of outputs) {
      await assert.rejects(execFileAsync(process.execPath, [cli, "compile", input, "--out", output]),
        /different file|link to the source/);
      assert.equal(await fs.readFile(input, "utf8"), source);
    }
    const invalid = path.join(directory, "source.txt");
    await fs.writeFile(invalid, source);
    await assert.rejects(execFileAsync(process.execPath, [cli, "compile", invalid]), /input file/);
    assert.equal(await fs.readFile(invalid, "utf8"), source);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});


test("typed reference and string conditions use native predicates with one evaluation", () => {
  const { gml } = compileTypeScript(`
    interface Actor { health: number; }
    declare function acquire(): Actor | undefined;
    function run(actor: Actor | undefined, label: string, mode: "idle" | "attack") {
      if (acquire()) return 1;
      if (actor && actor.health > 0) return 2;
      if (label) return 3;
      if (mode === "idle") return 4;
      return actor || acquire();
    }
  `);
  assert.match(gml, /!is_undefined\(acquire\(\)\)/);
  assert.match(gml, /!is_undefined\(actor\) && actor.health > 0/);
  assert.match(gml, /string_length\(label\) != 0/);
  assert.match(gml, /mode == "idle"/);
  // Value-returning || still preserves lazy evaluation and operand identity.
  assert.match(gml, /__ts2gml_value_truthy\(__ts2gml_logical_/);
  const nullable = compileTypeScript("function run(actor: object | null | undefined, v: unknown) { return actor ? v ? 1 : 2 : 3; }").gml;
  assert.match(nullable, /__ts2gml_value_truthy\(actor\)/);
  assert.match(nullable, /__ts2gml_value_truthy\(v\)/);
});

test("value runtime emission keeps transitive dependencies and omits unused helpers", async () => {
  const { createValueRuntimeGml } = await import("../src/compiler/values.js");
  const gml = createValueRuntimeGml("__ts2gml_value_or(a, b)");
  assert.match(gml, /function __ts2gml_value_or/);
  assert.match(gml, /function __ts2gml_value_truthy/);
  assert.match(gml, /function __ts2gml_value_nullish/);
  assert.doesNotMatch(gml, /function __ts2gml_value_equal|function __ts2gml_value_get/);
  const typed = compileTypeScript("function run(value: boolean, mode: 'a' | 'b') { if (value) return mode === 'a'; return false; }").gml;
  assert.doesNotMatch(typed, /__ts2gml_value_|__ts2gml_native_/);
  const dynamic = compileTypeScript("function run(v: unknown) { return v === 2; }").gml;
  assert.match(dynamic, /function __ts2gml_value_equal_number/);
  assert.doesNotMatch(dynamic, /function __ts2gml_value_truthy|function __ts2gml_value_get/);
});


test("disabled strict null checking cannot prove native conditions or equality", async () => {
  const { collectNativeAccessPlan } = await import("../src/compiler/access.js");
  const input = ts.createSourceFile("nullable.ts", "function run(v: object | null, n: number | null) { if (v) return n === 0; return false; }", ts.ScriptTarget.ESNext, true);
  const options: ts.CompilerOptions = { strictNullChecks: false, noResolve: true, types: [] };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = name => name === "nullable.ts" ? input : undefined;
  const program = ts.createProgram(["nullable.ts"], options, host);
  const plan = collectNativeAccessPlan(input, program.getTypeChecker(), false);
  assert.equal(plan.booleanConditions.size, 0);
  assert.equal(plan.typedConditions.size, 0);
  assert.equal(plan.primitiveComparisons.size, 0);
});


test("typed string dictionaries use native reads while preserving missing keys and call binding", () => {
  const { gml } = compileTypeScript("function read(values: Record<string, number>, key: string) { return values[key]; }");
  assert.match(gml, /variable_struct_get\(values, key\)/);
  assert.doesNotMatch(gml, /__ts2gml_value_get|__ts2gml_native_/);
  const context = { variable_struct_get: (values: Record<string, unknown>, key: string) => values[key] };
  runInNewContext(gml, context);
  const read = (context as unknown as { read(values: Record<string, number>, key: string): number | undefined }).read;
  assert.equal(read({ ready: 7 }, "ready"), 7);
  assert.equal(read({}, "missing"), undefined);
  const dynamic = compileTypeScript("function read(values, key: string) { return values[key]; }").gml;
  assert.match(dynamic, /__ts2gml_value_get/);
  const calls = compileTypeScript("function run(values: Record<string, () => number>, key: string) { return values[key](); }").gml;
  assert.match(calls, /__ts2gml_value_get/);
  const globals = compileTypeScript("interface GMGlobal { [key: string]: unknown; } function read(values: GMGlobal, key: string) { return values[key]; }").gml;
  assert.match(globals, /__ts2gml_value_get\(values, key\)/);
  const writes = compileTypeScript("function run(values: Record<string, number>, key: string) { values[key] = 1; return values[key]; }").gml;
  assert.match(writes, /__ts2gml_value_set\(values, key, 1\)/);
  assert.match(writes, /variable_struct_get\(values, key\)/);
});
