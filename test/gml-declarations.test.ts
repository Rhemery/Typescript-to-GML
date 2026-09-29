import assert from "node:assert/strict";
import { test } from "node:test";
import { extractGmlDeclarations } from "../src/declarations/gml.js";
import { mapGmlJsDocType } from "../src/declarations/jsdoc.js";

test("extracts global functions and variables from a GML script", () => {
  const declarations = extractGmlDeclarations(`
// function ignored_comment() {}
function imported_add(_left, _right = choose(1, [2, 3])) {
  global.calls += 1;
  function instance_only() { return 0; }
  enum NestedMode { First, Second }
  var _text = "global.ignored_string function ignored_string() {}";
  return _left + _right;
}
function Vector2(_x, _y) constructor {
  x = _x;
  y = _y;
}
global.player_score = 0;
settings = { difficulty: 2 };
var inventory = [];
globalvar legacy_score, legacy_lives;
global.callback = function(_value) { return _value; };
method_value = function() { return 1; };
#macro MAX_LIVES 3
#macro Windows:GAME_TITLE "Desktop"
#macro HTML5:GAME_TITLE "Browser"
enum ImportedMode { Idle, Running = choose(1, 2), Done }
`);

  assert.deepEqual(declarations.functions, [
    {
      name: "imported_add",
      constructor: false,
      parameters: [
        { name: "_left", optional: false },
        { name: "_right", optional: true },
      ],
    },
    {
      name: "Vector2",
      constructor: true,
      members: { x: "any", y: "any" },
      parameters: [
        { name: "_x", optional: false },
        { name: "_y", optional: false },
      ],
    },
  ]);
  assert.deepEqual(declarations.globals, [
    "callback",
    "calls",
    "inventory",
    "legacy_lives",
    "legacy_score",
    "method_value",
    "player_score",
    "settings",
  ]);
  assert.deepEqual(declarations.globalVariables, ["legacy_lives", "legacy_score"]);
  assert.deepEqual(declarations.macros, [
    { name: "GAME_TITLE", type: "string" },
    { name: "MAX_LIVES", type: "number" },
  ]);
  assert.deepEqual(declarations.enumerations, [
    { name: "ImportedMode", members: ["Idle", "Running", "Done"] },
    { name: "NestedMode", members: ["First", "Second"] },
  ]);
});

test("applies Feather JSDoc to GML function parameters and returns", () => {
  const declarations = extractGmlDeclarations(`
/// @desc Creates a profile.
/// Additional profile details.
/// @param {String} name Profile name.
/// @param {Array<Struct>} effectsArray Effects to render.
/// @returns {Struct} Profile struct.
function PPFX_Profile(_name, _effectsArray) constructor {}

/**
 * @param {Id.DsList} list Values to total.
 * @returns {real, undefined} The total, if present.
 */
function list_total(_list) {}

/// Returns whether a verb has been newly activated in the most recent update loop.
///
/// @param {Enum.INPUT_VERB,Real} verb
/// @param {Real} [playerIndex=0]
function InputPressed(_verb, _playerIndex = 0) {
  static _playerArray = __InputSystemPlayerArray();
  with (_playerArray[_playerIndex].__verbStateArray[_verb]) {
    return ((!__prevHeld) && __held);
  }
}
`);

  assert.deepEqual(declarations.functions, [
    {
      name: "PPFX_Profile",
      constructor: true,
      members: {},
      description: "Creates a profile.\nAdditional profile details.",
      parameters: [
        { name: "_name", optional: false, type: "String", description: "Profile name." },
        {
          name: "_effectsArray",
          optional: false,
          type: "Array<Struct>",
          description: "Effects to render.",
        },
      ],
      returnType: "Struct",
      returnDescription: "Profile struct.",
    },
    {
      name: "list_total",
      constructor: false,
      parameters: [
        { name: "_list", optional: false, type: "Id.DsList", description: "Values to total." },
      ],
      returnType: "real, undefined",
      returnDescription: "The total, if present.",
    },
    {
      name: "InputPressed",
      constructor: false,
      description: "Returns whether a verb has been newly activated in the most recent update loop.",
      parameters: [
        { name: "_verb", optional: false, type: "Enum.INPUT_VERB,Real" },
        { name: "_playerIndex", optional: true, type: "Real" },
      ],
    },
  ]);
  assert.equal(mapGmlJsDocType("String, Array<String>"), "string | Array<string>");
  assert.equal(mapGmlJsDocType("asset.gmsprite"), "GM.Asset.GMSprite");
  assert.equal(mapGmlJsDocType("Enum.INPUT_VERB,Real"), "INPUT_VERB | number");
  assert.equal(mapGmlJsDocType("unknown_project_type"), "any");
});

