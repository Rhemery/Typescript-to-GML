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
    return other.value;
};
