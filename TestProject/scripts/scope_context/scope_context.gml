global.closureGlobalFactory = function (__ts2gml_capture_1_parameter) {
    var __ts2gml_env_1 = { __ts2gml_capture_1: __ts2gml_capture_1_parameter };
    return method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_closure: true }, function () {
        var __ts2gml_env_1 = self.__ts2gml_env_1;
        return __ts2gml_env_1.__ts2gml_capture_1;
    });
};

global.closureGlobalRead = global.closureGlobalFactory(17);

// These locals share the script's initialization scope and are not globals.
var startupValue = 10;

var __ts2gml_destructure_223_1 = [startupValue, 4], startupFirst = 0 < array_length(__ts2gml_destructure_223_1) ? __ts2gml_destructure_223_1[0] : undefined, startupSecond = 1 < array_length(__ts2gml_destructure_223_1) ? __ts2gml_destructure_223_1[1] : undefined;

startupValue += startupSecond;

var startupSnapshot = { value: startupValue };

scopeContextExpect("top-level local initializer", startupFirst, 10);

scopeContextExpect("top-level local mutation", startupSnapshot.value, 14);

scopeContextExpect("top-level local stays private", variable_global_exists("startupValue") != 0, false);

function scopeContextExpect(label, actual, expected) {
    if (!__ts2gml_value_equal(actual, expected)) {
        throw string_concat("scope context '", label, "' expected ", expected, ", received ", actual);
    }
}

function scopeContextAdd(value) {
    var increment = 2;
    return value + increment;
}

function ScopeContextStruct(_value) constructor {
    self.value = 10;
    self.initialValue = self.value;
    self.callerValue = __ts2gml_guard_object(other, obj_scope_runner, "other").value;
    static fromParameter = function(_value) {
        return self.value + _value;
    };
    static fromLocal = function() {
        var value = 2;
        return self.value + value;
    };
    static makeReader = function() {
        return method(self, function () { return self.value; });
    };
    static identity = function() {
        return self;
    };
    self.value = _value;
}

method(__ts2gml_class_statics(obj_scope_target, true), function() {
    self.increment = method(undefined, function() {
        __ts2gml_class_statics(self.__ts2gml_class).total += 1;
        return variable_struct_get(__ts2gml_class_statics(self.__ts2gml_class), "total");
    });
    self.identity = method(undefined, function() {
        return self.__ts2gml_class;
    });
    self.total = 5;
})();
