# Compiler diagnostic catalog

Generated from compiler diagnostic call sites by `npm run docs:diagnostics`. Dynamic values are shown as …; source ranges and actionable suggestions are included in CLI/editor output.

This inventories stable compiler codes, not an exhaustive compatibility or execution-coverage claim. Ordinary type diagnostics retain their TypeScript TS codes.

| Code | Message templates |
| --- | --- |
| TS2GML1001 | ES module imports are not supported; GameMaker declarations are global. |
| TS2GML1002 | Async and generator control flow has no direct GML equivalent. |
| TS2GML1003 | Spread syntax is only supported in arrays and function calls. |
| TS2GML1004 | Destructuring parameters are not supported yet. |
| TS2GML1005 | Destructuring assignments are not supported yet; use a declaration. |
| TS2GML1006 | Destructuring is not supported in this position. |
| TS2GML1007 | Optional calls cannot preserve deferred argument evaluation in GML. |
| TS2GML1008 | Optional element access cannot preserve deferred key evaluation in GML. |
| TS2GML1009 | Async iteration has no direct GML equivalent. |
| TS2GML1010 | delete requires a property, collection key, or collection index. |
| TS2GML1011 | Async functions are not supported. |
| TS2GML1012 | Regular expressions are not supported by GML. |
| TS2GML1013 | Bigint literals are not supported by GML. |
| TS2GML1014 | … function captures local variable '…', but GML functions do not capture surrounding locals. |
| TS2GML1015 | Arrow functions that capture the enclosing 'arguments' object are not supported. |
| TS2GML1016 | Arrow functions that capture 'super' are not supported. |
| TS2GML1017 | new.target has no GML equivalent. |
| TS2GML1018 | An arrow function cannot preserve lexical 'this' without a known object or struct context.<br>Top-level 'this' has no stable GML object context. |
| TS2GML1020 | A function's call-site 'this' binding cannot be preserved by a bound GML method. |
| TS2GML1021 | Tagged template expressions are not supported by GML. |
| TS2GML1022 | Dynamic imports are not supported. |
| TS2GML1023 | import.meta has no GML equivalent. |
| TS2GML1024 | JavaScript private fields are not supported by GML. |
| TS2GML1025 | Class expressions cannot be represented as GML constructors. |
| TS2GML1026 | Rest parameters are not supported. |
| TS2GML1027 | Object-literal method shorthand is not supported. |
| TS2GML1028 | Object-literal accessors are not supported by GML. |
| TS2GML1029 | Computed property names are not supported in this position. |
| TS2GML1030 | TypeScript enums and namespaces do not have a safe JavaScript-to-GML lowering. |
| TS2GML1031 | using declarations are not supported by GML. |
| TS2GML1032 | Decorators are not supported. |
| TS2GML1033 | JavaScript runtime global '…' has no GML lowering. |
| TS2GML1034 | Math.… does not have a GML lowering. |
| TS2GML1035 | console.… does not have a GML lowering. |
| TS2GML1036 | Computed access on JavaScript … has no GML lowering. |
| TS2GML1037 | gm_macro is a compiler intrinsic and cannot be used as a runtime value.<br>gm_macro must initialize a top-level const declaration. |
| TS2GML1038 | A GameMaker macro must have a valid identifier name. |
| TS2GML1039 | gm_macro expects a raw GML string and an optional configuration override object. |
| TS2GML1040 | The gm_macro value must be a string literal containing raw GML.<br>A GameMaker macro configuration value must be a string literal containing raw GML. |
| TS2GML1041 | GameMaker macro configuration overrides must be an object literal.<br>Each GameMaker macro configuration override must be a named string property. |
| TS2GML1042 | A GameMaker configuration name cannot be empty or contain whitespace or a colon.<br>GameMaker macro configuration '…' is specified more than once. |
| TS2GML1043 | A GameMaker macro value cannot be empty.<br>A GameMaker macro value must fit on one source line. |
| TS2GML1044 | gm_with must be used as a standalone statement.<br>gm_with expects a target and an inline arrow-function block.<br>The gm_with action must be an arrow function with a block body.<br>The gm_with action accepts at most self and other parameters.<br>gm_with action parameters must be plain required identifiers.<br>A return inside gm_with would return from the enclosing GML function or event.<br>Nested functions inside gm_with are not supported. |
| TS2GML1045 | … is a type-only assertion and does not accept runtime arguments. |
| TS2GML1046 | Labeled statements have no GML equivalent.<br>Labeled break and continue have no GML equivalent. |
| TS2GML1047 | GML assignments cannot be used as expression values. |
| TS2GML1048 | Only a direct super(...) constructor call can be lowered to GML. |
| TS2GML1049 | Block-scoped '…' shadows another local, but GML locals are function-scoped. |
| TS2GML1050 | Nested class declarations cannot be lowered to GML constructors. |
| TS2GML1052 | JavaScript operator '…' has no safe GML lowering. |
| TS2GML1053 | Unsigned right shift has no GML equivalent. |
| TS2GML1054 | The JavaScript comma operator has no GML equivalent. |
| TS2GML1055 | Increment and decrement cannot be used as expression values in GML. |
| TS2GML1056 | Binding '…' uses the compiler's reserved internal prefix.<br>Local binding '…' shadows a compiler intrinsic.<br>Class member '…' conflicts with a compiler intrinsic. |
| TS2GML1057 | Generator functions are not supported, even when they contain no yield expression. |
| TS2GML1058 | JavaScript debugger statements have no GML equivalent. |
| TS2GML1059 | … cannot be emitted inside a GML finally block. |
| TS2GML1060 | JavaScript class static blocks have no GML equivalent.<br>JavaScript auto-accessor fields are not supported by GML constructors. |
| TS2GML1061 | Default export expressions have no GML module equivalent.<br>Runtime re-exports are not supported; GameMaker declarations are global. |
| TS2GML1062 | Anonymous default-exported functions cannot become global GML script functions. |
| TS2GML1063 | Identifier '…' is not a valid GML name.<br>Local binding '…' conflicts with a reserved GML name. |
| TS2GML1064 | The … runtime guard needs one concrete GameMaker object type.<br>GML struct literal keys must be identifier names. |
| TS2GML1065 | Spread arguments cannot be emitted in a GML parent-constructor clause. |
| TS2GML1066 | JavaScript 'arguments' has no GML equivalent. |
| TS2GML1067 | Top-level variable '…' must be accessed through explicit GameMaker global scope. |
| TS2GML1068 | Binding '…' conflicts with a GameMaker function, constant, or asset name. |
| TS2GML1069 | Coercive equality has no supported JavaScript-compatible GML lowering. |
| TS2GML1070 | A numeric literal must be finite. |
| TS2GML2001 | Anonymous classes cannot become GML constructors. |
| TS2GML2002 | A static member receiver cannot mix class and instance types.<br>Static member element access requires a literal GML member name. |
| TS2GML2003 | Class accessors are not supported yet. |
| TS2GML2004 | Computed and non-identifier class member names are not supported. |
| TS2GML2005 | A GML parent constructor must be referenced by a direct identifier. |
| TS2GML2006 | GML always runs the parent constructor before the child constructor body. |
| TS2GML2007 | A derived GML constructor must contain exactly one direct super(...) statement. |
| TS2GML2008 | … classes require GameMaker project-aware asset generation. |
