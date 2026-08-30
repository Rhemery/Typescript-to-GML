import { promises as fs } from "node:fs";
import path from "node:path";

const source = path.resolve("dist", "ts2gml");
const destination = path.resolve("TestProject", "datafiles", "ts2gml");
await fs.rm(destination, { recursive: true, force: true });
await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.cp(source, destination, { recursive: true });
