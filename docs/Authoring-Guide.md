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

Constructors written in unmanaged GML scripts also get a named TypeScript interface. For example, `function Inventory() constructor { count = 0; }` makes `new Inventory().count` a `number`, and `Inventory` can be used as a type. Direct constructor assignments and global struct literals infer members from primitive literals, arrays, nested structs, and documented or defaulted parameters. Expressions that cannot be resolved remain `any`; inferred structs retain the dynamic member access provided by `GMStruct`.

## GameMaker objects

A top-level class extending `GMObject` creates or updates an object asset. The class name is the asset name.

```ts
class obj_enemy extends GMObject {
  health = 20;

  onCreate() {
    this.image_speed = 0.2;
  }

  onAlarm0() {
    instance_destroy(this.id);
  }

  onCollision_obj_bullet(other: GMInstance<obj_bullet>) {
    this.health -= other.damage;
  }
}
```

Class fields become Object Variables initialized in PreCreate. Event methods generate their corresponding GameMaker event `.gml` files directly. Non-event methods and constructor statements are installed during Create. Collision event names are checked against project object assets, and their optional `other` parameter is compiler-only.

Declare object events as ordinary public methods, including numeric and collision events. The compiler rejects direct event calls and references during project checks and builds, both through object instances and inside object code. Child objects can override events. Use regular methods for shared logic, or GameMaker's `event_perform`, `event_user`, and `event_inherited` functions for explicit event dispatch.

Supported events include fixed Step, Draw, Mouse, Gesture, Other, and Async event names; alarms and user events; readable keyboard names such as `onKeyDown_A`; numeric keyboard forms; and project-aware collision methods.

`GMObjectEvents` contains all predefined optional event methods and the typed collision events generated for the current project. `GMObject` inherits this interface. Use `keyof GMObjectEvents` for the declared event names without instance fields or helpers. Numeric event forms remain declared on the concrete object class.

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

## Top-level locals and global values

Top-level `let`, `const`, and `var` declarations emit GML locals. Later top-level statements in the same file can read and update them during script initialization:

```ts
const baseDamage = 10;
let damage = baseDamage + 2;
damage += 1;
show_debug_message(damage);
```

These locals are not captured by functions, constructors, or object events, and cannot be read from another source file. Such references report `TS2GML1067`; pass the value as an argument or use an explicit global when it must outlive script initialization. Top-level functions, constructors, and macros remain global symbols.

If the file also defines its namesake `GMObject` or `GMRoom` class, initialization statements go into a companion `_init` script (or the existing `_statics` script when the object has statics). They run during script initialization, before object and room creation events.

For a persistent global, declare its type by extending `GMGlobal`, then initialize and access it through `gm_global`:

```ts
interface GMGlobal {
  score: number;
}

gm_global.score = 0;

function addScore(amount: number) {
  gm_global.score += amount;
}
```

Earlier compiler versions automatically copied top-level variables onto `global`. Replace such initializers with explicit `gm_global.name = value` assignments when upgrading code that depends on that behavior.

For globals assigned inside an event or function, declare the member on `GMGlobal` and assign through `gm_global`. Members can use your own classes and interfaces without a `GMValue` index signature:

```ts
interface GMGlobal {
  weapon: Weapon;
}

// For example, inside an object's onCreate:
gm_global.weapon = new Weapon(/* constructor arguments */);
```

Keep these declarations in a normal game `.ts` file or a `.d.ts` file included by the game's `tsconfig.json`. An assignment or `as Weapon` assertion alone does not declare a persistent global type for other functions and files. Undeclared members are `unknown` until narrowed or declared on `GMGlobal`.

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

You can create and store functions inside the block. A callback using native instance variables runs in the selected instance's context:

```ts
gm_with<oProjectile>(
  instance_create_depth(this.x, this.y, this.depth, oProjectile),
  (self) => {
    self.on_step = () => {
      x += lengthdir_x(5, direction);
      y += lengthdir_y(5, direction);
    };
  },
);
```

Stored callbacks have their own function scope and may use `return`. They can capture enclosing parameters and function-body locals, as well as the inline block's `self`/`other` parameters and directly declared locals. Each selected instance receives separate storage for the block's bindings. A captured arrow keeps the enclosing object's lexical `this` separate from native instance variables and `gm_self<ObjectType>()`, which refer to the selected instance. A `return` directly in the inline `gm_with` block remains unsupported.

Captures remain shared after the `gm_with` block and its enclosing function finish. See [closures](Supported-Language.md#closures) for examples and the supported lifetime rules.

Use `gm_self<obj_player>()` or `gm_other<obj_enemy>()` when a context reference needs an authoring-time type. They emit bare `self` or `other`, plus one runtime object check per distinct context/type pair at the start of the containing execution scope under the default `standard` guard level. See [runtime type guards](Runtime-Guards.md) for run/build profiles and maximum collection checks.

## Unmanaged GML interoperability

Existing IDE-created assets are declared but never adopted as generated resources. Top-level functions in unmanaged GML Scripts become TypeScript functions. Feather `///` JSDoc with `@param` and `@returns` can improve their types; malformed or unknown types fall back to `any`.

Script-scope variables and `global.name` assignments extend `GMGlobal`; legacy `globalvar` declarations become bare globals. The compiler also reads explicit globals in unmanaged object events, room and instance creation code, and timelines. Functions and ordinary variables defined inside those events stay instance or local scoped.

Literal initializers infer numbers, strings, booleans, arrays, functions, and struct members. Unknown expressions or conflicting assignments fall back to `any`. Native GML edits refresh these declarations during `build`, `check`, and `watch`; generated GML recorded in the compiler manifest is excluded.
