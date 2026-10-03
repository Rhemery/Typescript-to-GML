# Compatibility and verification

| Component | Declared contract | Execution evidence |
| --- | --- | --- |
| CLI/tooling | Node 22+, Windows and Linux portable checks | CI matrix: Node 22/24 on both systems. This implementation session uses Windows, Node 24.1.0. |
| TypeScript libraries | Separate TypeScript 5.9.x installation; project-local, global `tsc` on `PATH`, or `TS2GML_TYPESCRIPT_LIB` | The YYMPS contains no TypeScript standard-library declarations. Library versions must match the bundled engine's major/minor version. |
| GameMaker | Windows VM, runtime 2026.0.0.23 | `npm run verify` includes Igor compilation and the executable integration fixture. |
| IDE/package metadata | GameMaker IDE 2026.0.0.16 | Deterministic YYMPS structure checks; interactive import remains a release check. |
| Editor | VS Code 1.134+, extension 0.2.8, project compiler with diagnostic protocol 1 | Protocol/packaged metadata tests. See [implementation status](Implementation-Status.md#verification) for CLI upgrade evidence; interactive extension-host checks remain. |
| Other GameMaker targets | Unclaimed | YYC, HTML5, mobile, console, and other desktop runners need their own executed fixtures. |

The smoke runner uses the same runtime selection as declaration generation. `GAMEMAKER_PROJECT`, `GAMEMAKER_RUNTIME_PATH`, `GAMEMAKER_IGOR`, `GAMEMAKER_RUNNER`, and `GAMEMAKER_USER_DIR` allow explicit test installations. `GAMEMAKER_TARGET=windows` and `GAMEMAKER_COMPILER=VM` identify the supported combination; other combinations fail clearly until a target runner exists.

A successful runtime run records exact versions in ignored `output/gamemaker-verification.json`. Require a passing Windows VM run for the exact release candidate, plus YYMPS import and VSIX upgrade checks, before publication. Portable CI alone does not establish GameMaker execution compatibility. The hosted artifact workflow builds packages; it does not publish them or supply a licensed GameMaker installation.

## Feedback measurements

`npm run benchmark` measures three project checks and synthetic 100/500-function inputs, recording `output/benchmark.json`. On this Windows/Node 24.1.0 session, the five-source-file integration project took 1,381 / 1,039 / 894 ms; synthetic inputs took 343 / 660 ms. Generated integration GML totaled 63,740 bytes. These are local baselines, not performance guarantees. Program reuse, watch latency on larger games, and helper-size optimization remain measurement-driven follow-up work.

## Upgrading a game

1. Save GameMaker and commit the game, including TypeScript, generated resources, maps, and the manifest.
2. Replace the project's `datafiles/ts2gml/` with the new distribution. Keep `typescript/`, `ts2gml.config.json`, and `.ts2gml/manifest.json`.
3. Run `init`, then `doctor`, then `build --project-saved` using the updated local CLI.
4. Review generated changes, run the game, and install the corresponding VSIX. Runtime declarations are regenerated locally from the selected runtime.

Beta.5 requires explicit array sort comparators and rejects coercive equality. Review null-sensitive code: null now has a distinct pointer-null representation. Pin the compiler per game; editor checks report that local compiler's version.

Starting with beta.6, install TypeScript 5.9.x before upgrading; the distribution omits `datafiles/ts2gml/typescript/`. Older copied libraries are no longer used; replacing the entire tool directory removes them. The compiler does not delete unrecorded files left by an older package import. Remove obsolete library Included File entries in GameMaker too; see [upgrade instructions](Getting-Started.md#upgrade-the-tool). Restart watch mode after installing or switching the external TypeScript libraries.

## Watch dependencies

| Input changed | Queued work |
| --- | --- |
| Authored `.ts`, `.tsx`, `.d.ts` | Project recheck and build |
| `typescript/tsconfig*.json` | Project recheck and build |
| `ts2gml.config.json`, runtime selection, distributed declarations | Project recheck and build |
| `.yyp` or unmanaged `.gml` | Refresh extracted declarations; recheck/build when declarations change |

Changes to resource structure still require the existing saved-project confirmation. Custom tsconfig `extends` dependencies outside the watched project directory are not watched; restart the watcher after changing those files.
