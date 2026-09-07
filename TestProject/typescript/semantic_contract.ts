function semanticFallback(value: number, fallback: number): number { return value || fallback; }
function semanticAnd(flag: boolean, value: number): number | false { return flag && value; }
function semanticCondition(value: number | string | null): number { return value ? 1 : 0; }
function semanticEquality(value: number | boolean): boolean { return value === 1; }
function semanticDefault(data: { value?: number | null }): number | null {
  const { value = 5 } = data;
  return value;
}
function semanticParameter(value: number | null = 5): number | null { return value; }
function semanticField(data: Record<string, number>, key: string): number { return data[key]!; }
function semanticEffect(counter: { count: number }): number { counter.count += 1; return 9; }
function semanticLazy(value: number, counter: { count: number }): number { return value || semanticEffect(counter); }

class SemanticWorker {
  length = 3;
  map(value: number): number { return value + 1; }
}

function semanticContractRun(): void {
  scopeContextExpect("logical operand", semanticFallback(0, 5), 5);
  scopeContextExpect("logical local", semanticAnd(true, 42), 42);
  scopeContextExpect("logical false", semanticAnd(false, 42), false);
  const counter = { count: 0 };
  scopeContextExpect("short circuit result", semanticLazy(2, counter), 2);
  scopeContextExpect("short circuit effect", counter.count, 0);
  scopeContextExpect("deferred local result", semanticLazy(0, counter), 9);
  scopeContextExpect("deferred local effect", counter.count, 1);
  scopeContextExpect("negative condition", semanticCondition(-2), 1);
  scopeContextExpect("fraction condition", semanticCondition(0.25), 1);
  scopeContextExpect("empty condition", semanticCondition(""), 0);
  scopeContextExpect("string condition", semanticCondition("yes"), 1);
  scopeContextExpect("null condition", semanticCondition(null), 0);
  scopeContextExpect("strict boolean", semanticEquality(true), false);
  scopeContextExpect("strict number", semanticEquality(1), true);
  scopeContextExpect("null default", semanticDefault({ value: null }), null);
  scopeContextExpect("missing default", semanticDefault({}), 5);
  scopeContextExpect("null parameter", semanticParameter(null), null);
  scopeContextExpect("missing parameter", semanticParameter(), 5);
  scopeContextExpect("round tie", Math.round(2.5), 3);
  scopeContextExpect("round negative tie", Math.round(-1.5), -1);
  const next = Math.random;
  const sample = next();
  scopeContextExpect("random alias range", sample >= 0 && sample < 1, true);
  scopeContextExpect("string index", "abc"[0], "a");
  scopeContextExpect("struct index", semanticField({ score: 7 }, "score"), 7);
  scopeContextExpect("emoji literal", "😀", "😀");
  const worker = new SemanticWorker();
  scopeContextExpect("authored map", worker.map(2), 3);
  worker.length = 8;
  scopeContextExpect("authored length write", worker.length, 8);
  const values = [3, 1];
  values["push"](2);
  (values.push)(4);
  scopeContextExpect("optional includes", values.includes(2), true);
  scopeContextExpect("optional join", values.join(), "3,1,2,4");
  values.sort((left, right) => left - right);
  scopeContextExpect("array sort", values.join(), "1,2,3,4");
  values.length = 2;
  scopeContextExpect("array truncate", values.join(), "1,2");
  values.length = 4;
  scopeContextExpect("array grow", values[3], undefined);
  values[2] = 8;
  values[2] += 1;
  scopeContextExpect("array update", values[2], 9);
  const fractions = [0.3, 0.1, 0.2];
  fractions.sort((left, right) => left - right);
  scopeContextExpect("fraction comparator", fractions[0], 0.1);
  const stable = [{ key: 2, order: 1 }, { key: 1, order: 2 }, { key: 2, order: 3 }];
  stable.sort((left, right) => left.key - right.key);
  scopeContextExpect("stable comparator", stable[1]!.order, 1);
  scopeContextExpect("stable comparator second", stable[2]!.order, 3);
  values[2]!++;
  scopeContextExpect("postfix array mutation", values[2], 10);
  ++values[2]!;
  scopeContextExpect("prefix array mutation", values[2], 11);
  const mixed: (number | boolean)[] = [1, false];
  scopeContextExpect("includes strict types", mixed.includes(true), false);
  scopeContextExpect("indexOf strict types", mixed.indexOf(true), -1);
  scopeContextExpect("indexOf omitted offset", values.indexOf(11), 2);
  scopeContextExpect("includes negative offset", values.includes(11, -2), true);
  const minimum = Math.min;
  const maximum = Math.max;
  scopeContextExpect("min one argument", minimum(7), 7);
  scopeContextExpect("max one argument", maximum(7), 7);
  scopeContextExpect("min no arguments", Math.min() > 1e100, true);
  scopeContextExpect("max no arguments", Math.max() < -1e100, true);
  scopeContextExpect("template emoji", `start😀${1}😀end`, "start😀1😀end");
  scopeContextExpect("numeric literal formats", 0xff + 0b10 + 0o7 + 1_000, 1264);
  scopeContextExpect("small scientific literal", 1e-8 * 100000000, 1);
}
