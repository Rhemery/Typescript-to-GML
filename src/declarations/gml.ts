import { extractFunctionJsDocs } from "./jsdoc.js";

export interface GmlFunctionDeclaration {
  name: string;
  constructor: boolean;
  parameters?: GmlParameterDeclaration[];
  description?: string;
  returnType?: string;
  returnDescription?: string;
}

export interface GmlParameterDeclaration {
  name: string;
  optional: boolean;
  type?: string;
  description?: string;
}

export interface GmlSourceDeclarations {
  functions: GmlFunctionDeclaration[];
  macros: GmlMacroDeclaration[];
  enumerations: GmlEnumerationDeclaration[];
  globals: string[];
  globalVariables: string[];
}

export interface GmlMacroDeclaration {
  name: string;
  type: "number" | "string" | "boolean" | "any";
}

export interface GmlEnumerationDeclaration {
  name: string;
  members: string[];
}

const identifierPattern = /^[$A-Z_a-z][$\w]*$/;

export function extractGmlDeclarations(source: string): GmlSourceDeclarations {
  const functionJsDocs = extractFunctionJsDocs(source);
  const tokens: string[] = [];
  const macroTypes = new Map<string, Set<GmlMacroDeclaration["type"]>>();
  for (let index = 0; index < source.length;) {
    const character = source[index]!;
    const next = source[index + 1];
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    if (character === "/" && next === "/") {
      index += 2;
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) {
        index += 1;
      }
      index = Math.min(source.length, index + 2);
      continue;
    }
    if (character === "#") {
      const lineEnd = source.indexOf("\n", index);
      const directiveEnd = lineEnd < 0 ? source.length : lineEnd;
      const macro = /^#macro\s+(?:[^:\s]+:)?([$A-Z_a-z][$\w]*)\s+(.+?)\s*$/.exec(
        source.slice(index, directiveEnd),
      );
      if (macro) {
        const types = macroTypes.get(macro[1]!) ?? new Set<GmlMacroDeclaration["type"]>();
        types.add(inferMacroType(macro[2]!));
        macroTypes.set(macro[1]!, types);
      }
      index = directiveEnd;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      const quote = character;
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") {
          index += 2;
          continue;
        }
        if (source[index] === quote) {
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }
    if (/[$A-Z_a-z]/.test(character)) {
      const start = index;
      index += 1;
      while (index < source.length && /[$\w]/.test(source[index]!)) index += 1;
      tokens.push(source.slice(start, index));
      continue;
    }
    tokens.push(character);
    index += 1;
  }

  const functions: GmlFunctionDeclaration[] = [];
  const enumerations: GmlEnumerationDeclaration[] = [];
  const globals = new Set<string>();
  const globalVariables = new Set<string>();
  let braceDepth = 0;
  let parenthesisDepth = 0;
  let bracketDepth = 0;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const atScriptScope = braceDepth === 0 && parenthesisDepth === 0 && bracketDepth === 0;

    if (token === "global" && tokens[index + 1] === ".") {
      const name = tokens[index + 2];
      if (name && identifierPattern.test(name)) globals.add(name);
    }

    if (token === "globalvar") {
      let expectsName = true;
      for (let cursor = index + 1; cursor < tokens.length && tokens[cursor] !== ";"; cursor += 1) {
        const current = tokens[cursor]!;
        if (expectsName && identifierPattern.test(current)) {
          globalVariables.add(current);
          globals.add(current);
          expectsName = false;
        } else if (current === ",") {
          expectsName = true;
        }
      }
    }

    if (atScriptScope && token === "function" && tokens[index - 1] !== "=") {
      const name = tokens[index + 1];
      if (name && identifierPattern.test(name) && tokens[index + 2] === "(") {
        const parameterStart = index + 3;
        let cursor = index + 3;
        let parameterDepth = 1;
        while (cursor < tokens.length && parameterDepth > 0) {
          if (tokens[cursor] === "(") parameterDepth += 1;
          else if (tokens[cursor] === ")") parameterDepth -= 1;
          cursor += 1;
        }
        let parameters = parameterDepth === 0
          ? readFunctionParameters(tokens.slice(parameterStart, cursor - 1))
          : undefined;
        const jsDoc = functionJsDocs.get(name);
        if (parameters && jsDoc) {
          parameters = parameters.map((parameter, parameterIndex) => {
            const normalizedName = parameter.name.replace(/^_+/, "").toLowerCase();
            const documented = jsDoc.parameters.find(
              (candidate) => candidate.name.replace(/^_+/, "").toLowerCase() === normalizedName,
            ) ?? jsDoc.parameters[parameterIndex];
            if (!documented) return parameter;
            return {
              ...parameter,
              ...(documented.type ? { type: documented.type } : {}),
              ...(documented.description ? { description: documented.description } : {}),
            };
          });
        }
        let constructor = false;
        while (cursor < tokens.length && tokens[cursor] !== "{" && tokens[cursor] !== ";") {
          if (tokens[cursor] === "constructor") constructor = true;
          cursor += 1;
        }
        functions.push({
          name,
          constructor,
          ...(parameters ? { parameters } : {}),
          ...(jsDoc?.description ? { description: jsDoc.description } : {}),
          ...(jsDoc?.returnType ? { returnType: jsDoc.returnType } : {}),
          ...(jsDoc?.returnDescription
            ? { returnDescription: jsDoc.returnDescription }
            : {}),
        });
      }
    }

    if (
      token === "enum" &&
      identifierPattern.test(tokens[index + 1] ?? "") &&
      tokens[index + 2] === "{"
    ) {
      const members: string[] = [];
      let cursor = index + 3;
      let braces = 1;
      let parentheses = 0;
      let brackets = 0;
      let expectsMember = true;
      while (cursor < tokens.length && braces > 0) {
        const current = tokens[cursor]!;
        if (
          braces === 1 &&
          parentheses === 0 &&
          brackets === 0 &&
          expectsMember &&
          identifierPattern.test(current)
        ) {
          members.push(current);
          expectsMember = false;
        } else if (
          braces === 1 &&
          parentheses === 0 &&
          brackets === 0 &&
          current === ","
        ) {
          expectsMember = true;
        }
        if (current === "{") braces += 1;
        else if (current === "}") braces -= 1;
        else if (current === "(") parentheses += 1;
        else if (current === ")") parentheses = Math.max(0, parentheses - 1);
        else if (current === "[") brackets += 1;
        else if (current === "]") brackets = Math.max(0, brackets - 1);
        cursor += 1;
      }
      enumerations.push({ name: tokens[index + 1]!, members });
    }

    if (atScriptScope && token === "var") {
      let cursor = index + 1;
      let expectsName = true;
      let nested = 0;
      while (cursor < tokens.length) {
        const current = tokens[cursor]!;
        if (current === "(" || current === "[" || current === "{") nested += 1;
        else if (current === ")" || current === "]" || current === "}") nested -= 1;
        if (nested === 0 && current === ";") break;
        if (nested === 0 && current === ",") expectsName = true;
        else if (expectsName && identifierPattern.test(current)) {
          globals.add(current);
          expectsName = false;
        }
        cursor += 1;
      }
    }

    if (
      atScriptScope &&
      identifierPattern.test(token) &&
      token !== "var" &&
      token !== "globalvar" &&
      tokens[index - 1] !== "." &&
      tokens[index + 1] === "="
    ) {
      globals.add(token);
    }

    if (token === "{") braceDepth += 1;
    else if (token === "}") braceDepth = Math.max(0, braceDepth - 1);
    else if (token === "(") parenthesisDepth += 1;
    else if (token === ")") parenthesisDepth = Math.max(0, parenthesisDepth - 1);
    else if (token === "[") bracketDepth += 1;
    else if (token === "]") bracketDepth = Math.max(0, bracketDepth - 1);
  }

  return {
    functions,
    macros: [...macroTypes]
      .map(([name, types]) => ({
        name,
        type: types.size === 1 ? [...types][0]! : "any" as const,
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    enumerations: enumerations.sort((left, right) => left.name.localeCompare(right.name)),
    globals: [...globals].sort(),
    globalVariables: [...globalVariables].sort(),
  };
}

function inferMacroType(value: string): GmlMacroDeclaration["type"] {
  const trimmed = value.trim();
  if (/^(?:true|false)$/i.test(trimmed)) return "boolean";
  if (/^(?:[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?|\$[\da-f]+|0x[\da-f]+)$/i.test(trimmed)) {
    return "number";
  }
  if (/^(?:@|\$)?(["']).*\1$/s.test(trimmed)) return "string";
  return "any";
}

function readFunctionParameters(tokens: readonly string[]): GmlParameterDeclaration[] | undefined {
  if (tokens.length === 0) return [];
  const segments: string[][] = [[]];
  let nested = 0;
  for (const token of tokens) {
    if (nested === 0 && token === ",") {
      segments.push([]);
      continue;
    }
    segments.at(-1)!.push(token);
    if (token === "(" || token === "[" || token === "{") nested += 1;
    else if (token === ")" || token === "]" || token === "}") nested -= 1;
    if (nested < 0) return undefined;
  }
  if (nested !== 0) return undefined;

  const parameters: GmlParameterDeclaration[] = [];
  for (const segment of segments) {
    const name = segment[0];
    if (!name || !identifierPattern.test(name)) return undefined;
    if (segment.length > 1 && segment[1] !== "=") return undefined;
    parameters.push({ name, optional: segment[1] === "=" });
  }
  return parameters;
}
