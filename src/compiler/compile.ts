import ts from "typescript";
import { collectNativeAccessPlan, inspectRuntimeAccesses, type RuntimeAccessPlan } from "./access.js";
import { usesValueRuntime, valueRuntimeGml } from "./values.js";
import { collectionRuntimeGml } from "./collections.js";
import { extractGmlSourceMap, originalSourceRange, parseMappedJavaScript, type GmlSourceMap } from "./source-maps.js";
export { collectionRuntimeGml } from "./collections.js";
import { isGmlIdentifier } from "./gml-identifiers.js";
import {
  createRuntimeGuardGml,
  type RuntimeGuardLevel,
} from "./runtime-guards.js";

export interface CompilerDiagnostic {
  code: string;
  severity: "error" | "warning";
  fileName: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  sourceLine?: string;
  highlightLength?: number;
  suggestion?: string;
}

export interface CompileResult {
  gml: string;
  javascript: string;
  sourceMap: GmlSourceMap;
}

export class Ts2GmlError extends Error {
  constructor(readonly diagnostics: readonly CompilerDiagnostic[]) {
    super(diagnostics.map(formatDiagnostic).join("\n\n"));
    this.name = "Ts2GmlError";
  }
}

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

const mathFunctions = new Map([
  ["abs", "abs"],
  ["acos", "arccos"],
  ["asin", "arcsin"],
  ["atan", "arctan"],
  ["atan2", "arctan2"],
  ["ceil", "ceil"],
  ["cos", "cos"],
  ["exp", "exp"],
  ["floor", "floor"],
  ["max", "max"],
  ["min", "min"],
  ["pow", "power"],
  ["random", "random"],
  ["round", "round"],
  ["sign", "sign"],
  ["sin", "sin"],
  ["sqrt", "sqrt"],
  ["tan", "tan"],
]);

const gmlKeywordFunctions = new Map([
  ["gm_global", "global"],
  ["gm_instanceof", "instanceof"],
  ["gm_typeof", "typeof"],
]);

const gmlContextAssertions = new Map([
  ["gm_self", "self"],
  ["gm_other", "other"],
]);

const compilerIntrinsicBindings = new Set([
  ...gmlKeywordFunctions.keys(),
  ...gmlContextAssertions.keys(),
  "console",
  "gm_macro",
  "gm_static",
  "gm_with",
  "Math",
  "Grid",
  "List",
  "Map",
  "PriorityQueue",
  "Queue",
  "Set",
  "Stack",
  "method",
]);

export const collectionRuntimeScriptName = "__ts2gml_collections";

const collectionConstructors = new Map([
  ["Grid", "__ts2gml_Grid"],
  ["List", "__ts2gml_List"],
  ["Map", "__ts2gml_Map"],
  ["PriorityQueue", "__ts2gml_PriorityQueue"],
  ["Queue", "__ts2gml_Queue"],
  ["Set", "__ts2gml_Set"],
  ["Stack", "__ts2gml_Stack"],
]);

const loweredJavaScriptInstanceMembers = new Map([
  ["concat", "__ts2gml_collection_concat"],
  ["delete", "__ts2gml_remove"],
  ["entries", "__ts2gml_collection_entries"],
  ["includes", "__ts2gml_collection_includes"],
  ["indexOf", "__ts2gml_collection_index_of"],
  ["join", "__ts2gml_collection_join"],
  ["keys", "__ts2gml_collection_keys"],
  ["pop", "__ts2gml_collection_pop"],
  ["push", "__ts2gml_collection_push"],
  ["reverse", "__ts2gml_collection_reverse"],
  ["shift", "__ts2gml_collection_shift"],
  ["sort", "__ts2gml_collection_sort"],
  ["unshift", "__ts2gml_collection_unshift"],
  ["values", "__ts2gml_collection_values"],
]);


const javaScriptRuntimeGlobals = new Set([
  "AggregateError",
  "Array",
  "ArrayBuffer",
  "Atomics",
  "BigInt",
  "BigInt64Array",
  "BigUint64Array",
  "Boolean",
  "DataView",
  "Date",
  "Error",
  "EvalError",
  "FinalizationRegistry",
  "Float32Array",
  "Float64Array",
  "Function",
  "Infinity",
  "Int8Array",
  "Int16Array",
  "Int32Array",
  "Intl",
  "JSON",
  "Map",
  "Math",
  "NaN",
  "Number",
  "Object",
  "Promise",
  "Proxy",
  "RangeError",
  "ReferenceError",
  "Reflect",
  "RegExp",
  "Set",
  "SharedArrayBuffer",
  "String",
  "Symbol",
  "SyntaxError",
  "TypeError",
  "URIError",
  "Uint8Array",
  "Uint8ClampedArray",
  "Uint16Array",
  "Uint32Array",
  "WeakMap",
  "WeakRef",
  "WeakSet",
  "WebAssembly",
  "console",
  "decodeURI",
  "decodeURIComponent",
  "encodeURI",
  "encodeURIComponent",
  "eval",
  "globalThis",
  "isFinite",
  "isNaN",
  "parseFloat",
  "parseInt",
]);

const unsupportedJavaScriptInstanceMembers = new Set([
  "concat",
  "at",
  "charAt",
  "charCodeAt",
  "endsWith",
  "entries",
  "every",
  "filter",
  "find",
  "findIndex",
  "flat",
  "flatMap",
  "forEach",
  "includes",
  "indexOf",
  "join",
  "keys",
  "lastIndexOf",
  "length",
  "map",
  "pop",
  "padEnd",
  "padStart",
  "push",
  "reduce",
  "reduceRight",
  "repeat",
  "replace",
  "replaceAll",
  "reverse",
  "shift",
  "slice",
  "some",
  "sort",
  "split",
  "splice",
  "startsWith",
  "substring",
  "substr",
  "toLowerCase",
  "toFixed",
  "toPrecision",
  "toString",
  "toUpperCase",
  "trim",
  "unshift",
  "values",
]);

const unsupportedAssignmentOperators = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.AsteriskAsteriskEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
]);

const gmlReservedBindings = new Set([
  "all",
  "and",
  "argument",
  "argument_count",
  "begin",
  "div",
  "end",
  "exit",
  "global",
  "mod",
  "noone",
  "not",
  "or",
  "other",
  "pi",
  "pointer_null",
  "repeat",
  "self",
  "then",
  "undefined",
  "until",
  "xor",
]);
const compilerInternalPrefix = "__ts2gml_";

type RuntimeTypeDescriptor =
  | { kind: "number" | "string" | "boolean" | "undefined" | "null" | "never"; label: string }
  | { kind: "literal"; label: string; value: string | number | boolean }
  | { kind: "array"; element: RuntimeTypeDescriptor; label: string }
  | { kind: "union"; label: string; members: RuntimeTypeDescriptor[] }
  | { kind: "object" | "constructor"; label: string; name: string };

interface RuntimeArgumentGuard {
  argumentIndex: number;
  descriptor: RuntimeTypeDescriptor;
  spread: boolean;
}

export interface RuntimeTypeGuardPlan {
  level: RuntimeGuardLevel;
  contextObjects: ReadonlyMap<number, string>;
  guardedArguments: ReadonlyMap<number, readonly RuntimeArgumentGuard[]>;
}

export function compileTypeScript(source: string, fileName = "input.ts"): CompileResult {
  validateTypeScriptSource(source, fileName);
  const input = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const staticClasses = collectStaticClassNames([input]);
  const options: ts.CompilerOptions = { noResolve: true, types: [], target: ts.ScriptTarget.ESNext };
  const host = ts.createCompilerHost(options);
  const readSource = host.getSourceFile.bind(host);
  host.getSourceFile = (name, languageVersion, onError, createNew) => ts.sys.resolvePath(name) === ts.sys.resolvePath(fileName)
    ? input : readSource(name, languageVersion, onError, createNew);
  const program = ts.createProgram([fileName], options, host);
  const checker = program.getTypeChecker();
  validateRuntimeAccesses(input, checker);
  const staticReceivers = collectStaticReceivers(input, checker, staticClasses);
  const javascript = toJavaScript(source, fileName, undefined, staticReceivers, collectNativeAccessPlan(input, checker), { sourceFile: input, checker });
  const sourceFile = parseJavaScript(javascript, fileName);
  validateJavaScript(sourceFile);

  const chunks = sourceFile.statements
    .filter((statement) => !ts.isExportDeclaration(statement))
    .map((statement) => emitTopLevelGml(statement, sourceFile, staticClasses));
  if (staticClasses.size > 0) chunks.unshift(classStaticRuntimeGml);
  if (usesCollectionRuntime(sourceFile)) chunks.unshift(collectionRuntimeGml);
  if (usesRuntimeGuards(sourceFile)) {
    chunks.unshift(createRuntimeGuardGml());
  }
  if (usesValueRuntime(chunks.join("\n"))) chunks.unshift(valueRuntimeGml);

  const mapped = extractGmlSourceMap(`${chunks.filter(Boolean).join("\n\n").trim()}\n`,
    fileName.replace(/\.[jt]sx?$/i, ".gml"), ts.sys.getCurrentDirectory());
  return {
    javascript,
    gml: mapped.code,
    sourceMap: mapped.map,
  };
}

export function emitTopLevelGml(
  statement: ts.Statement,
  sourceFile: ts.SourceFile,
  staticClasses: ReadonlySet<string> = new Set(),
): string {
  if (ts.isClassDeclaration(statement)) {
    return [
      emitConstructorClass(statement, sourceFile),
      emitClassStatics(statement, sourceFile, staticClasses),
    ].filter(Boolean).join("\n\n");
  }

  if (ts.isVariableStatement(statement)) {
    const chunks: string[] = [];
    const runtimeDeclarations: ts.VariableDeclaration[] = [];
    for (const declaration of statement.declarationList.declarations) {
      const call = declaration.initializer && isGmMacroCall(declaration.initializer)
        ? declaration.initializer
        : undefined;
      if (call) chunks.push(...emitGmMacro(declaration, call, sourceFile));
      else runtimeDeclarations.push(declaration);
    }
    if (runtimeDeclarations.length > 0) {
      const locals = ts.factory.updateVariableStatement(
        statement,
        statement.modifiers,
        ts.factory.updateVariableDeclarationList(statement.declarationList, runtimeDeclarations),
      );
      chunks.push(stripExport(emitGml(locals, sourceFile)));
    }
    return chunks.join("\n");
  }

  return stripExport(emitGml(statement, sourceFile));
}

export function toJavaScript(
  source: string,
  fileName: string,
  runtimeTypeGuards?: RuntimeTypeGuardPlan,
  staticReceivers?: ReadonlySet<string>,
  nativeAccess?: RuntimeAccessPlan,
  typeScript?: { sourceFile: ts.SourceFile; checker: ts.TypeChecker },
): string {
  const enumSource = typeScript?.sourceFile ?? ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const enumConstants = new Map<number, string | number>();
  const enumReferences = new Map<number, { name: string; member: string }>();
  let enumChecker = typeScript?.checker;
  const collectEnums = (node: ts.Node): void => {
    if (ts.isTypeNode(node)) return;
    if (ts.isEnumDeclaration(node)) {
      enumChecker ??= createSourceChecker(enumSource);
      for (const member of node.members) {
        const value = enumChecker.getConstantValue(member);
        if (typeof value === "number" && !Number.isFinite(value)) {
          throw nodeError(member, enumSource, "TS2GML1070", "An enum value must be finite.");
        }
        if (value !== undefined) enumConstants.set(member.pos, value);
      }
    }
    if (enumChecker && ts.isIdentifier(node) && isIdentifierReference(node)) {
      const declaration = enumChecker.getSymbolAtLocation(node)?.valueDeclaration;
      if (declaration && ts.isEnumMember(declaration)) {
        if (ts.isIdentifier(declaration.name) || ts.isStringLiteralLike(declaration.name)) {
          enumReferences.set(node.pos, { name: declaration.parent.name.text, member: declaration.name.text });
        }
      }
    }
    ts.forEachChild(node, collectEnums);
  };
  collectEnums(enumSource);
  const result = ts.transpileModule(source, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      useDefineForClassFields: true,
      removeComments: false,
      inlineSourceMap: true,
      inlineSources: true,
    },
    transformers: {
      before: [runtimeTypeGuardTransformer(runtimeTypeGuards), (context) => (sourceFile) => {
        const visit: ts.Visitor = (node) => {
          if (ts.isTypeNode(node)) return node;
          const constant = enumConstants.get(node.pos);
          if (ts.isEnumMember(node) && constant !== undefined) {
            const value = typeof constant === "string" ? ts.factory.createStringLiteral(constant)
              : numericExpression(constant);
            return ts.factory.updateEnumMember(node, node.name, value);
          }
          const reference = ts.isIdentifier(node) && enumReferences.get(node.pos);
          if (reference) {
            return ts.setTextRange(ts.factory.createElementAccessExpression(
              ts.factory.createIdentifier(reference.name), ts.factory.createStringLiteral(reference.member)), node);
          }
          return ts.visitEachChild(node, visit, context);
        };
        return ts.visitNode(sourceFile, visit) as ts.SourceFile;
      }],
      after: [(context) => (sourceFile) => {
        const visit: ts.Visitor = (node) => {
          const original = ts.getOriginalNode(node);
          // Let TypeScript compute enum values and reverse mappings, then lower
          // its generated wrapper and assignment expressions to our JS subset.
          if (ts.isEnumDeclaration(original)) {
            const name = original.name.text;
            if (ts.isIdentifier(node)) return ts.factory.createIdentifier(name);
            if (ts.isVariableStatement(node)) {
              if (ts.isSourceFile(original.parent)) {
                const key = `__ts2gml_enum_${name}`;
                return [
                  ts.setTextRange(ts.factory.createVariableStatement(node.modifiers,
                    ts.factory.createVariableDeclarationList([
                      ts.factory.createVariableDeclaration(name, undefined, undefined,
                        runtimeCall("gm_macro", [ts.factory.createStringLiteral(`variable_global_get(${JSON.stringify(key)})`)])),
                    ], ts.NodeFlags.Const)), original),
                  ts.setTextRange(ts.factory.createExpressionStatement(runtimeCall("variable_global_set", [
                    ts.factory.createStringLiteral(key), ts.factory.createObjectLiteralExpression(),
                  ])), original),
                ];
              }
              return ts.factory.updateVariableStatement(node, node.modifiers,
                ts.factory.updateVariableDeclarationList(node.declarationList,
                  node.declarationList.declarations.map((declaration) => ts.factory.updateVariableDeclaration(
                    declaration, declaration.name, undefined, undefined, ts.factory.createObjectLiteralExpression()))));
            }
            if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
              ts.isParenthesizedExpression(node.expression.expression) && ts.isFunctionExpression(node.expression.expression.expression)) {
              return node.expression.expression.expression.body.statements.map((statement) => ts.visitNode(statement, visit) as ts.Statement);
            }
          }
          const enumAssignment = ts.isBinaryExpression(node) && ts.isElementAccessExpression(node.left) &&
            ts.isEnumDeclaration(ts.getOriginalNode(node.left.expression));
          const result = ts.visitEachChild(node, visit, context);
          if (ts.isBinaryExpression(result) && result.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            ts.isElementAccessExpression(result.left) && enumAssignment) {
            // The isolated emitter cannot resolve a string enum member from
            // another file and may still wrap its value in a reverse mapping.
            if (typeof enumConstants.get(node.pos) === "string" && ts.isCallExpression(result.left.argumentExpression)) {
              return ts.setTextRange(result.left.argumentExpression, node);
            }
            return ts.setTextRange(runtimeCall("__ts2gml_value_set", [result.left.expression, result.left.argumentExpression, result.right]), node);
          }
          if (nativeAccess?.nativeArrays.has(`${original.pos}:${original.end}:${original.kind}`)) {
            return runtimeCall("__ts2gml_native_array", [result as ts.Expression]);
          }
          if (nativeAccess?.nativeBooleans.has(`${original.pos}:${original.end}:${original.kind}`)) {
            return runtimeCall("__ts2gml_value_truthy", [result as ts.Expression]);
          }
          // Keep static reads distinguishable after type erasure. The GML
          // emitter uses a safe struct read, while calls and writes keep their receiver.
          if (ts.isPropertyAccessExpression(result) && !ts.isOptionalChain(result) &&
            isCallTo(result.expression, "__ts2gml_class_statics")) {
            return ts.setTextRange(ts.factory.createElementAccessExpression(
              result.expression, ts.factory.createStringLiteral(result.name.text)), node);
          }
          return staticReceivers?.has(`${original.pos}:${original.end}:${original.kind}`)
            ? runtimeCall("__ts2gml_class_statics", [result as ts.Expression])
            : result;
        };
        return ts.visitNode(sourceFile, visit) as ts.SourceFile;
      }],
    },
  });

  const diagnostics = (result.diagnostics ?? [])
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .map((diagnostic) => fromTypeScriptDiagnostic(diagnostic, fileName));
  if (diagnostics.length > 0) {
    throw new Ts2GmlError(diagnostics);
  }
  return result.outputText;
}

export const classStaticRuntimeScriptName = "__ts2gml_class_statics";

export const classStaticRuntimeGml = `function __ts2gml_class_statics(_class, _create = false) {
    static _classes = [];
    static _values = [];
    if (is_undefined(_class)) return undefined;
    for (var _index = 0; _index < array_length(_classes); _index += 1) {
        if (_classes[_index] == _class) return _values[_index];
    }
    if (!_create) throw "Class statics accessed before class initialization.";
    var _value = { __ts2gml_class: _class };
    array_push(_classes, _class);
    array_push(_values, _value);
    return _value;
}`;

export function collectStaticClassNames(sourceFiles: readonly ts.SourceFile[]): Set<string> {
  const classes = sourceFiles.flatMap((sourceFile) =>
    sourceFile.statements.filter((node): node is ts.ClassDeclaration =>
      ts.isClassDeclaration(node) && !hasModifier(node, ts.SyntaxKind.DeclareKeyword)
    )
  );
  const names = new Set(classes.flatMap((node) =>
    node.name && node.members.some((member) => hasModifier(member, ts.SyntaxKind.StaticKeyword))
      ? [node.name.text] : []
  ));
  let previousSize = -1;
  while (names.size !== previousSize) {
    previousSize = names.size;
    for (const node of classes) {
      const base = node.heritageClauses?.find((clause) =>
        clause.token === ts.SyntaxKind.ExtendsKeyword
      )?.types[0]?.expression;
      if (node.name && base && ts.isIdentifier(base) && names.has(base.text)) {
        names.add(node.name.text);
      }
    }
  }
  return names;
}

