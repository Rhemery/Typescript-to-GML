type GMPrimitive = number | string | boolean | null | undefined;
type GMFunction = (...args: any[]) => any;
type GMConstructor<T = any> = abstract new (...args: any[]) => T;
type GMValue = GMPrimitive | GMStruct | GMFunction | GMConstructor | GMValue[];

interface GMStruct {
  [name: string]: GMValue;
}

interface GMGlobal extends GMStruct {}

interface Console {
  log(...values: any[]): void;
  warn(...values: any[]): void;
  error(...values: any[]): void;
}

declare var console: Console;

/** A JavaScript-style list backed by a native GameMaker DS list. Call destroy when finished. */
declare class List<T = unknown> {
  constructor(values?: readonly T[]);
  readonly length: number;
  readonly size: number;
  add(value: NoInfer<T>): this;
  clear(): void;
  destroy(): void;
  get(index: number): T | undefined;
  has(value: NoInfer<T>): boolean;
  indexOf(value: NoInfer<T>): number;
  insert(index: number, value: NoInfer<T>): this;
  pop(): T | undefined;
  push(value: NoInfer<T>): number;
  remove(index: number): boolean;
  set(index: number, value: NoInfer<T>): this;
  shift(): T | undefined;
  shuffle(): this;
  sort(ascending?: boolean): this;
  toArray(): T[];
}

/** A JavaScript-style two-dimensional collection backed by a native GameMaker DS grid. */
declare class Grid<T = unknown> {
  constructor(width: number, height: number);
  readonly height: number;
  readonly width: number;
  add(x: number, y: number, value: NoInfer<T>): this;
  clear(value: NoInfer<T>): void;
  destroy(): void;
  get(x: number, y: number): T | undefined;
  has(value: NoInfer<T>): boolean;
  multiply(x: number, y: number, value: NoInfer<T>): this;
  remove(x: number, y: number): boolean;
  resize(width: number, height: number): this;
  set(x: number, y: number, value: NoInfer<T>): this;
  shuffle(): this;
  sort(column: number, ascending?: boolean): this;
}

/** A FIFO collection backed by a native GameMaker DS queue. */
declare class Queue<T = unknown> {
  constructor(values?: readonly T[]);
  readonly size: number;
  clear(): void;
  dequeue(): T | undefined;
  destroy(): void;
  enqueue(value: NoInfer<T>): this;
  head(): T | undefined;
  tail(): T | undefined;
}

/** A LIFO collection backed by a native GameMaker DS stack. */
declare class Stack<T = unknown> {
  constructor(values?: readonly T[]);
  readonly size: number;
  clear(): void;
  destroy(): void;
  peek(): T | undefined;
  pop(): T | undefined;
  push(value: NoInfer<T>): this;
}

/** A priority-ordered collection backed by a native GameMaker DS priority queue. */
declare class PriorityQueue<T = unknown> {
  constructor(entries?: readonly (readonly [T, number])[]);
  readonly size: number;
  add(value: NoInfer<T>, priority: number): this;
  changePriority(value: NoInfer<T>, priority: number): this;
  clear(): void;
  deleteMax(): T | undefined;
  deleteMin(): T | undefined;
  destroy(): void;
  getPriority(value: NoInfer<T>): number | undefined;
  max(): T | undefined;
  min(): T | undefined;
  remove(value: NoInfer<T>): boolean;
}

/** Adds strict empty-constructor inference and explicit DS cleanup to JavaScript Map. */
type GMMap<K = unknown, V = unknown> = Map<K, V> & (
  [K] extends [PropertyKey] ? { [P in K]?: never } : {}
);

interface MapConstructor {
  new <K = unknown, V = unknown>(
    entries?: readonly (readonly [K, V])[] | null,
  ): GMMap<K, V>;
}

interface Map<K, V> {
  destroy(): void;
  remove(key: NoInfer<K>): boolean;
}

/** Adds strict empty-constructor inference and explicit DS cleanup to JavaScript Set. */
type GMSet<T = unknown> = Set<T> & (
  [T] extends [PropertyKey] ? { [P in T]?: never } : {}
);

interface SetConstructor {
  new <T = unknown>(values?: readonly T[] | null): GMSet<T>;
}

