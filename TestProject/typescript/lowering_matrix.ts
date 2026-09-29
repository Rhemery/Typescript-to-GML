interface GMGlobal {
  LOWERING_MATRIX_GLOBAL: number;
  loweringMatrixEffect: number;
}

gm_global.LOWERING_MATRIX_GLOBAL = 17;

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

class LoweringMatrixNamedMembers {
  length = 7;

  concat(left: number, right: number): number { return left + right; }
  entries(value: number): number { return value + 1; }
  includes(value: number, offset: number): boolean { return value === offset; }
  indexOf(value: number, offset: number): number { return value + offset; }
  join(separator: string): string { return separator; }
  keys(value: number): number { return value + 2; }
  pop(value: number): number { return value + 3; }
  push(left: number, right: number): number { return left * right; }
  reverse(value: number): number { return value + 4; }
  shift(value: number): number { return value + 5; }
  sort(value: number, ascending: boolean): number { return value + (ascending ? 1 : 0); }
  unshift(left: number, right: number): number { return left - right; }
  values(value: number): number { return value + 6; }
}

class LoweringMatrixStatics {
  static count = 2;
  static initial = this.read();
  static label: string;
  count = 100;

  static read(): number { return this.count; }
  static add(value: number): number { this.count += value; return this.count; }
  static identity(): typeof LoweringMatrixStatics { return this; }
  static reader(): () => number { return () => this.count; }
  static push(value: number): number { return this.count + value; }
}

class LoweringMatrixStaticChild extends LoweringMatrixStatics {
  constructor() { super(); }
}

function loweringMatrixRun(): void {
  semanticContractRun();
  scopeContextExpect("static before construction", LoweringMatrixStatics.initial, 2);
  scopeContextExpect("uninitialized static", LoweringMatrixStatics.label, undefined);
  scopeContextExpect("inherited static", LoweringMatrixStaticChild.read(), 2);
  scopeContextExpect("static receiver identity", LoweringMatrixStaticChild.identity(), LoweringMatrixStaticChild);
  LoweringMatrixStaticChild.count = 7;
  scopeContextExpect("child static write", LoweringMatrixStaticChild.read(), 7);
  scopeContextExpect("parent static unchanged", LoweringMatrixStatics.read(), 2);
  const staticAlias = LoweringMatrixStaticChild;
  staticAlias.count += 1;
  scopeContextExpect("aliased static", staticAlias["count"], 8);
  scopeContextExpect("static spread call", staticAlias.add(...[3]), 11);
  scopeContextExpect("static collection name", staticAlias.push(1), 12);
  const staticReader = staticAlias.reader();
  scopeContextExpect("static lexical arrow", staticReader(), 11);
  const staticInstance = new LoweringMatrixStatics();
  scopeContextExpect("static and instance field", staticInstance.count, 100);
  scopeContextExpect("construction preserves static", LoweringMatrixStatics.read(), 2);
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

  const namedMembers = new LoweringMatrixNamedMembers();
  scopeContextExpect("authored length member", namedMembers.length, 7);
  scopeContextExpect("authored concat member", namedMembers.concat(2, 3), 5);
  scopeContextExpect("authored entries member", namedMembers.entries(4), 5);
  scopeContextExpect("authored includes member", namedMembers.includes(6, 6), true);
  scopeContextExpect("authored indexOf member", namedMembers.indexOf(7, 8), 15);
  scopeContextExpect("authored join member", namedMembers.join("joined"), "joined");
  scopeContextExpect("authored keys member", namedMembers.keys(9), 11);
  scopeContextExpect("authored pop member", namedMembers.pop(10), 13);
  scopeContextExpect("authored push member", namedMembers.push(3, 4), 12);
  scopeContextExpect("authored reverse member", namedMembers.reverse(11), 15);
  scopeContextExpect("authored shift member", namedMembers.shift(12), 17);
  scopeContextExpect("authored sort member", namedMembers.sort(13, true), 14);
  scopeContextExpect("authored unshift member", namedMembers.unshift(15, 2), 13);
  scopeContextExpect("authored values member", namedMembers.values(14), 20);

  const holey = [1, , 3];
  scopeContextExpect("array hole length", array_length(holey), 3);
  scopeContextExpect("array hole value", is_undefined(holey[1]), true);

  const nativeValues = [1, 2];
  scopeContextExpect("array push result", nativeValues.push(3), 3);
  let runtimeGuardCaught = false;
  try {
    const wrongValue: any = "not a number";
    nativeValues.push(wrongValue);
  } catch {
    runtimeGuardCaught = true;
  }
  scopeContextExpect("maximum array guard", runtimeGuardCaught, true);
  scopeContextExpect("array length property", nativeValues.length, 3);
  nativeValues.reverse();
  scopeContextExpect("array reverse", nativeValues[0], 3);
  delete nativeValues[1];
  scopeContextExpect("array delete", nativeValues.length, 2);

  const map = new Map<string, number>([["score", 1]]);
  map.set("lives", 3);
  scopeContextExpect("map get", map.get("lives"), 3);
  scopeContextExpect("map size", map.size, 2);
  scopeContextExpect("map delete keyword", delete map["score"], true);
  scopeContextExpect("map delete removed key", map.has("score"), false);
  const mapKeys = [...map.keys()];
  scopeContextExpect("map keys", mapKeys[0], "lives");

  const set = new Set<string>(["ready", "ready"]);
  set.add("running");
  scopeContextExpect("set unique size", set.size, 2);
  scopeContextExpect("set has", set.has("running"), true);
  scopeContextExpect("set delete keyword", delete set["ready"], true);

  const list = new List<number>([1, 2]);
  list.push(3);
  scopeContextExpect("list get", list.get(2), 3);
  scopeContextExpect("list remove", list.remove(0), true);
  scopeContextExpect("list size", list.size, 2);

  const grid = new Grid<string>(2, 2);
  grid.set(1, 1, "cell");
  scopeContextExpect("grid get", grid.get(1, 1), "cell");

  const queue = new Queue<number>();
  queue.enqueue(1).enqueue(2);
  scopeContextExpect("queue order", queue.dequeue(), 1);

  const stack = new Stack<number>();
  stack.push(1).push(2);
  scopeContextExpect("stack order", stack.pop(), 2);

  const priority = new PriorityQueue<string>();
  priority.add("later", 1).add("first", 10);
  scopeContextExpect("priority max", priority.max(), "first");
  scopeContextExpect("priority delete max", priority.deleteMax(), "first");

  map.destroy();
  set.destroy();
  list.destroy();
  grid.destroy();
  queue.destroy();
  stack.destroy();
  priority.destroy();
  map.destroy();
  const replacementMap = new Map<string, number>();
  replacementMap.set("owned", 7);
  let destroyedRejected = false;
  try { map.set("owned", 99); } catch { destroyedRejected = true; }
  scopeContextExpect("destroyed collection rejects reuse", destroyedRejected, true);
  scopeContextExpect("destroyed collection preserves reused native handle", replacementMap.get("owned"), 7);
  replacementMap.destroy();
  const nativeMap = ds_map_create<string, number>();
  ds_map_set(nativeMap, "ready", 1);
  scopeContextExpect("native predicate boolean", ds_map_exists(nativeMap, "ready"), true);
  ds_map_destroy(nativeMap);

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
