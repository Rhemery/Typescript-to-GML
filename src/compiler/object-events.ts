import ts from "typescript";
import { createNodeDiagnostic, emitGml, Ts2GmlError } from "./compile.js";
import { isGmlIdentifier } from "./gml-identifiers.js";

export interface CompiledObjectEvent {
  fileName: string;
  eventType: number;
  eventNum: number;
  collisionObject?: string;
  code: string;
}

export interface CompiledObjectVariable {
  name: string;
  value: string;
}

export interface CompiledObject {
  name: string;
  parentObject?: string;
  events: CompiledObjectEvent[];
  variables: CompiledObjectVariable[];
}

interface EventKind {
  eventType: number;
  eventNum: number;
  filePrefix: string;
}

const keyEventNumbers = new Map<string, number>([
  ["NoKey", 0],
  ["AnyKey", 1],
  ["Backspace", 8],
  ["Tab", 9],
  ["Enter", 13],
  ["Shift", 16],
  ["Ctrl", 17],
  ["Alt", 18],
  ["Escape", 27],
  ["Space", 32],
  ["PageUp", 33],
  ["PageDown", 34],
  ["End", 35],
  ["Home", 36],
  ["Left", 37],
  ["Up", 38],
  ["Right", 39],
  ["Down", 40],
  ["Insert", 45],
  ["Delete", 46],
  ...Array.from({ length: 10 }, (_, index): [string, number] => [`Digit${index}`, 48 + index]),
  ...Array.from({ length: 26 }, (_, index): [string, number] => [
    String.fromCharCode(65 + index),
    65 + index,
  ]),
  ...Array.from({ length: 10 }, (_, index): [string, number] => [`Numpad${index}`, 96 + index]),
  ["NumpadMultiply", 106],
  ["NumpadAdd", 107],
  ["NumpadSubtract", 109],
  ["NumpadDecimal", 110],
  ["NumpadDivide", 111],
  ...Array.from({ length: 12 }, (_, index): [string, number] => [`F${index + 1}`, 112 + index]),
]);