interface Set<T> {
  destroy(): void;
  remove(value: NoInfer<T>): boolean;
}

/**
 * Defines a global GameMaker macro from raw GML source text.
 * This compiler intrinsic is only valid as the initializer of a top-level const declaration.
 */
declare function gm_macro<T = GMValue>(
  value: string,
  configurations?: { readonly [configuration: string]: string },
): T;

interface GMRoomClass {
  readonly __ts2gmlRoomClass: true;
}

/** Base class used only by typescript-to-gml to define creation code for an existing room asset. */
declare abstract class GMRoom {
  static readonly __ts2gmlRoomClass: true;
  abstract onCreate(): void;
}

/**
 * Base class used only by typescript-to-gml to define a GameMaker object asset.
 * Declare event implementations as protected; GameMaker dispatches them automatically.
 */
declare abstract class GMObject {
  protected onCreate?(): void;
  protected onDestroy?(): void;
  protected onCleanUp?(): void;
  protected onStep?(): void;
  protected onBeginStep?(): void;
  protected onEndStep?(): void;
  protected onDraw?(): void;
  protected onDrawGUI?(): void;
  protected onDrawResize?(): void;
  protected onDrawBegin?(): void;
  protected onDrawEnd?(): void;
  protected onDrawGUIBegin?(): void;
  protected onDrawGUIEnd?(): void;
  protected onPreDraw?(): void;
  protected onPostDraw?(): void;
  protected onOutsideRoom?(): void;
  protected onBoundary?(): void;
  protected onGameStart?(): void;
  protected onGameEnd?(): void;
  protected onRoomStart?(): void;
  protected onRoomEnd?(): void;
  protected onAnimationEnd?(): void;
  protected onAnimationUpdate?(): void;
  protected onAnimationEvent?(): void;
  protected onPathEnd?(): void;
  protected onOutsideView0?(): void;
  protected onOutsideView1?(): void;
  protected onOutsideView2?(): void;
  protected onOutsideView3?(): void;
  protected onOutsideView4?(): void;
  protected onOutsideView5?(): void;
  protected onOutsideView6?(): void;
  protected onOutsideView7?(): void;
  protected onBoundaryView0?(): void;
  protected onBoundaryView1?(): void;
  protected onBoundaryView2?(): void;
  protected onBoundaryView3?(): void;
  protected onBoundaryView4?(): void;
  protected onBoundaryView5?(): void;
  protected onBoundaryView6?(): void;
  protected onBoundaryView7?(): void;
  protected onAlarm0?(): void;
  protected onAlarm1?(): void;
  protected onAlarm2?(): void;
  protected onAlarm3?(): void;
  protected onAlarm4?(): void;
  protected onAlarm5?(): void;
  protected onAlarm6?(): void;
  protected onAlarm7?(): void;
  protected onAlarm8?(): void;
  protected onAlarm9?(): void;
  protected onAlarm10?(): void;
  protected onAlarm11?(): void;
  protected onUserEvent0?(): void;
  protected onUserEvent1?(): void;
  protected onUserEvent2?(): void;
  protected onUserEvent3?(): void;
  protected onUserEvent4?(): void;
  protected onUserEvent5?(): void;
  protected onUserEvent6?(): void;
  protected onUserEvent7?(): void;
  protected onUserEvent8?(): void;
  protected onUserEvent9?(): void;
  protected onUserEvent10?(): void;
  protected onUserEvent11?(): void;
  protected onUserEvent12?(): void;
  protected onUserEvent13?(): void;
  protected onUserEvent14?(): void;
  protected onUserEvent15?(): void;
  protected onMouseLeftButton?(): void;
  protected onMouseRightButton?(): void;
  protected onMouseMiddleButton?(): void;
  protected onMouseNoButton?(): void;
  protected onMouseLeftPressed?(): void;
  protected onMouseRightPressed?(): void;
  protected onMouseMiddlePressed?(): void;
  protected onMouseLeftReleased?(): void;
  protected onMouseRightReleased?(): void;
  protected onMouseMiddleReleased?(): void;
  protected onMouseEnter?(): void;
  protected onMouseLeave?(): void;
  protected onMouseWheelUp?(): void;
  protected onMouseWheelDown?(): void;
  protected onGlobalMouseLeftButton?(): void;
  protected onGlobalMouseRightButton?(): void;
  protected onGlobalMouseMiddleButton?(): void;
  protected onGlobalMouseLeftPressed?(): void;
  protected onGlobalMouseRightPressed?(): void;
  protected onGlobalMouseMiddlePressed?(): void;
  protected onGlobalMouseLeftReleased?(): void;
  protected onGlobalMouseRightReleased?(): void;
  protected onGlobalMouseMiddleReleased?(): void;
  protected onGestureTap?(): void;
  protected onGestureDoubleTap?(): void;
  protected onGestureDragStart?(): void;
  protected onGestureDragging?(): void;
  protected onGestureDragEnd?(): void;
  protected onGestureFlick?(): void;
  protected onGesturePinchStart?(): void;
  protected onGesturePinchIn?(): void;
  protected onGesturePinchOut?(): void;
  protected onGesturePinchEnd?(): void;
  protected onGestureRotateStart?(): void;
  protected onGestureRotating?(): void;
  protected onGestureRotateEnd?(): void;
  protected onGlobalGestureTap?(): void;
  protected onGlobalGestureDoubleTap?(): void;
  protected onGlobalGestureDragStart?(): void;
  protected onGlobalGestureDragging?(): void;
  protected onGlobalGestureDragEnd?(): void;
  protected onGlobalGestureFlick?(): void;
  protected onGlobalGesturePinchStart?(): void;
  protected onGlobalGesturePinchIn?(): void;
  protected onGlobalGesturePinchOut?(): void;
  protected onGlobalGesturePinchEnd?(): void;
  protected onGlobalGestureRotateStart?(): void;
  protected onGlobalGestureRotating?(): void;
  protected onGlobalGestureRotateEnd?(): void;
  protected onBroadcastMessage?(): void;
  protected onRollbackStart?(): void;
  protected onRollbackEvent?(): void;
  protected onWallpaperConfig?(): void;
  protected onWallpaperSubscriptionData?(): void;
  protected onAsyncImageLoaded?(): void;
  protected onAsyncHTTP?(): void;
  protected onAsyncDialog?(): void;
  protected onAsyncIAP?(): void;
  protected onAsyncCloud?(): void;
  protected onAsyncNetworking?(): void;
  protected onAsyncSteam?(): void;
  protected onAsyncSocial?(): void;
  protected onAsyncPushNotification?(): void;
  protected onAsyncSaveLoad?(): void;
  protected onAsyncAudioRecording?(): void;
  protected onAsyncAudioPlayback?(): void;
  protected onAsyncSystemEvent?(): void;
  protected onAsyncAudioPlaybackEnded?(): void;
  protected onKeyDown_NoKey?(): void;
  protected onKeyDown_AnyKey?(): void;
  protected onKeyDown_Backspace?(): void;
  protected onKeyDown_Tab?(): void;
  protected onKeyDown_Enter?(): void;
  protected onKeyDown_Shift?(): void;
  protected onKeyDown_Ctrl?(): void;
  protected onKeyDown_Alt?(): void;
  protected onKeyDown_Escape?(): void;
  protected onKeyDown_Space?(): void;
  protected onKeyDown_PageUp?(): void;
  protected onKeyDown_PageDown?(): void;
  protected onKeyDown_End?(): void;
  protected onKeyDown_Home?(): void;
  protected onKeyDown_Left?(): void;
  protected onKeyDown_Up?(): void;
  protected onKeyDown_Right?(): void;
  protected onKeyDown_Down?(): void;
  protected onKeyDown_Insert?(): void;
  protected onKeyDown_Delete?(): void;
  protected onKeyDown_Digit0?(): void;
  protected onKeyDown_Digit1?(): void;
  protected onKeyDown_Digit2?(): void;
  protected onKeyDown_Digit3?(): void;
  protected onKeyDown_Digit4?(): void;
  protected onKeyDown_Digit5?(): void;
  protected onKeyDown_Digit6?(): void;
  protected onKeyDown_Digit7?(): void;
  protected onKeyDown_Digit8?(): void;
  protected onKeyDown_Digit9?(): void;
  protected onKeyDown_A?(): void;
  protected onKeyDown_B?(): void;
  protected onKeyDown_C?(): void;
  protected onKeyDown_D?(): void;
  protected onKeyDown_E?(): void;
  protected onKeyDown_F?(): void;
  protected onKeyDown_G?(): void;
  protected onKeyDown_H?(): void;
  protected onKeyDown_I?(): void;
  protected onKeyDown_J?(): void;
  protected onKeyDown_K?(): void;
  protected onKeyDown_L?(): void;
  protected onKeyDown_M?(): void;
  protected onKeyDown_N?(): void;
  protected onKeyDown_O?(): void;
  protected onKeyDown_P?(): void;
  protected onKeyDown_Q?(): void;
  protected onKeyDown_R?(): void;
  protected onKeyDown_S?(): void;
  protected onKeyDown_T?(): void;
  protected onKeyDown_U?(): void;
  protected onKeyDown_V?(): void;
  protected onKeyDown_W?(): void;
  protected onKeyDown_X?(): void;
  protected onKeyDown_Y?(): void;
  protected onKeyDown_Z?(): void;
  protected onKeyDown_Numpad0?(): void;
  protected onKeyDown_Numpad1?(): void;
  protected onKeyDown_Numpad2?(): void;
  protected onKeyDown_Numpad3?(): void;
  protected onKeyDown_Numpad4?(): void;
  protected onKeyDown_Numpad5?(): void;
  protected onKeyDown_Numpad6?(): void;
  protected onKeyDown_Numpad7?(): void;
  protected onKeyDown_Numpad8?(): void;
  protected onKeyDown_Numpad9?(): void;
  protected onKeyDown_NumpadDivide?(): void;
  protected onKeyDown_NumpadMultiply?(): void;
  protected onKeyDown_NumpadSubtract?(): void;
  protected onKeyDown_NumpadAdd?(): void;
  protected onKeyDown_NumpadDecimal?(): void;
  protected onKeyDown_F1?(): void;
  protected onKeyDown_F2?(): void;
  protected onKeyDown_F3?(): void;
  protected onKeyDown_F4?(): void;
  protected onKeyDown_F5?(): void;
  protected onKeyDown_F6?(): void;
  protected onKeyDown_F7?(): void;
  protected onKeyDown_F8?(): void;
  protected onKeyDown_F9?(): void;
  protected onKeyDown_F10?(): void;
  protected onKeyDown_F11?(): void;
  protected onKeyDown_F12?(): void;
  protected onKeyPressed_NoKey?(): void;
  protected onKeyPressed_AnyKey?(): void;
  protected onKeyPressed_Backspace?(): void;
  protected onKeyPressed_Tab?(): void;
  protected onKeyPressed_Enter?(): void;
  protected onKeyPressed_Shift?(): void;
  protected onKeyPressed_Ctrl?(): void;
  protected onKeyPressed_Alt?(): void;
  protected onKeyPressed_Escape?(): void;
  protected onKeyPressed_Space?(): void;
  protected onKeyPressed_PageUp?(): void;
  protected onKeyPressed_PageDown?(): void;
  protected onKeyPressed_End?(): void;
  protected onKeyPressed_Home?(): void;
  protected onKeyPressed_Left?(): void;
  protected onKeyPressed_Up?(): void;
  protected onKeyPressed_Right?(): void;
  protected onKeyPressed_Down?(): void;
  protected onKeyPressed_Insert?(): void;
  protected onKeyPressed_Delete?(): void;
  protected onKeyPressed_Digit0?(): void;
  protected onKeyPressed_Digit1?(): void;
  protected onKeyPressed_Digit2?(): void;
  protected onKeyPressed_Digit3?(): void;
  protected onKeyPressed_Digit4?(): void;
  protected onKeyPressed_Digit5?(): void;
  protected onKeyPressed_Digit6?(): void;
  protected onKeyPressed_Digit7?(): void;
  protected onKeyPressed_Digit8?(): void;
  protected onKeyPressed_Digit9?(): void;
  protected onKeyPressed_A?(): void;
  protected onKeyPressed_B?(): void;
  protected onKeyPressed_C?(): void;
  protected onKeyPressed_D?(): void;
  protected onKeyPressed_E?(): void;
  protected onKeyPressed_F?(): void;
  protected onKeyPressed_G?(): void;
  protected onKeyPressed_H?(): void;
  protected onKeyPressed_I?(): void;
  protected onKeyPressed_J?(): void;
  protected onKeyPressed_K?(): void;
  protected onKeyPressed_L?(): void;
  protected onKeyPressed_M?(): void;
  protected onKeyPressed_N?(): void;
  protected onKeyPressed_O?(): void;
  protected onKeyPressed_P?(): void;
  protected onKeyPressed_Q?(): void;
  protected onKeyPressed_R?(): void;
  protected onKeyPressed_S?(): void;
  protected onKeyPressed_T?(): void;
  protected onKeyPressed_U?(): void;
  protected onKeyPressed_V?(): void;
  protected onKeyPressed_W?(): void;
  protected onKeyPressed_X?(): void;
  protected onKeyPressed_Y?(): void;
  protected onKeyPressed_Z?(): void;
  protected onKeyPressed_Numpad0?(): void;
  protected onKeyPressed_Numpad1?(): void;
  protected onKeyPressed_Numpad2?(): void;
  protected onKeyPressed_Numpad3?(): void;
  protected onKeyPressed_Numpad4?(): void;
  protected onKeyPressed_Numpad5?(): void;
  protected onKeyPressed_Numpad6?(): void;
  protected onKeyPressed_Numpad7?(): void;
  protected onKeyPressed_Numpad8?(): void;
  protected onKeyPressed_Numpad9?(): void;
  protected onKeyPressed_NumpadDivide?(): void;
  protected onKeyPressed_NumpadMultiply?(): void;
  protected onKeyPressed_NumpadSubtract?(): void;
  protected onKeyPressed_NumpadAdd?(): void;
  protected onKeyPressed_NumpadDecimal?(): void;
  protected onKeyPressed_F1?(): void;
  protected onKeyPressed_F2?(): void;
  protected onKeyPressed_F3?(): void;
  protected onKeyPressed_F4?(): void;
  protected onKeyPressed_F5?(): void;
  protected onKeyPressed_F6?(): void;
  protected onKeyPressed_F7?(): void;
  protected onKeyPressed_F8?(): void;
  protected onKeyPressed_F9?(): void;
  protected onKeyPressed_F10?(): void;
  protected onKeyPressed_F11?(): void;
  protected onKeyPressed_F12?(): void;
  protected onKeyUp_NoKey?(): void;
  protected onKeyUp_AnyKey?(): void;
  protected onKeyUp_Backspace?(): void;
  protected onKeyUp_Tab?(): void;
  protected onKeyUp_Enter?(): void;
  protected onKeyUp_Shift?(): void;
  protected onKeyUp_Ctrl?(): void;
  protected onKeyUp_Alt?(): void;
  protected onKeyUp_Escape?(): void;
  protected onKeyUp_Space?(): void;
  protected onKeyUp_PageUp?(): void;
  protected onKeyUp_PageDown?(): void;
  protected onKeyUp_End?(): void;
  protected onKeyUp_Home?(): void;
  protected onKeyUp_Left?(): void;
  protected onKeyUp_Up?(): void;
  protected onKeyUp_Right?(): void;
  protected onKeyUp_Down?(): void;
  protected onKeyUp_Insert?(): void;
  protected onKeyUp_Delete?(): void;
  protected onKeyUp_Digit0?(): void;
  protected onKeyUp_Digit1?(): void;
  protected onKeyUp_Digit2?(): void;
  protected onKeyUp_Digit3?(): void;
  protected onKeyUp_Digit4?(): void;
  protected onKeyUp_Digit5?(): void;
  protected onKeyUp_Digit6?(): void;
  protected onKeyUp_Digit7?(): void;
  protected onKeyUp_Digit8?(): void;
  protected onKeyUp_Digit9?(): void;
  protected onKeyUp_A?(): void;
  protected onKeyUp_B?(): void;
  protected onKeyUp_C?(): void;
  protected onKeyUp_D?(): void;
  protected onKeyUp_E?(): void;
  protected onKeyUp_F?(): void;
  protected onKeyUp_G?(): void;
  protected onKeyUp_H?(): void;
  protected onKeyUp_I?(): void;
  protected onKeyUp_J?(): void;
  protected onKeyUp_K?(): void;
  protected onKeyUp_L?(): void;
  protected onKeyUp_M?(): void;
  protected onKeyUp_N?(): void;
  protected onKeyUp_O?(): void;
  protected onKeyUp_P?(): void;
  protected onKeyUp_Q?(): void;
  protected onKeyUp_R?(): void;
  protected onKeyUp_S?(): void;
  protected onKeyUp_T?(): void;
  protected onKeyUp_U?(): void;
  protected onKeyUp_V?(): void;
  protected onKeyUp_W?(): void;
  protected onKeyUp_X?(): void;
  protected onKeyUp_Y?(): void;
  protected onKeyUp_Z?(): void;
  protected onKeyUp_Numpad0?(): void;
  protected onKeyUp_Numpad1?(): void;
  protected onKeyUp_Numpad2?(): void;
  protected onKeyUp_Numpad3?(): void;
  protected onKeyUp_Numpad4?(): void;
  protected onKeyUp_Numpad5?(): void;
  protected onKeyUp_Numpad6?(): void;
  protected onKeyUp_Numpad7?(): void;
  protected onKeyUp_Numpad8?(): void;
  protected onKeyUp_Numpad9?(): void;
  protected onKeyUp_NumpadDivide?(): void;
  protected onKeyUp_NumpadMultiply?(): void;
  protected onKeyUp_NumpadSubtract?(): void;
  protected onKeyUp_NumpadAdd?(): void;
  protected onKeyUp_NumpadDecimal?(): void;
  protected onKeyUp_F1?(): void;
  protected onKeyUp_F2?(): void;
  protected onKeyUp_F3?(): void;
  protected onKeyUp_F4?(): void;
  protected onKeyUp_F5?(): void;
  protected onKeyUp_F6?(): void;
  protected onKeyUp_F7?(): void;
  protected onKeyUp_F8?(): void;
  protected onKeyUp_F9?(): void;
  protected onKeyUp_F10?(): void;
  protected onKeyUp_F11?(): void;
  protected onKeyUp_F12?(): void;
  /**
   * Instance-bound form of `gm_with`. The `other` callback parameter is inferred as this object.
   */
  gm_with<TSelf extends GMObject>(
    target: GMObjectClass<TSelf>,
    action: (self: GMInstance<TSelf>, other: GMInstance<this>) => void,
  ): void;
  gm_with<TSelf extends GMObject = GMObject>(
    target: GM.Asset.GMObject | GM.Id.Instance | GM.Constant.All,
    action: (self: GMInstance<TSelf>, other: GMInstance<this>) => void,
  ): void;
}

