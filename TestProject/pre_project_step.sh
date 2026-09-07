#!/bin/sh
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
node "$SCRIPT_DIR/datafiles/ts2gml/cli.cjs" guard-profile auto "$SCRIPT_DIR"/'TestProject.yyp'
