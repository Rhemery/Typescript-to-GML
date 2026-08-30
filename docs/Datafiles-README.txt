TypeScript to GML beta

This is a beta, project-local TypeScript-to-GML compiler. Node.js 20 or newer is required.

From the GameMaker project directory, run:

  datafiles\ts2gml\ts2gml.bat init
  datafiles\ts2gml\ts2gml.bat check
  datafiles\ts2gml\ts2gml.bat build

Save GameMaker and run build --project-saved once after installation.
The package contains no GameMaker runtime declaration snapshot. The first project command generates the local API declarations from the active compatible GameMaker runtime's GmlSpec.xml, or from the exact path in GAMEMAKER_GML_SPEC.
If Beta, Stable, or LTS installations are equally compatible, run ts2gml.bat runtime and select the installation this project uses.

For normal development, open the game folder in Visual Studio Code, open Terminal > New Terminal, and run:

  .\datafiles\ts2gml\ts2gml.bat watch

Keep the terminal visible so save prompts and diagnostics are noticed immediately. Double-clicking ts2gml.bat is also supported and starts the same watcher. When a structural update is pending, save GameMaker and press Enter in the watcher terminal to apply it.

Keep authored code in the project's typescript directory. Keep the project under version control. Do not edit compiler-owned generated GML directly; move changes into TypeScript. Read the repository's docs/Known-Issues.md before using the beta in a serious project.

If the batch file cannot find Node.js, install Node.js 20+ and reopen the terminal.
