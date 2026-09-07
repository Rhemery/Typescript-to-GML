# Authoring guide

## Scripts and functions

Top-level functions become global GML functions in a Script resource named after the source file.

```ts
function approach(current: number, target: number, amount: number): number {
  if (current < target) return min(current + amount, target);
  return max(current - amount, target);
}
```

Use GameMaker runtime functions directly. They are global declarations; no runtime import is needed or allowed. Type-only imports are permitted when they erase completely.

## Structs and constructors

Object literals become GML structs. Normal classes become constructor functions.

```ts
class DamageRoll {
  constructor(
    public amount: number,
    public critical: boolean,
  ) {}

  scaled(multiplier: number): number {
    return this.amount * multiplier;
  }
}
```

For ordinary class inheritance, a derived constructor must contain one explicit `super(...)` call as its first statement. Static fields and methods are supported on ordinary and GMObject classes. Accessors, private fields, decorators, and static initialization blocks remain unsupported.

## GameMaker objects

A top-level class extending `GMObject` creates or updates an object asset. The class name is the asset name.

```ts
class obj_enemy extends GMObject {
  health = 20;

  protected onCreate() {
    this.image_speed = 0.2;
  }

  protected onAlarm0() {
    instance_destroy(this.id);
  }

  protected onCollision_obj_bullet(other: GMInstance<obj_bullet>) {
    this.health -= other.damage;
  }
}
```

Class fields become Object Variables initialized in PreCreate. Event methods generate their corresponding GameMaker event `.gml` files directly. Non-event methods and constructor statements are installed during Create. Collision event names are checked against project object assets, and their optional `other` parameter is compiler-only.

Declare every object event as `protected`, including numeric and collision events. TypeScript rejects calls through object instances, and project checks reject direct event calls or references inside object code as well. Use regular methods for shared logic, or GameMaker's `event_perform`, `event_user`, and `event_inherited` functions for explicit event dispatch. Protected visibility allows child objects to override events; TypeScript private methods would prevent those overrides.

Supported events include fixed Step, Draw, Mouse, Gesture, Other, and Async event names; alarms and user events; readable keyboard names such as `onKeyDown_A`; numeric keyboard forms; and project-aware collision methods.

An authored object may extend another authored object. The generated child points at its parent and begins Create with `event_inherited()`. If a class directly extends `GMObject`, a parent selected manually in the IDE is retained.

Configure sprites, masks, persistence, visibility, solidity, physics, and similar Object resource properties in GameMaker. The compiler preserves these settings after the asset exists.

Changing only a method body is safe during `watch`. Adding or removing an event, field, object, or source folder changes GameMaker resource structure; save GameMaker and press Enter when the watcher asks to apply it.

## Existing rooms

Use a class whose name exactly matches an existing room asset:

```ts
class rm_game extends GMRoom {
  onCreate() {
    show_debug_message("Room started");
  }
}
```

`GMRoom` classes may define only `onCreate`. The compiler writes the implementation directly to `rooms/rm_game/RoomCreationCode.gml` and links it from the existing room; it does not create the room or take ownership of the room resource. Existing manual creation code is never overwritten.

## Global values

Top-level runtime variables are initialized on GameMaker's `global` struct. Declare the known shape by extending `GMGlobal`, then use `gm_global` in source:

```ts
interface GMGlobal {
  score: number;
}

let score = 0;

function addScore(amount: number) {
  gm_global.score += amount;
}
```

Top-level bare variable references are rejected because their GML scope would be ambiguous. Top-level functions, constructors, and macros remain global symbols.

GameMaker keywords and context values use authoring aliases: `gm_typeof(...)`, `gm_instanceof(...)`, `gm_self<T>()`, and `gm_global` emit `typeof`, `instanceof`, `self`, and `global`.

## Macros

`gm_macro` is valid only as the direct initializer of a top-level `const`. The string is raw, single-line GML, not a JavaScript value evaluated by the compiler.

```ts
const PLAYER_SPEED = gm_macro<number>("4");
const GAME_TITLE = gm_macro<string>('"My Game"');
const SERVICE_ID = gm_macro<string>('""', {
  Android: '"android-id"',
  iOS: '"ios-id"',
});
```

## Native `with` and `other`

Use `gm_with` as a standalone statement with an inline block:

```ts
this.gm_with(obj_enemy, (enemy, caller) => {
  enemy.health -= 1;
  caller.score += 10;
});
```

It emits a native GML `with` statement. In an object method, `this.gm_with` infers the caller type. In a script or room, use the global generic form when needed. Callback parameters map to GML `self` and `other`, may capture enclosing locals, and are not emitted as a runtime function.

Use `gm_self<obj_player>()` or `gm_other<obj_enemy>()` when a context reference needs an authoring-time type. They emit bare `self` or `other`, plus one runtime object check per distinct context/type pair at the start of the containing execution scope under the default `standard` guard level. See [runtime type guards](Runtime-Guards.md) for run/build profiles and maximum collection checks.

## Unmanaged GML interoperability

Existing IDE-created assets are declared but never adopted as generated resources. Top-level functions in unmanaged GML Scripts become TypeScript functions. Feather `///` JSDoc with `@param` and `@returns` can improve their types; malformed or unknown types fall back to `any`.

Script-scope variables and `global.name` assignments extend `GMGlobal`; legacy `globalvar` declarations become bare globals. Functions defined inside object events are intentionally not declared globally because GameMaker keeps them in instance scope.