/** A typed GameMaker instance reference. */
type GMInstance<T extends GMObject = GMObject> = GM.Id.Instance & T;

/** The constructor value emitted as a GameMaker object asset. */
type GMObjectClass<T extends GMObject = GMObject> = GMConstructor<T>;

/**
 * Runs an inline block for every instance selected by a GameMaker object class.
 * The callback is a compiler-only authoring form and is emitted as a native GML `with` statement.
 */
declare function gm_with<TSelf extends GMObject, TOther extends GMObject = GMObject>(
  target: GMObjectClass<TSelf>,
  action: (self: GMInstance<TSelf>, other: GMInstance<TOther>) => void,
): void;

/**
 * Runs an inline block for every selected GameMaker instance.
 * Supply `TSelf` when the target's concrete object type is known.
 */
declare function gm_with<TSelf extends GMObject = GMObject, TOther extends GMObject = GMObject>(
  target: GM.Asset.GMObject | GM.Id.Instance | GM.Constant.All,
  action: (self: GMInstance<TSelf>, other: GMInstance<TOther>) => void,
): void;

/**
 * Gives GameMaker's `self` instance a concrete compile-time type without a runtime cast.
 * This compiler intrinsic is emitted as the bare GML `self` keyword.
 */
declare function gm_self<T extends GMObject = GMObject>(): GMInstance<T>;

/**
 * Gives GameMaker's `other` instance a concrete compile-time type without a runtime cast.
 * This compiler intrinsic is emitted as the bare GML `other` keyword.
 */
declare function gm_other<T extends GMObject = GMObject>(): GMInstance<T>;
