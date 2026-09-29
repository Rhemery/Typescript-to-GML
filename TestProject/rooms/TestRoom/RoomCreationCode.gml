{
    var __ts2gml_env_114 = { __ts2gml_capture_40: undefined };
    exception_unhandled_handler(function (exception) {
        show_debug_message(string_concat("TS2GML_SCOPE_CONTEXT_ERROR: ", exception.longMessage));
        game_end(1);
    });
}
__ts2gml_env_114.__ts2gml_capture_40 = 2;
var readRoom = method({ __ts2gml_env_114: __ts2gml_env_114, __ts2gml_closure: true }, function () {
    var __ts2gml_env_114 = self.__ts2gml_env_114;
    return __ts2gml_env_114.__ts2gml_capture_40;
});
__ts2gml_env_114.__ts2gml_capture_40 = 4;
scopeContextExpect("closure room creation locals", readRoom(), 4);
closureContractRun();
enumContractRun();
loweringMatrixRun();
scopeContextExpect("room self", self, self);
instance_create_depth(0, 0, 0, obj_scope_runner);
