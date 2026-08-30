import ts from "typescript";
import { isGmlIdentifier } from "./gml-identifiers.js";

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
  ["gm_self", "self"],
  ["gm_typeof", "typeof"],
]);

const compilerIntrinsicBindings = new Set([
  ...gmlKeywordFunctions.keys(),
  "console",
  "gm_macro",
  "gm_other",
  "gm_with",
  "Math",
  "method",
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

export function compileTypeScript(source: string, fileName = "input.ts"): CompileResult {
  validateTypeScriptSource(source, fileName);
  const javascript = toJavaScript(source, fileName);
  const sourceFile = parseJavaScript(javascript, fileName);
  validateJavaScript(sourceFile);

  const chunks = sourceFile.statements
    .filter((statement) => !ts.isExportDeclaration(statement))
    .map((statement) => emitTopLevelGml(statement, sourceFile));

  return {
    javascript,
    gml: `${chunks.filter(Boolean).join("\n\n").trim()}\n`,
  };
}

export function emitTopLevelGml(
  statement: ts.Statement,
  sourceFile: ts.SourceFile,
): string {
  if (ts.isClassDeclaration(statement)) return emitConstructorClass(statement, sourceFile);

  if (ts.isVariableStatement(statement)) {
    const macroDeclarations: Array<{
      declaration: ts.VariableDeclaration;
      call: ts.CallExpression;
    }> = [];
    const runtimeDeclarations: ts.VariableDeclaration[] = [];
    const emitRuntimeDeclarations = (declarations: readonly ts.VariableDeclaration[]) => {
      const bindingNames = new Set<string>();
      for (const declaration of declarations) collectBindingNames(declaration.name, bindingNames);
      const declarationStatement = ts.factory.createVariableStatement(
        undefined,
        ts.factory.updateVariableDeclarationList(statement.declarationList, declarations),
      );
      const globalAssignments = [...bindingNames].map((name) =>
        ts.factory.createExpressionStatement(
          ts.factory.createAssignment(
            ts.factory.createPropertyAccessExpression(
              ts.factory.createIdentifier("global"),
              name,
            ),
            ts.factory.createIdentifier(name),
          ),
        )
      );
      const initializer = ts.factory.createCallExpression(
        ts.factory.createParenthesizedExpression(
          ts.factory.createFunctionExpression(
            undefined,
            undefined,
            undefined,
            undefined,
            [],
            undefined,
            ts.factory.createBlock([declarationStatement, ...globalAssignments], true),
          ),
        ),
        undefined,
        [],
      );
      return stripExport(emitGml(ts.factory.createExpressionStatement(initializer), sourceFile));
    };

    for (const declaration of statement.declarationList.declarations) {
      const call = declaration.initializer && isGmMacroCall(declaration.initializer)
        ? declaration.initializer
        : undefined;
      if (call) macroDeclarations.push({ declaration, call });
      else runtimeDeclarations.push(declaration);
    }

    if (macroDeclarations.length > 0) {
      const chunks = macroDeclarations.flatMap(({ declaration, call }) =>
        emitGmMacro(declaration, call, sourceFile)
      );
      if (runtimeDeclarations.length > 0) {
        chunks.push(emitRuntimeDeclarations(runtimeDeclarations));
      }
      return chunks.join("\n");
    }
    return emitRuntimeDeclarations(runtimeDeclarations);
  }

  return stripExport(emitGml(statement, sourceFile));
}

export function toJavaScript(source: string, fileName: string): string {
  const result = ts.transpileModule(source, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      useDefineForClassFields: true,
      removeComments: false,
      sourceMap: false,
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

export function parseJavaScript(source: string, fileName: string): ts.SourceFile {
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
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
  for (const validate of [
    validateJavaScript,
    validateBlockScopedShadowing,
    validateTopLevelVariableReferences,
    validateFunctionCaptures,
    validateJavaScriptRuntime,
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
    if (ts.isVariableDeclaration(node) || ts.isParameter(node)) {
      validateBinding(node.name);
    } else if (
      (ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isClassDeclaration(node) ||
        ts.isClassExpression(node)) &&
      node.name
    ) {
      validateBinding(node.name);
    } else if (
      (ts.isPropertyDeclaration(node) || ts.isMethodDeclaration(node)) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "gm_with"
    ) {
      report(
        node.name,
        "TS2GML1056",
        "Class member 'gm_with' conflicts with the compiler intrinsic.",
        "Rename the member so calls to gm_with keep their defined meaning.",
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
    if (isGmWithCall(node)) validateGmWithCall(node, report);
    if (isGmOtherCall(node)) validateGmOtherCall(node, report);
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
      ["gm_with", "gm_other"].includes(node.text) &&
      isIdentifierReference(node) &&
      !isDirectCallTarget(node)
    ) {
      report(
        node,
        node.text === "gm_with" ? "TS2GML1044" : "TS2GML1045",
        `${node.text} is a compiler intrinsic and cannot be used as a runtime value.`,
        node.text === "gm_with"
          ? "Call gm_with(target, (self, other) => { ... }) as a statement."
          : "Call gm_other<ObjectType>() directly where the other instance is needed.",
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
    if (ts.isCallExpression(node) && ts.isOptionalChain(node)) {
      report(
        node,
        "TS2GML1007",
        "Optional calls cannot preserve deferred argument evaluation in GML.",
        "Check the callable explicitly before invoking it.",
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
    if (ts.isDeleteExpression(node)) {
      report(
        node,
        "TS2GML1010",
        "JavaScript delete semantics cannot be represented safely in GML.",
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
    if (
      ts.isPropertyAccessExpression(node) &&
      node.expression.kind !== ts.SyntaxKind.ThisKeyword &&
      unsupportedJavaScriptInstanceMembers.has(node.name.text)
    ) {
      report(
        node.name,
        "TS2GML1051",
        `JavaScript instance member '.${node.name.text}' has no type-safe GML lowering.`,
        "Use the corresponding GameMaker array_* or string_* function explicitly.",
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
    if (ts.isEnumDeclaration(node) || ts.isModuleDeclaration(node)) {
      report(
        node,
        "TS2GML1030",
        "TypeScript enums and namespaces do not have a safe JavaScript-to-GML lowering.",
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

function isGmOtherCall(node: ts.Node): node is ts.CallExpression {
  return isCallTo(node, "gm_other");
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
  let nestedFunction: ts.Node | undefined;
  const inspect = (node: ts.Node): void => {
    if (node !== action && isFunctionWithBody(node)) {
      if (isGmWithAction(node)) ts.forEachChild(node.body, inspect);
      else nestedFunction ??= node;
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
  if (nestedFunction) {
    report(
      nestedFunction,
      "TS2GML1044",
      "Nested functions inside gm_with are not supported.",
      "Move the function outside the inline block.",
    );
  }
}

function validateGmOtherCall(
  call: ts.CallExpression,
  report: DiagnosticReporter,
): void {
  if (call.arguments.length > 0) {
    report(
      call,
      "TS2GML1045",
      "gm_other is a type-only assertion and does not accept runtime arguments.",
      "Select the expected type with gm_other<ObjectType>().",
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

function validateFunctionCaptures(sourceFile: ts.SourceFile): void {
  const diagnostics: CompilerDiagnostic[] = [];
  const rootBindings = new Set<string>();

  const validateFunction = (
    functionNode: FunctionWithBody,
    outerBindings: ReadonlySet<string>,
    lexicalThisAvailable: boolean,
  ): void => {
    const localBindings = collectFunctionBindings(functionNode);
    const nestedFunctions: FunctionWithBody[] = [];
    const reportedCaptures = new Set<string>();
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
        if (isGmWithAction(node)) {
          visit(node.body);
          return;
        }
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

        if (
          !localBindings.has(node.text) &&
          outerBindings.has(node.text) &&
          !reportedCaptures.has(node.text)
        ) {
          const kind = isArrow ? "Arrow" : "Nested";
          diagnostics.push(createNodeDiagnostic(
            node,
            sourceFile,
            "TS2GML1014",
            `${kind} function captures local variable '${node.text}', but GML functions do not capture surrounding locals.`,
            `Pass '${node.text}' as an argument or store it on the current instance or struct.`,
          ));
          reportedCaptures.add(node.text);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(functionNode.body);
    const nestedOuterBindings = new Set([...outerBindings, ...localBindings]);
    const nestedLexicalThis = isArrow ? lexicalThisAvailable : hasKnownOwnThis;
    for (const nestedFunction of nestedFunctions) {
      validateFunction(nestedFunction, nestedOuterBindings, nestedLexicalThis);
    }
  };

  const visitRoot = (node: ts.Node, lexicalThisAvailable = false): void => {
    if (isGmWithAction(node)) {
      visitRoot(node.body, lexicalThisAvailable);
      return;
    }
    if (isFunctionWithBody(node)) {
      validateFunction(node, rootBindings, lexicalThisAvailable);
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
      ts.isClassLike(node.parent) &&
      !hasModifier(node, ts.SyntaxKind.StaticKeyword)
      ? true
      : lexicalThisAvailable;
    ts.forEachChild(node, (child) => visitRoot(child, childHasLexicalThis));
  };

  visitRoot(sourceFile);
  if (diagnostics.length > 0) throw new Ts2GmlError(diagnostics);
}

export function validateTopLevelVariableReferences(
  sourceFile: ts.SourceFile,
  globalBindings = collectTopLevelVariableBindings(sourceFile),
): void {
  const diagnostics: CompilerDiagnostic[] = [];
  const scopes: ReadonlySet<string>[] = [];
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
      globalBindings.has(node.text) &&
      !scopes.slice(1).some((scope) => scope.has(node.text))
    ) {
      diagnostics.push(createNodeDiagnostic(
        node,
        sourceFile,
        "TS2GML1067",
        `Top-level variable '${node.text}' must be accessed through explicit GameMaker global scope.`,
        `Declare '${node.text}' on GMGlobal and use gm_global.${node.text}.`,
      ));
    }
    ts.forEachChild(node, visit);
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
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
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
    } else if (ts.isEnumDeclaration(statement)) {
      bindings.add(statement.name.text);
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
): string {
  const result = ts.transform(node, [gmlTransformer(identifierRenames, sourceFile)]);
  try {
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
    const isStatic = hasModifier(member, ts.SyntaxKind.StaticKeyword);
    if (isStatic) {
      throw nodeError(
        member,
        sourceFile,
        "TS2GML2002",
        "JavaScript static class members have no safe GML equivalent.",
      );
    }
    if (ts.isPropertyDeclaration(member)) {
      const name = memberName(member.name, sourceFile);
      const value = member.initializer ? emitGml(member.initializer, sourceFile) : "undefined";
      lines.push(`self.${name} = ${value};`);
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
): ts.TransformerFactory<ts.Node> {
  return (context: ts.TransformationContext): ts.Transformer<ts.Node> => {
  const usedIdentifiers = collectIdentifierTexts(sourceFile);
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
    return ts.factory.createIdentifier(text);
  };

  const visit: ts.Visitor = (node) => {
    if (
      ts.isOptionalChain(node) &&
      !(node.parent && ts.isOptionalChain(node.parent))
    ) {
      return lowerOptionalChain(node, visit, freshIdentifier);
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
          ts.visitNode(node.expression, visit) as ts.Expression,
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
    if (isGmOtherCall(node)) {
      return ts.factory.createIdentifier("other");
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
      const withBinding = findWithActionBinding(node.text, transformState.withActionBindings);
      if (withBinding) return withBinding.alias;
      const keywordFunction = gmlKeywordFunctions.get(node.text);
      if (keywordFunction) return ts.factory.createIdentifier(keywordFunction);
      const renamed = identifierRenames.get(node.text);
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
    if (ts.isCallExpression(node) && node.arguments.some(ts.isSpreadElement)) {
      return createSpreadCall(
        node.expression,
        node.arguments,
        visit,
      );
    }
    if (ts.isOmittedExpression(node)) {
      return ts.factory.createIdentifier("undefined");
    }
    if (node.kind === ts.SyntaxKind.ThisKeyword && transformState.withActionDepth > 0) {
      return transformState.withLexicalThis!;
    }
    if (node.kind === ts.SyntaxKind.ThisKeyword) {
      return ts.factory.createIdentifier("self");
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
      return ts.factory.createIdentifier("undefined");
    }
    if (ts.isBinaryExpression(node)) {
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
            ts.visitNode(node.left, visit) as ts.Expression,
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
    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      return ts.factory.createStringLiteral(node.text);
    }
    if (ts.isStringLiteral(node)) {
      return ts.factory.createStringLiteral(node.text);
    }
    if (ts.isArrowFunction(node)) {
      let usesLexicalThis = false;
      const inspect = (child: ts.Node): void => {
        if (child.kind === ts.SyntaxKind.ThisKeyword) {
          usesLexicalThis = true;
          return;
        }
        if (child !== node && isFunctionWithBody(child) && !ts.isArrowFunction(child)) return;
        ts.forEachChild(child, inspect);
      };
      inspect(node.body);
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
            [ts.factory.createIdentifier("self"), fn],
          )
        : fn;
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
    const actionBody = action.body as ts.Block;
    const body = ts.factory.updateBlock(actionBody, [
      variableStatement(selfAlias, ts.factory.createIdentifier("self")),
      variableStatement(otherAlias, ts.factory.createIdentifier("other")),
      ...actionBody.statements,
    ]);
    return ts.factory.createWithStatement(
      target,
      ts.visitNode(body, visit) as ts.Block,
    );
  } finally {
    state.withActionBindings.pop();
    state.withLexicalThis = previousLexicalThis;
    state.withActionDepth -= 1;
  }
}

type OptionalChainSegment =
  | { kind: "property"; name: ts.MemberName; optional: boolean }
  | { kind: "element"; argument: ts.Expression; optional: boolean }
  | { kind: "call"; arguments: readonly ts.Expression[]; optional: boolean };

function lowerOptionalChain(
  node: ts.OptionalChain,
  visit: ts.Visitor,
  freshIdentifier: FreshIdentifier,
): ts.Expression {
  const chain = decomposeOptionalChain(node);
  const build = (index: number, value: ts.Expression): ts.Expression => {
    const segment = chain.segments[index];
    if (!segment) return value;
    if (!segment.optional) return build(index + 1, applyChainSegment(value, segment, visit));

    const parameter = freshIdentifier("optional");
    const continuation = build(index + 1, applyChainSegment(parameter, segment, visit));
    const result = ts.factory.createConditionalExpression(
      isNullish(parameter),
      undefined,
      ts.factory.createIdentifier("undefined"),
      undefined,
      continuation,
    );
    return callInlineFunction(parameter, result, value);
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
): ts.Expression {
  if (segment.kind === "property") {
    return ts.factory.createPropertyAccessExpression(value, segment.name);
  }
  if (segment.kind === "element") {
    return ts.factory.createElementAccessExpression(
      value,
      ts.visitNode(segment.argument, visit) as ts.Expression,
    );
  }
  if (segment.arguments.some(ts.isSpreadElement)) {
    return createSpreadCall(value, segment.arguments, visit);
  }
  return createDynamicCall(
    value,
    ts.factory.createArrayLiteralExpression(
      segment.arguments.map((argument) => ts.visitNode(argument, visit) as ts.Expression),
    ),
  );
}

function callInlineFunction(
  parameter: ts.Identifier,
  result: ts.Expression,
  argument: ts.Expression,
): ts.CallExpression {
  const functionExpression = ts.factory.createFunctionExpression(
    undefined,
    undefined,
    undefined,
    undefined,
    [ts.factory.createParameterDeclaration(undefined, undefined, parameter)],
    undefined,
    ts.factory.createBlock([ts.factory.createReturnStatement(result)], true),
  );
  return ts.factory.createCallExpression(
    ts.factory.createParenthesizedExpression(functionExpression),
    undefined,
    [argument],
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

function createSpreadCall(
  expression: ts.Expression,
  argumentsList: readonly ts.Expression[],
  visit: ts.Visitor,
): ts.CallExpression {
  const callable = ts.visitNode(expression, visit) as ts.Expression;
  const argumentsArray = runtimeCall("array_concat", [
    ts.factory.createArrayLiteralExpression(),
    ...spreadParts(argumentsList, visit),
  ]);
  if (
    !ts.isPropertyAccessExpression(callable) &&
    !ts.isElementAccessExpression(callable)
  ) {
    return createDynamicCall(callable, argumentsArray);
  }

  const receiver = ts.factory.createIdentifier("__ts2gml_receiver");
  const argumentsParameter = ts.factory.createIdentifier("__ts2gml_arguments");
  const parameters = [
    ts.factory.createParameterDeclaration(undefined, undefined, receiver),
  ];
  const callArguments: ts.Expression[] = [callable.expression];
  let property: ts.Expression;
  if (ts.isPropertyAccessExpression(callable)) {
    property = ts.factory.createPropertyAccessExpression(receiver, callable.name);
  } else {
    const key = ts.factory.createIdentifier("__ts2gml_key");
    parameters.push(ts.factory.createParameterDeclaration(undefined, undefined, key));
    callArguments.push(callable.argumentExpression);
    property = ts.factory.createElementAccessExpression(receiver, key);
  }
  parameters.push(
    ts.factory.createParameterDeclaration(undefined, undefined, argumentsParameter),
  );
  callArguments.push(argumentsArray);
  const reboundMethod = runtimeCall("method", [receiver, property]);
  const functionExpression = ts.factory.createFunctionExpression(
    undefined,
    undefined,
    undefined,
    undefined,
    parameters,
    undefined,
    ts.factory.createBlock([
      ts.factory.createReturnStatement(
        runtimeCall("method_call", [reboundMethod, argumentsParameter]),
      ),
    ], true),
  );
  return ts.factory.createCallExpression(
    ts.factory.createParenthesizedExpression(functionExpression),
    undefined,
    callArguments,
  );
}

function createDynamicCall(
  callable: ts.Expression,
  argumentsArray: ts.Expression,
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
  const functionExpression = ts.factory.createFunctionExpression(
    undefined,
    undefined,
    undefined,
    undefined,
    [
      ts.factory.createParameterDeclaration(undefined, undefined, callableParameter),
      ts.factory.createParameterDeclaration(undefined, undefined, argumentsParameter),
    ],
    undefined,
    ts.factory.createBlock([ts.factory.createReturnStatement(result)], true),
  );
  return ts.factory.createCallExpression(
    ts.factory.createParenthesizedExpression(functionExpression),
    undefined,
    [callable, argumentsArray],
  );
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
  const initializer = element.initializer
    ? ts.factory.createBinaryExpression(
        value,
        ts.SyntaxKind.QuestionQuestionToken,
        ts.visitNode(element.initializer, visit) as ts.Expression,
      )
    : value;
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
  return ts.factory.createBinaryExpression(
    ts.factory.createParenthesizedExpression(
      ts.factory.createBinaryExpression(
        expression,
        ts.SyntaxKind.QuestionQuestionToken,
        ts.factory.createIdentifier("undefined"),
      ),
    ),
    ts.SyntaxKind.EqualsEqualsToken,
    ts.factory.createIdentifier("undefined"),
  );
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
  const start = node.getStart(sourceFile);
  const end = node.getEnd();
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
