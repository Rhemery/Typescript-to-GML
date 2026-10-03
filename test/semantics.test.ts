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
  }`, `var amount = (__ts2gml_value_truthy(__ts2gml_value_equal(kind, "health")) ? v.drop_health
    : (__ts2gml_value_truthy(__ts2gml_value_equal(kind, "energy")) ? v.drop_energy
    : (__ts2gml_value_truthy(__ts2gml_value_equal(kind, "experience")) ? v.drop_experience : v.drop_coins)));`],
  ["true branch", "function choose(a, b, c, d, e) { return a ? b ? c : d : e; }",
    "return (__ts2gml_value_truthy(a) ? (__ts2gml_value_truthy(b) ? c : d) : e);"],
  ["condition", "function choose(a, b, c, d, e) { return (a ? b : c) ? d : e; }",
    "return (__ts2gml_value_truthy(((__ts2gml_value_truthy(a) ? b : c))) ? d : e);"],
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
