/// <reference path="../types/index.d.ts" />

class GlobalWeapon {
  damage = 10;
}
interface GlobalSettings {
  title: string;
  weapons: GlobalWeapon[];
}
declare global {
  interface GMGlobal {
    weapon: GlobalWeapon;
    settings: GlobalSettings;
  }
}
gm_global.weapon = new GlobalWeapon();
gm_global.settings = { title: "Game", weapons: [gm_global.weapon] };
const globalDamage: number = gm_global.weapon.damage;
// @ts-expect-error Declared global members retain their types.
gm_global.weapon = "wrong";
// @ts-expect-error Declared interface members retain their types.
gm_global.settings.title = 1;
gm_global.dynamicWeapon = new GlobalWeapon();
// @ts-expect-error Undeclared globals need a GMGlobal member or narrowing before use.
const unknownWeapon: GlobalWeapon = gm_global.undeclaredWeapon;

const emptyEvents: GMObjectEvents = {};
const objectEvents: GMObjectEvents = {
  onCreate() {},
  onAlarm11() {},
  onUserEvent15() {},
  onKeyDown_A() {},
  onKeyPressed_Space() {},
  onKeyUp_F12() {},
  onMouseLeftPressed() {},
  onGlobalMouseLeftPressed() {},
  onGestureTap() {},
  onGlobalGestureTap() {},
  onRoomStart() {},
  onOutsideView7() {},
  onBoundaryView7() {},
  onAsyncNetworking() {},
  onDrawGUIEnd() {},
  onCleanUp() {},
};
class ObjectEventsTypeSmoke implements GMObjectEvents {
  onStep(): void {}
}
const baseObjectEvents: GMObjectEvents = gm_self();
// @ts-expect-error Object instance fields are not events.
const eventPosition: keyof GMObjectEvents = "x";
// @ts-expect-error Runtime fields starting with on are not events.
const eventLayer: keyof GMObjectEvents = "on_ui_layer";
// @ts-expect-error Instance helpers are not events.
const eventHelper: keyof GMObjectEvents = "gm_with";
// @ts-expect-error Unknown named events are not accepted.
const unknownEvent: keyof GMObjectEvents = "onUnknown";
// @ts-expect-error Alarms stop at 11.
const invalidAlarm: keyof GMObjectEvents = "onAlarm12";
// @ts-expect-error User events stop at 15.
const invalidUserEvent: keyof GMObjectEvents = "onUserEvent16";
// @ts-expect-error Event handlers cannot require arguments.
const invalidEvents: GMObjectEvents = { onStep(value: number) {} };

class obj_type_smoke extends GMObject {
  lives = 3;

  onCreate(): void {
    this.x = 10;
    this.y = 20;
    draw_set_alpha(1);
    show_debug_message(`position=${this.x},${this.y}`);
  }

  onAlarm0(): void {
    this.alarm[0] = 30;
  }

  onKeyPress_32(): void {
    const current = gm_self<obj_type_smoke>();
    show_debug_message(gm_typeof(current));
  }

  onKeyDown_A(): void {
    show_debug_message("A is down");
  }

  onAsyncNetworking(): void {
    show_debug_message(async_load);
  }

  onCollision_obj_type_target(target: GMInstance<obj_type_target>): void {
    target.health -= 1;
  }

  damageTargets(): void {
    this.gm_with(obj_type_target, (target, caller) => {
      target.health -= 1;
      caller.lives -= 1;
    });
  }
}

class obj_type_target extends GMObject {
  health = 10;
}

class obj_type_child extends obj_type_smoke {
  override onCreate(): void {
    this.lives = 5;
  }

  override onKeyPress_32(): void {}

  override onCollision_obj_type_target(target: GMInstance<obj_type_target>): void {
    target.health -= 2;
  }
}