const standardEvents = new Map<string, EventKind>([
  ["onCreate", { eventType: 0, eventNum: 0, filePrefix: "Create" }],
  ["onDestroy", { eventType: 1, eventNum: 0, filePrefix: "Destroy" }],
  ["onStep", { eventType: 3, eventNum: 0, filePrefix: "Step" }],
  ["onBeginStep", { eventType: 3, eventNum: 1, filePrefix: "Step" }],
  ["onEndStep", { eventType: 3, eventNum: 2, filePrefix: "Step" }],
  ["onOutsideRoom", { eventType: 7, eventNum: 0, filePrefix: "Other" }],
  ["onBoundary", { eventType: 7, eventNum: 1, filePrefix: "Other" }],
  ["onGameStart", { eventType: 7, eventNum: 2, filePrefix: "Other" }],
  ["onGameEnd", { eventType: 7, eventNum: 3, filePrefix: "Other" }],
  ["onRoomStart", { eventType: 7, eventNum: 4, filePrefix: "Other" }],
  ["onRoomEnd", { eventType: 7, eventNum: 5, filePrefix: "Other" }],
  ["onAnimationEnd", { eventType: 7, eventNum: 7, filePrefix: "Other" }],
  ["onPathEnd", { eventType: 7, eventNum: 8, filePrefix: "Other" }],
  ["onOutsideView0", { eventType: 7, eventNum: 40, filePrefix: "Other" }],
  ["onOutsideView1", { eventType: 7, eventNum: 41, filePrefix: "Other" }],
  ["onOutsideView2", { eventType: 7, eventNum: 42, filePrefix: "Other" }],
  ["onOutsideView3", { eventType: 7, eventNum: 43, filePrefix: "Other" }],
  ["onOutsideView4", { eventType: 7, eventNum: 44, filePrefix: "Other" }],
  ["onOutsideView5", { eventType: 7, eventNum: 45, filePrefix: "Other" }],
  ["onOutsideView6", { eventType: 7, eventNum: 46, filePrefix: "Other" }],
  ["onOutsideView7", { eventType: 7, eventNum: 47, filePrefix: "Other" }],
  ["onBoundaryView0", { eventType: 7, eventNum: 50, filePrefix: "Other" }],
  ["onBoundaryView1", { eventType: 7, eventNum: 51, filePrefix: "Other" }],
  ["onBoundaryView2", { eventType: 7, eventNum: 52, filePrefix: "Other" }],
  ["onBoundaryView3", { eventType: 7, eventNum: 53, filePrefix: "Other" }],
  ["onBoundaryView4", { eventType: 7, eventNum: 54, filePrefix: "Other" }],
  ["onBoundaryView5", { eventType: 7, eventNum: 55, filePrefix: "Other" }],
  ["onBoundaryView6", { eventType: 7, eventNum: 56, filePrefix: "Other" }],
  ["onBoundaryView7", { eventType: 7, eventNum: 57, filePrefix: "Other" }],
  ["onAnimationUpdate", { eventType: 7, eventNum: 58, filePrefix: "Other" }],
  ["onAnimationEvent", { eventType: 7, eventNum: 59, filePrefix: "Other" }],
  ["onAsyncImageLoaded", { eventType: 7, eventNum: 60, filePrefix: "Other" }],
  ["onAsyncHTTP", { eventType: 7, eventNum: 62, filePrefix: "Other" }],
  ["onAsyncDialog", { eventType: 7, eventNum: 63, filePrefix: "Other" }],
  ["onAsyncIAP", { eventType: 7, eventNum: 66, filePrefix: "Other" }],
  ["onAsyncCloud", { eventType: 7, eventNum: 67, filePrefix: "Other" }],
  ["onAsyncNetworking", { eventType: 7, eventNum: 68, filePrefix: "Other" }],
  ["onAsyncSteam", { eventType: 7, eventNum: 69, filePrefix: "Other" }],
  ["onAsyncSocial", { eventType: 7, eventNum: 70, filePrefix: "Other" }],
  ["onAsyncPushNotification", { eventType: 7, eventNum: 71, filePrefix: "Other" }],
  ["onAsyncSaveLoad", { eventType: 7, eventNum: 72, filePrefix: "Other" }],
  ["onAsyncAudioRecording", { eventType: 7, eventNum: 73, filePrefix: "Other" }],
  ["onAsyncAudioPlayback", { eventType: 7, eventNum: 74, filePrefix: "Other" }],
  ["onAsyncSystemEvent", { eventType: 7, eventNum: 75, filePrefix: "Other" }],
  ["onBroadcastMessage", { eventType: 7, eventNum: 76, filePrefix: "Other" }],
  ["onRollbackStart", { eventType: 7, eventNum: 77, filePrefix: "Other" }],
  ["onRollbackEvent", { eventType: 7, eventNum: 78, filePrefix: "Other" }],
  ["onWallpaperConfig", { eventType: 7, eventNum: 79, filePrefix: "Other" }],
  ["onAsyncAudioPlaybackEnded", { eventType: 7, eventNum: 80, filePrefix: "Other" }],
  ["onWallpaperSubscriptionData", { eventType: 7, eventNum: 81, filePrefix: "Other" }],
  ["onMouseLeftButton", { eventType: 6, eventNum: 0, filePrefix: "Mouse" }],
  ["onMouseRightButton", { eventType: 6, eventNum: 1, filePrefix: "Mouse" }],
  ["onMouseMiddleButton", { eventType: 6, eventNum: 2, filePrefix: "Mouse" }],
  ["onMouseNoButton", { eventType: 6, eventNum: 3, filePrefix: "Mouse" }],
  ["onMouseLeftPressed", { eventType: 6, eventNum: 4, filePrefix: "Mouse" }],
  ["onMouseRightPressed", { eventType: 6, eventNum: 5, filePrefix: "Mouse" }],
  ["onMouseMiddlePressed", { eventType: 6, eventNum: 6, filePrefix: "Mouse" }],
  ["onMouseLeftReleased", { eventType: 6, eventNum: 7, filePrefix: "Mouse" }],
  ["onMouseRightReleased", { eventType: 6, eventNum: 8, filePrefix: "Mouse" }],
  ["onMouseMiddleReleased", { eventType: 6, eventNum: 9, filePrefix: "Mouse" }],
  ["onMouseEnter", { eventType: 6, eventNum: 10, filePrefix: "Mouse" }],
  ["onMouseLeave", { eventType: 6, eventNum: 11, filePrefix: "Mouse" }],
  ["onGlobalMouseLeftButton", { eventType: 6, eventNum: 50, filePrefix: "Mouse" }],
  ["onGlobalMouseRightButton", { eventType: 6, eventNum: 51, filePrefix: "Mouse" }],
  ["onGlobalMouseMiddleButton", { eventType: 6, eventNum: 52, filePrefix: "Mouse" }],
  ["onGlobalMouseLeftPressed", { eventType: 6, eventNum: 53, filePrefix: "Mouse" }],
  ["onGlobalMouseRightPressed", { eventType: 6, eventNum: 54, filePrefix: "Mouse" }],
  ["onGlobalMouseMiddlePressed", { eventType: 6, eventNum: 55, filePrefix: "Mouse" }],
  ["onGlobalMouseLeftReleased", { eventType: 6, eventNum: 56, filePrefix: "Mouse" }],
  ["onGlobalMouseRightReleased", { eventType: 6, eventNum: 57, filePrefix: "Mouse" }],
  ["onGlobalMouseMiddleReleased", { eventType: 6, eventNum: 58, filePrefix: "Mouse" }],
  ["onMouseWheelUp", { eventType: 6, eventNum: 60, filePrefix: "Mouse" }],
  ["onMouseWheelDown", { eventType: 6, eventNum: 61, filePrefix: "Mouse" }],
  ["onGestureTap", { eventType: 13, eventNum: 0, filePrefix: "Gesture" }],
  ["onGestureDoubleTap", { eventType: 13, eventNum: 1, filePrefix: "Gesture" }],
  ["onGestureDragStart", { eventType: 13, eventNum: 2, filePrefix: "Gesture" }],
  ["onGestureDragging", { eventType: 13, eventNum: 3, filePrefix: "Gesture" }],
  ["onGestureDragEnd", { eventType: 13, eventNum: 4, filePrefix: "Gesture" }],
  ["onGestureFlick", { eventType: 13, eventNum: 5, filePrefix: "Gesture" }],
  ["onGesturePinchStart", { eventType: 13, eventNum: 6, filePrefix: "Gesture" }],
  ["onGesturePinchIn", { eventType: 13, eventNum: 7, filePrefix: "Gesture" }],
  ["onGesturePinchOut", { eventType: 13, eventNum: 8, filePrefix: "Gesture" }],
  ["onGesturePinchEnd", { eventType: 13, eventNum: 9, filePrefix: "Gesture" }],
  ["onGestureRotateStart", { eventType: 13, eventNum: 10, filePrefix: "Gesture" }],
  ["onGestureRotating", { eventType: 13, eventNum: 11, filePrefix: "Gesture" }],
  ["onGestureRotateEnd", { eventType: 13, eventNum: 12, filePrefix: "Gesture" }],
  ["onGlobalGestureTap", { eventType: 13, eventNum: 64, filePrefix: "Gesture" }],
  ["onGlobalGestureDoubleTap", { eventType: 13, eventNum: 65, filePrefix: "Gesture" }],
  ["onGlobalGestureDragStart", { eventType: 13, eventNum: 66, filePrefix: "Gesture" }],
  ["onGlobalGestureDragging", { eventType: 13, eventNum: 67, filePrefix: "Gesture" }],
  ["onGlobalGestureDragEnd", { eventType: 13, eventNum: 68, filePrefix: "Gesture" }],
  ["onGlobalGestureFlick", { eventType: 13, eventNum: 69, filePrefix: "Gesture" }],
  ["onGlobalGesturePinchStart", { eventType: 13, eventNum: 70, filePrefix: "Gesture" }],
  ["onGlobalGesturePinchIn", { eventType: 13, eventNum: 71, filePrefix: "Gesture" }],
  ["onGlobalGesturePinchOut", { eventType: 13, eventNum: 72, filePrefix: "Gesture" }],
  ["onGlobalGesturePinchEnd", { eventType: 13, eventNum: 73, filePrefix: "Gesture" }],
  ["onGlobalGestureRotateStart", { eventType: 13, eventNum: 74, filePrefix: "Gesture" }],
  ["onGlobalGestureRotating", { eventType: 13, eventNum: 75, filePrefix: "Gesture" }],
  ["onGlobalGestureRotateEnd", { eventType: 13, eventNum: 76, filePrefix: "Gesture" }],
  ["onDraw", { eventType: 8, eventNum: 0, filePrefix: "Draw" }],
  ["onDrawGUI", { eventType: 8, eventNum: 64, filePrefix: "Draw" }],
  ["onDrawResize", { eventType: 8, eventNum: 65, filePrefix: "Draw" }],
  ["onDrawBegin", { eventType: 8, eventNum: 72, filePrefix: "Draw" }],
  ["onDrawEnd", { eventType: 8, eventNum: 73, filePrefix: "Draw" }],
  ["onDrawGUIBegin", { eventType: 8, eventNum: 74, filePrefix: "Draw" }],
  ["onDrawGUIEnd", { eventType: 8, eventNum: 75, filePrefix: "Draw" }],
  ["onPreDraw", { eventType: 8, eventNum: 76, filePrefix: "Draw" }],
  ["onPostDraw", { eventType: 8, eventNum: 77, filePrefix: "Draw" }],
  ["onCleanUp", { eventType: 12, eventNum: 0, filePrefix: "CleanUp" }],
]);