export function collectStaticReceivers(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  staticClasses: ReadonlySet<string>,
): Set<string> {
  const receivers = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isTypeNode(node)) return;
    const receiver = ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)
      ? node.expression
      : ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name)
        ? node.initializer
        : undefined;
    if (receiver) {
      const type = checker.getNonNullableType(checker.getTypeAtLocation(receiver));
      const types = type.isUnion() ? type.types : [type];
      const staticTypes = types.filter((item) => item.getConstructSignatures().length > 0 &&
        runtimeObjectName(item, checker, staticClasses));
      if (staticTypes.length > 0) {
        if (staticTypes.length !== types.length) {
          throw nodeError(node, sourceFile, "TS2GML2002",
            "A static member receiver cannot mix class and instance types.",
            "Narrow the receiver to a class before accessing its static members.");
        }
        if (ts.isElementAccessExpression(node) &&
          (!ts.isStringLiteralLike(node.argumentExpression) ||
            !isGmlIdentifier(node.argumentExpression.text))) {
          throw nodeError(node, sourceFile, "TS2GML2002",
            "Static member element access requires a literal GML member name.",
            "Use Class.member or Class[\"member\"].");
        }
        receivers.add(`${receiver.pos}:${receiver.end}:${receiver.kind}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return receivers;
}

export function emitClassStatics(
  classNode: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
  staticClasses: ReadonlySet<string>,
): string {
  const name = classNode.name?.text;
  const members = classNode.members.filter((member) => hasModifier(member, ts.SyntaxKind.StaticKeyword));
  if (!name || (members.length === 0 && !staticClasses.has(name))) return "";
  const lines: string[] = [];
  const base = classNode.heritageClauses?.find((clause) =>
    clause.token === ts.SyntaxKind.ExtendsKeyword
  )?.types[0]?.expression;
  if (base && ts.isIdentifier(base) && staticClasses.has(base.text)) {
    lines.push(`static_set(self, __ts2gml_class_statics(${base.text}));`);
  }
  // Methods exist before field initializers run; fields then execute in source order.
  for (const member of members) {
    if (ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) {
      throw nodeError(member, sourceFile, "TS2GML2003", "Class accessors are not supported yet.");
    }
    if (!ts.isMethodDeclaration(member) || !member.body) continue;
    const renames = parameterRenames(member.parameters);
    const parameters = member.parameters.map((parameter) =>
      emitGml(parameter, sourceFile, renames, true)
    ).join(", ");
    lines.push(`self.${memberName(member.name, sourceFile)} = method(undefined, function(${parameters}) ${emitGml(member.body, sourceFile, renames, true)});`);
  }
  for (const member of members) {
    if (!ts.isPropertyDeclaration(member)) continue;
    const value = member.initializer ? emitGml(member.initializer, sourceFile, new Map(), true) : "undefined";
    lines.push(`self.${memberName(member.name, sourceFile)} = ${value};`);
  }
  return `method(__ts2gml_class_statics(${name}, true), function() {\n${indent(lines.join("\n"))}\n})();`;
}

export function createRuntimeTypeGuardPlan(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  objectNames: ReadonlySet<string>,
  level: RuntimeGuardLevel,
): RuntimeTypeGuardPlan {
  const contextObjects = new Map<number, string>();
  const guardedArguments = new Map<number, RuntimeArgumentGuard[]>();
  const diagnostics: CompilerDiagnostic[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const contextKeyword = getGmlContextAssertion(node);
      const contextType = node.typeArguments?.[0];
      if (contextKeyword && contextType) {
        const type = checker.getTypeFromTypeNode(contextType);
        const objectName = type.isUnion()
          ? undefined
          : runtimeObjectName(
            type,
            checker,
            objectNames,
          );
        if (objectName) {
          contextObjects.set(node.getStart(sourceFile), objectName);
        } else if (checker.typeToString(type) !== "GMObject") {
          diagnostics.push(createNodeDiagnostic(
            contextType,
            sourceFile,
            "TS2GML1064",
            `The ${contextKeyword} runtime guard needs one concrete GameMaker object type.`,
            `Use ${
              (node.expression as ts.Identifier).text
            }<AuthoredObject>() or omit the type argument for an unchecked context value.`,
          ));
        }
      }

      const guardedIndexes = guardedMutationArgumentIndexes(node, checker);
      const signature = guardedIndexes.length > 0 ? checker.getResolvedSignature(node) : undefined;
      const guards = guardedIndexes.flatMap((argumentIndex): RuntimeArgumentGuard[] => {
        const argument = node.arguments[argumentIndex];
        if (!argument || !signature) return [];
        let expected = expectedArgumentType(signature, argumentIndex, node, checker);
        if (!expected) return [];
        const spread = ts.isSpreadElement(argument);
        let descriptor = runtimeTypeDescriptor(expected, checker, objectNames);
        if (!descriptor) return [];
        if (spread) {
          descriptor = {
            kind: "array",
            element: descriptor,
            label: `${descriptor.label}[]`,
          };
        }
        return [{ argumentIndex, descriptor, spread }];
      });
      if (guards.length > 0) guardedArguments.set(node.getStart(sourceFile), guards);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (diagnostics.length > 0) throw new Ts2GmlError(diagnostics);
  return { level, contextObjects, guardedArguments };
}

function usesRuntimeGuards(sourceFile: ts.SourceFile): boolean {
  let used = false;
  const visit = (node: ts.Node): void => {
    if (used) return;
    if (
      ts.isIdentifier(node) &&
      (node.text === "__ts2gml_guard_object" || node.text === "__ts2gml_guard_value")
    ) {
      used = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return used;
}

function runtimeTypeGuardTransformer(
  plan?: RuntimeTypeGuardPlan,
): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    return (sourceFile) => {
      const level = plan?.level ?? "standard";
      const hoistedContextCalls = new Set<number>();

      const visit: ts.Visitor = (node) => {
        if (
          ts.isBlock(node) &&
          node.parent &&
          isFunctionWithBody(node.parent) &&
          node.parent.body === node
        ) {
          const contexts = level === "off"
            ? { guards: [], positions: [] }
            : collectDirectContextGuards(node, sourceFile, plan);
          for (const position of contexts.positions) hoistedContextCalls.add(position);
          const visited = ts.visitEachChild(node, visit, context) as ts.Block;
          if (contexts.guards.length === 0) return visited;
          return ts.factory.updateBlock(visited, [
            ...contexts.guards.map(createContextGuardStatement),
            ...visited.statements,
          ]);
        }

        if (ts.isCallExpression(node)) {
          const position = node.getStart(sourceFile);
          const contextKeyword = getGmlContextAssertion(node);
          const expectedObject = contextKeyword
            ? contextObjectForCall(node, sourceFile, plan)
            : undefined;
          if (
            level !== "off" &&
            contextKeyword &&
            expectedObject &&
            !hoistedContextCalls.has(position)
          ) {
            const contextValue = ts.factory.createCallExpression(
              ts.factory.createIdentifier((node.expression as ts.Identifier).text),
              undefined,
              [],
            );
            return ts.factory.createCallExpression(
              ts.factory.createIdentifier("__ts2gml_guard_object"),
              undefined,
              [
                contextValue,
                ts.factory.createIdentifier(expectedObject),
                ts.factory.createStringLiteral(contextKeyword),
              ],
            );
          }

          const visited = ts.visitEachChild(node, visit, context) as ts.CallExpression;
          const argumentGuards = plan?.guardedArguments.get(position);
          if (level !== "maximum" || !argumentGuards || argumentGuards.length === 0) {
            return visited;
          }
          const byIndex = new Map(argumentGuards.map((guard) => [guard.argumentIndex, guard]));
          const member = ts.isPropertyAccessExpression(node.expression)
            ? node.expression.name.text
            : "call";
          return ts.factory.updateCallExpression(
            visited,
            visited.expression,
            visited.typeArguments,
            visited.arguments.map((argument, index) => {
              const guard = byIndex.get(index);
              if (!guard) return argument;
              const value = guard.spread && ts.isSpreadElement(argument)
                ? argument.expression
                : argument;
              const checked = ts.factory.createCallExpression(
                ts.factory.createIdentifier("__ts2gml_guard_value"),
                undefined,
                [
                  value,
                  runtimeTypeDescriptorExpression(guard.descriptor),
                  ts.factory.createStringLiteral(guard.descriptor.label),
                  ts.factory.createStringLiteral(`${member}() argument ${index + 1}`),
                ],
              );
              return guard.spread && ts.isSpreadElement(argument)
                ? ts.factory.updateSpreadElement(argument, checked)
                : checked;
            }),
          );
        }
        return ts.visitEachChild(node, visit, context);
      };

      return ts.visitNode(sourceFile, visit) as ts.SourceFile;
    };
  };
}

function collectDirectContextGuards(
  root: ts.Node,
  sourceFile: ts.SourceFile,
  plan: RuntimeTypeGuardPlan | undefined,
): {
  guards: Array<{ keyword: string; objectName: string }>;
  positions: number[];
} {
  const guards: Array<{ keyword: string; objectName: string }> = [];
  const positions: number[] = [];
  const seen = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (node !== root && isFunctionWithBody(node)) return;
    if (ts.isCallExpression(node)) {
      const keyword = getGmlContextAssertion(node);
      const objectName = keyword ? contextObjectForCall(node, sourceFile, plan) : undefined;
      if (keyword && objectName) {
        positions.push(node.getStart(sourceFile));
        const key = `${keyword}:${objectName}`;
        if (!seen.has(key)) {
          seen.add(key);
          guards.push({ keyword, objectName });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return { guards, positions };
}

function contextObjectForCall(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  plan: RuntimeTypeGuardPlan | undefined,
): string | undefined {
  const planned = plan?.contextObjects.get(call.getStart(sourceFile));
  if (planned) return planned;
  const type = call.typeArguments?.[0];
  if (
    type &&
    ts.isTypeReferenceNode(type) &&
    ts.isIdentifier(type.typeName) &&
    type.typeName.text !== "GMObject"
  ) {
    return type.typeName.text;
  }
  return undefined;
}

function createContextGuardStatement(
  guard: { keyword: string; objectName: string },
): ts.ExpressionStatement {
  return ts.factory.createExpressionStatement(
    ts.factory.createCallExpression(
      ts.factory.createIdentifier("__ts2gml_guard_object"),
      undefined,
      [
        ts.factory.createCallExpression(
          ts.factory.createIdentifier(guard.keyword === "self" ? "gm_self" : "gm_other"),
          undefined,
          [],
        ),
        ts.factory.createIdentifier(guard.objectName),
        ts.factory.createStringLiteral(guard.keyword),
      ],
    ),
  );
}

function numericExpression(value: number): ts.Expression {
  return value < 0
    ? ts.factory.createPrefixUnaryExpression(ts.SyntaxKind.MinusToken, ts.factory.createNumericLiteral(-value))
    : ts.factory.createNumericLiteral(value);
}

function runtimeTypeDescriptorExpression(descriptor: RuntimeTypeDescriptor): ts.Expression {
  const values: ts.Expression[] = [ts.factory.createStringLiteral(descriptor.kind)];
  if (descriptor.kind === "literal") {
    values.push(
      typeof descriptor.value === "string"
        ? ts.factory.createStringLiteral(descriptor.value)
        : typeof descriptor.value === "number"
          ? numericExpression(descriptor.value)
          : descriptor.value
            ? ts.factory.createTrue()
            : ts.factory.createFalse(),
    );
  } else if (descriptor.kind === "array") {
    values.push(runtimeTypeDescriptorExpression(descriptor.element));
  } else if (descriptor.kind === "union") {
    values.push(
      ts.factory.createArrayLiteralExpression(
        descriptor.members.map(runtimeTypeDescriptorExpression),
      ),
    );
  } else if (descriptor.kind === "object" || descriptor.kind === "constructor") {
    values.push(ts.factory.createIdentifier(descriptor.name));
  }
  return ts.factory.createArrayLiteralExpression(values);
}

function guardedMutationArgumentIndexes(
  call: ts.CallExpression,
  checker: ts.TypeChecker,
): number[] {
  if (!ts.isPropertyAccessExpression(call.expression)) return [];
  const member = call.expression.name.text;
  const receiverType = checker.getTypeAtLocation(call.expression.expression);
  if ((checker.isArrayType(receiverType) || checker.isTupleType(receiverType)) &&
    (member === "push" || member === "unshift")) {
    return call.arguments.map((_, index) => index);
  }

  const signature = checker.getResolvedSignature(call);
  const owner = signature?.declaration && declarationOwnerName(signature.declaration);
  const indexes = owner ? guardedCollectionMethods.get(`${owner}.${member}`) : undefined;
  if (indexes === "all") return call.arguments.map((_, index) => index);
  return indexes ? [...indexes] : [];
}

const guardedCollectionMethods = new Map<string, readonly number[] | "all">([
  ["Array.push", "all"],
  ["Array.unshift", "all"],
  ["List.add", [0]],
  ["List.insert", [1]],
  ["List.push", [0]],
  ["List.set", [1]],
  ["Set.add", [0]],
  ["Map.set", [0, 1]],
  ["Grid.add", [2]],
  ["Grid.clear", [0]],
  ["Grid.multiply", [2]],
  ["Grid.set", [2]],
  ["Queue.enqueue", [0]],
  ["Stack.push", [0]],
  ["PriorityQueue.add", [0]],
  ["PriorityQueue.changePriority", [0]],
]);

function declarationOwnerName(node: ts.Node): string | undefined {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (
      (ts.isInterfaceDeclaration(current) || ts.isClassDeclaration(current)) &&
      current.name
    ) {
      return current.name.text;
    }
    current = current.parent;
  }
  return undefined;
}

function expectedArgumentType(
  signature: ts.Signature,
  argumentIndex: number,
  call: ts.CallExpression,
  checker: ts.TypeChecker,
): ts.Type | undefined {
  if (
    ts.isPropertyAccessExpression(call.expression) &&
    checker.isArrayType(checker.getTypeAtLocation(call.expression.expression))
  ) {
    const receiver = checker.getTypeAtLocation(call.expression.expression);
    const element = arrayElementTypes(receiver, checker)[0];
    if (element) return element;
  }

  const parameter = signature.parameters[Math.min(argumentIndex, signature.parameters.length - 1)];
  if (!parameter) return undefined;
  let type = checker.getTypeOfSymbolAtLocation(parameter, call);
  const declaration = parameter.valueDeclaration;
  if (declaration && ts.isParameter(declaration) && declaration.dotDotDotToken) {
    type = arrayElementTypes(type, checker)[0] ?? type;
  }
  return type;
}

function arrayElementTypes(type: ts.Type, checker: ts.TypeChecker): readonly ts.Type[] {
  if (!checker.isArrayType(type) && !checker.isTupleType(type)) return [];
  return checker.getTypeArguments(type as ts.TypeReference);
}

function runtimeTypeDescriptor(
  type: ts.Type,
  checker: ts.TypeChecker,
  objectNames: ReadonlySet<string>,
  seen = new Set<ts.Type>(),
): RuntimeTypeDescriptor | undefined {
  if (seen.has(type)) return undefined;
  seen.add(type);
  const label = checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation);
  if (type.flags & ts.TypeFlags.Any || type.flags & ts.TypeFlags.Unknown) return undefined;
  if (type.flags & ts.TypeFlags.StringLiteral) {
    return { kind: "literal", label, value: (type as ts.StringLiteralType).value };
  }
  if (type.flags & ts.TypeFlags.NumberLiteral) {
    return { kind: "literal", label, value: (type as ts.NumberLiteralType).value };
  }
  if (type.flags & ts.TypeFlags.BooleanLiteral) {
    return { kind: "literal", label, value: label === "true" };
  }
  if (type.flags & ts.TypeFlags.StringLike) return { kind: "string", label };
  if (type.flags & ts.TypeFlags.NumberLike) {
    return { kind: "number", label };
  }
  if (type.flags & ts.TypeFlags.BooleanLike) return { kind: "boolean", label };
  if (type.flags & ts.TypeFlags.Null) return { kind: "null", label };
  if (type.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void)) {
    return { kind: "undefined", label };
  }
  if (type.flags & ts.TypeFlags.Never) return { kind: "never", label };
  if (type.isUnion()) {
    const members = type.types.map((member) =>
      runtimeTypeDescriptor(member, checker, objectNames, new Set(seen))
    );
    if (members.some((member) => !member)) return undefined;
    return { kind: "union", label, members: members as RuntimeTypeDescriptor[] };
  }
  if (checker.isArrayType(type) || checker.isTupleType(type)) {
    const elements = arrayElementTypes(type, checker);
    const descriptors = elements.map((element) =>
      runtimeTypeDescriptor(element, checker, objectNames, new Set(seen))
    );
    if (descriptors.length === 0 || descriptors.some((descriptor) => !descriptor)) {
      return undefined;
    }
    const element = descriptors.length === 1
      ? descriptors[0]!
      : { kind: "union", members: descriptors, label: "tuple element" } as RuntimeTypeDescriptor;
    return { kind: "array", element, label };
  }

  const objectName = runtimeObjectName(type, checker, objectNames);
  if (objectName) return { kind: "object", label, name: objectName };
  if (type.isIntersection()) {
    for (const member of type.types) {
      const descriptor = runtimeTypeDescriptor(member, checker, objectNames, new Set(seen));
      if (descriptor && descriptor.kind !== "constructor") return { ...descriptor, label };
    }
  }
  const symbol = type.aliasSymbol ?? type.getSymbol();
  if (
    symbol &&
    isGmlIdentifier(symbol.name) &&
    symbol.declarations?.some(ts.isClassDeclaration)
  ) {
    return { kind: "constructor", label, name: symbol.name };
  }
  const constraint = checker.getBaseConstraintOfType(type);
  return constraint && constraint !== type
    ? runtimeTypeDescriptor(constraint, checker, objectNames, seen)
    : undefined;
}

export function runtimeObjectName(
  type: ts.Type,
  checker: ts.TypeChecker,
  objectNames: ReadonlySet<string>,
  seen = new Set<ts.Type>(),
): string | undefined {
  if (seen.has(type)) return undefined;
  seen.add(type);
  for (const symbol of [type.aliasSymbol, type.getSymbol()]) {
    if (symbol && objectNames.has(symbol.name)) return symbol.name;
  }
  if (type.isUnionOrIntersection()) {
    for (const member of type.types) {
      const name = runtimeObjectName(member, checker, objectNames, seen);
      if (name) return name;
    }
  }
  const constraint = checker.getBaseConstraintOfType(type);
  return constraint && constraint !== type
    ? runtimeObjectName(constraint, checker, objectNames, seen)
    : undefined;
}

export function parseJavaScript(source: string, fileName: string): ts.SourceFile {
  return parseMappedJavaScript(source, fileName);
}

export function usesCollectionRuntime(sourceFile: ts.SourceFile): boolean {
  let used = false;
  const visit = (node: ts.Node): void => {
    if (used) return;
    if (ts.isDeleteExpression(node)) {
      used = true;
      return;
    }
    if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (
        collectionConstructors.has(node.expression.text) ||
        [...collectionConstructors.values()].includes(node.expression.text)
      )
    ) {
      used = true;
      return;
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      (node.name.text === "length" || loweredJavaScriptInstanceMembers.has(node.name.text))
    ) {
      used = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return used;
}

export function validateTypeScriptSource(source: string, fileName: string): void {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const diagnostics: CompilerDiagnostic[] = [];
  const enumNames = new Set(sourceFile.statements.flatMap((statement) =>
    ts.isEnumDeclaration(statement) && !hasModifier(statement, ts.SyntaxKind.DeclareKeyword) ? [statement.name.text] : []));
  for (const validate of [
    validateJavaScript,
    validateBlockScopedShadowing,
    validateTopLevelVariableReferences,
    validateFunctionCaptures,
    validateJavaScriptRuntime,
    (file: ts.SourceFile) => validateGmlBindingConflicts(file, new Set(), enumNames),
  ]) {
    try {
      validate(sourceFile);
    } catch (error) {
      if (error instanceof Ts2GmlError) diagnostics.push(...error.diagnostics);
      else throw error;
    }
  }
  if (diagnostics.length > 0) throw new Ts2GmlError(diagnostics);
}

export function validateRuntimeAccesses(sourceFile: ts.SourceFile, checker: ts.TypeChecker): void {
  const issues = inspectRuntimeAccesses(sourceFile, checker,
    loweredJavaScriptInstanceMembers, unsupportedJavaScriptInstanceMembers);
  if (issues.length > 0) throw new Ts2GmlError(issues.map((issue) =>
    createNodeDiagnostic(issue.node, sourceFile, "TS2GML1051", issue.message, issue.suggestion)
  ));
}

export function validateJavaScript(sourceFile: ts.SourceFile): void {
  const diagnostics: CompilerDiagnostic[] = [];

  const report = (
    node: ts.Node,
    code: string,
    message: string,
    suggestion?: string,
  ) => {
    diagnostics.push(createNodeDiagnostic(node, sourceFile, code, message, suggestion));
  };

  const validateBinding = (name: ts.BindingName): void => {
    if (ts.isIdentifier(name)) {
      if (!isGmlIdentifier(name.text)) {
        report(
          name,
          "TS2GML1063",
          `Identifier '${name.text}' is not a valid GML name.`,
          "Use at most 64 ASCII letters, digits, and underscores, starting with a letter or underscore.",
        );
      } else if (name.text.startsWith(compilerInternalPrefix)) {
        report(
          name,
          "TS2GML1056",
          `Binding '${name.text}' uses the compiler's reserved internal prefix.`,
          `Rename the binding so it does not start with '${compilerInternalPrefix}'.`,
        );
      } else if (
        gmlReservedBindings.has(name.text) &&
        !(
          ts.isParameter(name.parent) &&
          (ts.isMethodDeclaration(name.parent.parent) ||
            ts.isConstructorDeclaration(name.parent.parent) ||
            isGmWithAction(name.parent.parent))
        )
      ) {
        report(
          name,
          "TS2GML1063",
          `Local binding '${name.text}' conflicts with a reserved GML name.`,
          "Rename the binding so GameMaker can parse it as a variable.",
        );
      } else if (compilerIntrinsicBindings.has(name.text)) {
        report(
          name,
          "TS2GML1056",
          `Local binding '${name.text}' shadows a compiler intrinsic.`,
          "Rename the local binding so the compiler intrinsic keeps its defined meaning.",
        );
      }
      return;
    }
    for (const element of name.elements) {
      if (!ts.isOmittedExpression(element)) validateBinding(element.name);
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isTypeNode(node)) return;
    if (ts.isNumericLiteral(node) && !Number.isFinite(Number(node.text))) {
      report(node, "TS2GML1070", "A numeric literal must be finite.", "Use GameMaker's explicit infinity constant when that target value is intended.");
    }
    if (ts.isVariableDeclaration(node) || ts.isParameter(node)) {
      validateBinding(node.name);
    } else if (
      (ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isClassDeclaration(node) ||
        ts.isClassExpression(node) ||
        ts.isEnumDeclaration(node)) &&
      node.name
    ) {
      validateBinding(node.name);
    } else if (
      (ts.isPropertyDeclaration(node) || ts.isMethodDeclaration(node)) &&
      (ts.isIdentifier(node.name) || ts.isStringLiteralLike(node.name)) &&
      (node.name.text === "gm_with" ||
        (node.name.text === "__ts2gml_class" && hasModifier(node, ts.SyntaxKind.StaticKeyword)))
    ) {
      report(
        node.name,
        "TS2GML1056",
        `Class member '${node.name.text}' conflicts with a compiler intrinsic.`,
        "Rename the member so the compiler intrinsic keeps its defined meaning.",
      );
    }
    if (
      ts.isIdentifier(node) &&
      !isGmlIdentifier(node.text) &&
      (
        isIdentifierReference(node) ||
        ((ts.isPropertyAccessExpression(node.parent) ||
          ts.isPropertyDeclaration(node.parent) ||
          ts.isMethodDeclaration(node.parent) ||
          ts.isGetAccessorDeclaration(node.parent) ||
          ts.isSetAccessorDeclaration(node.parent)) && node.parent.name === node) ||
        (ts.isPropertyAssignment(node.parent) && node.parent.name === node)
      )
    ) {
      report(
        node,
        "TS2GML1063",
        `Identifier '${node.text}' is not a valid GML name.`,
        "Use at most 64 ASCII letters, digits, and underscores, starting with a letter or underscore.",
      );
    }
    if (isGmMacroCall(node)) {
      validateGmMacroCall(node, report);
      return;
    }
    if (isCallTo(node, "gm_static")) {
      const field = node.parent;
      const factory = node.arguments[0];
      if (!ts.isPropertyDeclaration(field) || field.initializer !== node ||
        !ts.isClassDeclaration(field.parent) || hasModifier(field, ts.SyntaxKind.StaticKeyword)) {
        report(node, "TS2GML1071", "gm_static must initialize an ordinary instance field.",
          "Use field = gm_static(() => expression) in an ordinary constructor class.");
      }
      if (node.arguments.length !== 1 || !factory || !ts.isArrowFunction(factory) ||
        factory.parameters.length !== 0 || ts.isBlock(factory.body)) {
        report(node, "TS2GML1071", "gm_static expects one parameterless expression arrow.",
          "Use gm_static(() => expression); call a named function for more complex initialization.");
      } else {
        const inspect = (child: ts.Node): void => {
          if (ts.isTypeNode(child)) return;
          if (child.kind === ts.SyntaxKind.ThisKeyword || child.kind === ts.SyntaxKind.SuperKeyword ||
            (ts.isIdentifier(child) && isIdentifierReference(child) &&
              ["self", "other", "gm_self", "gm_other", "arguments"].includes(child.text))) {
            report(child, "TS2GML1071", "gm_static factories cannot depend on instance context.",
              "Use literals, class statics, or named initialization functions; native statics initialize before instance fields.");
          }
          if (ts.isFunctionLike(child)) {
            report(child, "TS2GML1071", "gm_static factories cannot contain nested functions.",
              "Use a normal instance method or an instance arrow field for callbacks.");
            return;
          }
          ts.forEachChild(child, inspect);
        };
        inspect(factory.body);
      }
    }
    if (ts.isIdentifier(node) && node.text === "gm_static" &&
      isIdentifierReference(node) && !isDirectCallTarget(node)) {
      report(node, "TS2GML1071", "gm_static is a compiler intrinsic and cannot be used as a runtime value.",
        "Use it directly as the initializer of an ordinary instance field.");
    }
    if (isGmWithCall(node)) validateGmWithCall(node, report);
    const contextKeyword = getGmlContextAssertion(node);
    if (contextKeyword && ts.isCallExpression(node)) {
      validateGmlContextAssertion(node, report);
    }
    if (
      ts.isIdentifier(node) &&
      node.text === "gm_macro" &&
      isIdentifierReference(node)
    ) {
      report(
        node,
        "TS2GML1037",
        "gm_macro is a compiler intrinsic and cannot be used as a runtime value.",
        "Use it directly as the initializer of a top-level const declaration.",
      );
      return;
    }
    if (
      ts.isIdentifier(node) &&
      (node.text === "gm_with" || gmlContextAssertions.has(node.text)) &&
      isIdentifierReference(node) &&
      !isDirectCallTarget(node)
    ) {
      report(
        node,
        node.text === "gm_with" ? "TS2GML1044" : "TS2GML1045",
        `${node.text} is a compiler intrinsic and cannot be used as a runtime value.`,
        node.text === "gm_with"
          ? "Call gm_with(target, (self, other) => { ... }) as a statement."
          : `Call ${node.text}<ObjectType>() directly where the context value is needed.`,
      );
      return;
    }
    if (
      (ts.isImportDeclaration(node) && !isTypeOnlyImport(node)) ||
      ts.isImportEqualsDeclaration(node)
    ) {
      report(
        node,
        "TS2GML1001",
        "ES module imports are not supported; GameMaker declarations are global.",
        "Remove the import and use the generated global GameMaker declarations.",
      );
      return;
    }
    if (ts.isAwaitExpression(node) || ts.isYieldExpression(node)) {
      report(
        node,
        "TS2GML1002",
        "Async and generator control flow has no direct GML equivalent.",
      );
    }
    if (
      ts.isSpreadElement(node) &&
      !ts.isArrayLiteralExpression(node.parent) &&
      !ts.isCallExpression(node.parent)
    ) {
      report(
        node,
        "TS2GML1003",
        "Spread syntax is only supported in arrays and function calls.",
      );
    }
    if (
      ts.isParameter(node) &&
      !ts.isIdentifier(node.name)
    ) {
      report(
        node.name,
        "TS2GML1004",
        "Destructuring parameters are not supported yet.",
        "Accept one parameter and destructure it inside the function body.",
      );
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      (ts.isArrayLiteralExpression(node.left) || ts.isObjectLiteralExpression(node.left))
    ) {
      report(
        node.left,
        "TS2GML1005",
        "Destructuring assignments are not supported yet; use a declaration.",
      );
    }
    if (
      ts.isVariableDeclaration(node) &&
      !ts.isIdentifier(node.name) &&
      !ts.isVariableDeclarationList(node.parent)
    ) {
      report(node.name, "TS2GML1006", "Destructuring is not supported in this position.");
    }
    if (ts.isCallExpression(node) && ts.isOptionalChain(node) && !getOptionalCallStatement(node)) {
      report(
        node,
        "TS2GML1007",
        "Optional calls are only supported as standalone method-call statements with optional property access.",
        "Use receiver?.method() as a statement, or check the callable explicitly before invoking it.",
      );
      return;
    }
    if (ts.isElementAccessExpression(node) && ts.isOptionalChain(node)) {
      report(
        node,
        "TS2GML1008",
        "Optional element access cannot preserve deferred key evaluation in GML.",
        "Check the value explicitly before reading the computed property.",
      );
      return;
    }
    if (ts.isForOfStatement(node) && node.awaitModifier) {
      report(node, "TS2GML1009", "Async iteration has no direct GML equivalent.");
    }
    if (
      ts.isDeleteExpression(node) &&
      !ts.isPropertyAccessExpression(node.expression) &&
      !ts.isElementAccessExpression(node.expression)
    ) {
      report(
        node,
        "TS2GML1010",
        "delete requires a property, collection key, or collection index.",
      );
    }
    if (hasModifier(node, ts.SyntaxKind.AsyncKeyword)) {
      report(node, "TS2GML1011", "Async functions are not supported.");
    }
    if (ts.isRegularExpressionLiteral(node)) {
      report(node, "TS2GML1012", "Regular expressions are not supported by GML.");
    }
    if (ts.isBigIntLiteral(node)) {
      report(node, "TS2GML1013", "Bigint literals are not supported by GML.");
    }
    if (ts.isTaggedTemplateExpression(node)) {
      report(node, "TS2GML1021", "Tagged template expressions are not supported by GML.");
    }
    if (ts.isFunctionLike(node) && "asteriskToken" in node && node.asteriskToken) {
      report(
        node.asteriskToken,
        "TS2GML1057",
        "Generator functions are not supported, even when they contain no yield expression.",
      );
    }
    if (ts.isDebuggerStatement(node)) {
      report(
        node,
        "TS2GML1058",
        "JavaScript debugger statements have no GML equivalent.",
        "Set a breakpoint in the GameMaker IDE instead.",
      );
    }
    if (
      ts.isReturnStatement(node) ||
      ts.isBreakStatement(node) ||
      ts.isContinueStatement(node)
    ) {
      let ancestor: ts.Node | undefined = node.parent;
      while (ancestor && !ts.isFunctionLike(ancestor)) {
        if (
          ts.isBlock(ancestor) &&
          ts.isTryStatement(ancestor.parent) &&
          ancestor.parent.finallyBlock === ancestor
        ) {
          report(
            node,
            "TS2GML1059",
            `${ts.isReturnStatement(node) ? "return" : ts.isBreakStatement(node) ? "break" : "continue"} cannot be emitted inside a GML finally block.`,
            "Move the control-flow statement outside finally.",
          );
          break;
        }
        ancestor = ancestor.parent;
      }
    }
    if (ts.isLabeledStatement(node)) {
      report(
        node.label,
        "TS2GML1046",
        "Labeled statements have no GML equivalent.",
        "Use a flag, return from a helper, or restructure the loops.",
      );
    }
    if ((ts.isBreakStatement(node) || ts.isContinueStatement(node)) && node.label) {
      report(node.label, "TS2GML1046", "Labeled break and continue have no GML equivalent.");
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
      !unsupportedAssignmentOperators.has(node.operatorToken.kind) &&
      !isStandaloneAssignment(node)
    ) {
      report(
        node,
        "TS2GML1047",
        "GML assignments cannot be used as expression values.",
        "Put the assignment in its own statement before using the assigned value.",
      );
    }
    if (
      ts.isBinaryExpression(node) &&
      unsupportedAssignmentOperators.has(node.operatorToken.kind)
    ) {
      report(
        node.operatorToken,
        "TS2GML1052",
        `JavaScript operator '${node.operatorToken.getText(sourceFile)}' has no safe GML lowering.`,
        "Expand it into an explicit assignment using GameMaker-compatible operators or functions.",
      );
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken
    ) {
      report(node.operatorToken, "TS2GML1053", "Unsigned right shift has no GML equivalent.");
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.CommaToken
    ) {
      report(
        node.operatorToken,
        "TS2GML1054",
        "The JavaScript comma operator has no GML equivalent.",
        "Put each expression in its own statement.",
      );
    }
    if (ts.isBinaryExpression(node) &&
      [ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(node.operatorToken.kind)) {
      report(node.operatorToken, "TS2GML1069", "Coercive equality has no supported JavaScript-compatible GML lowering.",
        "Use === or !== and convert operands explicitly when their types differ.");
    }
    if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator) &&
      !isStandaloneUpdate(node)
    ) {
      report(
        node,
        "TS2GML1055",
        "Increment and decrement cannot be used as expression values in GML.",
        "Update the variable in its own statement before reading it.",
      );
    }
    if (node.kind === ts.SyntaxKind.SuperKeyword && !isSupportedSuperCall(node)) {
      report(
        node,
        "TS2GML1048",
        "Only a direct super(...) constructor call can be lowered to GML.",
        "Use event_inherited() in GameMaker object events, or call a shared helper explicitly.",
      );
    }
    if (
      ts.isClassDeclaration(node) &&
      !ts.isSourceFile(node.parent)
    ) {
      report(
        node,
        "TS2GML1050",
        "Nested class declarations cannot be lowered to GML constructors.",
        "Move the class to the top level.",
      );
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      report(node, "TS2GML1022", "Dynamic imports are not supported.");
      return;
    }
    if (
      ts.isMetaProperty(node) &&
      node.keywordToken === ts.SyntaxKind.ImportKeyword
    ) {
      report(node, "TS2GML1023", "import.meta has no GML equivalent.");
    }
    if (ts.isPrivateIdentifier(node)) {
      report(node, "TS2GML1024", "JavaScript private fields are not supported by GML.");
    }
    if (ts.isClassExpression(node)) {
      report(node, "TS2GML1025", "Class expressions cannot be represented as GML constructors.");
    }
    if (ts.isClassStaticBlockDeclaration(node)) {
      report(
        node,
        "TS2GML1060",
        "JavaScript class static blocks have no GML equivalent.",
      );
    }
    if (ts.isPropertyDeclaration(node) && hasModifier(node, ts.SyntaxKind.AccessorKeyword)) {
      report(
        node,
        "TS2GML1060",
        "JavaScript auto-accessor fields are not supported by GML constructors.",
        "Use an ordinary field or explicit methods.",
      );
    }
    if (ts.isFunctionDeclaration(node) && !node.name) {
      report(
        node,
        "TS2GML1062",
        "Anonymous default-exported functions cannot become global GML script functions.",
        "Give the function a name or remove the default export.",
      );
    }
    if (ts.isExportAssignment(node)) {
      report(
        node,
        "TS2GML1061",
        "Default export expressions have no GML module equivalent.",
        "Export a named declaration or use a top-level GameMaker global.",
      );
    }
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      !node.isTypeOnly &&
      !(node.exportClause &&
        ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.length > 0 &&
        node.exportClause.elements.every((element) => element.isTypeOnly))
    ) {
      report(
        node,
        "TS2GML1061",
        "Runtime re-exports are not supported; GameMaker declarations are global.",
        "Remove the re-export and use a named declaration in this project.",
      );
    }
    if (ts.isParameter(node) && node.dotDotDotToken) {
      report(
        node,
        "TS2GML1026",
        "Rest parameters are not supported.",
        "Use the GML-compatible argument array and argument_count declarations instead.",
      );
    }
    if (ts.isMethodDeclaration(node) && ts.isObjectLiteralExpression(node.parent)) {
      report(
        node,
        "TS2GML1027",
        "Object-literal method shorthand is not supported.",
        "Assign an arrow or function expression to an identifier property instead.",
      );
    }
    if (
      (ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) &&
      ts.isObjectLiteralExpression(node.parent)
    ) {
      report(node, "TS2GML1028", "Object-literal accessors are not supported by GML.");
    }
    if (
      (ts.isPropertyAssignment(node) ||
        ts.isPropertyDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isGetAccessorDeclaration(node) ||
        ts.isSetAccessorDeclaration(node)) &&
      ts.isComputedPropertyName(node.name)
    ) {
      report(node.name, "TS2GML1029", "Computed property names are not supported in this position.");
    }
    if (
      ts.isPropertyAssignment(node) &&
      ts.isObjectLiteralExpression(node.parent) &&
      !ts.isIdentifier(node.name)
    ) {
      report(
        node.name,
        "TS2GML1064",
        "GML struct literal keys must be identifier names.",
        "Use an identifier key, or create the struct and call variable_struct_set for a dynamic string key.",
      );
    }
    if (
      ts.isSpreadElement(node) &&
      ts.isCallExpression(node.parent) &&
      node.parent.expression.kind === ts.SyntaxKind.SuperKeyword
    ) {
      report(
        node,
        "TS2GML1065",
        "Spread arguments cannot be emitted in a GML parent-constructor clause.",
        "Pass each parent constructor argument explicitly.",
      );
    }
    if (ts.isModuleDeclaration(node)) {
      report(
        node,
        "TS2GML1030",
        "TypeScript namespaces do not have a safe JavaScript-to-GML lowering.",
        "Use a const struct or GameMaker declarations instead.",
      );
      return;
    }
    if (
      ts.isVariableDeclarationList(node) &&
      (node.flags & ts.NodeFlags.Using) === ts.NodeFlags.Using
    ) {
      report(node, "TS2GML1031", "using declarations are not supported by GML.");
    }
    if (ts.canHaveDecorators(node) && ts.getDecorators(node)?.length) {
      report(node, "TS2GML1032", "Decorators are not supported.");
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  if (diagnostics.length > 0) {
    throw new Ts2GmlError(diagnostics);
  }
}