const eventInstance = instance_create_layer(0, 0, "Instances", obj_type_child);
eventInstance.damageTargets();
eventInstance.lives -= 1;
// Event members remain public for authoring and overrides. Project checks reject these accesses.
eventInstance.onCreate();
eventInstance.onAlarm0();
eventInstance.onDraw?.();
eventInstance.onKeyDown_A();
eventInstance.onKeyPress_32();
eventInstance.onCollision_obj_type_target(gm_self<obj_type_target>());
const eventCallback = eventInstance.onAsyncNetworking;
gm_self().onStep?.();
// @ts-expect-error Numeric events must be declared on the concrete object.
gm_self().onGesture_0?.();
// @ts-expect-error Collision declarations require a GameMaker project.
gm_self().onCollision_obj_type_target?.(gm_self<obj_type_target>());
gm_with(obj_type_child, (target) => {
  target.damageTargets();
  target.onCreate();
});

class RoomTypeSmoke extends GMRoom {
  onCreate(): void {
    room_goto(RoomTypeSmoke);
  }
}

const instance: GM.Id.Instance = instance_create_layer(0, 0, "Instances", 0);
const authoredAsset: GM.Asset.GMObject = obj_type_target;
const authoredInstance = instance_create_layer(0, 0, "Instances", obj_type_target, { health: 20 });
authoredInstance.health -= 1;
const key: GM.Constant.VirtualKey = vk_space;
const timeSource = time_source_create(
  time_source_global,
  1,
  time_source_units_frames,
  () => undefined,
);
const expiryType: GM.Constant.TimeSourceExpiryType = time_source_expire_after;
// @ts-expect-error An expiry mode is not a time-source ID or parent constant.
time_source_create(expiryType, 1, time_source_units_frames, () => undefined);
const macroValue: number = gm_macro<number>("4", { Debug: "8" });
class NativeStaticTypes {
  value = gm_static(() => 4);
  data = gm_static(() => ({ label: "shared" }));
}
const nativeStaticTypes = new NativeStaticTypes();
const nativeStaticNumber: number = nativeStaticTypes.value;
const nativeStaticLabel: string = nativeStaticTypes.data.label;
// @ts-expect-error Native static fields retain their inferred instance type.
nativeStaticTypes.value = "wrong";
// @ts-expect-error Native static storage does not declare a TypeScript class member.
NativeStaticTypes.value;
// @ts-expect-error An explicit field type constrains the factory result.
gm_static<number>(() => "wrong");
const numberList = ds_list_create<number>();
ds_list_add(numberList, 1);
const listValue: number | undefined = ds_list_find_value(numberList, 0);
// @ts-expect-error A number list does not accept strings.
ds_list_add(numberList, "one");
const scoreMap = ds_map_create<string, number>();
ds_map_set(scoreMap, "score", 1);
const score: number | undefined = ds_map_find_value(scoreMap, "score");
// @ts-expect-error Map keys retain their declared type.
ds_map_set(scoreMap, 1, 1);
// @ts-expect-error Map values retain their declared type.
ds_map_set(scoreMap, "score", "one");
const unknownList = ds_list_create();
const unknownListValue = ds_list_find_value(unknownList, 0);
// @ts-expect-error Untyped data structures return unknown values.
const knownUnknownListValue: number = unknownListValue;
const unknownMap = new Map();
const unknownMapValue = unknownMap.get("score");
// @ts-expect-error An untyped JavaScript-style map also returns unknown values.
const knownUnknownMapValue: number = unknownMapValue;
const deletableMap = new Map<"score", number>();
delete deletableMap["score"];
const deletableSet = new Set<"ready">();
delete deletableSet["ready"];
const typedList = new List<number>();
typedList.add(1).set(0, 2);
// @ts-expect-error JavaScript-style collections preserve their element type.
typedList.add("one");
const typedGrid = new Grid<string>(2, 2);
typedGrid.set(0, 0, "cell");
const typedQueue = new Queue<number>();
typedQueue.enqueue(1);
const typedStack = new Stack<number>();
typedStack.push(1);
const typedPriority = new PriorityQueue<string>();
typedPriority.add("urgent", 10);

void instance;
void authoredAsset;
void authoredInstance;
void key;
void timeSource;
void expiryType;
void macroValue;
void listValue;
void score;
void knownUnknownListValue;
void knownUnknownMapValue;
void typedGrid;
void typedQueue;
void typedStack;
void typedPriority;
void RoomTypeSmoke;

