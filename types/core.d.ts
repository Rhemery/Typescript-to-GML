type GMPrimitive = number | string | boolean | undefined;
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

/** Base class used only by typescript-to-gml to define a GameMaker object asset. */
declare abstract class GMObject {
  onCreate?(): void;
  onDestroy?(): void;
  onCleanUp?(): void;
  onStep?(): void;
  onBeginStep?(): void;
  onEndStep?(): void;
  onDraw?(): void;
  onDrawGUI?(): void;
  onDrawResize?(): void;
  onDrawBegin?(): void;
  onDrawEnd?(): void;
  onDrawGUIBegin?(): void;
  onDrawGUIEnd?(): void;
  onPreDraw?(): void;
  onPostDraw?(): void;
  onOutsideRoom?(): void;
  onBoundary?(): void;
  onGameStart?(): void;
  onGameEnd?(): void;
  onRoomStart?(): void;
  onRoomEnd?(): void;
  onAnimationEnd?(): void;
  onAnimationUpdate?(): void;
  onAnimationEvent?(): void;
  onPathEnd?(): void;
  onOutsideView0?(): void;
  onOutsideView1?(): void;
  onOutsideView2?(): void;
  onOutsideView3?(): void;
  onOutsideView4?(): void;
  onOutsideView5?(): void;
  onOutsideView6?(): void;
  onOutsideView7?(): void;
  onBoundaryView0?(): void;
  onBoundaryView1?(): void;
  onBoundaryView2?(): void;
  onBoundaryView3?(): void;
  onBoundaryView4?(): void;
  onBoundaryView5?(): void;
  onBoundaryView6?(): void;
  onBoundaryView7?(): void;
  onAlarm0?(): void;
  onAlarm1?(): void;
  onAlarm2?(): void;
  onAlarm3?(): void;
  onAlarm4?(): void;
  onAlarm5?(): void;
  onAlarm6?(): void;
  onAlarm7?(): void;
  onAlarm8?(): void;
  onAlarm9?(): void;
  onAlarm10?(): void;
  onAlarm11?(): void;
  onUserEvent0?(): void;
  onUserEvent1?(): void;
  onUserEvent2?(): void;
  onUserEvent3?(): void;
  onUserEvent4?(): void;
  onUserEvent5?(): void;
  onUserEvent6?(): void;
  onUserEvent7?(): void;
  onUserEvent8?(): void;
  onUserEvent9?(): void;
  onUserEvent10?(): void;
  onUserEvent11?(): void;
  onUserEvent12?(): void;
  onUserEvent13?(): void;
  onUserEvent14?(): void;
  onUserEvent15?(): void;
  onMouseLeftButton?(): void;
  onMouseRightButton?(): void;
  onMouseMiddleButton?(): void;
  onMouseNoButton?(): void;
  onMouseLeftPressed?(): void;
  onMouseRightPressed?(): void;
  onMouseMiddlePressed?(): void;
  onMouseLeftReleased?(): void;
  onMouseRightReleased?(): void;
  onMouseMiddleReleased?(): void;
  onMouseEnter?(): void;
  onMouseLeave?(): void;
  onMouseWheelUp?(): void;
  onMouseWheelDown?(): void;
  onGlobalMouseLeftButton?(): void;
  onGlobalMouseRightButton?(): void;
  onGlobalMouseMiddleButton?(): void;
  onGlobalMouseLeftPressed?(): void;
  onGlobalMouseRightPressed?(): void;
  onGlobalMouseMiddlePressed?(): void;
  onGlobalMouseLeftReleased?(): void;
  onGlobalMouseRightReleased?(): void;
  onGlobalMouseMiddleReleased?(): void;
  onGestureTap?(): void;
  onGestureDoubleTap?(): void;
  onGestureDragStart?(): void;
  onGestureDragging?(): void;
  onGestureDragEnd?(): void;
  onGestureFlick?(): void;
  onGesturePinchStart?(): void;
  onGesturePinchIn?(): void;
  onGesturePinchOut?(): void;
  onGesturePinchEnd?(): void;
  onGestureRotateStart?(): void;
  onGestureRotating?(): void;
  onGestureRotateEnd?(): void;
  onGlobalGestureTap?(): void;
  onGlobalGestureDoubleTap?(): void;
  onGlobalGestureDragStart?(): void;
  onGlobalGestureDragging?(): void;
  onGlobalGestureDragEnd?(): void;
  onGlobalGestureFlick?(): void;
  onGlobalGesturePinchStart?(): void;
  onGlobalGesturePinchIn?(): void;
  onGlobalGesturePinchOut?(): void;
  onGlobalGesturePinchEnd?(): void;
  onGlobalGestureRotateStart?(): void;
  onGlobalGestureRotating?(): void;
  onGlobalGestureRotateEnd?(): void;
  onBroadcastMessage?(): void;
  onRollbackStart?(): void;
  onRollbackEvent?(): void;
  onWallpaperConfig?(): void;
  onWallpaperSubscriptionData?(): void;
  onAsyncImageLoaded?(): void;
  onAsyncHTTP?(): void;
  onAsyncDialog?(): void;
  onAsyncIAP?(): void;
  onAsyncCloud?(): void;
  onAsyncNetworking?(): void;
  onAsyncSteam?(): void;
  onAsyncSocial?(): void;
  onAsyncPushNotification?(): void;
  onAsyncSaveLoad?(): void;
  onAsyncAudioRecording?(): void;
  onAsyncAudioPlayback?(): void;
  onAsyncSystemEvent?(): void;
  onAsyncAudioPlaybackEnded?(): void;
  [event: `onKeyboard_${number}`]: (() => void) | undefined;
  [event: `onKeyPress_${number}`]: (() => void) | undefined;
  [event: `onKeyRelease_${number}`]: (() => void) | undefined;
  onKeyDown_NoKey?(): void;
  onKeyDown_AnyKey?(): void;
  onKeyDown_Backspace?(): void;
  onKeyDown_Tab?(): void;
  onKeyDown_Enter?(): void;
  onKeyDown_Shift?(): void;
  onKeyDown_Ctrl?(): void;
  onKeyDown_Alt?(): void;
  onKeyDown_Escape?(): void;
  onKeyDown_Space?(): void;
  onKeyDown_PageUp?(): void;
  onKeyDown_PageDown?(): void;
  onKeyDown_End?(): void;
  onKeyDown_Home?(): void;
  onKeyDown_Left?(): void;
  onKeyDown_Up?(): void;
  onKeyDown_Right?(): void;
  onKeyDown_Down?(): void;
  onKeyDown_Insert?(): void;
  onKeyDown_Delete?(): void;
  onKeyDown_Digit0?(): void;
  onKeyDown_Digit1?(): void;
  onKeyDown_Digit2?(): void;
  onKeyDown_Digit3?(): void;
  onKeyDown_Digit4?(): void;
  onKeyDown_Digit5?(): void;
  onKeyDown_Digit6?(): void;
  onKeyDown_Digit7?(): void;
  onKeyDown_Digit8?(): void;
  onKeyDown_Digit9?(): void;
  onKeyDown_A?(): void;
  onKeyDown_B?(): void;
  onKeyDown_C?(): void;
  onKeyDown_D?(): void;
  onKeyDown_E?(): void;
  onKeyDown_F?(): void;
  onKeyDown_G?(): void;
  onKeyDown_H?(): void;
  onKeyDown_I?(): void;
  onKeyDown_J?(): void;
  onKeyDown_K?(): void;
  onKeyDown_L?(): void;
  onKeyDown_M?(): void;
  onKeyDown_N?(): void;
  onKeyDown_O?(): void;
  onKeyDown_P?(): void;
  onKeyDown_Q?(): void;
  onKeyDown_R?(): void;
  onKeyDown_S?(): void;
  onKeyDown_T?(): void;
  onKeyDown_U?(): void;
  onKeyDown_V?(): void;
  onKeyDown_W?(): void;
  onKeyDown_X?(): void;
  onKeyDown_Y?(): void;
  onKeyDown_Z?(): void;
  onKeyDown_Numpad0?(): void;
  onKeyDown_Numpad1?(): void;
  onKeyDown_Numpad2?(): void;
  onKeyDown_Numpad3?(): void;
  onKeyDown_Numpad4?(): void;
  onKeyDown_Numpad5?(): void;
  onKeyDown_Numpad6?(): void;
  onKeyDown_Numpad7?(): void;
  onKeyDown_Numpad8?(): void;
  onKeyDown_Numpad9?(): void;
  onKeyDown_NumpadDivide?(): void;
  onKeyDown_NumpadMultiply?(): void;
  onKeyDown_NumpadSubtract?(): void;
  onKeyDown_NumpadAdd?(): void;
  onKeyDown_NumpadDecimal?(): void;
  onKeyDown_F1?(): void;
  onKeyDown_F2?(): void;
  onKeyDown_F3?(): void;
  onKeyDown_F4?(): void;
  onKeyDown_F5?(): void;
  onKeyDown_F6?(): void;
  onKeyDown_F7?(): void;
  onKeyDown_F8?(): void;
  onKeyDown_F9?(): void;
  onKeyDown_F10?(): void;
  onKeyDown_F11?(): void;
  onKeyDown_F12?(): void;
  onKeyPressed_NoKey?(): void;
  onKeyPressed_AnyKey?(): void;
  onKeyPressed_Backspace?(): void;
  onKeyPressed_Tab?(): void;
  onKeyPressed_Enter?(): void;
  onKeyPressed_Shift?(): void;
  onKeyPressed_Ctrl?(): void;
  onKeyPressed_Alt?(): void;
  onKeyPressed_Escape?(): void;
  onKeyPressed_Space?(): void;
  onKeyPressed_PageUp?(): void;
  onKeyPressed_PageDown?(): void;
  onKeyPressed_End?(): void;
  onKeyPressed_Home?(): void;
  onKeyPressed_Left?(): void;
  onKeyPressed_Up?(): void;
  onKeyPressed_Right?(): void;
  onKeyPressed_Down?(): void;
  onKeyPressed_Insert?(): void;
  onKeyPressed_Delete?(): void;
  onKeyPressed_Digit0?(): void;
  onKeyPressed_Digit1?(): void;
  onKeyPressed_Digit2?(): void;
  onKeyPressed_Digit3?(): void;
  onKeyPressed_Digit4?(): void;
  onKeyPressed_Digit5?(): void;
  onKeyPressed_Digit6?(): void;
  onKeyPressed_Digit7?(): void;
  onKeyPressed_Digit8?(): void;
  onKeyPressed_Digit9?(): void;
  onKeyPressed_A?(): void;
  onKeyPressed_B?(): void;
  onKeyPressed_C?(): void;
  onKeyPressed_D?(): void;
  onKeyPressed_E?(): void;
  onKeyPressed_F?(): void;
  onKeyPressed_G?(): void;
  onKeyPressed_H?(): void;
  onKeyPressed_I?(): void;
  onKeyPressed_J?(): void;
  onKeyPressed_K?(): void;
  onKeyPressed_L?(): void;
  onKeyPressed_M?(): void;
  onKeyPressed_N?(): void;
  onKeyPressed_O?(): void;
  onKeyPressed_P?(): void;
  onKeyPressed_Q?(): void;
  onKeyPressed_R?(): void;
  onKeyPressed_S?(): void;
  onKeyPressed_T?(): void;
  onKeyPressed_U?(): void;
  onKeyPressed_V?(): void;
  onKeyPressed_W?(): void;
  onKeyPressed_X?(): void;
  onKeyPressed_Y?(): void;
  onKeyPressed_Z?(): void;
  onKeyPressed_Numpad0?(): void;
  onKeyPressed_Numpad1?(): void;
  onKeyPressed_Numpad2?(): void;
  onKeyPressed_Numpad3?(): void;
  onKeyPressed_Numpad4?(): void;
  onKeyPressed_Numpad5?(): void;
  onKeyPressed_Numpad6?(): void;
  onKeyPressed_Numpad7?(): void;
  onKeyPressed_Numpad8?(): void;
  onKeyPressed_Numpad9?(): void;
  onKeyPressed_NumpadDivide?(): void;
  onKeyPressed_NumpadMultiply?(): void;
  onKeyPressed_NumpadSubtract?(): void;
  onKeyPressed_NumpadAdd?(): void;
  onKeyPressed_NumpadDecimal?(): void;
  onKeyPressed_F1?(): void;
  onKeyPressed_F2?(): void;
  onKeyPressed_F3?(): void;
  onKeyPressed_F4?(): void;
  onKeyPressed_F5?(): void;
  onKeyPressed_F6?(): void;
  onKeyPressed_F7?(): void;
  onKeyPressed_F8?(): void;
  onKeyPressed_F9?(): void;
  onKeyPressed_F10?(): void;
  onKeyPressed_F11?(): void;
  onKeyPressed_F12?(): void;
  onKeyUp_NoKey?(): void;
  onKeyUp_AnyKey?(): void;
  onKeyUp_Backspace?(): void;
  onKeyUp_Tab?(): void;
  onKeyUp_Enter?(): void;
  onKeyUp_Shift?(): void;
  onKeyUp_Ctrl?(): void;
  onKeyUp_Alt?(): void;
  onKeyUp_Escape?(): void;
  onKeyUp_Space?(): void;
  onKeyUp_PageUp?(): void;
  onKeyUp_PageDown?(): void;
  onKeyUp_End?(): void;
  onKeyUp_Home?(): void;
  onKeyUp_Left?(): void;
  onKeyUp_Up?(): void;
  onKeyUp_Right?(): void;
  onKeyUp_Down?(): void;
  onKeyUp_Insert?(): void;
  onKeyUp_Delete?(): void;
  onKeyUp_Digit0?(): void;
  onKeyUp_Digit1?(): void;
  onKeyUp_Digit2?(): void;
  onKeyUp_Digit3?(): void;
  onKeyUp_Digit4?(): void;
  onKeyUp_Digit5?(): void;
  onKeyUp_Digit6?(): void;
  onKeyUp_Digit7?(): void;
  onKeyUp_Digit8?(): void;
  onKeyUp_Digit9?(): void;
  onKeyUp_A?(): void;
  onKeyUp_B?(): void;
  onKeyUp_C?(): void;
  onKeyUp_D?(): void;
  onKeyUp_E?(): void;
  onKeyUp_F?(): void;
  onKeyUp_G?(): void;
  onKeyUp_H?(): void;
  onKeyUp_I?(): void;
  onKeyUp_J?(): void;
  onKeyUp_K?(): void;
  onKeyUp_L?(): void;
  onKeyUp_M?(): void;
  onKeyUp_N?(): void;
  onKeyUp_O?(): void;
  onKeyUp_P?(): void;
  onKeyUp_Q?(): void;
  onKeyUp_R?(): void;
  onKeyUp_S?(): void;
  onKeyUp_T?(): void;
  onKeyUp_U?(): void;
  onKeyUp_V?(): void;
  onKeyUp_W?(): void;
  onKeyUp_X?(): void;
  onKeyUp_Y?(): void;
  onKeyUp_Z?(): void;
  onKeyUp_Numpad0?(): void;
  onKeyUp_Numpad1?(): void;
  onKeyUp_Numpad2?(): void;
  onKeyUp_Numpad3?(): void;
  onKeyUp_Numpad4?(): void;
  onKeyUp_Numpad5?(): void;
  onKeyUp_Numpad6?(): void;
  onKeyUp_Numpad7?(): void;
  onKeyUp_Numpad8?(): void;
  onKeyUp_Numpad9?(): void;
  onKeyUp_NumpadDivide?(): void;
  onKeyUp_NumpadMultiply?(): void;
  onKeyUp_NumpadSubtract?(): void;
  onKeyUp_NumpadAdd?(): void;
  onKeyUp_NumpadDecimal?(): void;
  onKeyUp_F1?(): void;
  onKeyUp_F2?(): void;
  onKeyUp_F3?(): void;
  onKeyUp_F4?(): void;
  onKeyUp_F5?(): void;
  onKeyUp_F6?(): void;
  onKeyUp_F7?(): void;
  onKeyUp_F8?(): void;
  onKeyUp_F9?(): void;
  onKeyUp_F10?(): void;
  onKeyUp_F11?(): void;
  onKeyUp_F12?(): void;
  [event: `onKeyDown_${number}`]: (() => void) | undefined;
  [event: `onKeyPressed_${number}`]: (() => void) | undefined;
  [event: `onKeyUp_${number}`]: (() => void) | undefined;
  [event: `onMouse_${number}`]: (() => void) | undefined;
  [event: `onGesture_${number}`]: (() => void) | undefined;
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
  [event: `onCollision_${string}`]: ((other: any) => void) | undefined;
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
 * Gives GameMaker's `other` instance a concrete compile-time type without a runtime cast.
 * This compiler intrinsic is emitted as the bare GML `other` keyword.
 */
declare function gm_other<T extends GMObject = GMObject>(): GMInstance<T>;