function isTypeOnlyImport(node: ts.ImportDeclaration): boolean {
  const clause = node.importClause;
  if (!clause) return false;
  if (clause.isTypeOnly) return true;
  return !clause.name &&
    !!clause.namedBindings &&
    ts.isNamedImports(clause.namedBindings) &&
    clause.namedBindings.elements.length > 0 &&
    clause.namedBindings.elements.every((element) => element.isTypeOnly);
}

function isStandaloneAssignment(node: ts.BinaryExpression): boolean {
  let expression: ts.Expression = node;
  while (ts.isParenthesizedExpression(expression.parent)) expression = expression.parent;
  const parent = expression.parent;
  return (ts.isExpressionStatement(parent) && parent.expression === expression) ||
    (ts.isForStatement(parent) &&
      (parent.initializer === expression || parent.incrementor === expression));
}

function getOptionalCallStatement(node: ts.Node, standalone = false) {
  while (ts.isParenthesizedExpression(node)) node = node.expression;
  if (!ts.isOptionalChain(node)) return undefined;
  let expression: ts.Expression = node;
  while (expression.parent && ts.isOptionalChain(expression.parent) &&
    expression.parent.expression === expression) {
    expression = expression.parent;
  }
  while (expression.parent && ts.isParenthesizedExpression(expression.parent)) expression = expression.parent;
  if (!standalone && (!expression.parent || !ts.isExpressionStatement(expression.parent))) return undefined;
  while (ts.isParenthesizedExpression(expression)) expression = expression.expression;
  if (!ts.isCallExpression(expression) || !ts.isOptionalChain(expression)) return undefined;
  const chain = decomposeOptionalChain(expression);
  if (!chain.segments.every((segment) => segment.kind !== "element")) return undefined;
  if (chain.segments.some((segment) => segment.kind === "call" && segment.optional)) return undefined;
  return { base: chain.base, segments: chain.segments };
}

function isSupportedSuperCall(node: ts.Node): boolean {
  if (!ts.isCallExpression(node.parent) || node.parent.expression !== node) return false;
  const statement = node.parent.parent;
  return ts.isExpressionStatement(statement) &&
    statement.expression === node.parent &&
    ts.isBlock(statement.parent) &&
    ts.isConstructorDeclaration(statement.parent.parent);
}

function isStandaloneUpdate(node: ts.PrefixUnaryExpression | ts.PostfixUnaryExpression): boolean {
  let expression: ts.Expression = node;
  while (ts.isParenthesizedExpression(expression.parent)) expression = expression.parent;
  const parent = expression.parent;
  return (ts.isExpressionStatement(parent) && parent.expression === expression) ||
    (ts.isForStatement(parent) && parent.incrementor === expression);
}

function validateBlockScopedShadowing(sourceFile: ts.SourceFile): void {
  const diagnostics: CompilerDiagnostic[] = [];

  const extendScopes = (
    bindings: ReadonlyMap<string, ts.Node>,
    scopes: readonly ReadonlySet<string>[],
  ): readonly ReadonlySet<string>[] => {
    for (const [name, declaration] of bindings) {
      if (scopes.some((scope) => scope.has(name))) {
        diagnostics.push(createNodeDiagnostic(
          declaration,
          sourceFile,
          "TS2GML1049",
          `Block-scoped '${name}' shadows another local, but GML locals are function-scoped.`,
          "Rename one of the locals so each name is unique within the function or script.",
        ));
      }
    }
    return [...scopes, new Set(bindings.keys())];
  };

  const visitFunction = (node: FunctionWithBody): void => {
    const functionBindings = new Set<string>();
    for (const parameter of node.parameters) collectBindingNames(parameter.name, functionBindings);
    collectHoistedVariableBindings(node.body, functionBindings);
    visitNode(node.body, [functionBindings], node);
  };

  const visitStatements = (
    statements: readonly ts.Statement[],
    scopes: readonly ReadonlySet<string>[],
    owner?: FunctionWithBody,
  ): void => {
    const bindings = new Map<string, ts.Node>();
    for (const statement of statements) {
      if (ts.isEnumDeclaration(statement)) bindings.set(statement.name.text, statement.name);
      if (
        !ts.isVariableStatement(statement) ||
        (statement.declarationList.flags & ts.NodeFlags.BlockScoped) === 0
      ) continue;
      for (const declaration of statement.declarationList.declarations) {
        collectBindingNodes(declaration.name, bindings);
      }
    }
    const nextScopes = extendScopes(bindings, scopes);
    for (const statement of statements) visitNode(statement, nextScopes, owner);
  };

  const visitNode = (
    node: ts.Node,
    scopes: readonly ReadonlySet<string>[],
    owner?: FunctionWithBody,
  ): void => {
    if (node !== owner && isFunctionWithBody(node)) {
      if (isGmWithAction(node)) {
        visitNode(node.body, scopes, owner);
        return;
      }
      visitFunction(node);
      return;
    }
    if (ts.isBlock(node)) {
      visitStatements(node.statements, scopes, owner);
      return;
    }
    const declarationList = ts.isForStatement(node)
      ? node.initializer && ts.isVariableDeclarationList(node.initializer)
        ? node.initializer
        : undefined
      : ts.isForInStatement(node) || ts.isForOfStatement(node)
        ? ts.isVariableDeclarationList(node.initializer)
          ? node.initializer
          : undefined
        : undefined;
    if (declarationList && (declarationList.flags & ts.NodeFlags.BlockScoped) !== 0) {
      const bindings = new Map<string, ts.Node>();
      for (const declaration of declarationList.declarations) {
        collectBindingNodes(declaration.name, bindings);
      }
      const nextScopes = extendScopes(bindings, scopes);
      ts.forEachChild(node, (child) => visitNode(child, nextScopes, owner));
      return;
    }
    if (ts.isCatchClause(node) && node.variableDeclaration) {
      const bindings = new Map<string, ts.Node>();
      collectBindingNodes(node.variableDeclaration.name, bindings);
      const nextScopes = extendScopes(bindings, scopes);
      visitNode(node.block, nextScopes, owner);
      return;
    }
    ts.forEachChild(node, (child) => visitNode(child, scopes, owner));
  };

  const rootBindings = new Set<string>();
  collectHoistedVariableBindings(sourceFile, rootBindings);
  visitStatements(sourceFile.statements, [rootBindings]);
  if (diagnostics.length > 0) throw new Ts2GmlError(diagnostics);
}

function collectBindingNodes(name: ts.BindingName, bindings: Map<string, ts.Node>): void {
  if (ts.isIdentifier(name)) {
    bindings.set(name.text, name);
    return;
  }
  for (const element of name.elements) {
    if (!ts.isOmittedExpression(element)) collectBindingNodes(element.name, bindings);
  }
}

type DiagnosticReporter = (
  node: ts.Node,
  code: string,
  message: string,
  suggestion?: string,
) => void;

function isGmMacroCall(node: ts.Node): node is ts.CallExpression {
  return isCallTo(node, "gm_macro");
}

function isGmWithCall(node: ts.Node): node is ts.CallExpression {
  return isCallTo(node, "gm_with") ||
    (ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
      node.expression.name.text === "gm_with");
}

function getGmlContextAssertion(node: ts.Node): string | undefined {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression)
    ? gmlContextAssertions.get(node.expression.text)
    : undefined;
}

function isCallTo(node: ts.Node, name: string): node is ts.CallExpression {
  return ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === name;
}

function isDirectCallTarget(node: ts.Identifier): boolean {
  return ts.isCallExpression(node.parent) && node.parent.expression === node;
}

function isGmWithAction(node: ts.Node): node is ts.ArrowFunction {
  return ts.isArrowFunction(node) &&
    ts.isCallExpression(node.parent) &&
    isGmWithCall(node.parent) &&
    node.parent.arguments[1] === node;
}