export function compileObjectClass(
  classNode: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
  objectNames: ReadonlySet<string>,
  editorParentObject?: string,
): CompiledObject {
  const name = classNode.name?.text;
  if (!name) throw objectError(classNode, sourceFile, "GameMaker objects must have a class name.");
  if (!isGmlIdentifier(name)) {
    throw objectError(classNode, sourceFile, `Invalid GameMaker object name '${name}'.`);
  }

  const baseType = classNode.heritageClauses
    ?.find((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword)
    ?.types[0];
  const baseName = baseType && ts.isIdentifier(baseType.expression)
    ? baseType.expression.text
    : undefined;
  const parentObject = baseName && objectNames.has(baseName) ? baseName : editorParentObject;
  const constructorLines: string[] = [];
  const methodLines: string[] = [];
  const onCreateLines: string[] = [];
  const events: CompiledObjectEvent[] = [];
  const variables: CompiledObjectVariable[] = [];

  for (const member of classNode.members) {
    if (hasStaticModifier(member)) {
      throw objectError(member, sourceFile, "Static members are not supported on GMObject classes.");
    }
    if (ts.isPropertyDeclaration(member)) {
      const fieldName = getMemberName(member.name, sourceFile);
      const value = member.initializer ? emitGml(member.initializer, sourceFile) : "undefined";
      variables.push({ name: fieldName, value });
      continue;
    }
    if (ts.isConstructorDeclaration(member)) {
      if (member.parameters.length > 0) {
        throw objectError(member, sourceFile, "GMObject constructors cannot receive parameters.");
      }
      for (const statement of member.body?.statements ?? []) {
        const isSuperCall =
          ts.isExpressionStatement(statement) &&
          ts.isCallExpression(statement.expression) &&
          statement.expression.expression.kind === ts.SyntaxKind.SuperKeyword;
        if (!isSuperCall) constructorLines.push(emitGml(statement, sourceFile));
      }
      continue;
    }
    if (ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) {
      throw objectError(member, sourceFile, "GMObject accessors are not supported yet.");
    }
    if (!ts.isMethodDeclaration(member) || !member.body) continue;

    const methodName = getMemberName(member.name, sourceFile);
    const event = eventForMethod(methodName, sourceFile, member);
    if (event) {
      const collisionParameter = event.collisionObject && member.parameters[0];
      if (
        (!event.collisionObject && member.parameters.length > 0) ||
        (event.collisionObject && member.parameters.length > 1)
      ) {
        throw objectError(
          member,
          sourceFile,
          event.collisionObject
            ? `Collision event '${methodName}' can only receive its other instance parameter.`
            : `Object event '${methodName}' cannot receive parameters.`,
        );
      }
      if (
        collisionParameter &&
        (!ts.isIdentifier(collisionParameter.name) ||
          collisionParameter.dotDotDotToken ||
          collisionParameter.initializer)
      ) {
        throw objectError(
          collisionParameter,
          sourceFile,
          `Collision event '${methodName}' must use a plain other instance parameter.`,
        );
      }
      const parameterRenames = collisionParameter && ts.isIdentifier(collisionParameter.name)
        ? new Map([[collisionParameter.name.text, "other"]])
        : undefined;
      const body = blockContents(member.body, sourceFile, parameterRenames);
      if (methodName === "onCreate") onCreateLines.push(body);
      else {
        if (events.some((existing) => sameEvent(existing, event))) {
          throw objectError(
            member,
            sourceFile,
            `Object event '${methodName}' duplicates another method for the same GameMaker event.`,
          );
        }
        events.push({ ...event, code: `${body.trim()}\n` });
      }
      continue;
    }

    const parameters = member.parameters
      .map((parameter) => emitGml(parameter, sourceFile, methodParameterRenames(member)))
      .join(", ");
    methodLines.push(
      `self.${methodName} = function(${parameters}) ${emitGml(member.body, sourceFile, methodParameterRenames(member))};`,
    );
  }

  const createLines = [...methodLines, ...constructorLines, ...onCreateLines];
  if (createLines.length > 0) {
    const create = standardEvents.get("onCreate")!;
    if (parentObject) createLines.unshift("event_inherited();");
    events.unshift({
      ...eventFile(create),
      code: `${createLines.filter(Boolean).join("\n").trim()}\n`,
    });
  }

  return {
    name,
    ...(parentObject ? { parentObject } : {}),
    events,
    variables,
  };
}

function hasStaticModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node) &&
    Boolean(ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword));
}

