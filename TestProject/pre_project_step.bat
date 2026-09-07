@echo off
node "%~dp0datafiles\ts2gml\cli.cjs" guard-profile auto "%~dp0TestProject.yyp"
exit /b %ERRORLEVEL%