function validateGmWithCall(
  call: ts.CallExpression,
  report: DiagnosticReporter,
): void {
  if (!ts.isExpressionStatement(call.parent) || call.parent.expression !== call) {
    report(
      call,
      "TS2GML1044",
      "gm_with must be used as a standalone statement.",
      "Call gm_with(target, (self, other) => { ... }); on its own line.",
    );
  }

  if (call.arguments.length !== 2) {
    report(
      call,
      "TS2GML1044",
      "gm_with expects a target and an inline arrow-function block.",
    );
    return;
  }

  const action = call.arguments[1]!;
  if (!ts.isArrowFunction(action) || !ts.isBlock(action.body)) {
    report(
      action,
      "TS2GML1044",
      "The gm_with action must be an arrow function with a block body.",
      "Use (self, other) => { ... } so the block can be emitted inline.",
    );
    return;
  }

  if (action.parameters.length > 2) {
    report(
      action.parameters[2] ?? action,
      "TS2GML1044",
      "The gm_with action accepts at most self and other parameters.",
    );
  }
  for (const parameter of action.parameters) {
    if (
      !ts.isIdentifier(parameter.name) ||
      parameter.dotDotDotToken ||
      parameter.initializer ||
      parameter.questionToken
    ) {
      report(
        parameter,
        "TS2GML1044",
        "gm_with action parameters must be plain required identifiers.",
      );
    }
  }

  let invalidControlFlow: ts.Node | undefined;
  const inspect = (node: ts.Node): void => {
    if (node !== action && isFunctionWithBody(node)) {
      if (isGmWithAction(node)) ts.forEachChild(node.body, inspect);
      return;
    }
    if (ts.isReturnStatement(node)) invalidControlFlow ??= node;
    ts.forEachChild(node, inspect);
  };
  inspect(action.body);
  if (invalidControlFlow) {
    report(
      invalidControlFlow,
      "TS2GML1044",
      "A return inside gm_with would return from the enclosing GML function or event.",
      "Use ordinary conditional control flow inside the gm_with block.",
    );
  }
}

function validateGmlContextAssertion(
  call: ts.CallExpression,
  report: DiagnosticReporter,
): void {
  if (call.arguments.length > 0) {
    const name = (call.expression as ts.Identifier).text;
    report(
      call,
      "TS2GML1045",
      `${name} is a type-only assertion and does not accept runtime arguments.`,
      `Select the expected type with ${name}<ObjectType>().`,
    );
  }
}

function validateGmMacroCall(
  call: ts.CallExpression,
  report: DiagnosticReporter,
): void {
  const declaration = call.parent;
  const declarationList = ts.isVariableDeclaration(declaration) && declaration.initializer === call
    ? declaration.parent
    : undefined;
  const statement = declarationList && ts.isVariableDeclarationList(declarationList)
    ? declarationList.parent
    : undefined;

  if (
    !ts.isVariableDeclaration(declaration) ||
    !declarationList ||
    !statement ||
    !ts.isVariableStatement(statement) ||
    !ts.isSourceFile(statement.parent) ||
    (declarationList.flags & ts.NodeFlags.Const) === 0
  ) {
    report(
      call,
      "TS2GML1037",
      "gm_macro must initialize a top-level const declaration.",
      'Use syntax such as const PLAYER_SPEED = gm_macro<number>("4");',
    );
    return;
  }

  if (
    !ts.isIdentifier(declaration.name) ||
    !isGmlIdentifier(declaration.name.text)
  ) {
    report(
      declaration.name,
      "TS2GML1038",
      "A GameMaker macro must have a valid identifier name.",
    );
  }

  if (call.arguments.length < 1 || call.arguments.length > 2) {
    report(
      call,
      "TS2GML1039",
      "gm_macro expects a raw GML string and an optional configuration override object.",
    );
    return;
  }

  const valueArgument = call.arguments[0];
  if (!valueArgument || !isRawMacroString(valueArgument)) {
    report(
      valueArgument ?? call,
      "TS2GML1040",
      "The gm_macro value must be a string literal containing raw GML.",
    );
  } else {
    validateRawMacroValue(valueArgument, report);
  }

  const configurations = call.arguments[1];
  if (!configurations) return;
  if (!ts.isObjectLiteralExpression(configurations)) {
    report(
      configurations,
      "TS2GML1041",
      "GameMaker macro configuration overrides must be an object literal.",
    );
    return;
  }

  const names = new Set<string>();
  for (const property of configurations.properties) {
    if (!ts.isPropertyAssignment(property)) {
      report(
        property,
        "TS2GML1041",
        "Each GameMaker macro configuration override must be a named string property.",
      );
      continue;
    }

    const name = macroConfigurationName(property.name);
    if (!name || /[\s:]/.test(name)) {
      report(
        property.name,
        "TS2GML1042",
        "A GameMaker configuration name cannot be empty or contain whitespace or a colon.",
      );
    } else if (names.has(name)) {
      report(
        property.name,
        "TS2GML1042",
        `GameMaker macro configuration '${name}' is specified more than once.`,
      );
    } else {
      names.add(name);
    }

    if (!isRawMacroString(property.initializer)) {
      report(
        property.initializer,
        "TS2GML1040",
        "A GameMaker macro configuration value must be a string literal containing raw GML.",
      );
    } else {
      validateRawMacroValue(property.initializer, report);
    }
  }
}

function validateRawMacroValue(
  valueNode: ts.StringLiteralLike,
  report: DiagnosticReporter,
): void {
  if (!valueNode.text.trim()) {
    report(valueNode, "TS2GML1043", "A GameMaker macro value cannot be empty.");
  } else if (/[\r\n\u2028\u2029]/.test(valueNode.text)) {
    report(
      valueNode,
      "TS2GML1043",
      "A GameMaker macro value must fit on one source line.",
      "Keep the raw GML expression on one line.",
    );
  }
}

function isRawMacroString(node: ts.Node): node is ts.StringLiteralLike {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

function macroConfigurationName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return undefined;
}

function emitGmMacro(
  declaration: ts.VariableDeclaration,
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
): string[] {
  if (!ts.isIdentifier(declaration.name)) {
    throw nodeError(
      declaration.name,
      sourceFile,
      "TS2GML1038",
      "A GameMaker macro must have a valid identifier name.",
    );
  }
  const valueArgument = call.arguments[0];
  if (!valueArgument || !isRawMacroString(valueArgument)) {
    throw nodeError(
      valueArgument ?? call,
      sourceFile,
      "TS2GML1040",
      "The gm_macro value must be a string literal containing raw GML.",
    );
  }

  const name = declaration.name.text;
  const lines = [`#macro ${name} ${valueArgument.text.trim()}`];
  const configurations = call.arguments[1];
  if (configurations && ts.isObjectLiteralExpression(configurations)) {
    for (const property of configurations.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const configurationName = macroConfigurationName(property.name);
      if (!configurationName || !isRawMacroString(property.initializer)) continue;
      lines.push(
        `#macro ${configurationName}:${name} ${property.initializer.text.trim()}`,
      );
    }
  }
  return lines;
}

function stripExport(gml: string): string {
  return gml.replace(/^export\s+(?:default\s+)?/, "");
}

type FunctionWithBody = ts.SignatureDeclaration & { body: ts.ConciseBody };

interface ClosureBinding {
  name: ts.Identifier;
  declaration: ts.VariableDeclaration | ts.ParameterDeclaration | ts.EnumDeclaration;
  owner: FunctionWithBody;
  field: string;
  parameter?: ts.Identifier;
}

interface ClosureFunction {
  environment: ts.Identifier;
  locals: ClosureBinding[];
  captures: Set<FunctionWithBody>;
  context: boolean;
  needsReceiver: boolean;
  lexicalThis: boolean;
  needsLexicalThis: boolean;
}

interface ClosurePlan {
  functions: Map<FunctionWithBody, ClosureFunction>;
  references: Map<ts.Identifier, ClosureBinding>;
  parameterNames: Map<ts.Identifier, ts.Identifier>;
  diagnostics: CompilerDiagnostic[];
  lowered: Map<ts.Node, ts.Node>;
}

const closurePlans = new WeakMap<ts.SourceFile, ClosurePlan>();

function enclosingFunction(node: ts.Node): FunctionWithBody | undefined {
  let parent = node.parent;
  while (parent && !isFunctionWithBody(parent)) parent = parent.parent;
  return parent as FunctionWithBody | undefined;
}

function needsClosureContext(node: ts.Node, checker: ts.TypeChecker): boolean {
  if (node.kind === ts.SyntaxKind.ThisKeyword) return true;
  if (!ts.isIdentifier(node) || !isIdentifierReference(node) ||
    ["undefined", "Math", "console", "gm_global"].includes(node.text) || node.text.startsWith(compilerInternalPrefix)) return false;
  const symbol = ts.isShorthandPropertyAssignment(node.parent)
    ? checker.getShorthandAssignmentValueSymbol(node.parent) : checker.getSymbolAtLocation(node);
  return !symbol?.valueDeclaration || !enclosingFunction(symbol.valueDeclaration);
}

function createSourceChecker(sourceFile: ts.SourceFile): ts.TypeChecker {
  const options: ts.CompilerOptions = { noLib: true, noResolve: true, allowJs: true, target: ts.ScriptTarget.ESNext };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (name) => name === sourceFile.fileName ? sourceFile : undefined;
  return ts.createProgram([sourceFile.fileName], options, host).getTypeChecker();
}

function collectClosurePlan(sourceFile: ts.SourceFile): ClosurePlan {
  const cached = closurePlans.get(sourceFile);
  if (cached) return cached;
  const plan: ClosurePlan = { functions: new Map(), references: new Map(), parameterNames: new Map(), diagnostics: [], lowered: new Map() };
  closurePlans.set(sourceFile, plan);
  // The checker resolves bindings (including shorthand fields and shadowing),
  // without loading libraries or changing the TypeScript -> JavaScript pipeline.
  const checker = createSourceChecker(sourceFile);
  const bindings = new Map<ts.Symbol, ClosureBinding>();
  const references: Array<[ts.Identifier, ts.Symbol]> = [];
  const reported = new Set<string>();
  const report = (node: ts.Node, message: string) => {
    const key = `${node.pos}:${message}`;
    if (reported.has(key)) return;
    reported.add(key);
    plan.diagnostics.push(createNodeDiagnostic(node, sourceFile, "TS2GML1014", `Unsupported closure capture: ${message}`,
      "Use a function-body local or parameter, or pass the value explicitly."));
  };
  const visit = (node: ts.Node): void => {
    if (ts.isTypeNode(node)) return;
    if (isFunctionWithBody(node)) {
      plan.functions.set(node, {
        environment: ts.factory.createIdentifier(`__ts2gml_env_${plan.functions.size + 1}`),
        locals: [], captures: new Set(), context: false, needsReceiver: false, lexicalThis: false, needsLexicalThis: false,
      });
    }
    if (ts.isIdentifier(node) && isIdentifierReference(node)) {
      const symbol = ts.isShorthandPropertyAssignment(node.parent)
        ? checker.getShorthandAssignmentValueSymbol(node.parent) : checker.getSymbolAtLocation(node);
      if (symbol) references.push([node, symbol]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  for (const [reference, symbol] of references) {
    const declaration = symbol.valueDeclaration;
    if (!declaration) continue;
    const owner = enclosingFunction(declaration);
    if (!owner) continue;
    const crossed: FunctionWithBody[] = [];
    let current = enclosingFunction(reference);
    while (current && current !== owner) {
      crossed.push(current);
      current = enclosingFunction(current);
    }
    if (current !== owner || !crossed.some((fn) => !isGmWithAction(fn))) continue;
    // A with action is inline, but its parameters and direct locals can own
    // an environment allocated afresh for each selected instance.
    const supported = (ts.isParameter(declaration) && ts.isIdentifier(declaration.name)) ||
      (ts.isEnumDeclaration(declaration) && declaration.parent === owner.body) ||
      (ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name) &&
        ts.isVariableDeclarationList(declaration.parent) && ts.isVariableStatement(declaration.parent.parent) &&
        declaration.parent.parent.parent === owner.body);
    const collisionParameter = ts.isParameter(declaration) && ts.isMethodDeclaration(owner) &&
      ts.isIdentifier(owner.name) && owner.name.text.startsWith("onCollision_");
    if (!supported || collisionParameter || (symbol.declarations?.length ?? 0) > 1) {
      report(reference, `Capturing '${reference.text}' requires a single plain parameter or local declared directly in a function or gm_with body; nested block, loop, destructuring, local function, and collision context bindings are not supported.`);
      continue;
    }
    // Parameter initializers and parent-constructor arguments execute before
    // the function body can allocate its environment.
    let ancestor: ts.Node = reference;
    let beforeBody = false;
    while (ancestor !== owner) {
      if (ts.isParameter(ancestor) ||
        (ts.isCallExpression(ancestor) && ancestor.expression.kind === ts.SyntaxKind.SuperKeyword)) beforeBody = true;
      ancestor = ancestor.parent;
    }
    if (beforeBody) {
      report(reference, `Capturing '${reference.text}' in a parameter initializer or super(...) argument is not supported.`);
      continue;
    }
    let binding = bindings.get(symbol);
    if (!binding) {
      binding = { name: declaration.name as ts.Identifier,
        declaration: declaration as ClosureBinding["declaration"], owner,
        field: `__ts2gml_capture_${bindings.size + 1}` };
      if (ts.isParameter(declaration)) binding.parameter = ts.factory.createIdentifier(`${binding.field}_parameter`);
      bindings.set(symbol, binding);
      plan.functions.get(owner)!.locals.push(binding);
    }
    // With actions must stay inline arrows, never environment-bound methods.
    for (const fn of crossed) {
      if (!isGmWithAction(fn)) plan.functions.get(fn)!.captures.add(owner);
    }
  }
  const privateParameters = new Map<ts.Symbol, ts.Identifier>();
  for (const [fn, data] of plan.functions) {
    if (data.locals.length === 0 || isGmWithAction(fn) ||
      !(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn) || ts.isFunctionDeclaration(fn))) continue;
    // All parameters of a closure factory need private names, including those
    // used only while creating the callback (for example weapon -> projectile).
    fn.parameters.forEach((parameter, index) => {
      if (!ts.isIdentifier(parameter.name)) return;
      const symbol = checker.getSymbolAtLocation(parameter.name);
      if (!symbol) return;
      const name = bindings.get(symbol)?.parameter ?? ts.factory.createIdentifier(`${data.environment.text}_parameter_${index + 1}`);
      privateParameters.set(symbol, name);
      plan.parameterNames.set(parameter.name, name);
    });
  }
  for (const [reference, symbol] of references) {
    const binding = bindings.get(symbol);
    if (binding) plan.references.set(reference, binding);
    const parameter = privateParameters.get(symbol);
    if (parameter) plan.parameterNames.set(reference, parameter);
    const declaration = symbol.valueDeclaration;
    if (declaration && ts.isFunctionDeclaration(declaration) && isFunctionWithBody(declaration) &&
      plan.functions.get(declaration)?.captures.size && reference.pos < declaration.pos) {
      report(reference, "A nested function with captured locals must be declared before it is referenced.");
    }
  }
  for (const [fn, data] of plan.functions) {
    if (data.captures.size === 0) continue;
    const inspectContext = (node: ts.Node): void => {
      if (ts.isTypeNode(node)) return;
      if (needsClosureContext(node, checker)) data.context = true;
      ts.forEachChild(node, inspectContext);
    };
    inspectContext(fn);
    if (data.context) plan.functions.get(enclosingFunction(fn)!)!.needsReceiver = true;
    const inspect = (node: ts.Node): void => {
      if (node !== fn && isFunctionWithBody(node)) return;
      if (getGmlContextAssertion(node) === "other" ||
        (ts.isIdentifier(node) && node.text === "other" && isIdentifierReference(node) &&
          !checker.getSymbolAtLocation(node)?.valueDeclaration)) {
        report(node, "A closure with captured locals cannot use the native other context; capture the gm_with caller parameter instead.");
      }
      ts.forEachChild(node, inspect);
    };
    inspect(fn);
    for (const parameter of fn.parameters) {
      if (parameter.initializer) {
        const inspectDefault = (node: ts.Node): void => {
          if (needsClosureContext(node, checker)) {
            report(node, "A closure with captured locals cannot read its context in a parameter initializer.");
          }
          ts.forEachChild(node, inspectDefault);
        };
        inspectDefault(parameter.initializer);
      }
    }
  }
  return plan;
}

function lowerClosures(node: ts.Node, sourceFile: ts.SourceFile): ts.Node {
  const plan = collectClosurePlan(sourceFile);
  if (plan.diagnostics.length) throw new Ts2GmlError(plan.diagnostics);
  if (![...plan.functions.values()].some((fn) => fn.locals.length > 0)) return node;
  if (plan.lowered.size === 0) {
    const result = ts.transform(sourceFile, [(context) => {
      const access = (binding: ClosureBinding) => ts.factory.createPropertyAccessExpression(
        plan.functions.get(binding.owner)!.environment, binding.field);
      const lexicalThis = (node: ts.Node, snapshot = false): ts.Expression => {
        let owner = enclosingFunction(node);
        while (owner && ts.isArrowFunction(owner)) {
          const data = plan.functions.get(owner)!;
          if (data.captures.size > 0) {
            data.lexicalThis = true;
            return ts.factory.createIdentifier(`${data.environment.text}_this`);
          }
          owner = enclosingFunction(owner);
        }
        if (snapshot) {
          const parent = plan.functions.get(enclosingFunction(node)!)!;
          parent.needsLexicalThis = true;
          return ts.factory.createIdentifier(`${parent.environment.text}_lexical`);
        }
        return node as ts.Expression;
      };
      const visit: ts.Visitor = (original) => {
        let changed: ts.Node;
        if (original.kind === ts.SyntaxKind.ThisKeyword) {
          changed = lexicalThis(original);
        } else if (ts.isIdentifier(original) && plan.references.has(original)) {
          const binding = plan.references.get(original)!;
          // Defaults and super arguments execute before the body environment.
          let ancestor: ts.Node = original;
          while (ancestor.parent && ancestor.parent !== binding.owner &&
            !ts.isParameter(ancestor) && !(ts.isCallExpression(ancestor) && ancestor.expression.kind === ts.SyntaxKind.SuperKeyword)) {
            ancestor = ancestor.parent;
          }
          changed = ts.isParameter(ancestor) || (ts.isCallExpression(ancestor) && ancestor.expression.kind === ts.SyntaxKind.SuperKeyword)
            ? binding.parameter ?? original : access(binding);
        } else if (ts.isIdentifier(original) && plan.parameterNames.has(original)) {
          changed = plan.parameterNames.get(original)!;
        } else if (ts.isIdentifier(original) && ts.isParameter(original.parent) && original.parent.name === original) {
          const owner = enclosingFunction(original)!;
          changed = plan.functions.get(owner)?.locals.find((binding) => binding.declaration === original.parent)?.parameter ?? original;
        } else if (ts.isShorthandPropertyAssignment(original)) {
          changed = ts.factory.createPropertyAssignment(ts.factory.createIdentifier(original.name.text),
            ts.visitNode(original.name, visit) as ts.Expression);
        } else if (ts.isVariableStatement(original)) {
          const statements: ts.Statement[] = [];
          let hasCapturedBinding = false;
          for (const declaration of original.declarationList.declarations) {
            const owner = enclosingFunction(declaration);
            const binding = owner && plan.functions.get(owner)?.locals.find((item) => item.declaration === declaration);
            if (binding) {
              hasCapturedBinding = true;
              statements.push(ts.factory.createExpressionStatement(ts.factory.createAssignment(access(binding),
                declaration.initializer ? ts.visitNode(declaration.initializer, visit) as ts.Expression
                  : ts.factory.createIdentifier("undefined"))));
            } else {
              statements.push(ts.factory.updateVariableStatement(original, original.modifiers,
                ts.factory.updateVariableDeclarationList(original.declarationList,
                  [ts.visitEachChild(declaration, visit, context)])));
            }
          }
          changed = hasCapturedBinding
            ? statements.length === 1 ? statements[0]! : ts.factory.createBlock(statements, true)
            : ts.factory.updateVariableStatement(original, original.modifiers,
              ts.factory.updateVariableDeclarationList(original.declarationList,
                statements.flatMap((statement) => (statement as ts.VariableStatement).declarationList.declarations)));
        } else {
          changed = ts.visitEachChild(original, visit, context);
        }
        if (isFunctionWithBody(original) && (plan.functions.get(original)!.locals.length > 0 ||
          plan.functions.get(original)!.captures.size > 0 || plan.functions.get(original)!.needsReceiver ||
          plan.functions.get(original)!.needsLexicalThis)) {
          const data = plan.functions.get(original)!;
          const fn = changed as FunctionWithBody;
          let body = ts.isBlock(fn.body) ? fn.body : ts.factory.createBlock([ts.factory.createReturnStatement(fn.body)], true);
          if (data.locals.length > 0 || data.needsReceiver || data.needsLexicalThis) {
            const prefix: ts.Statement[] = [];
            if (data.needsReceiver) prefix.push(variableStatement(
              ts.factory.createIdentifier(`${data.environment.text}_self`), runtimeCall("method_get_self", [
                ts.factory.createFunctionExpression(undefined, undefined, undefined, undefined, [], undefined,
                  ts.factory.createBlock([])),
              ])));
            if (data.needsLexicalThis) prefix.push(variableStatement(
              ts.factory.createIdentifier(`${data.environment.text}_lexical`), ts.factory.createThis()));
            const environment = variableStatement(data.environment, ts.factory.createObjectLiteralExpression(
              data.locals.map((binding) => ts.factory.createPropertyAssignment(binding.field,
                ts.isParameter(binding.declaration) ? binding.parameter! : ts.factory.createIdentifier("undefined"))), false));
            if (data.locals.length > 0) prefix.push(environment);
            const statements = [...body.statements];
            const first = statements.findIndex((statement) => !(ts.isExpressionStatement(statement) &&
              ts.isCallExpression(statement.expression) && statement.expression.expression.kind === ts.SyntaxKind.SuperKeyword));
            if (first >= 0) {
              const wrapped = ts.factory.createBlock([...prefix, statements[first]!], true);
              // Events and constructors emit individual statements; attach the
              // prefix to the first one so every emission path initializes it.
              if (ts.isBlock(original.body)) plan.lowered.set(original.body.statements[first]!, wrapped);
              statements.splice(first, 0, ...prefix);
            } else statements.push(...prefix);
            body = ts.factory.updateBlock(body, statements);
          }
          if (data.captures.size > 0) {
            const properties = [...data.captures].map((owner) => {
              const environment = plan.functions.get(owner)!.environment;
              return ts.factory.createPropertyAssignment(environment, environment);
            });
            if (data.context) properties.push(ts.factory.createPropertyAssignment("__ts2gml_receiver",
              ts.factory.createIdentifier(`${plan.functions.get(enclosingFunction(original)!)!.environment.text}_self`)));
            const aliases = [...data.captures].map((owner) => {
              const environment = plan.functions.get(owner)!.environment;
              return variableStatement(environment, ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier("self"), environment));
            });
            // Lexical this and native self can differ inside gm_with. Keep
            // this separately while the receiver restores native variables.
            if (data.lexicalThis) {
              properties.push(ts.factory.createPropertyAssignment("__ts2gml_this", lexicalThis(original, true)));
              aliases.push(variableStatement(ts.factory.createIdentifier(`${data.environment.text}_this`),
                ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier("self"), "__ts2gml_this")));
            }
            properties.push(ts.factory.createPropertyAssignment("__ts2gml_closure", ts.factory.createTrue()));
            // Restore the original native self for built-ins, instance variables,
            // keeping method(undefined, callback) relative to its caller.
            const receiver = ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier("self"), "__ts2gml_receiver");
            body = ts.factory.createBlock([...aliases, ...(data.context ? [ts.factory.createWithStatement(
              ts.factory.createConditionalExpression(runtimeCall("is_undefined", [receiver]), undefined,
                ts.factory.createIdentifier("other"), undefined, receiver), body)] : body.statements)], true);
            const expression = ts.factory.createFunctionExpression(undefined, undefined, undefined, undefined,
              fn.parameters, undefined, body);
            const bound = runtimeCall("method", [ts.factory.createObjectLiteralExpression(properties), expression]);
            changed = ts.isFunctionDeclaration(original) && original.name
              ? variableStatement(original.name, bound) : bound;
          } else {
            changed = ts.visitEachChild(fn, (child) => child === fn.body ? body : child, context);
          }
          plan.lowered.set(original.body, body);
        }
        if (changed !== original) ts.setOriginalNode(changed, original);
        plan.lowered.set(original, changed);
        return changed;
      };
      return (file) => ts.visitNode(file, visit) as ts.SourceFile;
    }]);
    result.dispose();
  }
  const lowered = plan.lowered.get(node);
  if (lowered) return lowered;
  // Top-level initializers and class-static setup use synthetic wrappers around
  // original nodes. Replace their descendants through the same cached plan.
  const result = ts.transform(node, [(context) => {
    const visit: ts.Visitor = (child) => plan.lowered.get(child) ?? ts.visitEachChild(child, visit, context);
    return (root) => ts.visitNode(root, visit)!;
  }]);
  try { return result.transformed[0]!; }
  finally { result.dispose(); }
}

