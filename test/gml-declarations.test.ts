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
