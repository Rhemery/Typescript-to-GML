{
    var __ts2gml_env_64 = { __ts2gml_capture_9: undefined, __ts2gml_capture_10: undefined };
    __ts2gml_env_64.__ts2gml_capture_9 = other;
}
__ts2gml_env_64.__ts2gml_capture_10 = 2;
self.capturedCollisionReader = method({ __ts2gml_env_64: __ts2gml_env_64, __ts2gml_closure: true }, function () {
    var __ts2gml_env_64 = self.__ts2gml_env_64;
    return __ts2gml_env_64.__ts2gml_capture_9.value + __ts2gml_env_64.__ts2gml_capture_10;
});
var value = 2;
scopeContextExpect("collision self/local", self.value + value, 56);
scopeContextExpect("collision other", other.value, 26);
self.collisionContextPassed = true;
