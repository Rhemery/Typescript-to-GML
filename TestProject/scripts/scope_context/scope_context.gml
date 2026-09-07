function scopeContextExpect(label, actual, expected) {
    if (__ts2gml_value_truthy(!__ts2gml_value_equal(actual, expected))) {
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
        return __ts2gml_class_statics(self.__ts2gml_class).total;
    });
    self.identity = method(undefined, function() {
        return self.__ts2gml_class;
    });
    self.total = undefined;
    self.total = 5;
})();
