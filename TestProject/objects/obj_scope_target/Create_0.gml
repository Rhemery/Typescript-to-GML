self.invoke = function(_callback) {
    return _callback();
};
self.fromParameter = function(_value) {
    return self.value + _value;
};
self.fromLocal = function() {
    var value = 3;
    return self.value + value;
};
self.callerValue = function() {
    __ts2gml_guard_object(other, obj_scope_target, "other");
    return other.value;
};
self.extractedCallerValue = function() {
    __ts2gml_guard_object(other, obj_scope_runner, "other");
    return other.value;
};
