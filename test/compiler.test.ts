import assert from "node:assert/strict";
import { test } from "node:test";
import { compileTypeScript, Ts2GmlError } from "../src/compiler/compile.js";

test("initializes class statics once before construction, with methods before fields", () => {
  const result = compileTypeScript(`
class Counter {
  static readonly initial = this.read();
  static count = 3;
  static unset: number;
  count = 100;
  static read(offset: number = 0): number { return this.count + offset; }
  static identity() { return this; }
  static reader() { return () => this.count; }
  static arrow = () => this.count;
}
function use() {
  Counter.count += 1;
  Counter.count++;
  return [Counter.read(), new Counter().count];
}
`, "statics.ts");
  assert.match(result.javascript, /static readonly|static initial/);
  assert.match(result.gml, /function Counter\(\) constructor \{\s+self\.count = 100;\s+\}/);
  assert.equal(result.gml.match(/__ts2gml_class_statics\(Counter, true\)/g)?.length, 1);
  assert.ok(result.gml.indexOf("self.read = method") < result.gml.indexOf("self.initial = __ts2gml"));
  assert.ok(result.gml.indexOf("self.initial = __ts2gml") < result.gml.indexOf("self.count = 3;"));
  assert.match(result.gml, /self\.unset = undefined;/);
  assert.match(result.gml, /return self\.__ts2gml_class;/);
  assert.match(result.gml, /return method\(self, function/);
  assert.match(result.gml, /self\.arrow = method\(self, function/);
  assert.match(result.gml, /__ts2gml_class_statics\(Counter\)\.count \+= 1;/);
  assert.match(result.gml, /__ts2gml_class_statics\(Counter\)\.count\+\+;/);
  assert.doesNotMatch(result.gml, /static (?:initial|count|read)\b|\bthis\b/);
});

test("lowers inherited, aliased, bracketed, and destructured static members", () => {
  const result = compileTypeScript(`
class Parent {
  static count = 1;
  static read() { return this.count; }
}
class Child extends Parent { constructor() { super(); } }
function use() {
  const Alias = Child;
  Alias["count"] = 7;
  const { count } = Alias;
  return [count, Alias.read(), Parent.count];
}
function shadow(Parent: {count: number}) { return Parent.count; }
function generic<T extends typeof Parent>(value: T) { return value.count; }
`, "./fixtures/inherited-statics.ts");
  assert.match(result.gml, /__ts2gml_class_statics\(Child, true\)/);
  assert.match(result.gml, /static_set\(self, __ts2gml_class_statics\(Parent\)\);/);
  assert.match(result.gml, /__ts2gml_class_statics\(Alias\)\.count = 7;/);
  assert.match(result.gml, /var __ts2gml_destructure_\w+ = __ts2gml_class_statics\(Alias\)/);
  assert.match(result.gml, /return Parent\.count;/);
  assert.match(result.gml, /return __ts2gml_class_statics\(value\)\.count;/);
  assert.doesNotMatch(result.gml, /Alias\["count"\]/);
});

test("keeps unsupported static syntax source-located", () => {
  for (const source of [
    "class State { static get value() { return 1; } }",
    "class State { static [name] = 1; }",
    "class State { static value = 1; } function read(key: string) { return State[key]; }",
    "class State { static { reset(); } }",
    "class State { static __ts2gml_class = 1; }",
    'class State { static "__ts2gml_class" = 1; }',
    "class State { static value = 1; } function read(value: typeof State | {value: number}) { return value.value; }",
  ]) {
    assert.throws(() => compileTypeScript(source, "unsupported-statics.ts"), (error: unknown) =>
      error instanceof Ts2GmlError && error.diagnostics.some((diagnostic) =>
        diagnostic.fileName === "unsupported-statics.ts" && diagnostic.line > 0 && diagnostic.column > 0
      )
    );
  }
});

test("lowers TypeScript classes and JavaScript expressions to GML", () => {
  const source = `
class Vector3 extends Vector2 {
  z = 0;
  constructor(x: number, y: number, z: number) {
    super(x, y);
    this.z = z;
  }
  magnitude(): number {
    const squared = this.x * this.x + this.y * this.y + this.z * this.z;
    return Math.sqrt(squared);
  }
}
function announce(value: number): void {
  console.log(` + "`value=${value}`" + `);
  if (value === null) return;
}
`;

  const result = compileTypeScript(source, "vector.ts");
  assert.match(result.gml, /function Vector3\(_x, _y, _z\) : Vector2\(_x, _y\) constructor/);
  assert.match(result.gml, /z = 0;/);
  assert.match(result.gml, /z = _z;/);
  assert.match(result.gml, /static magnitude = function\(\)/);
  assert.match(
    result.gml,
    /var squared = self\.x \* self\.x \+ self\.y \* self\.y \+ self\.z \* self\.z;/,
  );
  assert.match(result.gml, /return sqrt\(squared\);/);
  assert.match(result.gml, /show_debug_message\(string_concat\("value=", value\)\);/);
  assert.match(result.gml, /__ts2gml_value_equal\(value, pointer_null\)/);
  assert.doesNotMatch(result.gml, /this\./);
  assert.doesNotMatch(result.gml, /\b(?:const|let)\b/);
});

test("lowers bare this, random, and interpolated strings with valid GML semantics", () => {
  const result = compileTypeScript(`
class Value {
  self() { return this; }
  describe(value: number) { return ` + "`value=${value}!`" + `; }
  randomUnit() { return Math.random(); }
  squared(value: number) { return value ** 2; }
}
`, "semantic-lowering.ts");

  assert.match(result.gml, /return self;/);
  assert.match(result.gml, /return string_concat\("value=", _value, "!"\);/);
  assert.match(result.gml, /return random\(1\);/);
  assert.match(result.gml, /return power\(_value, 2\);/);
});

test("emits TypeScript string literals with GML double quotes", () => {
  const result = compileTypeScript(`
function messages() {
  return ['ready', 'it\\'s valid'];
}
`, "string-literals.ts");

  assert.match(result.gml, /return \["ready", "it's valid"\];/);
  assert.doesNotMatch(result.gml, /'ready'/);
});

test("rejects JavaScript control flow and scope semantics that GML cannot preserve", () => {
  const invalidSources = [
    ["labels.ts", "outer: while (true) { break outer; }", "TS2GML1046"],
    ["assignment-value.ts", "let a; const b = (a = 1);", "TS2GML1047"],
    ["super-method.ts", "class Child extends Base { run() { return super.run(); } }", "TS2GML1048"],
    ["shadow.ts", "function read(value: number) { if (value) { let value = 2; } return value; }", "TS2GML1049"],
    ["nested-class.ts", "function make() { class Local {} return new Local(); }", "TS2GML1050"],
    ["logical-assignment.ts", "function set(value: number) { value ||= 1; }", "TS2GML1052"],
    ["unsigned-shift.ts", "function shift(value: number) { return value >>> 1; }", "TS2GML1053"],
    ["comma.ts", "function both() { return (first(), second()); }", "TS2GML1054"],
    ["update-value.ts", "function next(value: number) { return value++; }", "TS2GML1055"],
  ] as const;

  for (const [fileName, source, code] of invalidSources) {
    assert.throws(
      () => compileTypeScript(source, fileName),
      (error: unknown) =>
        error instanceof Ts2GmlError && error.diagnostics.some((item) => item.code === code),
    );
  }
});

test("lowers JavaScript-style collections to native GameMaker data structures", () => {
  const result = compileTypeScript(`
function collections() {
  const map = new Map<string, number>([["score", 1]]);
  const set = new Set<string>(["ready"]);
  const list = new List<number>([1, 2]);
  const grid = new Grid<string>(2, 3);
  const queue = new Queue<number>();
  const stack = new Stack<number>();
  const priority = new PriorityQueue<string>();
  map.set("score", 2);
  map.delete("missing");
  set.add("running");
  list.push(3);
  grid.set(0, 0, "cell");
  queue.enqueue(1);
  stack.push(2);
  priority.add("urgent", 10);
  const values = [1, 2];
  const record: { value?: number } = { value: 1 };
  values.push(3);
  values.reverse();
  const count = values.length;
  delete values[0];
  delete map["score"];
  delete record.value;
  return count;
}
`, "collections.ts");

  assert.match(result.gml, /function __ts2gml_Map\(_entries\) constructor/);
  assert.match(result.gml, /__ds = ds_map_create\(\)/);
  assert.match(result.gml, /new __ts2gml_Map\(\[\["score", 1\]\]\)/);
  assert.match(result.gml, /new __ts2gml_Set\(\["ready"\]\)/);
  assert.match(result.gml, /new __ts2gml_List\(\[1, 2\]\)/);
  assert.match(result.gml, /new __ts2gml_Grid\(2, 3\)/);
  assert.match(result.gml, /new __ts2gml_Queue\(\)/);
  assert.match(result.gml, /new __ts2gml_Stack\(\)/);
  assert.match(result.gml, /new __ts2gml_PriorityQueue\(\)/);
  assert.match(result.gml, /__ts2gml_collection_push\(list, \[3\]\)/);
  assert.match(result.gml, /__ts2gml_collection_push\(values, \[3\]\)/);
  assert.match(result.gml, /__ts2gml_collection_reverse\(values, \[\]\)/);
  assert.match(result.gml, /var count = __ts2gml_collection_length\(values\)/);
  assert.match(result.gml, /__ts2gml_remove\(values, 0\)/);
  assert.match(result.gml, /__ts2gml_remove\(map, "score"\)/);
  assert.match(result.gml, /__ts2gml_remove\(map, "missing"\)/);
  assert.match(result.gml, /__ts2gml_remove\(record, "value"\)/);
  assert.doesNotMatch(result.gml, /static delete\b|\.delete\(/);
});

test("preserves authored members whose names overlap collection intrinsics", () => {
  const result = compileTypeScript(`
class Bag {
  length = 7;
  concat(left: number, right: number) { return left + right; }
  includes(value: number, offset: number) { return value === offset; }
  push(left: number, right: number) { return left * right; }
}
function inspectBag() {
  const bag = new Bag();
  return bag.length + bag.concat(1, 2) + bag.push(3, 4) + (bag.includes(5, 5) ? 1 : 0);
}
`, "authored-collection-members.ts");

  assert.match(result.gml, /return _target\.length;/);
  assert.match(result.gml, /method_call\(method\(_target, _function\), _arguments\)/);
  assert.match(result.gml, /__ts2gml_call_member\(_target, _target\.concat, _arguments\)/);
  assert.match(result.gml, /__ts2gml_call_member\(_target, _target\.includes, _arguments\)/);
  assert.match(result.gml, /__ts2gml_call_member\(_target, _target\.push, _arguments\)/);
  assert.match(result.gml, /__ts2gml_collection_concat\(bag, \[1, 2\]\)/);
  assert.match(result.gml, /__ts2gml_collection_push\(bag, \[3, 4\]\)/);
  assert.match(result.gml, /__ts2gml_collection_includes\(bag, \[5, 5\]\)/);
});

test("keeps unsupported JavaScript globals strict beside collection intrinsics", () => {
  const result = compileTypeScript(
    "function create() { return new Map<string, number>(); }",
    "map.ts",
  );
  assert.match(result.gml, /new __ts2gml_Map\(\)/);

  assert.throws(
    () => compileTypeScript("const constructor = Map;", "bare-map.ts"),
    (error: unknown) =>
      error instanceof Ts2GmlError &&
      error.diagnostics.some((diagnostic) => diagnostic.code === "TS2GML1033"),
  );
});

test("allows erased type-only imports", () => {
  const result = compileTypeScript(
    'import type { External } from "./external.js"; function identity(value: External) { return value; }',
    "type-import.ts",
  );
  assert.match(result.gml, /function identity\(value\)/);
  assert.doesNotMatch(result.gml, /import|External/);
});

test("turns arrow functions and shorthand fields into GML functions and structs", () => {
  const result = compileTypeScript(
    `function createValues() {
      const double = (value: number) => value * 2;
      const value = 4;
      const point = { value };
      return { double, point };
    }`,
    "expressions.ts",
  );
  assert.match(result.gml, /var double = function \(value\)/);
  assert.match(result.gml, /return value \* 2;/);
  assert.match(result.gml, /var point = \{ value: value \};/);
});

test("emits raw GameMaker macros with typed references and configuration overrides", () => {
  const result = compileTypeScript(`
const PLAYER_SPEED = gm_macro<number>("4");
const GAME_TITLE = gm_macro<string>('"Core Awakening"');
const RANDOM_COLOR = gm_macro<number>("make_colour_hsv(irandom(255), 255, 255)");
const AD_ID = gm_macro<string>('""', {
  Android: '"com.example.android"',
  "iOS": '"com.example.ios"',
});
function currentSpeed(): number { return PLAYER_SPEED; }
`, "macros.ts");

  assert.match(result.gml, /^#macro PLAYER_SPEED 4/m);
  assert.match(result.gml, /^#macro GAME_TITLE "Core Awakening"/m);
  assert.match(
    result.gml,
    /^#macro RANDOM_COLOR make_colour_hsv\(irandom\(255\), 255, 255\)/m,
  );
  assert.match(result.gml, /^#macro AD_ID ""/m);
  assert.match(result.gml, /^#macro Android:AD_ID "com\.example\.android"/m);
  assert.match(result.gml, /^#macro iOS:AD_ID "com\.example\.ios"/m);
  assert.match(result.gml, /return PLAYER_SPEED;/);
  assert.doesNotMatch(result.gml, /gm_macro|var PLAYER_SPEED|var AD_ID/);
});

test("rejects invalid GameMaker macro declarations before GML emission", () => {
  const invalidSources = [
    ["runtime-macro.ts", "function value() { return gm_macro<number>(\"4\"); }", "TS2GML1037"],
    ["mutable-macro.ts", "let VALUE = gm_macro<number>(\"4\");", "TS2GML1037"],
    ["macro-reference.ts", "const factory = gm_macro;", "TS2GML1037"],
    ["macro-name.ts", "const $VALUE = gm_macro<number>(\"4\");", "TS2GML1038"],
    ["typed-value.ts", "const VALUE = gm_macro<number>(4);", "TS2GML1040"],
    ["empty-macro.ts", "const VALUE = gm_macro<number>(\"   \");", "TS2GML1043"],
    ["dynamic-config.ts", "const VALUE = gm_macro<number>(\"4\", configs);", "TS2GML1041"],
    ["typed-config.ts", "const VALUE = gm_macro<number>(\"4\", { Debug: 8 });", "TS2GML1040"],
    ["invalid-config.ts", "const VALUE = gm_macro<number>(\"4\", { \"Debug Mode\": \"8\" });", "TS2GML1042"],
  ] as const;

  for (const [fileName, source, code] of invalidSources) {
    assert.throws(
      () => compileTypeScript(source, fileName),
      (error: unknown) =>
        error instanceof Ts2GmlError && error.diagnostics.some((diagnostic) =>
          diagnostic.code === code
        ),
    );
  }

  assert.throws(
    () => compileTypeScript("const VALUE = gm_macro<number>(`line one\nline two`);", "multiline-macro.ts"),
    (error: unknown) =>
      error instanceof Ts2GmlError && error.diagnostics[0]?.code === "TS2GML1043",
  );
});

test("allows context-safe arrows and rejects unsupported lexical captures", () => {
  const safe = compileTypeScript(`
class Counter {
  value = 1;
  add = (amount: number) => this.value + amount;
  createAdder() {
    return (amount: number) => this.value + amount;
  }
}
const double = (value: number) => value * 2;
`, "safe-arrows.ts");
  assert.match(safe.gml, /return self\.value \+ amount/);

  assert.throws(
    () => compileTypeScript(`
function createScaler(multiplier: number) {
  const offset = 1;
  return (value: number) => value * multiplier + offset;
}
`, "capturing-arrow.ts"),
    (error: unknown) => {
      assert.ok(error instanceof Ts2GmlError);
      assert.deepEqual(
        error.diagnostics.map((diagnostic) => diagnostic.code),
        ["TS2GML1014", "TS2GML1014"],
      );
      assert.match(error.message, /capturing-arrow\.ts:4:\d+ - error TS2GML1014/);
      assert.match(error.message, /captures local variable 'multiplier'/);
      assert.match(error.message, /captures local variable 'offset'/);
      assert.match(error.message, /\|   return \(value: number\) => value \* multiplier \+ offset;/);
      assert.match(error.message, /hint: Pass 'multiplier' as an argument/);
      return true;
    },
  );
});

test("rejects lexical arrow context that GML methods cannot preserve", () => {
  assert.throws(
    () => compileTypeScript(
      "function outer() { return () => arguments[0]; }",
      "arguments.ts",
    ),
    (error: unknown) =>
      error instanceof Ts2GmlError &&
      error.diagnostics[0]?.code === "TS2GML1015" &&
      /enclosing 'arguments'/.test(error.message),
  );
  assert.throws(
    () => compileTypeScript("const read = () => this.value;", "top-level-this.ts"),
    (error: unknown) =>
      error instanceof Ts2GmlError &&
      error.diagnostics[0]?.code === "TS2GML1018" &&
      /known object or struct context/.test(error.message),
  );
  assert.throws(
    () => compileTypeScript(
      "function read() { return this.value; }",
      "dynamic-function-this.ts",
    ),
    (error: unknown) =>
      error instanceof Ts2GmlError &&
      error.diagnostics[0]?.code === "TS2GML1020" &&
      /call-site 'this'/.test(error.message),
  );
  assert.throws(
    () => compileTypeScript(
      "function makeReader() { return () => this.value; }",
      "dynamic-arrow-this.ts",
    ),
    (error: unknown) =>
      error instanceof Ts2GmlError &&
      error.diagnostics[0]?.code === "TS2GML1018",
  );
  assert.throws(
    () => compileTypeScript(
      "function outer() { const value = 1; return function inner() { return value; }; }",
      "nested-function.ts",
    ),
    (error: unknown) =>
      error instanceof Ts2GmlError &&
      error.diagnostics[0]?.code === "TS2GML1014" &&
      /Nested function captures local variable 'value'/.test(error.message),
  );
});

test("lowers optional chains and JavaScript-only operators", () => {
  const result = compileTypeScript(`
const position = player?.transform?.position.x;
const isPlayer = player instanceof Player;
const hasHealth = "health" in player;
const kind = typeof player;
const nothing = void reset();
`, "operators.ts");

  assert.doesNotMatch(result.gml, /\?\./);
  assert.match(result.gml, /__ts2gml_value_nullish\(__ts2gml_optional/);
  assert.match(result.gml, /is_instanceof\(player, Player\)/);
  assert.match(result.gml, /variable_struct_exists\(player, "health"\)/);
  assert.match(result.gml, /is_callable\(__ts2gml_typeof_value\)/);
  assert.match(result.gml, /reset\(\)/);
});

test("lowers array, object, and call spread", () => {
  const result = compileTypeScript(`
function spreadValues(left: number[], right: number[], source: GMStruct, calculator: GMStruct) {
  const values = [0, ...left, 3, ...right];
  const clone = { before: 1, ...source, after: 2 };
  const total = sum(1, ...values);
  const methodTotal = calculator.sum(...values);
  return { clone, total, methodTotal };
}
`, "spread.ts");

  assert.match(result.gml, /array_concat\(\[\], \[0\], left, \[3\], right\)/);
  assert.match(result.gml, /variable_struct_get_names\(__ts2gml_part\)/);
  assert.match(result.gml, /variable_struct_set\(__ts2gml_result/);
  assert.match(result.gml, /is_method\(__ts2gml_callable\) \? method_call/);
  assert.match(result.gml, /\}\)\(sum, array_concat\(\[\], \[1\], values\)\)/);
  assert.match(result.gml, /method\(__ts2gml_receiver, __ts2gml_receiver\.sum\)/);
  assert.doesNotMatch(result.gml, /\.\.\./);
});

test("lowers nested array and object destructuring declarations", () => {
  const result = compileTypeScript(`
const [first, second = 2, ...tail] = values;
const { position: { x, y }, name: displayName, ...rest } = player;
`, "destructuring.ts");

  assert.match(result.gml, /first = 0 < array_length/);
  assert.match(result.gml, /second = is_undefined\(__ts2gml_default_\w+\) \? 2/);
  assert.match(result.gml, /tail = 2 < array_length[\s\S]+array_copy_while/);
  assert.match(result.gml, /variable_struct_get\([^,]+, "position"\)/);
  assert.match(result.gml, /variable_struct_get\([^,]+, "name"\)/);
  assert.match(result.gml, /\["position", "name"\]/);
  assert.doesNotMatch(result.gml, /var \[/);
  assert.doesNotMatch(result.gml, /var \{/);
});

test("lowers array for-of and struct for-in loops", () => {
  const result = compileTypeScript(`
for (const [index, value] of entries) console.log(index, value);
for (const key in record) console.log(key);
`, "iteration.ts");

  assert.match(result.gml, /for \(var __ts2gml_iteration_values_/);
  assert.match(result.gml, /array_length\(__ts2gml_iteration_values_/);
  assert.match(result.gml, /variable_struct_get_names\(record\)/);
  assert.doesNotMatch(result.gml, /\bof\b|\bin\b/);
});

test("lowers typed gm_with blocks and context assertions", () => {
  const result = compileTypeScript(`
class obj_enemy { health = 10; }
class obj_player {
  score = 0;
  damageEnemies(amount: number) {
    this.gm_with(obj_enemy, (enemy, player) => {
      enemy.health -= amount;
      player.score += 1;
      this.score += 1;
    });
  }
  onCollision_obj_enemy() {
    const player = gm_self<obj_player>();
    const enemy = gm_other<obj_enemy>();
    player.score += 1;
    enemy.health -= 1;
  }
}
`, "with.ts");

  assert.match(result.gml, /with \(obj_enemy\) \{/);
  assert.match(result.gml, /__ts2gml_with_self_\d+_\d+\.health -= _amount;/);
  assert.match(result.gml, /__ts2gml_with_other_\d+_\d+\.score \+= 1;/);
  assert.match(result.gml, /var player = self;/);
  assert.match(result.gml, /var enemy = other;/);
  assert.doesNotMatch(
    result.gml,
    /gm_with|gm_other|function \(enemy, player\)|var enemy = self|var player = other/,
  );
});

test("hoists repeated typed context guards once per function", () => {
  const result = compileTypeScript(`
class obj_entity {}
function inspect() {
  const first = gm_self<obj_entity>();
  if (first.health > 0) {
    const second = gm_self<obj_entity>();
    return second.health;
  }
  return 0;
}
`, "runtime-guards.ts");

  assert.doesNotMatch(result.gml, /__TS2GML_RUNTIME_GUARD_LEVEL/);
  assert.match(
    result.gml,
    /function inspect\(\) \{\s+__ts2gml_guard_object\(self, obj_entity, "self"\);/,
  );
  const inspect = result.gml.slice(result.gml.indexOf("function inspect"));
  assert.equal(inspect.match(/__ts2gml_guard_object/g)?.length, 1);
  assert.equal(inspect.match(/var (?:first|second) = self;/g)?.length, 2);
});

test("keeps explicit instance fields distinct from parameters and locals", () => {
  const result = compileTypeScript(`
class ContextProbe {
  value = 40;
  constructor(value: number) { this.value = value; }
  fromParameter(value: number) { return this.value + value; }
  fromLocal() { const value = 2; return this.value + value; }
}
`, "field-context.ts");

  assert.match(result.gml, /self\.value = 40;/);
  assert.match(result.gml, /self\.value = _value;/);
  assert.match(result.gml, /return self\.value \+ _value;/);
  assert.match(result.gml, /var value = 2;\s+return self\.value \+ value;/);
});

test("binds lexical this before arrows enter struct or array literal context", () => {
  const result = compileTypeScript(`
class ContextProbe {
  value = 40;
  callbacks() {
    const record = { value: 99, read: () => this.value };
    const list = [() => this.value];
    return [record.read, list[0]];
  }
}
`, "literal-arrow-context.ts");

  assert.equal(result.gml.match(/method\(self, function/g)?.length, 2);
  assert.match(result.gml, /read: method\(self, function \(\) \{ return self\.value; \}\)/);
});

test("rewrites nested gm_with contexts without leaking callback aliases", () => {
  const result = compileTypeScript(`
class obj_enemy { health = 10; }
class obj_player {
  score = 0;
  inspect() {
    const enemy = 7;
    this.gm_with(obj_enemy, (enemy, player) => {
      gm_with(obj_enemy, (nestedEnemy, outerEnemy) => {
        nestedEnemy.health -= 1;
        outerEnemy.health -= 2;
        enemy.health -= 3;
        player.score += 4;
        this.score += 5;
      });
    });
    return enemy + this.score;
  }
}
`, "nested-with-context.ts");

  assert.match(result.gml, /var enemy = 7;/);
  assert.equal(result.gml.match(/with \(obj_enemy\) \{/g)?.length, 2);
  assert.match(result.gml, /__ts2gml_with_self_\d+_\d+\.health -= 1;/);
  assert.match(result.gml, /__ts2gml_with_other_\d+_\d+\.health -= 2;/);
  assert.match(result.gml, /__ts2gml_with_self_\d+_\d+\.health -= 3;/);
  assert.match(result.gml, /__ts2gml_with_other_\d+_\d+\.score \+= 4;/);
  assert.match(result.gml, /__ts2gml_with_other_\d+_\d+\.score \+= 5;/);
  assert.match(result.gml, /return enemy \+ self\.score;/);
  assert.doesNotMatch(result.gml, /var (?:nestedEnemy|outerEnemy|player) =/);
  assert.doesNotMatch(result.gml, /other\.other/);
});

test("rejects scopes that would change meaning after GML lowering", () => {
  const invalidSources = [
    [
      "inline-shadow.ts",
      "function inspect() { const value = 1; gm_with(target, () => { const value = 2; }); }",
      "TS2GML1049",
    ],
    [
      "math-shadow.ts",
      "function inspect(Math: { max(): number }) { return Math.max(); }",
      "TS2GML1056",
    ],
    [
      "intrinsic-shadow.ts",
      "function inspect() { const gm_self = 1; return gm_self; }",
      "TS2GML1056",
    ],
    [
      "with-member.ts",
      "class Context { gm_with() {} run() { this.gm_with(); } }",
      "TS2GML1056",
    ],
  ] as const;

  for (const [fileName, source, code] of invalidSources) {
    assert.throws(
      () => compileTypeScript(source, fileName),
      (error: unknown) =>
        error instanceof Ts2GmlError &&
        error.diagnostics.some((diagnostic) => diagnostic.code === code),
    );
  }
});

test("rejects compiler context forms that cannot be emitted inline", () => {
  const invalidSources = [
    ["with-expression.ts", "const result = gm_with(target, () => {});", "TS2GML1044"],
    ["with-concise.ts", "gm_with(target, () => reset());", "TS2GML1044"],
    ["with-return.ts", "gm_with(target, () => { return; });", "TS2GML1044"],
    ["self-argument.ts", "const value = gm_self(target);", "TS2GML1045"],
    ["self-reference.ts", "const getSelf = gm_self;", "TS2GML1045"],
    ["other-argument.ts", "const value = gm_other(target);", "TS2GML1045"],
    ["other-reference.ts", "const getOther = gm_other;", "TS2GML1045"],
  ] as const;

  for (const [fileName, source, code] of invalidSources) {
    assert.throws(
      () => compileTypeScript(source, fileName),
      (error: unknown) =>
        error instanceof Ts2GmlError &&
        error.diagnostics.some((diagnostic) => diagnostic.code === code),
    );
  }
});

test("reports JavaScript features without a safe GML lowering", () => {
  assert.throws(
    () => compileTypeScript("const value = new Factory(...args); const pattern = /x/;", "unsupported.ts"),
    (error: unknown) =>
      error instanceof Ts2GmlError &&
      /unsupported\.ts:1:\d+/.test(error.message) &&
      /Spread syntax/.test(error.message) &&
      /Regular expressions/.test(error.message),
  );
  assert.throws(
    () => compileTypeScript("function read({ value }) { return value; }", "parameters.ts"),
    (error: unknown) =>
      error instanceof Ts2GmlError &&
      /Destructuring parameters/.test(error.message),
  );
  assert.throws(
    () => compileTypeScript("const value = callback?.(argument);", "optional-call.ts"),
    (error: unknown) =>
      error instanceof Ts2GmlError &&
      /Optional calls/.test(error.message),
  );
  assert.throws(
    () => compileTypeScript("const value = record?.[key];", "optional-element.ts"),
    (error: unknown) =>
      error instanceof Ts2GmlError &&
      /Optional element access/.test(error.message),
  );
});

test("rejects JavaScript runtime globals and syntax that would emit invalid GML", () => {
  assert.throws(
    () => compileTypeScript(
      "const task = new Promise(() => undefined); const value = Math.trunc(1.5);",
      "runtime-globals.ts",
    ),
    (error: unknown) => {
      assert.ok(error instanceof Ts2GmlError);
      assert.deepEqual(
        error.diagnostics.map((diagnostic) => diagnostic.code),
        ["TS2GML1033", "TS2GML1034"],
      );
      assert.match(error.message, /runtime global 'Promise'/);
      assert.match(error.message, /Math\.trunc/);
      return true;
    },
  );

  assert.throws(
    () => compileTypeScript(
      "const record = { method() { return 1; } }; function collect(...values) { return values; }",
      "unsafe-syntax.ts",
    ),
    (error: unknown) =>
      error instanceof Ts2GmlError &&
      error.diagnostics.some((diagnostic) => diagnostic.code === "TS2GML1027") &&
      error.diagnostics.some((diagnostic) => diagnostic.code === "TS2GML1026"),
  );

  assert.throws(
    () => compileTypeScript("const math = Math; const output = console;", "bare-runtime.ts"),
    (error: unknown) => {
      assert.ok(error instanceof Ts2GmlError);
      assert.deepEqual(
        error.diagnostics.map((diagnostic) => diagnostic.code),
        ["TS2GML1033", "TS2GML1033"],
      );
      return true;
    },
  );

  assert.throws(
    () => compileTypeScript(
      "function inspect() { { const Promise = constructor; new Promise(); } return Promise; }",
      "block-shadow.ts",
    ),
    (error: unknown) => {
      assert.ok(error instanceof Ts2GmlError);
      assert.equal(error.diagnostics.length, 1);
      assert.equal(error.diagnostics[0]?.code, "TS2GML1033");
      return true;
    },
  );

  const shadowed = compileTypeScript(
    "class Promise { value = 1; } const task = new Promise();",
    "shadowed-global.ts",
  );
  assert.match(shadowed.gml, /new Promise\(\)/);
});

test("lowers do-while loops and bindingless catch clauses to valid GML", () => {
  const result = compileTypeScript(`
function run(limit: number): number {
  let count = 0;
  do {
    count++;
    if (count < limit) continue;
  } while (count < limit);
  try { throw 1; } catch { count += 1; }
  return count;
}
`, "statement-lowering.ts");

  assert.match(result.gml, /for \(var __ts2gml_do_first_/);
  assert.match(result.gml, /__ts2gml_do_first_\d+_\d+ \|\| __ts2gml_value_truthy\(count < limit\)/);
  assert.match(result.gml, /catch \(__ts2gml_caught_/);
  assert.doesNotMatch(result.gml, /\bdo\s*\{|catch\s*\{/);
});

test("initializes top-level runtime declarations in explicit global scope", () => {
  const result = compileTypeScript(`
const value = 1;
const [first, ...rest] = values;
`, "globals.ts");

  assert.match(result.gml, /global\.value = value;/);
  assert.match(result.gml, /global\.first = first;/);
  assert.match(result.gml, /global\.rest = rest;/);
});

test("rejects accepted TypeScript syntax that cannot produce safe GML", () => {
  const invalidSources = [
    ["generator.ts", "function* values() { return 1; }", "TS2GML1057"],
    ["generator-expression.ts", "const values = function* () { return 1; };", "TS2GML1057"],
    ["debugger.ts", "function inspect() { debugger; }", "TS2GML1058"],
    [
      "finally-return.ts",
      "function inspect() { try { return 1; } finally { return 2; } }",
      "TS2GML1059",
    ],
    ["static-block.ts", "class State { static { reset(); } }", "TS2GML1060"],
    ["auto-accessor.ts", "class State { accessor value = 1; }", "TS2GML1060"],
    ["default-expression.ts", "const value = 1; export default value;", "TS2GML1061"],
    [
      "runtime-reexport.ts",
      'export { value } from "./external.js";',
      "TS2GML1061",
    ],
    ["anonymous-default.ts", "export default function () {}", "TS2GML1062"],
    ["dollar-name.ts", "function $invalid() {}", "TS2GML1063"],
    ["reserved-name.ts", "function inspect() { const repeat = 1; }", "TS2GML1063"],
    [
      "internal-name.ts",
      "function inspect() { const __ts2gml_value = 1; }",
      "TS2GML1056",
    ],
    ["quoted-key.ts", 'const value = { "not-an-identifier": 1 };', "TS2GML1064"],
    [
      "super-spread.ts",
      "class Child extends Parent { constructor(values: any[]) { super(...values); } }",
      "TS2GML1065",
    ],
    ["arguments.ts", "function inspect() { return arguments[0]; }", "TS2GML1066"],
    ["top-level-this.ts", "const value = this;", "TS2GML1018"],
    [
      "top-level-reference.ts",
      "const value = 1; function inspect() { return value; }",
      "TS2GML1067",
    ],
    [
      "dynamic-parent.ts",
      "class Child extends selectParent() { constructor() { super(); } }",
      "TS2GML2005",
    ],
    [
      "late-super.ts",
      "class Child extends Parent { constructor() { prepare(); super(); } }",
      "TS2GML2006",
    ],
    [
      "implicit-super.ts",
      "class Child extends Parent {}",
      "TS2GML2007",
    ],
    [
      "missing-super.ts",
      "class Child extends Parent { constructor() {} }",
      "TS2GML2007",
    ],
    [
      "multiple-super.ts",
      "class Child extends Parent { constructor() { super(); super(); } }",
      "TS2GML2007",
    ],
    [
      "standalone-object.ts",
      "class obj_player extends GMObject {}",
      "TS2GML2008",
    ],
    [
      "standalone-room.ts",
      "class Room1 extends GMRoom { onCreate() {} }",
      "TS2GML2008",
    ],
  ] as const;

  for (const [fileName, source, code] of invalidSources) {
    assert.throws(
      () => compileTypeScript(source, fileName),
      (error: unknown) =>
        error instanceof Ts2GmlError &&
        error.diagnostics.some((diagnostic) => diagnostic.code === code),
    );
  }
});
