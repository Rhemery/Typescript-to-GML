function scopeContextExpect(label, actual, expected) {
    if (actual != expected) {
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
    self.callerValue = other.value;
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