test("infers native constructor members and global struct literals", () => {
  const declarations = extractGmlDeclarations(`
/// @param {String} label
function Inferred(_label, _count = (2), _unknown = choose(1, 2)) constructor {
  __var = 0;
  a = "str";
  label = _label;
  count = _count;
  unknown = _unknown;
  self.enabled = true;
  negative = -1.5e2;
  hex = $ff;
  raw = @"text";
  nested = { value: 1, info: { text: "ok" }, values: [1, 2], mixed: [1, "two"] };
  static callback = function() { hidden = 2; };
  var local = 1, second = 2;
  local = 3;
  second = 4;
  global.counter = 1;
  other.foreign = 2;
  nested.value = 3;
  with (other) { scoped = 5; }
  with (other) unbraced = 6;
  with (other) self.unbraced_self = 7;
  if (false) conditional = 8;
  other.self.foreign_self = 9;
  dynamic = choose(1, "two");
  expression = 1 + "two";
  changed = 1;
  changed = "now text";
}
global.infer_struct = {
  __ee: 0,
  b: "dd",
}
settings = { active: false };
var options = { title: 'Title' };
global.read_only;
`);
  assert.deepEqual(declarations.functions[0]?.members, {
    __var: "number", a: "string", label: "string", count: "number", unknown: "any",
    enabled: "boolean", negative: "number", hex: "number", raw: "string",
    nested: "GMStruct & { value: number; info: GMStruct & { text: string; }; values: Array<number>; mixed: Array<number | string>; }",
    callback: "GMFunction", dynamic: "any", expression: "any", changed: "any",
  });
  assert.equal(declarations.globalTypes.get("infer_struct"), "GMStruct & { __ee: number; b: string; }");
  assert.equal(declarations.globalTypes.get("settings"), "GMStruct & { active: boolean; }");
  assert.equal(declarations.globalTypes.get("options"), "GMStruct & { title: string; }");
  assert.equal(declarations.globalTypes.get("read_only"), undefined);
  assert.deepEqual(declarations.functions[0]?.parameters, [
    { name: "_label", optional: false, type: "String" },
    { name: "_count", optional: true, inferredType: "number" },
    { name: "_unknown", optional: true },
  ]);
});

test("handles semicolonless members and keeps uncertain initializers permissive", () => {
  const declarations = extractGmlDeclarations(`
/// @param {Mixed} value
function Semicolonless(_value = 1) constructor {
  first = 0
  second = "str"
  self.third = false
  fourth = { inner: [true, false] }
  untyped = _value
  invoked = function() { return 1; }()
  computed = [1] + [2]
}
global.uncertain = { known: 1 };
global.uncertain = load_data();
global.repeated = { same: true };
global.repeated = { same: false };
global.computed = { a: 1 } ?? { a: 2 };
`);
  assert.deepEqual(declarations.functions[0]?.members, {
    first: "number", second: "string", third: "boolean",
    fourth: "GMStruct & { inner: Array<boolean>; }",
    untyped: "any", invoked: "any", computed: "any",
  });
  assert.equal(declarations.globalTypes.get("uncertain"), "any");
  assert.equal(declarations.globalTypes.get("repeated"), "GMStruct & { same: boolean; }");
  assert.equal(declarations.globalTypes.get("computed"), "any");
});

test("infers global literals without discarding primitive, array, and function types", () => {
  const declarations = extractGmlDeclarations(`
global.score = 0;
global.title = @"Game";
global.enabled = true;
global.values = [1, 2];
global.empty = [];
global.callback = function() { return 1; };
global.missing = undefined;
var lives = 3, label = "Player";
globalvar legacy;
legacy = false;
global.changed = 1;
global.changed = "now text";
global.dynamic = load_value();
global.same = 1;
global.same = 2;
global.same += 1;
global.read_only;
other.global.not_a_global = 1;
`);
  assert.deepEqual(Object.fromEntries(declarations.globalTypes), {
    score: "number", title: "string", enabled: "boolean", values: "Array<number>",
    empty: "Array<any>", callback: "GMFunction", missing: "undefined",
    lives: "number", label: "string", legacy: "boolean", changed: "any",
    dynamic: "any", same: "number",
  });
  assert.ok(!declarations.globals.includes("not_a_global"));
});

test("extracts explicit globals from events without declaring instance or local variables", () => {
  const declarations = extractGmlDeclarations(`
health = 100;
var local = 2;
function instance_method() { global.from_method = [true, false]; }
if (true) { global.from_event = 12; }
globalvar legacy;
legacy = "text";
`, false);
  assert.deepEqual(declarations.functions, []);
  assert.deepEqual(declarations.globals, ["from_event", "from_method", "legacy"]);
  assert.deepEqual(Object.fromEntries(declarations.globalTypes), {
    from_method: "Array<boolean>", from_event: "number", legacy: "string",
  });
});
