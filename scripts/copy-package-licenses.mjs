import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

export async function copyPackageLicenses(destinationDirectory) {
  await fs.mkdir(destinationDirectory, { recursive: true });
  for (const [packageName, licenseFiles] of [
    ["typescript", ["LICENSE.txt", "ThirdPartyNoticeText.txt"]],
    ["json5", ["LICENSE.md"]],
    ["fast-xml-parser", ["LICENSE"]],
    ["strnum", ["LICENSE"]],
  ]) {
    let packageDirectory = path.dirname(require.resolve(packageName));
    while (path.dirname(packageDirectory) !== packageDirectory) {
      try {
        const metadata = JSON.parse(
          await fs.readFile(path.join(packageDirectory, "package.json"), "utf8"),
        );
        if (metadata.name === packageName) break;
      } catch {
        // Continue toward the package root.
      }
      packageDirectory = path.dirname(packageDirectory);
    }
    for (const licenseFile of licenseFiles) {
      await fs.copyFile(
        path.join(packageDirectory, licenseFile),
        path.join(destinationDirectory, `${packageName}-${licenseFile}`),
      );
    }
  }
}
