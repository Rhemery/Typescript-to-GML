import ts from "typescript";

export interface AccessIssue {
  node: ts.Node;
  message: string;
  suggestion: string;
}

export interface RuntimeAccessPlan {
  nativeArrays: Set<string>;
  nativeBooleans: Set<string>;
}

export function collectNativeAccessPlan(sourceFile: ts.SourceFile, checker: ts.TypeChecker): RuntimeAccessPlan {
  const nativeArrays = new Set<string>();
  const nativeBooleans = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isTypeNode(node)) return;
    if (ts.isElementAccessExpression(node)) {
      const receiver = node.expression;
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
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return { nativeArrays, nativeBooleans };
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