export function isObjectClass(
  classNode: ts.ClassDeclaration,
  objectNames: ReadonlySet<string>,
): boolean {
  const baseType = classNode.heritageClauses
    ?.find((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword)
    ?.types[0];
  return Boolean(
    baseType &&
      ts.isIdentifier(baseType.expression) &&
      (baseType.expression.text === "GMObject" || objectNames.has(baseType.expression.text)),
  );
}

function eventForMethod(
  methodName: string,
  sourceFile: ts.SourceFile,
  node: ts.Node,
): CompiledObjectEvent | undefined {
  const standard = standardEvents.get(methodName);
  if (standard) return { ...eventFile(standard), code: "" };

  const namedKey = /^on(KeyDown|KeyPressed|KeyUp)_([$A-Z_a-z][$\w]*|\d+)$/.exec(methodName);
  if (namedKey) {
    const keyName = namedKey[2]!;
    const eventNum = /^\d+$/.test(keyName) ? Number(keyName) : keyEventNumbers.get(keyName);
    if (eventNum === undefined || eventNum < 0 || eventNum > 255) {
      throw objectError(node, sourceFile, `Unknown GameMaker key '${keyName}'.`);
    }
    const [eventType, filePrefix] = namedKey[1] === "KeyDown"
      ? [5, "Keyboard"]
      : namedKey[1] === "KeyPressed"
        ? [9, "KeyPress"]
        : [10, "KeyRelease"];
    return { fileName: `${filePrefix}_${eventNum}.gml`, eventType, eventNum, code: "" };
  }

  const numericEvents: Array<[RegExp, number, string, number, number]> = [
    [/^onAlarm(\d+)$/, 2, "Alarm", 0, 11],
    [/^onKeyboard_(\d+)$/, 5, "Keyboard", 0, 255],
    [/^onMouse_(\d+)$/, 6, "Mouse", 0, 255],
    [/^onKeyPress_(\d+)$/, 9, "KeyPress", 0, 255],
    [/^onKeyRelease_(\d+)$/, 10, "KeyRelease", 0, 255],
    [/^onGesture_(\d+)$/, 13, "Gesture", 0, 255],
  ];
  for (const [pattern, eventType, filePrefix, minimum, maximum] of numericEvents) {
    const match = pattern.exec(methodName);
    if (!match) continue;
    const eventNum = Number(match[1]);
    if (eventNum < minimum || eventNum > maximum) {
      throw objectError(node, sourceFile, `'${methodName}' must be between ${minimum} and ${maximum}.`);
    }
    return { fileName: `${filePrefix}_${eventNum}.gml`, eventType, eventNum, code: "" };
  }

  const userEvent = /^onUserEvent(\d+)$/.exec(methodName);
  if (userEvent) {
    const index = Number(userEvent[1]);
    if (index < 0 || index > 15) {
      throw objectError(node, sourceFile, "User event indices must be between 0 and 15.");
    }
    return {
      fileName: `Other_${index + 10}.gml`,
      eventType: 7,
      eventNum: index + 10,
      code: "",
    };
  }

  const collision = /^onCollision_([$A-Z_a-z][$\w]*)$/.exec(methodName);
  if (collision) {
    return {
      fileName: `Collision_${collision[1]}.gml`,
      eventType: 4,
      eventNum: 0,
      collisionObject: collision[1]!,
      code: "",
    };
  }

  if (methodName.startsWith("on")) {
    throw objectError(node, sourceFile, `Unknown GameMaker event method '${methodName}'.`);
  }
  return undefined;
}

function eventFile(event: EventKind): Omit<CompiledObjectEvent, "code"> {
  return {
    fileName: `${event.filePrefix}_${event.eventNum}.gml`,
    eventType: event.eventType,
    eventNum: event.eventNum,
  };
}

function sameEvent(
  left: Pick<CompiledObjectEvent, "eventType" | "eventNum" | "collisionObject">,
  right: Pick<CompiledObjectEvent, "eventType" | "eventNum" | "collisionObject">,
): boolean {
  return left.eventType === right.eventType &&
    left.eventNum === right.eventNum &&
    left.collisionObject === right.collisionObject;
}

function blockContents(
  block: ts.Block,
  sourceFile: ts.SourceFile,
  identifierRenames?: ReadonlyMap<string, string>,
): string {
  return block.statements
    .map((statement) => emitGml(statement, sourceFile, identifierRenames))
    .join("\n");
}

function getMemberName(name: ts.PropertyName, sourceFile: ts.SourceFile): string {
  if (ts.isIdentifier(name) && isGmlIdentifier(name.text)) return name.text;
  throw objectError(name, sourceFile, "GameMaker object members must use identifier names.");
}

function objectError(node: ts.Node, sourceFile: ts.SourceFile, message: string): Ts2GmlError {
  return new Ts2GmlError([
    createNodeDiagnostic(node, sourceFile, "TS2GML3001", message),
  ]);
}

function methodParameterRenames(
  method: ts.MethodDeclaration,
): ReadonlyMap<string, string> {
  return new Map(
    method.parameters
      .filter((parameter): parameter is ts.ParameterDeclaration & { name: ts.Identifier } =>
        ts.isIdentifier(parameter.name),
      )
      .map((parameter) => [parameter.name.text, `_${parameter.name.text}`]),
  );
}