function validateFunctionCaptures(sourceFile: ts.SourceFile): void {
  const diagnostics: CompilerDiagnostic[] = [...collectClosurePlan(sourceFile).diagnostics];

  const validateFunction = (
    functionNode: FunctionWithBody,
    lexicalThisAvailable: boolean,
  ): void => {
    const localBindings = collectFunctionBindings(functionNode);
    const nestedFunctions: FunctionWithBody[] = [];
    const isArrow = ts.isArrowFunction(functionNode);
    const hasKnownOwnThis =
      ts.isMethodDeclaration(functionNode) ||
      ts.isConstructorDeclaration(functionNode) ||
      ts.isGetAccessorDeclaration(functionNode) ||
      ts.isSetAccessorDeclaration(functionNode);
    let reportedArguments = false;
    let reportedSuper = false;
    let reportedNewTarget = false;
    let reportedThis = false;
    let reportedDynamicThis = false;

    const visit = (node: ts.Node): void => {
      if (node !== functionNode && isFunctionWithBody(node)) {
        nestedFunctions.push(node);
        return;
      }
      if (ts.isTypeNode(node)) return;

      if (isArrow && node.kind === ts.SyntaxKind.ThisKeyword && !lexicalThisAvailable) {
        if (!reportedThis) {
          diagnostics.push(createNodeDiagnostic(
            node,
            sourceFile,
            "TS2GML1018",
            "An arrow function cannot preserve lexical 'this' without a known object or struct context.",
            "Create the arrow inside a constructor, method, or function with a known self context.",
          ));
          reportedThis = true;
        }
        return;
      }

      if (!isArrow && !hasKnownOwnThis && node.kind === ts.SyntaxKind.ThisKeyword) {
        if (!reportedDynamicThis) {
          diagnostics.push(createNodeDiagnostic(
            node,
            sourceFile,
            "TS2GML1020",
            "A function's call-site 'this' binding cannot be preserved by a bound GML method.",
            "Use a class method for a known object context or pass the receiver explicitly.",
          ));
          reportedDynamicThis = true;
        }
        return;
      }

      if (isArrow && node.kind === ts.SyntaxKind.SuperKeyword) {
        if (!reportedSuper) {
          diagnostics.push(createNodeDiagnostic(
            node,
            sourceFile,
            "TS2GML1016",
            "Arrow functions that capture 'super' are not supported.",
          ));
          reportedSuper = true;
        }
        return;
      }

      if (
        ts.isMetaProperty(node) &&
        node.keywordToken === ts.SyntaxKind.NewKeyword &&
        node.name.text === "target"
      ) {
        if (!reportedNewTarget) {
          diagnostics.push(createNodeDiagnostic(
            node,
            sourceFile,
            "TS2GML1017",
            "new.target has no GML equivalent.",
          ));
          reportedNewTarget = true;
        }
        return;
      }

      if (ts.isIdentifier(node) && isIdentifierReference(node)) {
        if (isArrow && node.text === "arguments" && !localBindings.has(node.text)) {
          if (!reportedArguments) {
            diagnostics.push(createNodeDiagnostic(
              node,
              sourceFile,
              "TS2GML1015",
              "Arrow functions that capture the enclosing 'arguments' object are not supported.",
              "Use a named parameter or rest parameter instead.",
            ));
            reportedArguments = true;
          }
          return;
        }
        if (!isArrow && node.text === "arguments" && !localBindings.has(node.text)) {
          diagnostics.push(createNodeDiagnostic(
            node,
            sourceFile,
            "TS2GML1066",
            "JavaScript 'arguments' has no GML equivalent.",
            "Use named parameters, or use GameMaker's explicit argument and argument_count globals.",
          ));
          return;
        }

      }

      ts.forEachChild(node, visit);
    };

    for (const parameter of functionNode.parameters) {
      if (parameter.initializer) visit(parameter.initializer);
    }
    visit(functionNode.body);
    const nestedLexicalThis = isArrow ? lexicalThisAvailable : hasKnownOwnThis;
    for (const nestedFunction of nestedFunctions) {
      validateFunction(nestedFunction, nestedLexicalThis);
    }
  };

  const visitRoot = (node: ts.Node, lexicalThisAvailable = false): void => {
    if (isFunctionWithBody(node)) {
      validateFunction(node, lexicalThisAvailable);
      return;
    }
    if (ts.isTypeNode(node)) return;
    if (node.kind === ts.SyntaxKind.ThisKeyword && !lexicalThisAvailable) {
      diagnostics.push(createNodeDiagnostic(
        node,
        sourceFile,
        "TS2GML1018",
        "Top-level 'this' has no stable GML object context.",
        "Use 'this' inside a class member, or pass the intended value explicitly.",
      ));
      return;
    }
    if (
      ts.isIdentifier(node) &&
      node.text === "arguments" &&
      isIdentifierReference(node)
    ) {
      diagnostics.push(createNodeDiagnostic(
        node,
        sourceFile,
        "TS2GML1066",
        "JavaScript 'arguments' has no GML equivalent.",
        "Use named parameters, or use GameMaker's explicit argument and argument_count globals.",
      ));
      return;
    }
    const childHasLexicalThis = ts.isPropertyDeclaration(node) &&
      ts.isClassLike(node.parent)
      ? true
      : lexicalThisAvailable;
    ts.forEachChild(node, (child) => visitRoot(child, childHasLexicalThis));
  };

  visitRoot(sourceFile);
  if (diagnostics.length > 0) throw new Ts2GmlError(diagnostics);
}

export function validateTopLevelVariableReferences(
  sourceFile: ts.SourceFile,
  projectBindings = collectTopLevelVariableBindings(sourceFile),
): void {
  const diagnostics: CompilerDiagnostic[] = [];
  const localBindings = collectTopLevelVariableBindings(sourceFile);
  const scopes: ReadonlySet<string>[] = [];
  const visit = (node: ts.Node, scriptScope = true): void => {
    if ((isFunctionWithBody(node) && !isGmWithAction(node)) || ts.isClassLike(node)) scriptScope = false;
    const bindings = collectRuntimeScopeBindings(node);
    if (bindings) scopes.push(bindings);
    if (ts.isTypeNode(node)) {
      if (bindings) scopes.pop();
      return;
    }
    if (
      ts.isIdentifier(node) &&
      isIdentifierReference(node) &&
      projectBindings.has(node.text) &&
      !(scriptScope && localBindings.has(node.text)) &&
      !scopes.slice(1).some((scope) => scope.has(node.text))
    ) {
      diagnostics.push(createNodeDiagnostic(
        node,
        sourceFile,
        "TS2GML1067",
        `Top-level local '${node.text}' is only available during initialization of its own script.`,
        `Pass '${node.text}' as an argument, or declare it on GMGlobal and initialize and access gm_global.${node.text} explicitly.`,
      ));
    }
    ts.forEachChild(node, (child) => visit(child, scriptScope));
    if (bindings) scopes.pop();
  };
  visit(sourceFile);
  if (diagnostics.length > 0) throw new Ts2GmlError(diagnostics);
}

export function validateGmlBindingConflicts(
  sourceFile: ts.SourceFile,
  externalBindings: ReadonlySet<string>,
  generatedBindings: ReadonlySet<string>,
): void {
  const diagnostics: CompilerDiagnostic[] = [];
  const reportBinding = (name: ts.Identifier, definesGeneratedBinding: boolean): void => {
    const owner = enclosingFunction(name);
    // Captured locals become fields; captured parameters have private emitted
    // names. Neither keeps its authored name in GML's local variable namespace.
    const plan = collectClosurePlan(sourceFile);
    if (plan.parameterNames.has(name) ||
      (owner && plan.functions.get(owner)?.locals.some((binding) => binding.name === name))) return;
    if (
      !externalBindings.has(name.text) &&
      (definesGeneratedBinding || !generatedBindings.has(name.text))
    ) return;
    diagnostics.push(createNodeDiagnostic(
      name,
      sourceFile,
      "TS2GML1068",
      `Binding '${name.text}' conflicts with a GameMaker function, constant, or asset name.`,
      "Rename the binding; GameMaker does not permit these runtime names to be used as variables.",
    ));
  };
  const visitBinding = (
    name: ts.BindingName,
    definesGeneratedBinding = false,
  ): void => {
    if (ts.isIdentifier(name)) {
      reportBinding(name, definesGeneratedBinding);
      return;
    }
    for (const element of name.elements) {
      if (!ts.isOmittedExpression(element)) visitBinding(element.name);
    }
  };
  const visit = (node: ts.Node): void => {
    if (ts.isTypeNode(node)) return;
    if (ts.isParameter(node)) {
      const isRenamed = ts.isMethodDeclaration(node.parent) ||
        ts.isConstructorDeclaration(node.parent) ||
        isGmWithAction(node.parent);
      if (!isRenamed) visitBinding(node.name);
    } else if (ts.isVariableDeclaration(node)) {
      const variableStatement = node.parent.parent;
      const definesGeneratedBinding = ts.isVariableDeclarationList(node.parent) &&
        ts.isVariableStatement(variableStatement) &&
        ts.isSourceFile(variableStatement.parent) &&
        Boolean(node.initializer && isGmMacroCall(node.initializer));
      visitBinding(node.name, definesGeneratedBinding);
    } else if (
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isEnumDeclaration(node)) &&
      node.name
    ) {
      visitBinding(node.name, ts.isSourceFile(node.parent));
    } else if (
      (ts.isFunctionExpression(node) || ts.isClassExpression(node)) &&
      node.name
    ) {
      visitBinding(node.name);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (diagnostics.length > 0) throw new Ts2GmlError(diagnostics);
}

function validateJavaScriptRuntime(sourceFile: ts.SourceFile): void {
  const diagnostics: CompilerDiagnostic[] = [];
  const scopes: ReadonlySet<string>[] = [];
  const isVisible = (name: string) => scopes.some((scope) => scope.has(name));

  const visit = (node: ts.Node): void => {
    const bindings = collectRuntimeScopeBindings(node);
    if (bindings) scopes.push(bindings);
    if (ts.isTypeNode(node)) {
      if (bindings) scopes.pop();
      return;
    }

    if (
      ts.isIdentifier(node) &&
      isIdentifierReference(node) &&
      javaScriptRuntimeGlobals.has(node.text) &&
      !isVisible(node.text) &&
      !(
        collectionConstructors.has(node.text) &&
        ts.isNewExpression(node.parent) &&
        node.parent.expression === node
      ) &&
      !(
        (ts.isPropertyAccessExpression(node.parent) ||
          ts.isElementAccessExpression(node.parent)) &&
        node.parent.expression === node &&
        ["Math", "console"].includes(node.text)
      )
    ) {
      diagnostics.push(createNodeDiagnostic(
        node,
        sourceFile,
        "TS2GML1033",
        `JavaScript runtime global '${node.text}' has no GML lowering.`,
        "Use a GameMaker API or a supported user-defined function or constructor.",
      ));
    }

    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      !isVisible(node.expression.text)
    ) {
      if (
        node.expression.text === "Math" &&
        node.name.text !== "PI" &&
        !mathFunctions.has(node.name.text)
      ) {
        diagnostics.push(createNodeDiagnostic(
          node,
          sourceFile,
          "TS2GML1034",
          `Math.${node.name.text} does not have a GML lowering.`,
        ));
      }
      if (
        node.expression.text === "console" &&
        !["log", "warn", "error"].includes(node.name.text)
      ) {
        diagnostics.push(createNodeDiagnostic(
          node,
          sourceFile,
          "TS2GML1035",
          `console.${node.name.text} does not have a GML lowering.`,
          "Use console.log, console.warn, or console.error.",
        ));
      }
    }

    if (
      ts.isElementAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      !isVisible(node.expression.text) &&
      ["Math", "console"].includes(node.expression.text)
    ) {
      diagnostics.push(createNodeDiagnostic(
        node,
        sourceFile,
        "TS2GML1036",
        `Computed access on JavaScript ${node.expression.text} has no GML lowering.`,
      ));
    }

    ts.forEachChild(node, visit);
    if (bindings) scopes.pop();
  };

  visit(sourceFile);
  if (diagnostics.length > 0) throw new Ts2GmlError(diagnostics);
}

function isFunctionWithBody(node: ts.Node): node is FunctionWithBody {
  return ts.isFunctionLike(node) && "body" in node && node.body !== undefined;
}

export function collectTopLevelVariableBindings(sourceFile: ts.SourceFile): Set<string> {
  const bindings = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (declaration.initializer && isGmMacroCall(declaration.initializer)) continue;
        collectBindingNames(declaration.name, bindings);
      }
    }
  }
  return bindings;
}

function collectRootRuntimeBindings(sourceFile: ts.SourceFile): Set<string> {
  const bindings = new Set<string>();
  collectDirectStatementBindings(sourceFile.statements, bindings);
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && statement.importClause) {
      if (statement.importClause.name) bindings.add(statement.importClause.name.text);
      const namedBindings = statement.importClause.namedBindings;
      if (namedBindings && ts.isNamespaceImport(namedBindings)) {
        bindings.add(namedBindings.name.text);
      } else if (namedBindings) {
        for (const element of namedBindings.elements) bindings.add(element.name.text);
      }
    }
  }
  collectHoistedVariableBindings(sourceFile, bindings);
  return bindings;
}

function collectRuntimeScopeBindings(node: ts.Node): Set<string> | undefined {
  if (ts.isSourceFile(node)) return collectRootRuntimeBindings(node);
  if (ts.isEnumDeclaration(node)) {
    return new Set(node.members.flatMap((member) => ts.isIdentifier(member.name) ? [member.name.text] : []));
  }

  const bindings = new Set<string>();
  if (isFunctionWithBody(node)) {
    if (
      (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) &&
      node.name
    ) {
      bindings.add(node.name.text);
    }
    for (const parameter of node.parameters) collectBindingNames(parameter.name, bindings);
    collectHoistedVariableBindings(node.body, bindings);
    return bindings;
  }

  if (ts.isBlock(node)) {
    collectDirectStatementBindings(node.statements, bindings);
    return bindings;
  }
  if (ts.isCaseBlock(node)) {
    for (const clause of node.clauses) {
      collectDirectStatementBindings(clause.statements, bindings);
    }
    return bindings;
  }
  if (ts.isCatchClause(node)) {
    if (node.variableDeclaration) collectBindingNames(node.variableDeclaration.name, bindings);
    return bindings;
  }
  if (
    (ts.isForStatement(node) && node.initializer && ts.isVariableDeclarationList(node.initializer)) ||
    ((ts.isForInStatement(node) || ts.isForOfStatement(node)) &&
      ts.isVariableDeclarationList(node.initializer))
  ) {
    for (const declaration of node.initializer.declarations) {
      collectBindingNames(declaration.name, bindings);
    }
    return bindings;
  }
  return undefined;
}

function collectDirectStatementBindings(
  statements: readonly ts.Statement[],
  bindings: Set<string>,
): void {
  for (const statement of statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        collectBindingNames(declaration.name, bindings);
      }
    } else if (
      (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
      statement.name
    ) {
      bindings.add(statement.name.text);
    } else if (ts.isEnumDeclaration(statement)) {
      bindings.add(statement.name.text);
    }
  }
}

