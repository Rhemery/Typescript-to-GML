exception_unhandled_handler(function (exception) {
    show_debug_message(string_concat("TS2GML_SCOPE_CONTEXT_ERROR: ", exception.longMessage));
    game_end(1);
});
loweringMatrixRun();
scopeContextExpect("room self", self, self);
instance_create_depth(0, 0, 0, obj_scope_runner);
