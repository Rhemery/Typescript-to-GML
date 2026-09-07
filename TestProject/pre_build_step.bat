@echo off
node "%~dp0datafiles\ts2gml\cli.cjs" guard-profile build "%~dp0TestProject.yyp"
exit /b %ERRORLEVEL%