function collectHoistedVariableBindings(root: ts.Node, bindings: Set<string>): void {
  const visit = (node: ts.Node): void => {
    if (node !== root && ts.isFunctionLike(node)) return;
    if (
      ts.isVariableDeclaration(node) &&
      ts.isVariableDeclarationList(node.parent) &&
      (node.parent.flags & ts.NodeFlags.BlockScoped) === 0
    ) {
      collectBindingNames(node.name, bindings);
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
}

function collectFunctionBindings(functionNode: FunctionWithBody): Set<string> {
  const bindings = new Set<string>();
  if (
    (ts.isFunctionDeclaration(functionNode) || ts.isFunctionExpression(functionNode)) &&
    functionNode.name
  ) {
    bindings.add(functionNode.name.text);
  }
  for (const parameter of functionNode.parameters) collectBindingNames(parameter.name, bindings);

  const visit = (node: ts.Node): void => {
    if (node !== functionNode.body && isFunctionWithBody(node)) {
      if (ts.isFunctionDeclaration(node) && node.name) bindings.add(node.name.text);
      return;
    }
    if (ts.isVariableDeclaration(node)) collectBindingNames(node.name, bindings);
    else if (ts.isClassDeclaration(node) && node.name) bindings.add(node.name.text);
    else if (ts.isEnumDeclaration(node)) bindings.add(node.name.text);
    else if (ts.isCatchClause(node) && node.variableDeclaration) {
      collectBindingNames(node.variableDeclaration.name, bindings);
    }
    ts.forEachChild(node, visit);
  };
  visit(functionNode.body);
  return bindings;
}

function collectBindingNames(name: ts.BindingName, bindings: Set<string>): void {
  if (ts.isIdentifier(name)) {
    bindings.add(name.text);
    return;
  }
  for (const element of name.elements) {
    if (!ts.isOmittedExpression(element)) collectBindingNames(element.name, bindings);
  }
}

function isIdentifierReference(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) return true;
  if (
    ((ts.isVariableDeclaration(parent) ||
      ts.isParameter(parent) ||
      ts.isBindingElement(parent) ||
      ts.isFunctionDeclaration(parent) ||
      ts.isFunctionExpression(parent) ||
      ts.isClassDeclaration(parent) ||
      ts.isClassExpression(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isMethodSignature(parent) ||
      ts.isEnumDeclaration(parent) ||
      ts.isEnumMember(parent)) &&
      parent.name === node) ||
    (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
    (ts.isPropertyAssignment(parent) && parent.name === node) ||
    (ts.isLabeledStatement(parent) && parent.label === node) ||
    ((ts.isBreakStatement(parent) || ts.isContinueStatement(parent)) && parent.label === node) ||
    ts.isImportClause(parent) ||
    ts.isImportSpecifier(parent) ||
    ts.isNamespaceImport(parent) ||
    ts.isExportSpecifier(parent)
  ) {
    return false;
  }
  return true;
}

export function emitGml(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  identifierRenames: ReadonlyMap<string, string> = new Map(),
  staticThis = false,
): string {
  const result = ts.transform(lowerClosures(node, sourceFile), [gmlTransformer(identifierRenames, sourceFile, staticThis)]);
  try {
    const preserveUnicode = (child: ts.Node): void => {
      if (ts.isStringLiteral(child)) ts.setEmitFlags(child, ts.EmitFlags.NoAsciiEscaping);
      const original = ts.getOriginalNode(child);
      if (ts.isStatement(child) && !ts.isBlock(child) && original.pos >= 0 && original.end <= sourceFile.text.length) {
        const range = originalSourceRange(sourceFile, original.getStart(sourceFile), original.end);
        if (range.source !== sourceFile) {
          const position = range.source.getLineAndCharacterOfPosition(range.start);
          ts.addSyntheticLeadingComment(child, ts.SyntaxKind.SingleLineCommentTrivia,
            ` @ts2gml-source ${JSON.stringify({ source: sourceFile.fileName, line: position.line + 1, column: position.character + 1 })}`, true);
        }
      }
      ts.forEachChild(child, preserveUnicode);
    };
    preserveUnicode(result.transformed[0]!);
    return printer.printNode(ts.EmitHint.Unspecified, result.transformed[0]!, sourceFile);
  } finally {
    result.dispose();
  }
}

function emitConstructorClass(
  classNode: ts.ClassDeclaration,
  sourceFile: ts.SourceFile,
): string {
  const className = classNode.name?.text;
  if (!className) {
    throw nodeError(
      classNode,
      sourceFile,
      "TS2GML2001",
      "Anonymous classes cannot become GML constructors.",
    );
  }

  const baseType = classNode.heritageClauses
    ?.find((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword)
    ?.types[0];
  if (baseType && !ts.isIdentifier(baseType.expression)) {
    throw nodeError(
      baseType.expression,
      sourceFile,
      "TS2GML2005",
      "A GML parent constructor must be referenced by a direct identifier.",
      "Assign the parent constructor a top-level name and extend that name directly.",
    );
  }
  if (
    baseType &&
    ts.isIdentifier(baseType.expression) &&
    ["GMObject", "GMRoom"].includes(baseType.expression.text)
  ) {
    throw nodeError(
      classNode,
      sourceFile,
      "TS2GML2008",
      `${baseType.expression.text} classes require GameMaker project-aware asset generation.`,
      "Use the build or check command with a GameMaker .yyp project instead of standalone compile.",
    );
  }
  const constructor = classNode.members.find(ts.isConstructorDeclaration);
  const constructorStatements = [...(constructor?.body?.statements ?? [])];
  const constructorRenames = parameterRenames(constructor?.parameters ?? []);
  let parentArguments = "";

  if (baseType) {
    const superIndexes = constructorStatements.flatMap((statement, index) =>
      ts.isExpressionStatement(statement) &&
        ts.isCallExpression(statement.expression) &&
        statement.expression.expression.kind === ts.SyntaxKind.SuperKeyword
        ? [index]
        : []
    );
    const superIndex = superIndexes[0] ?? -1;
    if (superIndexes.length !== 1) {
      throw nodeError(
        constructor ?? classNode,
        sourceFile,
        "TS2GML2007",
        "A derived GML constructor must contain exactly one direct super(...) statement.",
        "Add one explicit constructor whose first statement is super(...).",
      );
    }
    if (superIndex >= 0) {
      const statement = constructorStatements[superIndex]! as ts.ExpressionStatement;
      const call = statement.expression as ts.CallExpression;
      if (superIndex !== 0) {
        throw nodeError(
          statement,
          sourceFile,
          "TS2GML2006",
          "GML always runs the parent constructor before the child constructor body.",
          "Move super(...) to the first statement so JavaScript and GML execute in the same order.",
        );
      }
      parentArguments = call.arguments
        .map((argument) => emitGml(argument, sourceFile, constructorRenames))
        .join(", ");
      constructorStatements.splice(superIndex, 1);
    }
  }

  const lines: string[] = [];
  for (const member of classNode.members) {
    if (hasModifier(member, ts.SyntaxKind.StaticKeyword)) continue;
    if (ts.isPropertyDeclaration(member)) {
      const name = memberName(member.name, sourceFile);
      const nativeStatic = member.initializer && isCallTo(member.initializer, "gm_static");
      const initializer = nativeStatic
        ? (member.initializer!.arguments[0] as ts.ArrowFunction).body : member.initializer;
      const value = initializer ? emitGml(initializer, sourceFile) : "undefined";
      lines.push(`${nativeStatic ? "static " : "self."}${name} = ${value};`);
    }
    if (ts.isMethodDeclaration(member)) {
      if (!member.body) continue;
      const name = memberName(member.name, sourceFile);
      const renames = parameterRenames(member.parameters);
      const parameters = member.parameters
        .map((parameter) => emitGml(parameter, sourceFile, renames))
        .join(", ");
      lines.push(
        `static ${name} = function(${parameters}) ${emitGml(member.body, sourceFile, renames)};`,
      );
    }
    if (ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) {
      throw nodeError(
        member,
        sourceFile,
        "TS2GML2003",
        "Class accessors are not supported yet.",
      );
    }
  }

  lines.push(
    ...constructorStatements.map((statement) =>
      emitGml(statement, sourceFile, constructorRenames),
    ),
  );
  const parameters = (constructor?.parameters ?? [])
    .map((parameter) => emitGml(parameter, sourceFile, constructorRenames))
    .join(", ");
  const inheritance = baseType
    ? ` : ${emitGml(baseType.expression, sourceFile)}(${parentArguments})`
    : "";
  const body = lines.length > 0 ? `\n${indent(lines.join("\n"))}\n` : "";
  return `function ${className}(${parameters})${inheritance} constructor {${body}}`;
}

function gmlTransformer(
  identifierRenames: ReadonlyMap<string, string>,
  sourceFile: ts.SourceFile,
  staticThis: boolean,
): ts.TransformerFactory<ts.Node> {
  return (context: ts.TransformationContext): ts.Transformer<ts.Node> => {
  const usedIdentifiers = collectIdentifierTexts(sourceFile);
  const generatedLocals = new Set<string>();
  let rootPosition = 0;
  let generatedIdentifier = 0;
  const transformState: TransformState = {
    withActionDepth: 0,
    withActionBindings: [],
    withLexicalThis: undefined,
  };
  const freshIdentifier = (purpose: string): ts.Identifier => {
    let text: string;
    do {
      generatedIdentifier += 1;
      text = `__ts2gml_${purpose}_${rootPosition}_${generatedIdentifier}`;
    } while (usedIdentifiers.has(text));
    usedIdentifiers.add(text);
    generatedLocals.add(text);
    return ts.factory.createIdentifier(text);
  };

  const inlineResult: InlineResult = (origin: ts.Node, parameter: ts.Identifier, result: ts.Expression | ts.Block,
    argument: ts.Expression): ts.CallExpression => {
    const visible = new Set(generatedLocals);
    const closurePlan = collectClosurePlan(sourceFile);
    // Closure conversion introduces locals after the source AST was parsed.
    // Expression helpers must receive these just like authored locals.
    for (const fn of closurePlan.functions.values()) {
      visible.add(fn.environment.text);
      if (fn.needsReceiver) visible.add(`${fn.environment.text}_self`);
      if (fn.lexicalThis) visible.add(`${fn.environment.text}_this`);
      if (fn.needsLexicalThis) visible.add(`${fn.environment.text}_lexical`);
    }
    for (const name of closurePlan.parameterNames.values()) visible.add(name.text);
    let owner: ts.Node | undefined = ts.getOriginalNode(origin);
    while (owner && !isFunctionWithBody(owner)) owner = owner.parent;
    if (owner && isFunctionWithBody(owner)) {
      const boxed = closurePlan.functions.get(owner)?.locals ?? [];
      for (const name of collectFunctionBindings(owner)) {
        if (!boxed.some((binding) => binding.name.text === name)) visible.add(identifierRenames.get(name) ?? name);
      }
    }
    for (const bindings of transformState.withActionBindings) {
      for (const binding of bindings) visible.add(binding.alias.text);
    }
    if (transformState.withLexicalThis) visible.add(transformState.withLexicalThis.text);
    const captured = new Set<string>();
    const collect = (node: ts.Node, locals: ReadonlySet<string>): void => {
      if (isFunctionWithBody(node)) {
        const bindings = new Set([...locals, ...collectFunctionBindings(node)]);
        ts.forEachChild(node, (child) => collect(child, bindings));
        return;
      }
      // Synthetic names have no parent pointers. Visit values explicitly so
      // property names and declarations cannot become accidental captures.
      if (ts.isPropertyAccessExpression(node)) return collect(node.expression, locals);
      if (ts.isPropertyAssignment(node)) {
        if (ts.isComputedPropertyName(node.name)) collect(node.name.expression, locals);
        collect(node.initializer, locals);
        return;
      }
      if (ts.isVariableDeclaration(node) || ts.isParameter(node)) {
        if (node.initializer) collect(node.initializer, locals);
        return;
      }
      if (ts.isIdentifier(node) && visible.has(node.text) && !locals.has(node.text) && isIdentifierReference(node)) {
        captured.add(node.text);
      }
      ts.forEachChild(node, (child) => collect(child, locals));
    };
    collect(result, new Set([parameter.text]));
    return callInlineFunction(parameter, result, argument,
      [...captured].map((name) => ts.factory.createIdentifier(name)));
  };

  const visit: ts.Visitor = (node) => {
    if (isCallTo(node, "gm_static")) {
      throw nodeError(node, sourceFile, "TS2GML1071",
        "gm_static is only supported in ordinary constructor classes, not GMObject or GMRoom assets.",
        "Use a TypeScript static field for class state on GameMaker assets.");
    }
    if (ts.isCallExpression(node) && ts.isParenthesizedExpression(node.expression)) {
      let expression = node.expression.expression;
      while (ts.isParenthesizedExpression(expression)) expression = expression.expression;
      if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression) || ts.isCallExpression(expression)) {
        return visit(ts.factory.updateCallExpression(node, expression, node.typeArguments, node.arguments));
      }
    }
    if (ts.isFunctionDeclaration(node) && node.modifiers) {
      node = ts.factory.updateFunctionDeclaration(node,
        node.modifiers.filter((modifier) => modifier.kind !== ts.SyntaxKind.ExportKeyword && modifier.kind !== ts.SyntaxKind.DefaultKeyword),
        node.asteriskToken, node.name, node.typeParameters, node.parameters, node.type, node.body);
    }
    if (ts.isCallExpression(node) && ts.isElementAccessExpression(node.expression) &&
      ts.isStringLiteralLike(node.expression.argumentExpression) && isGmlIdentifier(node.expression.argumentExpression.text)) {
      return visit(ts.factory.updateCallExpression(node,
        ts.factory.createPropertyAccessExpression(node.expression.expression, node.expression.argumentExpression.text),
        node.typeArguments, node.arguments));
    }
    if (ts.isBinaryExpression(node) &&
      node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      const target = node.left;
      if (ts.isElementAccessExpression(target) && isCallTo(target.expression, "__ts2gml_native_array")) {
        return ts.factory.updateBinaryExpression(node,
          ts.factory.createElementAccessExpression(ts.visitNode(target.expression.arguments[0]!, visit) as ts.Expression,
            ts.visitNode(target.argumentExpression, visit) as ts.Expression), node.operatorToken,
          ts.visitNode(node.right, visit) as ts.Expression);
      }
      if (ts.isElementAccessExpression(target) && ts.isStringLiteralLike(target.argumentExpression) && target.argumentExpression.text === "length") {
        return visit(ts.factory.updateBinaryExpression(node,
          ts.factory.createPropertyAccessExpression(target.expression, "length"), node.operatorToken, node.right));
      }
      if (ts.isElementAccessExpression(target) ||
        (ts.isPropertyAccessExpression(target) && target.name.text === "length" &&
          target.expression.kind !== ts.SyntaxKind.ThisKeyword)) {
        // Literal class static access is normalized to a field below.
        if (ts.isElementAccessExpression(target) && isCallTo(target.expression, "__ts2gml_class_statics") &&
          ts.isStringLiteralLike(target.argumentExpression)) {
          return ts.factory.createBinaryExpression(
            ts.factory.createPropertyAccessExpression(ts.visitNode(target.expression, visit) as ts.Expression,
              target.argumentExpression.text), node.operatorToken, ts.visitNode(node.right, visit) as ts.Expression);
        }
        const receiver = ts.visitNode(target.expression, visit) as ts.Expression;
        const key = ts.isElementAccessExpression(target)
          ? ts.visitNode(target.argumentExpression, visit) as ts.Expression
          : ts.factory.createStringLiteral("length");
        const right = ts.visitNode(node.right, visit) as ts.Expression;
        const length = ts.isPropertyAccessExpression(target);
        const setter = length ? "__ts2gml_value_set_length" : "__ts2gml_value_set";
        if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
          return runtimeCall(setter, length ? [receiver, right] : [receiver, key, right]);
        }
        const operator = ts.tokenToString(node.operatorToken.kind)!.slice(0, -1);
        const binary = new Map<string, ts.BinaryOperator>([
          ["+", ts.SyntaxKind.PlusToken], ["-", ts.SyntaxKind.MinusToken],
          ["*", ts.SyntaxKind.AsteriskToken], ["/", ts.SyntaxKind.SlashToken],
          ["%", ts.SyntaxKind.PercentToken], ["&", ts.SyntaxKind.AmpersandToken],
          ["|", ts.SyntaxKind.BarToken], ["^", ts.SyntaxKind.CaretToken],
          ["<<", ts.SyntaxKind.LessThanLessThanToken], [">>", ts.SyntaxKind.GreaterThanGreaterThanToken],
        ]).get(operator)!;
        const pair = freshIdentifier("assignment");
        const object = ts.factory.createElementAccessExpression(pair, 0);
        const property = ts.factory.createElementAccessExpression(pair, 1);
        const previous = length ? runtimeCall("__ts2gml_collection_length", [object])
          : runtimeCall("__ts2gml_value_get", [object, property]);
        const value = ts.factory.createBinaryExpression(previous, binary, right);
        return inlineResult(node, pair, runtimeCall(setter, length ? [object, value] : [object, property, value]),
          ts.factory.createArrayLiteralExpression([receiver, key]));
      }
    }
    if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator) &&
      (ts.isElementAccessExpression(node.operand) ||
        (ts.isPropertyAccessExpression(node.operand) && node.operand.name.text === "length"))) {
      if (ts.isElementAccessExpression(node.operand) && isCallTo(node.operand.expression, "__ts2gml_native_array")) {
        return ts.visitEachChild(node, visit, context);
      }
      const updated = visit(ts.factory.createBinaryExpression(node.operand,
        node.operator === ts.SyntaxKind.PlusPlusToken ? ts.SyntaxKind.PlusEqualsToken : ts.SyntaxKind.MinusEqualsToken,
        ts.factory.createNumericLiteral(1))) as ts.Expression;
      return updated;
    }
    if (ts.isElementAccessExpression(node) &&
      isCallTo(node.expression, "__ts2gml_class_statics") &&
      ts.isStringLiteralLike(node.argumentExpression)) {
      return runtimeCall("variable_struct_get", [
        ts.visitNode(node.expression, visit) as ts.Expression,
        ts.factory.createStringLiteral(node.argumentExpression.text),
      ]);
    }
    const optionalChain = ts.isExpressionStatement(node) ? getOptionalCallStatement(node.expression, true) : undefined;
    if (optionalChain) {
      const build = (index: number, value: ts.Expression): ts.Statement => {
        const segment = optionalChain.segments[index];
        if (!segment) return ts.factory.createExpressionStatement(ts.visitNode(value, visit) as ts.Expression);

        // Field reads are repeatable; cache receivers containing calls or computed access.
        let base = value;
        while (ts.isPropertyAccessExpression(base) || ts.isParenthesizedExpression(base)) base = base.expression;
        const temporary = segment.optional && !ts.isIdentifier(base) && base.kind !== ts.SyntaxKind.ThisKeyword
          ? freshIdentifier("optional") : undefined;
        const receiver = temporary ?? value;
        const next = ts.setOriginalNode(segment.kind === "property"
          ? segment.classStatic && optionalChain.segments[index + 1]?.kind !== "call"
            ? runtimeCall("variable_struct_get", [receiver, ts.factory.createStringLiteral(segment.name.text)])
            : ts.factory.createPropertyAccessExpression(receiver, segment.name)
          : ts.factory.createCallExpression(receiver, undefined, segment.arguments), node);
        const continuation = build(index + 1, next);
        if (!segment.optional) return continuation;

        const guard = ts.factory.createIfStatement(
          runtimeCall("__ts2gml_value_truthy", [ts.visitNode(receiver, visit) as ts.Expression]),
          ts.factory.createBlock([continuation], true),
        );
        return temporary ? ts.factory.createBlock([
          variableStatement(temporary, ts.visitNode(value, visit) as ts.Expression), guard,
        ], true) : guard;
      };
      const statement = build(0, optionalChain.base);
      // A generated guard must not capture an enclosing unbraced if's else branch.
      return node.parent && !ts.isBlock(node.parent) && !ts.isSourceFile(node.parent) &&
        !ts.isCaseOrDefaultClause(node.parent)
        ? ts.factory.createBlock([statement], true) : statement;
    }
    if (
      ts.isOptionalChain(node) &&
      !(node.parent && ts.isOptionalChain(node.parent))
    ) {
      return lowerOptionalChain(node, visit, freshIdentifier, inlineResult);
    }
    if (ts.isElementAccessExpression(node)) {
      if (isCallTo(node.expression, "__ts2gml_native_array")) {
        return ts.factory.createElementAccessExpression(ts.visitNode(node.expression.arguments[0]!, visit) as ts.Expression,
          ts.visitNode(node.argumentExpression, visit) as ts.Expression);
      }
      if (ts.isStringLiteralLike(node.argumentExpression) && node.argumentExpression.text === "length") {
        return visit(ts.factory.createPropertyAccessExpression(node.expression, "length"));
      }
      return runtimeCall("__ts2gml_value_get", [
        ts.visitNode(node.expression, visit) as ts.Expression,
        ts.visitNode(node.argumentExpression, visit) as ts.Expression,
      ]);
    }
    if (ts.isIfStatement(node)) return ts.factory.updateIfStatement(node,
      runtimeCall("__ts2gml_value_truthy", [ts.visitNode(node.expression, visit) as ts.Expression]),
      ts.visitNode(node.thenStatement, visit) as ts.Statement,
      ts.visitNode(node.elseStatement, visit) as ts.Statement | undefined);
    if (ts.isWhileStatement(node)) return ts.factory.updateWhileStatement(node,
      runtimeCall("__ts2gml_value_truthy", [ts.visitNode(node.expression, visit) as ts.Expression]),
      ts.visitNode(node.statement, visit) as ts.Statement);
    if (ts.isForStatement(node)) return ts.factory.updateForStatement(node,
      ts.visitNode(node.initializer, visit) as ts.ForInitializer | undefined,
      node.condition ? runtimeCall("__ts2gml_value_truthy", [ts.visitNode(node.condition, visit) as ts.Expression]) : undefined,
      ts.visitNode(node.incrementor, visit) as ts.Expression | undefined,
      ts.visitNode(node.statement, visit) as ts.Statement);
    // GML requires explicit grouping for nested ternaries; the TS printer does not.
    if (ts.isConditionalExpression(node)) return ts.factory.createParenthesizedExpression(ts.factory.updateConditionalExpression(node,
      runtimeCall("__ts2gml_value_truthy", [ts.visitNode(node.condition, visit) as ts.Expression]),
      node.questionToken, ts.visitNode(node.whenTrue, visit) as ts.Expression,
      node.colonToken, ts.visitNode(node.whenFalse, visit) as ts.Expression));
    if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) {
      return ts.factory.createLogicalNot(runtimeCall("__ts2gml_value_truthy", [ts.visitNode(node.operand, visit) as ts.Expression]));
    }
    if (ts.isDeleteExpression(node)) {
      const target = node.expression;
      if (ts.isPropertyAccessExpression(target)) {
        return runtimeCall("__ts2gml_remove", [
          ts.visitNode(target.expression, visit) as ts.Expression,
          ts.factory.createStringLiteral(target.name.text),
        ]);
      }
      if (ts.isElementAccessExpression(target)) {
        return runtimeCall("__ts2gml_remove", [
          ts.visitNode(target.expression, visit) as ts.Expression,
          ts.visitNode(target.argumentExpression, visit) as ts.Expression,
        ]);
      }
    }
    if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      collectionConstructors.has(node.expression.text)
    ) {
      return ts.factory.updateNewExpression(
        node,
        ts.factory.createIdentifier(collectionConstructors.get(node.expression.text)!),
        undefined,
        node.arguments?.map((argument) => ts.visitNode(argument, visit) as ts.Expression),
      );
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.kind !== ts.SyntaxKind.ThisKeyword &&
      loweredJavaScriptInstanceMembers.has(node.expression.name.text)
    ) {
      const member = node.expression.name.text;
      const helper = ts.factory.createIdentifier(loweredJavaScriptInstanceMembers.get(member)!);
      const receiver = ts.visitNode(node.expression.expression, visit) as ts.Expression;
      if (member === "delete" && node.arguments.some(ts.isSpreadElement)) {
        return createIndirectCall(helper, [receiver, ...node.arguments], visit, inlineResult, node);
      }
      if (member === "delete") {
        return ts.factory.createCallExpression(helper, undefined, [
          receiver,
          ...node.arguments.map((argument) => ts.visitNode(argument, visit) as ts.Expression),
        ]);
      }
      const argumentsArray = node.arguments.some(ts.isSpreadElement)
        ? runtimeCall("array_concat", [
            ts.factory.createArrayLiteralExpression(),
            ...spreadParts(node.arguments, visit),
          ])
        : ts.factory.createArrayLiteralExpression(
            node.arguments.map((argument) => ts.visitNode(argument, visit) as ts.Expression),
          );
      return ts.factory.createCallExpression(helper, undefined, [receiver, argumentsArray]);
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      node.expression.kind !== ts.SyntaxKind.ThisKeyword &&
      node.name.text === "length"
    ) {
      return runtimeCall("__ts2gml_collection_length", [
        ts.visitNode(node.expression, visit) as ts.Expression,
      ]);
    }
    if (ts.isForOfStatement(node)) {
      return lowerForOfStatement(node, visit, freshIdentifier);
    }
    if (ts.isDoStatement(node)) {
      const firstIteration = freshIdentifier("do_first");
      return ts.factory.createForStatement(
        variableList([
          ts.factory.createVariableDeclaration(
            firstIteration,
            undefined,
            undefined,
            ts.factory.createTrue(),
          ),
        ]),
        ts.factory.createLogicalOr(
          firstIteration,
          runtimeCall("__ts2gml_value_truthy", [ts.visitNode(node.expression, visit) as ts.Expression]),
        ),
        ts.factory.createAssignment(firstIteration, ts.factory.createFalse()),
        ts.visitNode(node.statement, visit) as ts.Statement,
      );
    }
    if (ts.isForInStatement(node)) {
      return lowerForInStatement(node, visit, freshIdentifier);
    }
    if (ts.isExpressionStatement(node) && isGmWithCall(node.expression)) {
      return lowerGmWithStatement(
        node.expression,
        visit,
        transformState,
        freshIdentifier,
      );
    }
    if (ts.isCatchClause(node) && !node.variableDeclaration) {
      return ts.factory.updateCatchClause(
        node,
        ts.factory.createVariableDeclaration(freshIdentifier("caught")),
        ts.visitNode(node.block, visit) as ts.Block,
      );
    }
    const contextKeyword = getGmlContextAssertion(node);
    if (contextKeyword) {
      return ts.factory.createIdentifier(contextKeyword);
    }
    if (ts.isTypeOfExpression(node)) {
      return lowerTypeOfExpression(node.expression, visit);
    }
    if (ts.isVoidExpression(node)) {
      return callInlineFunction(
        freshIdentifier("void"),
        ts.factory.createIdentifier("undefined"),
        ts.visitNode(node.expression, visit) as ts.Expression,
      );
    }
    if (ts.isIdentifier(node)) {
      // Only authored references use the closure-aware adapter. The compiler's
      // generated method calls must still bind directly to their environments.
      if (node.text === "method" && node.pos >= 0 && isIdentifierReference(node)) {
        return ts.factory.createIdentifier("__ts2gml_value_method");
      }
      const withBinding = findWithActionBinding(node.text, transformState.withActionBindings);
      if (withBinding) return withBinding.alias;
      const keywordFunction = gmlKeywordFunctions.get(node.text);
      if (keywordFunction) return ts.factory.createIdentifier(keywordFunction);
      // Generated context reads belong to GML, even when an authored method
      // parameter named self/other is renamed to _self/_other.
      const nativeContext = node.pos < 0 && (node.text === "self" || node.text === "other");
      const renamed = nativeContext ? undefined : identifierRenames.get(node.text);
      if (renamed) return ts.factory.createIdentifier(renamed);
    }
    if (ts.isVariableDeclarationList(node)) {
      return ts.factory.createVariableDeclarationList(
        node.declarations.flatMap((declaration) =>
          lowerVariableDeclaration(declaration, visit, freshIdentifier),
        ),
        ts.NodeFlags.None,
      );
    }
    if (ts.isArrayLiteralExpression(node) && node.elements.some(ts.isSpreadElement)) {
      return lowerArraySpread(node, visit);
    }
    if (ts.isObjectLiteralExpression(node) && node.properties.some(ts.isSpreadAssignment)) {
      return lowerObjectSpread(node, visit);
    }
    if (ts.isCallExpression(node) && (node.arguments.some(ts.isSpreadElement) || ts.isElementAccessExpression(node.expression))) {
      return createIndirectCall(
        node.expression,
        node.arguments,
        visit,
        inlineResult,
        node,
      );
    }
    if (ts.isCallExpression(node) && ts.isCallExpression(node.expression)) {
      // GML cannot reliably chain calls to returned/indexed functions. Evaluate
      // the callable once and preserve its method binding through the shared helper.
      return createDynamicCall(ts.visitNode(node.expression, visit) as ts.Expression,
        ts.factory.createArrayLiteralExpression(node.arguments.map((argument) => ts.visitNode(argument, visit) as ts.Expression)),
        inlineResult, node);
    }
    if (ts.isOmittedExpression(node)) {
      return ts.factory.createIdentifier("undefined");
    }
    if (node.kind === ts.SyntaxKind.ThisKeyword && transformState.withActionDepth > 0) {
      return staticThis
        ? ts.factory.createPropertyAccessExpression(transformState.withLexicalThis!, "__ts2gml_class")
        : transformState.withLexicalThis!;
    }
    if (node.kind === ts.SyntaxKind.ThisKeyword) {
      return staticThis
        ? ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier("self"), "__ts2gml_class")
        : ts.factory.createIdentifier("self");
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ThisKeyword
    ) {
      if (transformState.withActionDepth > 0) {
        return ts.factory.updatePropertyAccessExpression(
          node,
          ts.visitNode(node.expression, visit) as ts.Expression,
          node.name,
        );
      }
      return ts.factory.createPropertyAccessExpression(
        ts.factory.createIdentifier("self"),
        node.name,
      );
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "Math" &&
      node.expression.name.text === "random" &&
      node.arguments.length === 0
    ) {
      return ts.factory.createCallExpression(
        ts.factory.createIdentifier("random"),
        undefined,
        [ts.factory.createNumericLiteral(1)],
      );
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "console" &&
      ["log", "warn", "error"].includes(node.name.text)
    ) {
      return ts.factory.createIdentifier("show_debug_message");
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "Math"
    ) {
      if (node.name.text === "PI") return ts.factory.createIdentifier("pi");
      if (["round", "random", "min", "max"].includes(node.name.text)) {
        return ts.factory.createIdentifier(`__ts2gml_value_${node.name.text}`);
      }
      const replacement = mathFunctions.get(node.name.text);
      if (replacement) return ts.factory.createIdentifier(replacement);
    }
    if (ts.isPropertyAccessExpression(node)) {
      return ts.factory.updatePropertyAccessExpression(
        node,
        ts.visitNode(node.expression, visit) as ts.Expression,
        node.name,
      );
    }
    if (node.kind === ts.SyntaxKind.NullKeyword) {
      return ts.factory.createIdentifier("pointer_null");
    }
    if (ts.isBinaryExpression(node)) {
      if ([ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken,
        ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) {
        const parameter = freshIdentifier("logical");
        const left = ts.visitNode(node.left, visit) as ts.Expression;
        const right = ts.visitNode(node.right, visit) as ts.Expression;
        const condition = runtimeCall(node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
          ? "__ts2gml_value_nullish" : "__ts2gml_value_truthy", [parameter]);
        const useRight = node.operatorToken.kind !== ts.SyntaxKind.BarBarToken;
        return inlineResult(node, parameter, ts.factory.createConditionalExpression(condition,
          undefined, useRight ? right : parameter, undefined, useRight ? parameter : right), left);
      }
      if (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken) {
        const equal = runtimeCall("__ts2gml_value_equal", [
          ts.visitNode(node.left, visit) as ts.Expression,
          ts.visitNode(node.right, visit) as ts.Expression,
        ]);
        return node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ? equal : ts.factory.createLogicalNot(equal);
      }
      if (node.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword) {
        return ts.factory.createCallExpression(
          ts.factory.createIdentifier("is_instanceof"),
          undefined,
          [
            ts.visitNode(node.left, visit) as ts.Expression,
            ts.visitNode(node.right, visit) as ts.Expression,
          ],
        );
      }
      if (node.operatorToken.kind === ts.SyntaxKind.InKeyword) {
        return ts.factory.createCallExpression(
          ts.factory.createIdentifier("variable_struct_exists"),
          undefined,
          [
            ts.visitNode(node.right, visit) as ts.Expression,
            ts.isStringLiteralLike(node.left) ? ts.visitNode(node.left, visit) as ts.Expression
              : runtimeCall("__ts2gml_value_key", [ts.visitNode(node.left, visit) as ts.Expression]),
          ],
        );
      }
      if (node.operatorToken.kind === ts.SyntaxKind.AsteriskAsteriskToken) {
        return ts.factory.createCallExpression(
          ts.factory.createIdentifier("power"),
          undefined,
          [
            ts.visitNode(node.left, visit) as ts.Expression,
            ts.visitNode(node.right, visit) as ts.Expression,
          ],
        );
      }
      const operators = new Map<ts.SyntaxKind, ts.BinaryOperator>([
        [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken],
        [ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken],
      ]);
      const operator = operators.get(node.operatorToken.kind) ?? node.operatorToken.kind;
      return ts.factory.createBinaryExpression(
        ts.visitNode(node.left, visit) as ts.Expression,
        operator,
        ts.visitNode(node.right, visit) as ts.Expression,
      );
    }
    if (ts.isTemplateExpression(node)) {
      const parts: ts.Expression[] = [ts.factory.createStringLiteral(node.head.text)];
      for (const span of node.templateSpans) {
        parts.push(ts.visitNode(span.expression, visit) as ts.Expression);
        if (span.literal.text) {
          parts.push(ts.factory.createStringLiteral(span.literal.text));
        }
      }
      return ts.factory.createCallExpression(
        ts.factory.createIdentifier("string_concat"),
        undefined,
        parts,
      );
    }
    if (ts.isNumericLiteral(node)) {
      const numeric = Number(node.text).toString();
      if (!numeric.includes("e")) return ts.factory.createNumericLiteral(numeric);
      const [coefficient, exponent] = numeric.split("e");
      const digits = coefficient!.replace(".", "");
      const point = (coefficient!.includes(".") ? coefficient!.indexOf(".") : coefficient!.length) + Number(exponent);
      const decimal = point <= 0 ? `0.${"0".repeat(-point)}${digits}`
        : point >= digits.length ? `${digits}${"0".repeat(point - digits.length)}.0`
        : `${digits.slice(0, point)}.${digits.slice(point)}`;
      return ts.factory.createNumericLiteral(decimal);
    }
    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      return ts.setEmitFlags(ts.factory.createStringLiteral(node.text), ts.EmitFlags.NoAsciiEscaping);
    }
    if (ts.isStringLiteral(node)) {
      return ts.setEmitFlags(ts.factory.createStringLiteral(node.text), ts.EmitFlags.NoAsciiEscaping);
    }
    if (isFunctionWithBody(node)) {
      // A stored callback has its own locals and runtime self. Only an arrow's
      // lexical this crosses the inline with boundary, through method binding.
      const lexicalThis = transformState.withLexicalThis ?? ts.factory.createIdentifier("self");
      const previousState = { ...transformState };
      transformState.withActionDepth = 0;
      transformState.withActionBindings = [];
      transformState.withLexicalThis = undefined;
      try {
        if (!ts.isArrowFunction(node)) return ts.visitEachChild(node, visit, context);
        let usesLexicalThis = false;
        const inspect = (child: ts.Node): void => {
          if (child.kind === ts.SyntaxKind.ThisKeyword) {
            usesLexicalThis = true;
            return;
          }
          if (child !== node && isFunctionWithBody(child) && !ts.isArrowFunction(child)) return;
          ts.forEachChild(child, inspect);
        };
        // Closure conversion replaces nested arrows with bound function
        // expressions. Their original arrows still determine lexical this.
        ts.forEachChild(ts.getOriginalNode(node), inspect);
        const body = ts.isBlock(node.body)
          ? (ts.visitNode(node.body, visit) as ts.Block)
          : ts.factory.createBlock([
              ts.factory.createReturnStatement(ts.visitNode(node.body, visit) as ts.Expression),
            ]);
        const fn = ts.factory.createFunctionExpression(
          undefined,
          undefined,
          undefined,
          undefined,
          node.parameters.map(
            (parameter) => ts.visitNode(parameter, visit) as ts.ParameterDeclaration,
          ),
          undefined,
          body,
        );
        return usesLexicalThis
          ? ts.factory.createCallExpression(
              ts.factory.createIdentifier("method"),
              undefined,
              [lexicalThis, fn],
            )
          : fn;
      } finally {
        Object.assign(transformState, previousState);
      }
    }
    if (ts.isShorthandPropertyAssignment(node)) {
      return ts.factory.createPropertyAssignment(
        node.name,
        ts.visitNode(node.name, visit) as ts.Expression,
      );
    }
    return ts.visitEachChild(node, visit, context);
  };
  return (node) => {
    rootPosition = node.pos >= 0 ? Math.max(0, node.getStart(sourceFile)) : 0;
    return ts.visitNode(node, visit) as ts.Node;
  };
  };
}

