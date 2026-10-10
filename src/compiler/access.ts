import ts from "typescript";

export interface AccessIssue {
  node: ts.Node;
  message: string;
  suggestion: string;
}

export interface RuntimeAccessPlan {
  nativeArrays: Set<string>;
  nativeStructReads: Set<string>;
  nativeBooleans: Set<string>;
  booleanConditions: Set<string>;
  primitiveComparisons: Set<string>;
  typedConditions: Map<string, "reference" | "string">;
}

export function collectNativeAccessPlan(sourceFile: ts.SourceFile, checker: ts.TypeChecker, strictNullChecks = true): RuntimeAccessPlan {
  const nativeArrays = new Set<string>();
  const nativeStructReads = new Set<string>();
  const nativeBooleans = new Set<string>();
  const booleanConditions = new Set<string>();
  const primitiveComparisons = new Set<string>();
  const typedConditions = new Map<string, "reference" | "string">();
  const primitiveKind = (type: ts.Type): ts.TypeFlags | undefined => {
    const members = type.isUnion() ? type.types : [type];
    return [ts.TypeFlags.NumberLike, ts.TypeFlags.StringLike, ts.TypeFlags.BooleanLike]
      .find((kind) => members.every((member) => (member.flags & kind) !== 0));
  };
  const recordBoolean = (expression: ts.Expression | undefined): void => {
    if (!expression || !strictNullChecks) return;
    const key = `${expression.pos}:${expression.end}:${expression.kind}`;
    const type = checker.getTypeAtLocation(expression);
    const kind = primitiveKind(type);
    if (kind === ts.TypeFlags.BooleanLike) booleanConditions.add(key);
    else if (kind === ts.TypeFlags.StringLike) typedConditions.set(key, "string");
    else {
      const members = type.isUnion() ? type.types : [type];
      // Structs, arrays and methods are always truthy; missing references are
      // undefined. Nullable, primitive, branded numeric and unknown unions
      // retain the general JS predicate. Never discard a call's side effects.
      if (members.some((member) => (member.flags & ts.TypeFlags.Object) !== 0) &&
        members.every((member) => (member.flags & (ts.TypeFlags.Object | ts.TypeFlags.Undefined)) !== 0)) {
        typedConditions.set(key, "reference");
      }
    }
  };
  const visit = (node: ts.Node): void => {
    if (ts.isTypeNode(node)) return;
    if (ts.isElementAccessExpression(node)) {
      const receiver = node.expression;
      const receiverType = checker.getTypeAtLocation(receiver);
      const parent = node.parent;
      const write = ts.isDeleteExpression(parent) || ts.isPostfixUnaryExpression(parent) ||
        (ts.isPrefixUnaryExpression(parent) && (parent.operator === ts.SyntaxKind.PlusPlusToken || parent.operator === ts.SyntaxKind.MinusMinusToken)) ||
        (ts.isBinaryExpression(parent) && parent.left === node && parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
          parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment);
      // Typed string dictionaries are GML structs. Native instance brands,
      // arrays, nullable/unknown receivers, writes and method calls retain their
      // general adapter. A missing struct key still returns undefined natively.
      if (strictNullChecks && !write && !ts.isOptionalChain(node) &&
        !(ts.isCallExpression(parent) && parent.expression === node) &&
        (receiverType.flags & ts.TypeFlags.Object) !== 0 && !checker.isArrayType(receiverType) && !checker.isTupleType(receiverType) &&
        receiverType.getSymbol()?.getName() !== "GMGlobal" && !(ts.isIdentifier(receiver) && receiver.text === "gm_global") &&
        !checker.getPropertyOfType(receiverType, "gm_with") && checker.getIndexTypeOfType(receiverType, ts.IndexKind.String) &&
        primitiveKind(checker.getTypeAtLocation(node.argumentExpression)) === ts.TypeFlags.StringLike) {
        nativeStructReads.add(`${node.pos}:${node.end}:${node.kind}`);
      }
      const symbol = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(receiver) ? receiver.name : receiver);
      if (symbol?.declarations?.some((declaration) =>
        /(?:^|[\\/])gamemaker\.generated\.d\.ts$/i.test(declaration.getSourceFile().fileName))) {
        nativeArrays.add(`${receiver.pos}:${receiver.end}:${receiver.kind}`);
      }
    }
    if (ts.isCallExpression(node)) {
      const signature = checker.getResolvedSignature(node);
      if (signature?.declaration &&
        /(?:^|[\\/])gamemaker\.generated\.d\.ts$/i.test(signature.declaration.getSourceFile().fileName) &&
        (checker.getReturnTypeOfSignature(signature).flags & ts.TypeFlags.BooleanLike) !== 0) {
        nativeBooleans.add(`${node.pos}:${node.end}:${node.kind}`);
      }
    }
    if (ts.isIfStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node)) recordBoolean(node.expression);
    if (ts.isForStatement(node)) recordBoolean(node.condition);
    if (ts.isConditionalExpression(node)) recordBoolean(node.condition);
    if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) recordBoolean(node.operand);
    if (ts.isBinaryExpression(node)) {
      if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
        node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
        recordBoolean(node.left);
        recordBoolean(node.right);
      }
      if (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken) {
        // Same-kind primitives need no dynamic type discrimination. Mixed,
        // nullable and unknown values retain JavaScript's strict-equality helper.
        const left = primitiveKind(checker.getTypeAtLocation(node.left));
        const right = primitiveKind(checker.getTypeAtLocation(node.right));
        if (strictNullChecks && left !== undefined && left === right) {
          primitiveComparisons.add(`${node.pos}:${node.end}:${node.kind}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return { nativeArrays, nativeStructReads, nativeBooleans, booleanConditions, primitiveComparisons, typedConditions };
}

// Use the checker before erasing types; never infer a standard-library method
// merely from a spelling shared by an authored member.
export function inspectRuntimeAccesses(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  loweredMembers: ReadonlyMap<string, string>,
  unsupportedMembers: ReadonlySet<string>,
): AccessIssue[] {
  const issues: AccessIssue[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isTypeNode(node)) return;
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const name = ts.isPropertyAccessExpression(node) ? node.name.text
        : ts.isStringLiteralLike(node.argumentExpression) ? node.argumentExpression.text : undefined;
      if (name && unsupportedMembers.has(name)) {
        const type = checker.getTypeAtLocation(node.expression);
        const members = type.isUnion() ? type.types : [type];
        const authored = members.every((member) => {
          const property = checker.getPropertyOfType(member, name);
          return property?.declarations?.some((declaration) =>
            !declaration.getSourceFile().hasNoDefaultLib
          );
        });
        let parent: ts.Node = node.parent;
        while (ts.isParenthesizedExpression(parent)) parent = parent.parent;
        const called = ts.isCallExpression(parent);
        const array = members.some((member) => checker.isArrayType(member) || checker.isTupleType(member));
        if (array && name === "sort" && ts.isCallExpression(parent) && parent.arguments.length === 0) {
          issues.push({ node, message: "Array sort requires an explicit comparator.",
            suggestion: "Use values.sort((left, right) => left - right), or native array_sort for GameMaker ordering." });
        } else if (!authored && node.expression.kind !== ts.SyntaxKind.ThisKeyword &&
          name !== "length" && !(loweredMembers.has(name) && called)) {
          issues.push({ node, message: `JavaScript instance member '.${name}' has no safe GML lowering.`,
            suggestion: "Use the corresponding GameMaker function, or call a declared authored member." });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return issues;
}