const nativeNumbers = array_create(3, 0);
array_set(nativeNumbers, 0, 7);
const nativeFirst: number | undefined = array_first(nativeNumbers);
// @ts-expect-error A native number array does not accept strings.
array_set(nativeNumbers, 0, "seven");
// @ts-expect-error Pushed values must match the existing array.
array_push(nativeNumbers, "seven");
const nativeMapped: string[] = array_map(nativeNumbers, (value) => string(value));
// @ts-expect-error An in-place map must retain the element type.
array_map_ext(nativeNumbers, (value) => string(value));
void nativeFirst;
void nativeMapped;

// Native arrays can contain authored interfaces, classes, and unconstrained values.
const nativeSettings: GlobalSettings[] = [{ title: "Game", weapons: [new GlobalWeapon()] }];
const nativeWeapons = [new GlobalWeapon()];
const nativeUnknowns: unknown[] = nativeSettings;
const nativeArrayLength: <T>(values: readonly T[]) => number = array_length;
declare const nativeArrayUnion: number[] | string[];
array_length(nativeArrayUnion);
array_resize(nativeArrayUnion, 2);
array_delete(nativeArrayUnion, 0, 1);
array_equals(nativeArrayUnion, nativeSettings);
array_length(nativeSettings);
array_length(nativeWeapons);
array_length(nativeUnknowns);
array_length([nativeSettings]);
array_length_1d(nativeSettings);
array_length_2d([nativeSettings], 0);
array_height_2d([nativeSettings]);
array_delete(nativeSettings, 0, 1);
array_resize(nativeSettings, 2);
array_reverse_ext(nativeSettings);
array_shuffle_ext(nativeSettings);
array_unique_ext(nativeSettings);
array_equals(nativeSettings, nativeWeapons);
array_contains_ext(nativeSettings, nativeSettings);
const nativeUnion: (GlobalSettings | GlobalWeapon)[] = array_union(nativeSettings, nativeWeapons);
const nativeIntersection: GlobalSettings[] = array_intersection(nativeSettings, nativeWeapons);
const nativeCopy: GlobalSettings[] = array_copy_while(nativeSettings, (value, index) => value.title.length > index);
array_all(nativeSettings, (value) => value.title.length > 0);
array_any(nativeSettings, (value) => value.weapons.length > 0);
array_find_index(nativeSettings, (value) => value.title === "Game");
array_foreach(nativeSettings, (value, index) => {
  const title: string = value.title;
  const position: number = index;
  // @ts-expect-error Array callbacks retain the element type.
  const damage: number = value.damage;
  void title;
  void position;
  void damage;
});
array_reduce(nativeSettings, (previous, value) => previous + value.title.length, 0);
const nativeFiltered: GlobalSettings[] = array_filter(nativeSettings, (value) => value.title.length > 0);
const nativeTitles: string[] = array_map(nativeSettings, (value) => value.title);
const nativeReadonly: readonly GlobalSettings[] = nativeSettings;
array_length(nativeReadonly);
array_all(nativeReadonly, (value) => value.title.length > 0);
array_equals(nativeReadonly, nativeWeapons);
array_copy(nativeSettings, 0, nativeReadonly, 0, 1);
// @ts-expect-error Length requires an array.
array_length({ length: 1 });
// @ts-expect-error Mutating functions require a mutable array.
array_resize(nativeReadonly, 1);
// @ts-expect-error Copied elements must match the destination array.
array_copy(nativeSettings, 0, nativeWeapons, 0, 1);
// @ts-expect-error Predicates must return a boolean.
array_all(nativeSettings, (value) => value.title);

// Runtime argument arrays must also accept authored values without an index signature.
method_call(() => {}, nativeSettings);
script_execute_ext(() => {}, nativeWeapons);
show_debug_message_ext("{0}", nativeSettings);
string_concat_ext(nativeSettings);
string_join_ext(",", nativeWeapons);
string_ext("{0}", nativeUnknowns);
time_source_create(time_source_global, 1, time_source_units_frames, () => {}, nativeSettings);
// @ts-expect-error Runtime argument arrays still require an array.
method_call(() => {}, { title: "Game" });
// @ts-expect-error Explicitly typed runtime arrays retain their element constraints.
shader_set_uniform_i_array(0, nativeSettings);
void nativeUnion;
void nativeIntersection;
void nativeCopy;
void nativeFiltered;
void nativeTitles;
void nativeArrayLength;