type FreshIdentifier = (purpose: string) => ts.Identifier;
type InlineResult = (origin: ts.Node, parameter: ts.Identifier, result: ts.Expression | ts.Block,
  argument: ts.Expression) => ts.CallExpression;

interface WithActionBinding {
  name: string;
  alias: ts.Identifier;
}

interface TransformState {
  withActionDepth: number;
  withActionBindings: WithActionBinding[][];
  withLexicalThis: ts.Identifier | undefined;
}

function findWithActionBinding(
  name: string,
  bindings: readonly WithActionBinding[][],
): WithActionBinding | undefined {
  for (let index = bindings.length - 1; index >= 0; index -= 1) {
    const binding = bindings[index]!.find((candidate) => candidate.name === name);
    if (binding) return binding;
  }
  return undefined;
}

function lowerGmWithStatement(
  call: ts.CallExpression,
  visit: ts.Visitor,
  state: TransformState,
  freshIdentifier: FreshIdentifier,
): ts.WithStatement {
  const target = ts.visitNode(call.arguments[0]!, visit) as ts.Expression;
  const action = call.arguments[1]! as ts.ArrowFunction;
  const selfParameter = action.parameters[0];
  const otherParameter = action.parameters[1];
  const selfAlias = freshIdentifier("with_self");
  const otherAlias = freshIdentifier("with_other");
  state.withActionDepth += 1;
  const previousLexicalThis = state.withLexicalThis;
  state.withLexicalThis ??= otherAlias;
  const bindings: WithActionBinding[] = [];
  if (selfParameter && ts.isIdentifier(selfParameter.name)) {
    bindings.push({ name: selfParameter.name.text, alias: selfAlias });
  }
  if (otherParameter && ts.isIdentifier(otherParameter.name)) {
    bindings.push({ name: otherParameter.name.text, alias: otherAlias });
  }
  state.withActionBindings.push(bindings);
  try {
    const body = ts.visitNode(action.body, visit) as ts.Block;
    return ts.factory.createWithStatement(
      target,
      // Add native context reads after rewriting the authored callback so its
      // parameters (including self/other) cannot rewrite these initializers.
      ts.factory.updateBlock(body, [
        variableStatement(selfAlias, ts.factory.createIdentifier("self")),
        variableStatement(otherAlias, ts.factory.createIdentifier("other")),
        ...body.statements,
      ]),
    );
  } finally {
    state.withActionBindings.pop();
    state.withLexicalThis = previousLexicalThis;
    state.withActionDepth -= 1;
  }
}

type OptionalChainSegment =
  | { kind: "property"; name: ts.MemberName; optional: boolean; classStatic: boolean }
  | { kind: "element"; argument: ts.Expression; optional: boolean }
  | { kind: "call"; arguments: readonly ts.Expression[]; optional: boolean };

function lowerOptionalChain(
  node: ts.OptionalChain,
  visit: ts.Visitor,
  freshIdentifier: FreshIdentifier,
  inlineResult: InlineResult,
): ts.Expression {
  const chain = decomposeOptionalChain(node);
  const build = (index: number, value: ts.Expression): ts.Expression => {
    const segment = chain.segments[index];
    if (!segment) return value;
    if (!segment.optional) return build(index + 1, applyChainSegment(value, segment, visit, inlineResult, node));

    const parameter = freshIdentifier("optional");
    const continuation = build(index + 1, applyChainSegment(parameter, segment, visit, inlineResult, node));
    const result = ts.factory.createConditionalExpression(
      isNullish(parameter),
      undefined,
      ts.factory.createIdentifier("undefined"),
      undefined,
      continuation,
    );
    return inlineResult(node, parameter, result, value);
  };

  return build(0, ts.visitNode(chain.base, visit) as ts.Expression);
}

function decomposeOptionalChain(node: ts.OptionalChain): {
  base: ts.Expression;
  segments: OptionalChainSegment[];
} {
  const segments: OptionalChainSegment[] = [];
  const read = (expression: ts.Expression): ts.Expression => {
    if (ts.isPropertyAccessExpression(expression) && ts.isOptionalChain(expression)) {
      const base = read(expression.expression);
      segments.push({
        kind: "property",
        name: expression.name,
        optional: Boolean(expression.questionDotToken),
        classStatic: isCallTo(expression.expression, "__ts2gml_class_statics"),
      });
      return base;
    }
    if (ts.isElementAccessExpression(expression) && ts.isOptionalChain(expression)) {
      const base = read(expression.expression);
      segments.push({
        kind: "element",
        argument: expression.argumentExpression,
        optional: Boolean(expression.questionDotToken),
      });
      return base;
    }
    if (ts.isCallExpression(expression) && ts.isOptionalChain(expression)) {
      const base = read(expression.expression);
      segments.push({
        kind: "call",
        arguments: expression.arguments,
        optional: Boolean(expression.questionDotToken),
      });
      return base;
    }
    return expression;
  };

  return { base: read(node), segments };
}

function applyChainSegment(
  value: ts.Expression,
  segment: OptionalChainSegment,
  visit: ts.Visitor,
  inlineResult: InlineResult,
  origin: ts.Node,
): ts.Expression {
  if (segment.kind === "property") {
    return segment.classStatic
      ? runtimeCall("variable_struct_get", [value, ts.factory.createStringLiteral(segment.name.text)])
      : ts.factory.createPropertyAccessExpression(value, segment.name);
  }
  if (segment.kind === "element") {
    return ts.factory.createElementAccessExpression(
      value,
      ts.visitNode(segment.argument, visit) as ts.Expression,
    );
  }
  if (segment.arguments.some(ts.isSpreadElement)) {
    return createIndirectCall(value, segment.arguments, visit, inlineResult, origin);
  }
  return createDynamicCall(
    value,
    ts.factory.createArrayLiteralExpression(
      segment.arguments.map((argument) => ts.visitNode(argument, visit) as ts.Expression),
    ),
    inlineResult,
    origin,
  );
}

function callInlineFunction(
  parameter: ts.Identifier,
  result: ts.Expression | ts.Block,
  argument: ts.Expression,
  captures: readonly ts.Identifier[] = [],
): ts.CallExpression {
  const functionExpression = ts.factory.createFunctionExpression(
    undefined,
    undefined,
    undefined,
    undefined,
    [parameter, ...captures].map((name) => ts.factory.createParameterDeclaration(undefined, undefined, name)),
    undefined,
    ts.isBlock(result) ? result : ts.factory.createBlock([ts.factory.createReturnStatement(result)], true),
  );
  return ts.factory.createCallExpression(
    ts.factory.createParenthesizedExpression(functionExpression),
    undefined,
    [argument, ...captures],
  );
}

function lowerTypeOfExpression(expression: ts.Expression, visit: ts.Visitor): ts.Expression {
  if (expression.kind === ts.SyntaxKind.NullKeyword) {
    return ts.factory.createStringLiteral("object");
  }

  const value = ts.factory.createIdentifier("__ts2gml_typeof_value");
  const checks: Array<[string, string]> = [
    ["is_undefined", "undefined"],
    ["is_bool", "boolean"],
    ["is_numeric", "number"],
    ["is_string", "string"],
    ["is_callable", "function"],
  ];
  const functionExpression = ts.factory.createFunctionExpression(
    undefined,
    undefined,
    undefined,
    undefined,
    [ts.factory.createParameterDeclaration(undefined, undefined, value)],
    undefined,
    ts.factory.createBlock([
      ...checks.map(([check, result]) =>
        ts.factory.createIfStatement(
          runtimeCall(check, [value]),
          ts.factory.createReturnStatement(ts.factory.createStringLiteral(result)),
        ),
      ),
      ts.factory.createReturnStatement(ts.factory.createStringLiteral("object")),
    ], true),
  );
  return ts.factory.createCallExpression(
    ts.factory.createParenthesizedExpression(functionExpression),
    undefined,
    [ts.visitNode(expression, visit) as ts.Expression],
  );
}

function lowerArraySpread(node: ts.ArrayLiteralExpression, visit: ts.Visitor): ts.Expression {
  return runtimeCall("array_concat", [
    ts.factory.createArrayLiteralExpression(),
    ...spreadParts(node.elements, visit),
  ]);
}

function lowerObjectSpread(node: ts.ObjectLiteralExpression, visit: ts.Visitor): ts.Expression {
  const parts: ts.Expression[] = [];
  let properties: ts.ObjectLiteralElementLike[] = [];
  const flushProperties = () => {
    if (properties.length === 0) return;
    parts.push(ts.factory.createObjectLiteralExpression(properties));
    properties = [];
  };

  for (const property of node.properties) {
    if (ts.isSpreadAssignment(property)) {
      flushProperties();
      parts.push(ts.visitNode(property.expression, visit) as ts.Expression);
    } else {
      properties.push(ts.visitNode(property, visit) as ts.ObjectLiteralElementLike);
    }
  }
  flushProperties();
  return createObjectCopy(parts, [], true);
}

