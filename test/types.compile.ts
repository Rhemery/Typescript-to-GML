/// <reference path="../types/index.d.ts" />

class obj_type_smoke extends GMObject {
  lives = 3;

  protected onCreate(): void {
    this.x = 10;
    this.y = 20;
    draw_set_alpha(1);
    show_debug_message(`position=${this.x},${this.y}`);
  }

  protected onAlarm0(): void {
    this.alarm[0] = 30;
  }

  protected onKeyPress_32(): void {
    const current = gm_self<obj_type_smoke>();
    show_debug_message(gm_typeof(current));
  }

  protected onKeyDown_A(): void {
    show_debug_message("A is down");
  }

  protected onAsyncNetworking(): void {
    show_debug_message(async_load);
  }

  protected onCollision_obj_type_target(target: GMInstance<obj_type_target>): void {
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
  protected override onCreate(): void {
    this.lives = 5;
  }

  protected override onKeyPress_32(): void {}

  protected override onCollision_obj_type_target(target: GMInstance<obj_type_target>): void {
    target.health -= 2;
  }
}

const eventInstance = instance_create_layer(0, 0, "Instances", obj_type_child);
eventInstance.damageTargets();
eventInstance.lives -= 1;
// @ts-expect-error Implemented events are protected.
eventInstance.onCreate();
// @ts-expect-error Inherited events are protected.
eventInstance.onAlarm0();
// @ts-expect-error Unimplemented events are protected as well.
eventInstance.onDraw?.();
// @ts-expect-error Named keyboard events are protected.
eventInstance.onKeyDown_A();
// @ts-expect-error Numeric keyboard events are protected.
eventInstance.onKeyPress_32();
// @ts-expect-error Collision events are protected.
eventInstance.onCollision_obj_type_target(gm_self<obj_type_target>());
// @ts-expect-error Async events cannot be used as callbacks.
const eventCallback = eventInstance.onAsyncNetworking;
// @ts-expect-error Base object references do not expose callable events.
gm_self().onStep?.();
// @ts-expect-error Numeric event fallbacks do not expose callable events.
gm_self().onGesture_0?.();
// @ts-expect-error Collision event fallbacks do not expose callable events.
gm_self().onCollision_obj_type_target?.(gm_self<obj_type_target>());
gm_with(obj_type_child, (target) => {
  target.damageTargets();
  // @ts-expect-error Typed with-block instances do not expose events.
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
