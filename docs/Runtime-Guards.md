# Runtime type guards

TypeScript proves types while compiling, but values entering from GameMaker or untyped GML can still have the wrong runtime shape. The project compiler emits targeted GML guards for those boundaries. Guard behavior is configured in `ts2gml.config.json` beside the `.yyp`; source-code macros are not used as configuration.

Initialization creates this default configuration. If the file is absent, both profiles still default to `standard`.

```json
{
  "runtimeGuards": {
    "run": "standard",
    "build": "standard",
    "configurations": {}
  }
}
```

The levels are:

| Level | Behavior |
| --- | --- |
| `off` | Emits no runtime checks. TypeScript checking still runs. |
| `standard` | Emits checks for explicit typed context assertions such as `gm_self<obj_player>()` and `gm_other<obj_enemy>()`. |
| `maximum` | Includes standard checks and emits validation around values inserted through typed array and compiler collection mutation methods. |

Standard context checks are hoisted to the start of the containing function, method, event, or inline `gm_with` action. Repeating `gm_self<obj_player>()` in that scope produces one check for that context/type pair, not one check per use. An untyped `gm_self()` or `gm_other()` remains a bare context access without a guard.

A typed context guard must resolve to one concrete authored GameMaker object class. A generic type parameter, object union, or structural interface has no single GameMaker asset to test and is rejected; omit the type argument when an intentionally dynamic context cannot be checked.

Maximum mode guards `.push()` and `.unshift()` on typed arrays, along with value-changing methods on `List`, `Map`, `Set`, `Grid`, `Queue`, `Stack`, and `PriorityQueue`. Reifiable primitives, literals, unions, nested arrays, authored GameMaker objects, and ordinary constructor instances are supported. Deep array validation deliberately costs more and is reserved for maximum mode. Types with no sound GML runtime representation, such as `any`, `unknown`, or arbitrary structural interfaces, remain compile-time-only.

## Separate run and build profiles

`run` controls testing from GameMaker or watch-mode output. `build` controls an explicit compiler build and GameMaker package builds. This makes configurations such as maximum checks while testing and standard or disabled checks in a shipped package possible:

```json
{
  "runtimeGuards": {
    "run": "maximum",
    "build": "off",
    "configurations": {
      "Debug": {
        "run": "maximum",
        "build": "standard"
      },
      "Release": {
        "run": "standard",
        "build": "off"
      }
    }
  }
}
```

Entries under `configurations` use GameMaker configuration names. Either `run` or `build` may be omitted to inherit the profile's base level. Names cannot contain whitespace or a colon.

The selected level is applied while TypeScript is lowered. Generated GML contains the requested checks directly: there is no per-use level test and no runtime guard-level macro. In `off`, the guard calls are absent; in `maximum`, collection values are passed directly through the generated type-checking helper.

## GameMaker compiler hooks

The first successful build generates `pre_project_step`, `pre_run_step`, and `pre_build_step` hooks in both `.bat` and `.sh` forms beside the `.yyp`. The project hook recompiles the TypeScript lowering before GameMaker loads the generated GML, selecting `run` when no package target is present and `build` for a package target. The later operation-specific hooks verify the same selection. Because GameMaker invokes the build hook after the run hook during F5, the hooks use a short-lived marker to retain the run profile for that test invocation.

Changing levels updates only generated code bodies when the project structure is unchanged. This timing matters: `pre_run_step` and `pre_build_step` alone occur after GameMaker loads project sources, so `pre_project_step` performs the effective in-place rewrite for the current build.

The pre-project hook also applies pending structural changes to the saved project, including fields, events, resources, source folders, and room creation-code links. Save GameMaker and use Run or Build; no separate watcher confirmation or `build --project-saved` command is needed for that build. IDE-owned object settings and manual variables are merged as in a normal confirmed build. The later hooks still reject structural changes because the asset compiler has already loaded the project. A new package build discards any leftover run marker before selecting its build profile.

These hook names are part of GameMaker's documented [compiler batch-file and shell-script interface](https://manual.gamemaker.io/lts/en/Settings/Runner_Details/Compiler_Batch_Files.htm). They are compiler-owned and recorded in `.ts2gml/manifest.json`. If a project already owns one of these hook files, ts2gml stops instead of overwriting it; relocate the existing logic to an extension hook or another build integration before rebuilding.

Changing `ts2gml.config.json` takes effect on the next GameMaker Run or Build. The hooks match configured GameMaker configuration names against the compiler environment. For command-line workflows, pass `--configuration NAME` to `build` or `watch`; `TS2GML_CONFIGURATION=NAME` is also recognized by the internal hook command. Without a matching override, the base `run` or `build` level is used.

`watch` emits the run profile, while the normal `build` command emits the build profile.