function createIndirectCall(
  expression: ts.Expression,
  argumentsList: readonly ts.Expression[],
  visit: ts.Visitor,
  inlineResult: InlineResult,
  origin: ts.Node,
): ts.CallExpression {
  // Keep an indexed receiver visible until its method is bound. Ordinary
  // element lowering would otherwise turn it into a bare value_get(...) call.
  const callable = ts.isElementAccessExpression(expression)
    ? ts.factory.updateElementAccessExpression(expression,
      ts.visitNode(expression.expression, visit) as ts.Expression,
      ts.visitNode(expression.argumentExpression, visit) as ts.Expression)
    : ts.visitNode(expression, visit) as ts.Expression;
  const argumentsArray = argumentsList.some(ts.isSpreadElement)
    ? runtimeCall("array_concat", [ts.factory.createArrayLiteralExpression(), ...spreadParts(argumentsList, visit)])
    : ts.factory.createArrayLiteralExpression(argumentsList.map((argument) => ts.visitNode(argument, visit) as ts.Expression));
  if (
    !ts.isPropertyAccessExpression(callable) &&
    !ts.isElementAccessExpression(callable)
  ) {
    return createDynamicCall(callable, argumentsArray, inlineResult, origin);
  }

  const receiver = ts.factory.createIdentifier("__ts2gml_receiver");
  const method = ts.factory.createIdentifier("__ts2gml_method");
  const statements: ts.Statement[] = [variableStatement(receiver, callable.expression)];
  let property: ts.Expression;
  if (ts.isPropertyAccessExpression(callable)) {
    property = ts.factory.createPropertyAccessExpression(receiver, callable.name);
  } else {
    const key = ts.factory.createIdentifier("__ts2gml_key");
    statements.push(variableStatement(key, callable.argumentExpression));
    property = runtimeCall("__ts2gml_value_get", [receiver, key]);
  }
  const boundMethod = ts.factory.createLogicalAnd(runtimeCall("is_method", [method]),
    ts.factory.createLogicalNot(runtimeCall("is_undefined", [runtimeCall("method_get_self", [method])])));
  const methodReceiver = ts.factory.createConditionalExpression(runtimeCall("is_array", [receiver]),
    undefined, ts.factory.createIdentifier("undefined"), undefined, receiver);
  const reboundMethod = ts.factory.createConditionalExpression(boundMethod,
    undefined, method, undefined, runtimeCall("method", [methodReceiver, method]));
  statements.push(variableStatement(method, property),
    ts.factory.createExpressionStatement(ts.factory.createAssignment(method, reboundMethod)),
    ts.factory.createReturnStatement(runtimeCall("method_call", [method, argumentsArray])));
  // GML evaluates native call arguments in a different order. Resolve the
  // receiver/key/method in statements before evaluating authored arguments.
  return inlineResult(origin, ts.factory.createIdentifier("__ts2gml_unused"),
    ts.factory.createBlock(statements, true), ts.factory.createIdentifier("undefined"));
}

function createDynamicCall(
  callable: ts.Expression,
  argumentsArray: ts.Expression,
  inlineResult: InlineResult,
  origin: ts.Node,
): ts.CallExpression {
  const callableParameter = ts.factory.createIdentifier("__ts2gml_callable");
  const argumentsParameter = ts.factory.createIdentifier("__ts2gml_arguments");
  const result = ts.factory.createConditionalExpression(
    runtimeCall("is_method", [callableParameter]),
    undefined,
    runtimeCall("method_call", [callableParameter, argumentsParameter]),
    undefined,
    runtimeCall("script_execute_ext", [callableParameter, argumentsParameter]),
  );
  return inlineResult(origin, ts.factory.createIdentifier("__ts2gml_unused"), ts.factory.createBlock([
    variableStatement(callableParameter, callable),
    variableStatement(argumentsParameter, argumentsArray),
    ts.factory.createReturnStatement(result),
  ], true), ts.factory.createIdentifier("undefined"));
}

function spreadParts(
  elements: readonly ts.Expression[],
  visit: ts.Visitor,
): ts.Expression[] {
  const parts: ts.Expression[] = [];
  let values: ts.Expression[] = [];
  const flushValues = () => {
    if (values.length === 0) return;
    parts.push(ts.factory.createArrayLiteralExpression(values));
    values = [];
  };

  for (const element of elements) {
    if (ts.isSpreadElement(element)) {
      flushValues();
      parts.push(ts.visitNode(element.expression, visit) as ts.Expression);
    } else {
      values.push(
        ts.isOmittedExpression(element)
          ? ts.factory.createIdentifier("undefined")
          : ts.visitNode(element, visit) as ts.Expression,
      );
    }
  }
  flushValues();
  return parts;
}

function lowerVariableDeclaration(
  declaration: ts.VariableDeclaration,
  visit: ts.Visitor,
  freshIdentifier: FreshIdentifier,
): ts.VariableDeclaration[] {
  if (ts.isIdentifier(declaration.name)) {
    return [
      ts.factory.updateVariableDeclaration(
        declaration,
        ts.visitNode(declaration.name, visit) as ts.Identifier,
        undefined,
        undefined,
        declaration.initializer
          ? ts.visitNode(declaration.initializer, visit) as ts.Expression
          : undefined,
      ),
    ];
  }

  const declarations: ts.VariableDeclaration[] = [];
  const temporary = freshIdentifier("destructure");
  declarations.push(
    ts.factory.createVariableDeclaration(
      temporary,
      undefined,
      undefined,
      declaration.initializer
        ? ts.visitNode(declaration.initializer, visit) as ts.Expression
        : ts.factory.createIdentifier("undefined"),
    ),
  );
  appendBindingDeclarations(
    declaration.name,
    temporary,
    declarations,
    visit,
    freshIdentifier,
  );
  return declarations;
}

function appendBindingDeclarations(
  pattern: ts.BindingPattern,
  source: ts.Expression,
  declarations: ts.VariableDeclaration[],
  visit: ts.Visitor,
  freshIdentifier: FreshIdentifier,
): void {
  if (ts.isArrayBindingPattern(pattern)) {
    pattern.elements.forEach((element, index) => {
      if (ts.isOmittedExpression(element)) return;
      const value = element.dotDotDotToken
        ? createArrayRest(source, index)
        : safeArrayElement(source, index);
      appendBindingElement(element, value, declarations, visit, freshIdentifier);
    });
    return;
  }

  const excluded: ts.Expression[] = [];
  for (const element of pattern.elements) {
    if (element.dotDotDotToken) {
      appendBindingElement(
        element,
        createObjectCopy([source], excluded, false),
        declarations,
        visit,
        freshIdentifier,
      );
      continue;
    }

    let key = bindingPropertyKey(element, visit);
    if (element.propertyName && ts.isComputedPropertyName(element.propertyName)) {
      const keyTemporary = freshIdentifier("property");
      declarations.push(
        ts.factory.createVariableDeclaration(keyTemporary, undefined, undefined, key),
      );
      key = keyTemporary;
    }
    excluded.push(key);
    appendBindingElement(
      element,
      runtimeCall("variable_struct_get", [source, key]),
      declarations,
      visit,
      freshIdentifier,
    );
  }
}

function appendBindingElement(
  element: ts.BindingElement,
  value: ts.Expression,
  declarations: ts.VariableDeclaration[],
  visit: ts.Visitor,
  freshIdentifier: FreshIdentifier,
): void {
  let initializer = value;
  if (element.initializer) {
    const temporary = freshIdentifier("default");
    declarations.push(ts.factory.createVariableDeclaration(temporary, undefined, undefined, value));
    initializer = ts.factory.createConditionalExpression(runtimeCall("is_undefined", [temporary]),
      undefined, ts.visitNode(element.initializer, visit) as ts.Expression, undefined, temporary);
  }
  if (ts.isIdentifier(element.name)) {
    declarations.push(
      ts.factory.createVariableDeclaration(
        ts.visitNode(element.name, visit) as ts.Identifier,
        undefined,
        undefined,
        initializer,
      ),
    );
    return;
  }

  const temporary = freshIdentifier("destructure");
  declarations.push(
    ts.factory.createVariableDeclaration(temporary, undefined, undefined, initializer),
  );
  appendBindingDeclarations(element.name, temporary, declarations, visit, freshIdentifier);
}

function bindingPropertyKey(element: ts.BindingElement, visit: ts.Visitor): ts.Expression {
  const name = element.propertyName ?? element.name;
  if (ts.isIdentifier(name)) return ts.factory.createStringLiteral(name.text);
  if (ts.isStringLiteral(name)) return ts.factory.createStringLiteral(name.text);
  if (ts.isNumericLiteral(name)) return ts.factory.createStringLiteral(name.text);
  if (ts.isComputedPropertyName(name)) {
    return ts.visitNode(name.expression, visit) as ts.Expression;
  }
  throw new Error("Invalid object binding property.");
}

function safeArrayElement(source: ts.Expression, index: number): ts.Expression {
  return ts.factory.createConditionalExpression(
    ts.factory.createLessThan(
      ts.factory.createNumericLiteral(index),
      runtimeCall("array_length", [source]),
    ),
    undefined,
    ts.factory.createElementAccessExpression(source, index),
    undefined,
    ts.factory.createIdentifier("undefined"),
  );
}

function createArrayRest(source: ts.Expression, index: number): ts.Expression {
  const predicate = ts.factory.createFunctionExpression(
    undefined,
    undefined,
    undefined,
    undefined,
    [],
    undefined,
    ts.factory.createBlock([
      ts.factory.createReturnStatement(ts.factory.createTrue()),
    ], true),
  );
  return ts.factory.createConditionalExpression(
    ts.factory.createLessThan(
      ts.factory.createNumericLiteral(index),
      runtimeCall("array_length", [source]),
    ),
    undefined,
    runtimeCall("array_copy_while", [source, predicate, ts.factory.createNumericLiteral(index)]),
    undefined,
    ts.factory.createArrayLiteralExpression(),
  );
}

function createObjectCopy(
  parts: readonly ts.Expression[],
  excluded: readonly ts.Expression[],
  ignoreNullish: boolean,
): ts.Expression {
  const partsParameter = ts.factory.createIdentifier("__ts2gml_parts");
  const excludedParameter = ts.factory.createIdentifier("__ts2gml_excluded");
  const ignoreParameter = ts.factory.createIdentifier("__ts2gml_ignore_nullish");
  const result = ts.factory.createIdentifier("__ts2gml_result");
  const partIndex = ts.factory.createIdentifier("__ts2gml_part_index");
  const part = ts.factory.createIdentifier("__ts2gml_part");
  const names = ts.factory.createIdentifier("__ts2gml_names");
  const nameIndex = ts.factory.createIdentifier("__ts2gml_name_index");
  const name = ts.factory.createIdentifier("__ts2gml_name");

  const copyName = ts.factory.createIfStatement(
    ts.factory.createPrefixUnaryExpression(
      ts.SyntaxKind.ExclamationToken,
      runtimeCall("array_contains", [excludedParameter, name]),
    ),
    ts.factory.createBlock([
      ts.factory.createExpressionStatement(
        runtimeCall("variable_struct_set", [
          result,
          name,
          runtimeCall("variable_struct_get", [part, name]),
        ]),
      ),
    ], true),
  );
  const copyNames = ts.factory.createForStatement(
    variableList([
      ts.factory.createVariableDeclaration(nameIndex, undefined, undefined, ts.factory.createNumericLiteral(0)),
    ]),
    ts.factory.createLessThan(nameIndex, runtimeCall("array_length", [names])),
    ts.factory.createPostfixIncrement(nameIndex),
    ts.factory.createBlock([
      variableStatement(name, ts.factory.createElementAccessExpression(names, nameIndex)),
      copyName,
    ], true),
  );
  const copyParts = ts.factory.createForStatement(
    variableList([
      ts.factory.createVariableDeclaration(partIndex, undefined, undefined, ts.factory.createNumericLiteral(0)),
    ]),
    ts.factory.createLessThan(partIndex, runtimeCall("array_length", [partsParameter])),
    ts.factory.createPostfixIncrement(partIndex),
    ts.factory.createBlock([
      variableStatement(part, ts.factory.createElementAccessExpression(partsParameter, partIndex)),
      ts.factory.createIfStatement(
        ts.factory.createLogicalAnd(ignoreParameter, isNullish(part)),
        ts.factory.createContinueStatement(),
      ),
      variableStatement(names, runtimeCall("variable_struct_get_names", [part])),
      copyNames,
    ], true),
  );
  const functionExpression = ts.factory.createFunctionExpression(
    undefined,
    undefined,
    undefined,
    undefined,
    [
      ts.factory.createParameterDeclaration(undefined, undefined, partsParameter),
      ts.factory.createParameterDeclaration(undefined, undefined, excludedParameter),
      ts.factory.createParameterDeclaration(undefined, undefined, ignoreParameter),
    ],
    undefined,
    ts.factory.createBlock([
      variableStatement(result, ts.factory.createObjectLiteralExpression()),
      copyParts,
      ts.factory.createReturnStatement(result),
    ], true),
  );
  return ts.factory.createCallExpression(
    ts.factory.createParenthesizedExpression(functionExpression),
    undefined,
    [
      ts.factory.createArrayLiteralExpression(parts),
      ts.factory.createArrayLiteralExpression(excluded),
      ignoreNullish ? ts.factory.createTrue() : ts.factory.createFalse(),
    ],
  );
}

function lowerForOfStatement(
  node: ts.ForOfStatement,
  visit: ts.Visitor,
  freshIdentifier: FreshIdentifier,
): ts.ForStatement {
  return lowerForEachStatement(
    node.initializer,
    node.expression,
    node.statement,
    visit,
    freshIdentifier,
  );
}

function lowerForInStatement(
  node: ts.ForInStatement,
  visit: ts.Visitor,
  freshIdentifier: FreshIdentifier,
): ts.ForStatement {
  return lowerForEachStatement(
    node.initializer,
    runtimeCall("variable_struct_get_names", [node.expression]),
    node.statement,
    visit,
    freshIdentifier,
  );
}

function lowerForEachStatement(
  initializer: ts.ForInitializer,
  expression: ts.Expression,
  statement: ts.Statement,
  visit: ts.Visitor,
  freshIdentifier: FreshIdentifier,
): ts.ForStatement {
  const values = freshIdentifier("iteration_values");
  const index = freshIdentifier("iteration_index");
  const value = ts.factory.createElementAccessExpression(values, index);
  let binding: ts.Statement;

  if (ts.isVariableDeclarationList(initializer)) {
    const declaration = initializer.declarations[0]!;
    binding = ts.factory.createVariableStatement(
      undefined,
      ts.factory.createVariableDeclarationList([
        ts.factory.createVariableDeclaration(declaration.name, undefined, undefined, value),
      ], initializer.flags),
    );
  } else {
    binding = ts.factory.createExpressionStatement(
      ts.factory.createAssignment(
        ts.visitNode(initializer, visit) as ts.Expression,
        value,
      ),
    );
  }

  const visitedBinding = ts.visitNode(binding, visit) as ts.Statement;
  const visitedBody = ts.visitNode(statement, visit) as ts.Statement;
  const bodyStatements = ts.isBlock(visitedBody)
    ? [visitedBinding, ...visitedBody.statements]
    : [visitedBinding, visitedBody];
  return ts.factory.createForStatement(
    variableList([
      ts.factory.createVariableDeclaration(
        values,
        undefined,
        undefined,
        ts.visitNode(expression, visit) as ts.Expression,
      ),
      ts.factory.createVariableDeclaration(index, undefined, undefined, ts.factory.createNumericLiteral(0)),
    ]),
    ts.factory.createLessThan(index, runtimeCall("array_length", [values])),
    ts.factory.createPostfixIncrement(index),
    ts.factory.createBlock(bodyStatements, true),
  );
}

function runtimeCall(name: string, argumentsList: readonly ts.Expression[]): ts.CallExpression {
  return ts.factory.createCallExpression(
    ts.factory.createIdentifier(name),
    undefined,
    argumentsList,
  );
}

function isNullish(expression: ts.Expression): ts.Expression {
  return runtimeCall("__ts2gml_value_nullish", [expression]);
}

function variableList(
  declarations: readonly ts.VariableDeclaration[],
): ts.VariableDeclarationList {
  return ts.factory.createVariableDeclarationList(declarations, ts.NodeFlags.None);
}

function variableStatement(name: ts.Identifier, initializer: ts.Expression): ts.VariableStatement {
  return ts.factory.createVariableStatement(
    undefined,
    variableList([
      ts.factory.createVariableDeclaration(name, undefined, undefined, initializer),
    ]),
  );
}

function collectIdentifierTexts(node: ts.Node): Set<string> {
  const identifiers = new Set<string>();
  const visit = (current: ts.Node): void => {
    if (ts.isIdentifier(current)) identifiers.add(current.text);
    ts.forEachChild(current, visit);
  };
  visit(node);
  return identifiers;
}

function memberName(name: ts.PropertyName, sourceFile: ts.SourceFile): string {
  if (ts.isIdentifier(name) && isGmlIdentifier(name.text)) return name.text;
  if (ts.isStringLiteral(name) && isGmlIdentifier(name.text)) return name.text;
  throw nodeError(
    name,
    sourceFile,
    "TS2GML2004",
    "Computed and non-identifier class member names are not supported.",
  );
}

function nodeError(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  code: string,
  message: string,
  suggestion?: string,
): Ts2GmlError {
  return new Ts2GmlError([
    createNodeDiagnostic(node, sourceFile, code, message, suggestion),
  ]);
}

export function createNodeDiagnostic(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  code: string,
  message: string,
  suggestion?: string,
): CompilerDiagnostic {
  const range = originalSourceRange(sourceFile, node.getStart(sourceFile), node.getEnd());
  sourceFile = range.source;
  const start = range.start;
  const end = Math.min(range.end, sourceFile.text.length);
  const position = sourceFile.getLineAndCharacterOfPosition(start);
  const endPosition = sourceFile.getLineAndCharacterOfPosition(end);
  const lineStart = sourceFile.getPositionOfLineAndCharacter(position.line, 0);
  const nextLineStart = sourceFile.getLineStarts()[position.line + 1] ?? sourceFile.text.length;
  const sourceLine = sourceFile.text.slice(lineStart, nextLineStart).replace(/[\r\n]+$/, "");
  const lineEnd = lineStart + sourceLine.length;
  const diagnostic: CompilerDiagnostic = {
    code,
    severity: "error",
    fileName: sourceFile.fileName,
    line: position.line + 1,
    column: position.character + 1,
    endLine: endPosition.line + 1,
    endColumn: endPosition.character + 1,
    message,
    sourceLine,
    highlightLength: Math.max(1, Math.min(end, lineEnd) - start),
  };
  if (suggestion) diagnostic.suggestion = suggestion;
  return diagnostic;
}

export function fromTypeScriptDiagnostic(
  diagnostic: ts.Diagnostic,
  fallbackFileName: string,
): CompilerDiagnostic {
  const file = diagnostic.file;
  const position = file && diagnostic.start !== undefined
    ? file.getLineAndCharacterOfPosition(diagnostic.start)
    : undefined;
  const endPosition = file && diagnostic.start !== undefined
    ? file.getLineAndCharacterOfPosition(diagnostic.start + (diagnostic.length ?? 1))
    : undefined;
  const result: CompilerDiagnostic = {
    code: `TS${diagnostic.code}`,
    severity: "error",
    fileName: file?.fileName ?? fallbackFileName,
    line: (position?.line ?? 0) + 1,
    column: (position?.character ?? 0) + 1,
    endLine: (endPosition?.line ?? position?.line ?? 0) + 1,
    endColumn: (endPosition?.character ?? position?.character ?? 0) + 1,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
  };
  if (file && position && diagnostic.start !== undefined) {
    const lineStart = file.getPositionOfLineAndCharacter(position.line, 0);
    const nextLineStart = file.getLineStarts()[position.line + 1] ?? file.text.length;
    const sourceLine = file.text.slice(lineStart, nextLineStart).replace(/[\r\n]+$/, "");
    result.sourceLine = sourceLine;
    result.highlightLength = Math.max(
      1,
      Math.min(diagnostic.length ?? 1, sourceLine.length - position.character),
    );
  }
  return result;
}

export function formatDiagnostic(diagnostic: CompilerDiagnostic): string {
  const lines = [
    `${diagnostic.fileName}:${diagnostic.line}:${diagnostic.column} - ${diagnostic.severity} ${diagnostic.code}: ${diagnostic.message}`,
  ];
  if (diagnostic.sourceLine !== undefined) {
    const lineNumber = String(diagnostic.line);
    lines.push(`  ${lineNumber} | ${diagnostic.sourceLine}`);
    lines.push(
      `  ${" ".repeat(lineNumber.length)} | ${" ".repeat(diagnostic.column - 1)}${"~".repeat(diagnostic.highlightLength ?? 1)}`,
    );
  }
  if (diagnostic.suggestion) lines.push(`  hint: ${diagnostic.suggestion}`);
  return lines.join("\n");
}

function indent(text: string): string {
  return text
    .split("\n")
    .map((line) => (line ? `    ${line}` : line))
    .join("\n");
}

function parameterRenames(
  parameters: readonly ts.ParameterDeclaration[],
): ReadonlyMap<string, string> {
  return new Map(
    parameters
      .filter((parameter): parameter is ts.ParameterDeclaration & { name: ts.Identifier } =>
        ts.isIdentifier(parameter.name),
      )
      .map((parameter) => [parameter.name.text, `_${parameter.name.text}`]),
  );
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node) && Boolean(ts.getModifiers(node)?.some((modifier) => modifier.kind === kind));
}
