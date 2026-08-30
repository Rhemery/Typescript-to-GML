interface GMGlobal {
  LOWERING_MATRIX_GLOBAL: number;
  loweringMatrixEffect: number;
}

const LOWERING_MATRIX_GLOBAL = 17;

function loweringMatrixAdd(left: number, right: number): number {
  return left + right;
}

function loweringMatrixOptional(
  value: { branch?: { value: number } } | undefined,
): number | undefined {
  return value?.branch?.value;
}

function loweringMatrixSetEffect(): number {
  gm_global.loweringMatrixEffect = 1;
  return 9;
}

class LoweringMatrixBase {
  base = 1;

  constructor(base: number) {
    this.base = base;
  }
}

class LoweringMatrixStruct extends LoweringMatrixBase {
  doubled = this.double();

  constructor(base: number) {
    super(base);
  }

  double(): number {
    return this.base * 2;
  }

  add(left: number, right: number): number {
    return this.base + left + right;
  }
}

function loweringMatrixRun(): void {
  scopeContextExpect("top-level global", gm_global.LOWERING_MATRIX_GLOBAL, 17);

  let count = 0;
  do {
    count++;
    if (count < 3) continue;
  } while (count < 3);
  scopeContextExpect("do-while continue", count, 3);

  let once = 0;
  do {
    once++;
  } while (false);
  scopeContextExpect("do-while first iteration", once, 1);

  let caught = 0;
  try {
    throw 7;
  } catch {
    caught = 7;
  } finally {
    caught += 1;
  }
  scopeContextExpect("bindingless catch/finally", caught, 8);

  const spread = [0, ...[1, 2], 3, ...[4]];
  scopeContextExpect("array spread length", array_length(spread), 5);
  scopeContextExpect("array spread value", spread[4], 4);
  const pair: [number, number] = [2, 3];
  scopeContextExpect("script spread call", loweringMatrixAdd(...pair), 5);

  const clone = { before: 1, ...{ middle: 2 }, after: 3 };
  scopeContextExpect("object spread", clone.before + clone.middle + clone.after, 6);

  const [first, second = 2, ...tail] = [1, undefined, 3, 4];
  scopeContextExpect("array destructuring", first + second, 3);
  scopeContextExpect("array rest", array_length(tail), 2);
  scopeContextExpect("array rest value", tail[1], 4);

  const {
    nested: { value: nestedValue },
    label: renamed,
    ...objectRest
  } = { nested: { value: 5 }, label: "ok", extra: 9 };
  scopeContextExpect("object destructuring", nestedValue, 5);
  scopeContextExpect("object rename", renamed, "ok");
  scopeContextExpect("object rest", objectRest.extra, 9);

  let arrayTotal = 0;
  for (const value of [1, 2, 3]) arrayTotal += value;
  scopeContextExpect("for-of", arrayTotal, 6);

  let keyCount = 0;
  for (const key in { first: 1, second: 2 }) {
    if (key === "first" || key === "second") keyCount++;
  }
  scopeContextExpect("for-in", keyCount, 2);

  const optionalValue = { branch: { value: 11 } };
  scopeContextExpect("optional chain value", loweringMatrixOptional(optionalValue), 11);
  scopeContextExpect("optional chain undefined", loweringMatrixOptional(undefined), undefined);

  const square = (value: number) => value * value;
  scopeContextExpect("typeof undefined", typeof undefined, "undefined");
  scopeContextExpect("typeof boolean", typeof true, "boolean");
  scopeContextExpect("typeof number", typeof 1, "number");
  scopeContextExpect("typeof string", typeof "value", "string");
  scopeContextExpect("typeof function", typeof square, "function");
  scopeContextExpect("typeof object", typeof {}, "object");
  scopeContextExpect("typeof null", typeof null, "object");
  scopeContextExpect("in operator", "middle" in clone, true);

  const structure = new LoweringMatrixStruct(3);
  scopeContextExpect("constructor inheritance", structure.base, 3);
  scopeContextExpect("field calling method", structure.doubled, 6);
  scopeContextExpect("instanceof child", structure instanceof LoweringMatrixStruct, true);
  scopeContextExpect("instanceof parent", structure instanceof LoweringMatrixBase, true);
  scopeContextExpect("method spread call", structure.add(...pair), 8);

  const holey = [1, , 3];
  scopeContextExpect("array hole length", array_length(holey), 3);
  scopeContextExpect("array hole value", is_undefined(holey[1]), true);

  const shorthandValue = 6;
  const shorthand = { shorthandValue };
  scopeContextExpect("plain arrow", square(3), 9);
  scopeContextExpect("object shorthand", shorthand.shorthandValue, 6);
  scopeContextExpect("template string", `value=${2}`, "value=2");
  scopeContextExpect("Math lowering", Math.max(2, Math.pow(2, 3)), 8);

  gm_global.loweringMatrixEffect = 0;
  const nothing = void loweringMatrixSetEffect();
  scopeContextExpect("void result", nothing, undefined);
  scopeContextExpect("void side effect", gm_global.loweringMatrixEffect, 1);

  let switched = 0;
  for (let index = 0; index < 3; index++) switched += index;
  while (switched < 4) switched++;
  switch (switched) {
    case 4:
      switched += 1;
      break;
    default:
      switched = -1;
  }
  scopeContextExpect("ordinary control flow", switched, 5);
}
