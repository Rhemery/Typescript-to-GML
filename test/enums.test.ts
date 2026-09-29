import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import { compileTypeScript, toJavaScript, Ts2GmlError } from "../src/compiler/compile.js";

test("enum runtime fixture satisfies the JavaScript contract and compiles deterministically", async () => {
  const source = await fs.readFile("TestProject/typescript/enum_contract.ts", "utf8");
  let comparisons = 0;
  runInNewContext(`${ts.transpile(source)}\nenumContractRun();`, {
    scopeContextExpect: (label: string, actual: unknown, expected: unknown) => {
      comparisons++;
      assert.equal(actual, expected, label);
    },
  });
  assert.ok(comparisons >= 30);
  const result = compileTypeScript(source, "enum_contract.ts");
  assert.match(result.gml, /#macro EnumNumeric variable_global_get\("__ts2gml_enum_EnumNumeric"\)/);
  assert.match(result.gml, /__ts2gml_value_set\(EnumNumeric, __ts2gml_value_set\(EnumNumeric, "Active", 4\), "Active"\)/);
  assert.match(result.gml, /__ts2gml_value_set\(EnumText, "Alias", "active"\)/);
  assert.equal(result.gml.match(/#macro EnumMerged /g)?.length, 1);
  assert.equal(result.gml.match(/variable_global_set\("__ts2gml_enum_EnumMerged",/g)?.length, 1);
  assert.doesNotMatch(result.gml, /\benum\s+Enum|\bconst\s+\w+\s*=|=>|\(function \(Enum/);
  assert.ok(result.sourceMap.mappings.some((mapping) => mapping.line === 3));
  assert.deepEqual(compileTypeScript(source, "enum_contract.ts"), result);
});

test("enum erasure supports exports, const enums, ambient enums, and compiler-only JavaScript output", () => {
  const source = `declare enum NativeMode { Ready }
export enum Mode { Idle, Active = 4 }
export const enum Flags { First = 1, Second = First << 1 }
interface EnumField { mode: Mode.Active }
export function current() { return Mode.Active + Flags.Second + NativeMode.Ready; }`;
  const { gml, javascript } = compileTypeScript(source, "exported-enums.ts");
  assert.match(gml, /#macro Mode /);
  assert.match(gml, /#macro Flags /);
  assert.match(gml, /NativeMode\.Ready/);
  assert.doesNotMatch(gml, /#macro NativeMode|\bexport\b/);
  assert.equal(toJavaScript(source, "exported-enums.ts"), javascript);
});

test("enum computed members preserve references and evaluate initializers once", () => {
  const { gml } = compileTypeScript(`function nextValue() { return 4; }
enum Computed { First = nextValue(), Second = First + 1, Alias = First }`);
  assert.match(gml, /__ts2gml_value_set\(Computed, __ts2gml_value_set\(Computed, "First", nextValue\(\)\), "First"\)/);
  assert.match(gml, /"Second", __ts2gml_value_get\(Computed, "First"\) \+ 1/);
  assert.match(gml, /"Alias", __ts2gml_value_get\(Computed, "First"\)/);
});

test("enum lowering preserves member names that resemble compiler helpers", () => {
  const { gml } = compileTypeScript(`enum Keys { length = 1, Math = 2, "with-dash" = "dash" }
function readKeys() { return Keys.length + Keys.Math; }`);
  assert.match(gml, /__ts2gml_value_set\(Keys, "with-dash", "dash"\)/);
  assert.match(gml, /__ts2gml_collection_length\(Keys\)/);
});

for (const [source, code] of [
  ["enum Invalid { Value = 1 / 0 }", "TS2GML1070"],
  ["enum Invalid { Value = /pattern/ }", "TS2GML1012"],
  ["enum Math { Value }", "TS2GML1056"],
  ["enum global { Value }", "TS2GML1063"],
  ["enum __ts2gml_private { Value }", "TS2GML1056"],
  ["enum Mode { Idle } function shadow(Mode: number) { return Mode; }", "TS2GML1068"],
  ["function nested() { let Local = 1; { enum Local { Value } } }", "TS2GML1049"],
  ["namespace Modes { export enum Mode { Idle } }", "TS2GML1030"],
] as const) {
  test(`keeps enum diagnostics source-located: ${source}`, () => {
    assert.throws(() => compileTypeScript(`interface Erased {}\n\n${source}`, "invalid-enum.ts"),
      (error: unknown) => error instanceof Ts2GmlError && error.diagnostics.some((diagnostic) =>
        diagnostic.code === code && diagnostic.fileName === "invalid-enum.ts" && diagnostic.line === 3 && diagnostic.column > 0));
  });
}
