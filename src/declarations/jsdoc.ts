export interface GmlJsDocParameter {
  name: string;
  type?: string;
  description?: string;
}

export interface GmlJsDoc {
  description?: string;
  parameters: GmlJsDocParameter[];
  returnType?: string;
  returnDescription?: string;
}

const namespacedTypes = new Map<string, string>([
  ["asset.gmanimcurve", "GM.Asset.GMAnimCurve"],
  ["asset.gmfont", "GM.Asset.GMFont"],
  ["asset.gmobject", "GM.Asset.GMObject"],
  ["asset.gmpath", "GM.Asset.GMPath"],
  ["asset.gmroom", "GM.Asset.GMRoom"],
  ["asset.gmscript", "GM.Asset.GMScript"],
  ["asset.gmsequence", "GM.Asset.GMSequence"],
  ["asset.gmshader", "GM.Asset.GMShader"],
  ["asset.gmsound", "GM.Asset.GMSound"],
  ["asset.gmsprite", "GM.Asset.GMSprite"],
  ["asset.gmtileset", "GM.Asset.GMTileSet"],
  ["constant.bufferdatatype", "GM.Constant.BufferDataType"],
  ["constant.color", "GM.Constant.Color"],
  ["constant.dstype", "GM.Constant.DsType"],
  ["constant.mousebutton", "GM.Constant.MouseButton"],
  ["gm.sprite", "GM.Asset.GMSprite"],
  ["id.buffer", "GM.Id.Buffer"],
  ["id.camera", "GM.Id.Camera"],
  ["id.color", "number"],
  ["id.dsgrid", "GM.Id.DsGrid"],
  ["id.dslist", "GM.Id.DsList"],
  ["id.dsmap", "GM.Id.DsMap"],
  ["id.gmcamera", "GM.Id.Camera"],
  ["id.gmobject", "GM.Asset.GMObject"],
  ["id.instance", "GM.Id.Instance"],
  ["id.layer", "GM.Id.Layer"],
  ["id.surface", "GM.Id.Surface"],
  ["id.texture", "GM.Id.Texture"],
  ["pointer.texture", "GM.Pointer.Texture"],
  ["struct.vector3", "GMStruct"],
]);

export function extractFunctionJsDocs(source: string): Map<string, GmlJsDoc> {
  const comments = new Map<string, GmlJsDoc>();
  const patterns = [
    /((?:^[ \t]*\/\/\/[^\r\n]*(?:\r?\n|$))+)[ \t\r\n]*function[ \t]+([$A-Z_a-z][$\w]*)[ \t]*\(/gm,
    /(\/\*\*[\s\S]*?\*\/)[ \t\r\n]*function[ \t]+([$A-Z_a-z][$\w]*)[ \t]*\(/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const rawComment = match[1];
      const name = match[2];
      if (!rawComment || !name) continue;
      const lines = rawComment
        .split(/\r?\n/)
        .map((line) => line
          .replace(/^\s*\/\/\/\s?/, "")
          .replace(/^\s*\/\*\*?\s?/, "")
          .replace(/^\s*\*\/?\s?/, "")
          .replace(/\s*\*\/\s*$/, "")
          .trim());
      comments.set(name, parseGmlJsDoc(lines));
    }
  }
  return comments;
}

export function mapGmlJsDocType(rawType?: string): string {
  const raw = rawType?.trim();
  if (!raw) return "any";
  const union = splitTypeUnion(raw);
  if (union.length > 1) {
    return [...new Set(union.map(mapGmlJsDocType))].join(" | ");
  }
  const array = /^array\s*<(.+)>$/i.exec(raw);
  if (array) return `Array<${mapGmlJsDocType(array[1])}>`;
  const bracketArray = /^(.+)\[\]$/.exec(raw);
  if (bracketArray) return `Array<${mapGmlJsDocType(bracketArray[1])}>`;
  const enumeration = /^enum\.([$A-Z_a-z][$\w]*)$/i.exec(raw);
  if (enumeration) return enumeration[1]!;

  const lower = raw.toLowerCase().replace(/\s+/g, "");
  const namespaced = namespacedTypes.get(lower);
  if (namespaced) return namespaced;
  if (lower.endsWith("*")) return "any";
  if (["real", "number", "int", "integer", "constant"].includes(lower)) return "number";
  if (["bool", "boolean"].includes(lower)) return "boolean";
  if (lower === "string") return "string";
  if (lower === "undefined") return "undefined";
  if (["any", "mixed", "variable"].includes(lower)) return "any";
  if (lower === "array") return "GMValue[]";
  if (["struct", "object"].includes(lower)) return "GMStruct";
  if (["function", "method"].includes(lower)) return "GMFunction";
  if (lower === "instance") return "GM.Id.Instance";
  if (lower === "asset") return "GM.AssetReference";
  if (lower === "id") return "number";
  if (lower === "pointer") return "GM.PointerReference";
  if (lower === "macro") return "GMValue";
  return "any";
}

function parseGmlJsDoc(lines: readonly string[]): GmlJsDoc {
  const description: string[] = [];
  const parameters: GmlJsDocParameter[] = [];
  let returnType: string | undefined;
  let returnDescription: string | undefined;
  let active: "description" | "parameter" | "return" = "description";

  for (const line of lines) {
    const descriptionMatch = /^@(?:desc|description)\s*(.*)$/i.exec(line);
    if (descriptionMatch) {
      if (descriptionMatch[1]) description.push(descriptionMatch[1]);
      active = "description";
      continue;
    }
    const parameterMatch = /^@param(?:eter)?\s+(?:\{([^}]+)\}\s*)?(\[[^\]]+\](?:\s*=\s*\S+)?|[$A-Z_a-z][$\w]*)?\s*(.*)$/i.exec(line);
    if (parameterMatch) {
      const name = (parameterMatch[2] ?? `argument${parameters.length}`)
        .replace(/^\[/, "")
        .replace(/\].*$/, "")
        .replace(/=.*/, "");
      const parameter: GmlJsDocParameter = { name };
      if (parameterMatch[1]?.trim()) parameter.type = parameterMatch[1].trim();
      if (parameterMatch[3]?.trim()) parameter.description = parameterMatch[3].trim();
      parameters.push(parameter);
      active = "parameter";
      continue;
    }
    const returnMatch = /^@returns?\s*(?:\{([^}]+)\})?\s*(.*)$/i.exec(line);
    if (returnMatch) {
      if (returnMatch[1]?.trim()) returnType = returnMatch[1].trim();
      if (returnMatch[2]?.trim()) returnDescription = returnMatch[2].trim();
      active = "return";
      continue;
    }
    if (!line || line.startsWith("@")) continue;
    if (active === "description") description.push(line);
    else if (active === "parameter" && parameters.length > 0) {
      const parameter = parameters.at(-1)!;
      parameter.description = [parameter.description, line].filter(Boolean).join(" ");
    } else if (active === "return") {
      returnDescription = [returnDescription, line].filter(Boolean).join(" ");
    }
  }

  const result: GmlJsDoc = { parameters };
  if (description.length > 0) result.description = description.join("\n");
  if (returnType) result.returnType = returnType;
  if (returnDescription) result.returnDescription = returnDescription;
  return result;
}

function splitTypeUnion(type: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < type.length; index += 1) {
    const character = type[index];
    if (character === "<" || character === "[" || character === "(") depth += 1;
    else if (character === ">" || character === "]" || character === ")") depth -= 1;
    else if ((character === "," || character === "|") && depth === 0) {
      parts.push(type.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(type.slice(start).trim());
  return parts.filter(Boolean);
}
