function semanticSparseCondition(values: boolean[], index: number): boolean {
  return !!values[index];
}
function semanticSparseEqual(values: boolean[], index: number): boolean {
  return values[index] === false;
}
function semanticSparseStored(values: boolean[]): boolean {
  const value = values[0];
  return !!value;
}
function semanticSparseNumber(values: number[], index: number): boolean {
  return values[index] === 0;
}

function semanticTypedEqual(left: number, right: number): boolean {
  return left === right;
}
function semanticTypedChoose(enabled: boolean, left: number, right: number, mode: string): boolean {
  return enabled && left === right && mode !== "idle";
}

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
function semanticConditionalEffect<T>(state: { trace: string }, label: string, value: T): T {
  state.trace += label;
  return value;
}

class SemanticWorker {
  length = 3;
  weapon: SemanticWorker | null | undefined;
  receiverReads = 0;
  map(value: number): number { return value + 1; }
  onEndStep(amount = 1): void { this.length += amount; }
  endStep(): void { this.weapon?.onEndStep(); }
  readWeapon(): SemanticWorker | null | undefined { this.receiverReads += 1; return this.weapon; }
}

function semanticContractRun(): void {
  scopeContextExpect("missing typed boolean element truthiness", semanticSparseCondition([], 0), false);
  scopeContextExpect("missing typed boolean element equality", semanticSparseEqual([], 0), false);
  scopeContextExpect("missing stored typed boolean truthiness", semanticSparseStored([]), false);
  scopeContextExpect("missing typed number element equality", semanticSparseNumber([], 0), false);
  for (const left of [0, -0, -1, 0.25, 1]) for (const right of [0, -1, 0.25, 1]) {
    scopeContextExpect("typed native number comparison", semanticTypedEqual(left, right), left === right);
    scopeContextExpect("typed native boolean condition", semanticTypedChoose(true, left, right, "active"), left === right);
    scopeContextExpect("typed native boolean false", semanticTypedChoose(false, left, right, "active"), false);
    scopeContextExpect("typed native string comparison", semanticTypedChoose(true, left, right, "idle"), false);
  }
  const native_boolean = instance_exists(undefined);
  scopeContextExpect("native API result is normalized boolean", is_bool(native_boolean), true);
  for (let index = 0; index < 2; index++) {
    const enabled = index === 1;
    const state = { trace: "" };
    const selected = semanticConditionalEffect(state, "A", enabled)
      && semanticConditionalEffect(state, "B", true);
    scopeContextExpect("typed boolean short circuit value", selected, enabled);
    scopeContextExpect("typed boolean short circuit effects", state.trace, enabled ? "AB" : "A");
  }
  console.log("TS2GML_TYPED_PRIMITIVE_CONTRACT_OK");
  semanticClosuresRun();
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
  // All eight paths, including non-boolean truthiness. The trace catches eager
  // branches, repeated conditions, and reordered side effects in either runtime.
  for (let index = 0; index < 8; index++) {
    const first = index < 4 ? "" : 0.25;
    const second = index % 4 < 2 ? null : "yes";
    const third = index % 2 === 0 ? undefined : -2;
    const state = { trace: "" };
    const falseChain = semanticConditionalEffect(state, "A", first)
      ? semanticConditionalEffect(state, "h", 10)
      : semanticConditionalEffect(state, "B", second)
        ? semanticConditionalEffect(state, "e", 20)
        : semanticConditionalEffect(state, "C", third)
          ? semanticConditionalEffect(state, "x", 30)
          : semanticConditionalEffect(state, "k", 40);
    scopeContextExpect(`conditional false chain value ${index}`, falseChain, [40, 30, 20, 20, 10, 10, 10, 10][index]);
    scopeContextExpect(`conditional false chain effects ${index}`, state.trace, ["ABCk", "ABCx", "ABe", "ABe", "Ah", "Ah", "Ah", "Ah"][index]);
    state.trace = "";
    const trueChain = semanticConditionalEffect(state, "A", first)
      ? semanticConditionalEffect(state, "B", second)
        ? semanticConditionalEffect(state, "C", third)
          ? semanticConditionalEffect(state, "h", 10)
          : semanticConditionalEffect(state, "e", 20)
        : semanticConditionalEffect(state, "x", 30)
      : semanticConditionalEffect(state, "k", 40);
    scopeContextExpect(`conditional true chain value ${index}`, trueChain, [40, 40, 40, 40, 30, 30, 20, 10][index]);
    scopeContextExpect(`conditional true chain effects ${index}`, state.trace, ["Ak", "Ak", "Ak", "Ak", "ABx", "ABx", "ABCe", "ABCh"][index]);
    state.trace = "";
    const condition = (semanticConditionalEffect(state, "A", first)
      ? semanticConditionalEffect(state, "B", second)
      : semanticConditionalEffect(state, "C", third))
      ? semanticConditionalEffect(state, "h", 10)
      : semanticConditionalEffect(state, "e", 20);
    scopeContextExpect(`conditional condition value ${index}`, condition, [20, 10, 20, 10, 20, 20, 10, 10][index]);
    scopeContextExpect(`conditional condition effects ${index}`, state.trace, ["ACe", "ACh", "ACe", "ACh", "ABe", "ABe", "ABh", "ABh"][index]);
  }
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
  const optionalOwner = new SemanticWorker();
  const optionalEffects = { count: 0 };
  optionalOwner.endStep();
  optionalOwner.readWeapon()?.onEndStep(semanticEffect(optionalEffects));
  scopeContextExpect("optional missing receiver evaluated once", optionalOwner.receiverReads, 1);
  scopeContextExpect("optional missing receiver skips arguments", optionalEffects.count, 0);
  optionalOwner.weapon = null;
  optionalOwner.endStep();
  optionalOwner.readWeapon()?.onEndStep(semanticEffect(optionalEffects));
  scopeContextExpect("optional null receiver evaluated once", optionalOwner.receiverReads, 2);
  scopeContextExpect("optional null receiver skips arguments", optionalEffects.count, 0);
  optionalOwner.weapon = worker;
  optionalOwner.endStep();
  scopeContextExpect("optional method receiver", worker.length, 9);
  optionalOwner.readWeapon()?.onEndStep(semanticEffect(optionalEffects));
  scopeContextExpect("optional present receiver evaluated once", optionalOwner.receiverReads, 3);
  scopeContextExpect("optional present receiver evaluates arguments", optionalEffects.count, 1);
  scopeContextExpect("optional call preserves this", worker.length, 18);
  optionalOwner.weapon?.readWeapon()?.onEndStep(semanticEffect(optionalEffects));
  scopeContextExpect("optional nested receiver evaluated once", worker.receiverReads, 1);
  scopeContextExpect("optional nested receiver skips arguments", optionalEffects.count, 1);
  if (true) optionalOwner.weapon?.weapon?.onEndStep(semanticEffect(optionalEffects));
  else semanticEffect(optionalEffects);
  scopeContextExpect("optional guard preserves enclosing else", optionalEffects.count, 1);
  const optionalAmount: [number] = [2];
  optionalOwner.weapon?.onEndStep(...optionalAmount);
  scopeContextExpect("optional spread call preserves this", worker.length, 20);
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

function semanticClosureCounter(start = 0) {
  let count = start;
  const read = () => count;
  const add = (amount = 1) => { count += amount; return count; };
  count += 2;
  return { read, add };
}

function semanticClosureChain(first: number) {
  return (second: number) => (third: number) => first + second + third;
}

function semanticClosureNamed(value: number) {
  function read() { return value; }
  value += 1;
  return read;
}

class SemanticClosureOwner {
  value = 10;
  static value = 30;
  constructor(value: number) {
    const increment = 2;
    this.read = () => value + increment + this.value;
    value += 1;
  }
  read: () => number = () => 0;
  make(amount: number) {
    return () => { this.value += amount; return this.value; };
  }
  nested(amount: number) {
    return () => () => this.value + amount;
  }
  aliased() { const owner = this; return () => owner.value; }
  static make(amount: number) { return () => this.value + amount; }
}

function semanticClosuresRun(): void {
  const first = semanticClosureCounter(5);
  const second = semanticClosureCounter();
  scopeContextExpect("closure outer mutation", first.read(), 7);
  scopeContextExpect("closure sibling mutation", first.add(), 8);
  scopeContextExpect("closure shared read", first.read(), 8);
  scopeContextExpect("closure independent calls", second.read(), 2);
  scopeContextExpect("closure default argument", second.add(3), 5);
  const middle = semanticClosureChain(1);
  const inner = middle(2);
  scopeContextExpect("closure transitive capture", inner(3), 6);
  scopeContextExpect("closure separate intermediate calls", middle(4)(5), 10);
  const named = semanticClosureNamed(8);
  scopeContextExpect("closure named function", named(), 9);
  const owner = new SemanticClosureOwner(3);
  const read = owner.read;
  scopeContextExpect("closure constructor parameter", read(), 16);
  const add = owner.make(2);
  scopeContextExpect("closure lexical this", add(), 12);
  scopeContextExpect("closure this shared state", read(), 18);
  const nested = owner.nested(5);
  scopeContextExpect("closure nested lexical this", nested()(), 17);
  const aliased = owner.aliased();
  scopeContextExpect("closure captured receiver value", aliased(), 12);
  const staticRead = SemanticClosureOwner.make(4);
  scopeContextExpect("closure static this", staticRead(), 34);
  let local = 1;
  const expression = function () { local += 2; return { local }; };
  scopeContextExpect("closure function expression", expression().local, 3);
  scopeContextExpect("closure mutation visible to owner", local, 3);
  const zero = () => 0;
  let callback = zero;
  const indirect = () => callback();
  callback = () => 7;
  scopeContextExpect("closure function-valued binding", indirect(), 7);
  const recursive = (depth: number): number => depth === 0 ? 1 : recursive(depth - 1) + 1;
  scopeContextExpect("closure recursive variable", recursive(3), 4);
  const value = 9;
  const shadow = (value: number) => () => value;
  scopeContextExpect("closure shadowed parameter", shadow(4)(), 4);
  const readValue = () => value;
  scopeContextExpect("closure shadow leaves outer binding", readValue(), 9);
  const values = [3, 1, 2];
  const direction = -1;
  values.sort((left, right) => (left - right) * direction);
  scopeContextExpect("closure native comparator", values.join(), "3,2,1");
  let optional: { value: number } | undefined = { value: 8 };
  const fallback = 3;
  const optionalRead = () => optional?.value ?? fallback;
  scopeContextExpect("closure optional lowering", optionalRead(), 8);
  optional = undefined;
  scopeContextExpect("closure optional fallback capture", optionalRead(), 3);
  let amount = 2;
  const update = () => { values[0]! += amount; return values[0]; };
  scopeContextExpect("closure indexed mutation", update(), 5);
  amount = 4;
  scopeContextExpect("closure indexed mutation shared operand", update(), 9);
}
