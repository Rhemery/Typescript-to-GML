import path from "node:path";

export const projectTypesInclude = "../datafiles/ts2gml/types/**/*.d.ts";

export function getProjectTypesDirectory(projectDirectory: string): string {
  return path.join(projectDirectory, "datafiles", "ts2gml", "types");
}
