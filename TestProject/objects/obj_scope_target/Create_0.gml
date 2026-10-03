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
self.capturedReader = function(__ts2gml_capture_2_parameter) {
    var __ts2gml_env_23 = { __ts2gml_capture_2: __ts2gml_capture_2_parameter };
    return method({ __ts2gml_env_23: __ts2gml_env_23, __ts2gml_closure: true }, function () {
        var __ts2gml_env_23 = self.__ts2gml_env_23;
        return __ts2gml_env_23.__ts2gml_capture_2;
    });
};
self.deepCaptured = function(__ts2gml_capture_3_parameter) {
    var __ts2gml_env_25_self = method_get_self(function () { });
    var __ts2gml_env_25 = { __ts2gml_capture_3: __ts2gml_capture_3_parameter };
    return method({ __ts2gml_env_25: __ts2gml_env_25, __ts2gml_receiver: __ts2gml_env_25_self, __ts2gml_closure: true }, function () {
        var __ts2gml_env_25 = self.__ts2gml_env_25;
        with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
            var __ts2gml_env_26_self = method_get_self(function () { });
            return method({ __ts2gml_env_25: __ts2gml_env_25, __ts2gml_receiver: __ts2gml_env_26_self, __ts2gml_closure: true }, function () {
                var __ts2gml_env_25 = self.__ts2gml_env_25;
                with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                    var __ts2gml_env_27_self = method_get_self(function () { });
                    return method({ __ts2gml_env_25: __ts2gml_env_25, __ts2gml_receiver: __ts2gml_env_27_self, __ts2gml_closure: true }, function () {
                        var __ts2gml_env_25 = self.__ts2gml_env_25;
                        with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                            var __ts2gml_env_28_self = method_get_self(function () { });
                            return method({ __ts2gml_env_25: __ts2gml_env_25, __ts2gml_receiver: __ts2gml_env_28_self, __ts2gml_closure: true }, function () {
                                var __ts2gml_env_25 = self.__ts2gml_env_25;
                                with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                                    var __ts2gml_env_29_self = method_get_self(function () { });
                                    return method({ __ts2gml_env_25: __ts2gml_env_25, __ts2gml_receiver: __ts2gml_env_29_self, __ts2gml_closure: true }, function () {
                                        var __ts2gml_env_25 = self.__ts2gml_env_25;
                                        with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                                            var __ts2gml_env_30_self = method_get_self(function () { });
                                            return method({ __ts2gml_env_25: __ts2gml_env_25, __ts2gml_receiver: __ts2gml_env_30_self, __ts2gml_closure: true }, function () {
                                                var __ts2gml_env_25 = self.__ts2gml_env_25;
                                                with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                                                    var __ts2gml_env_31_self = method_get_self(function () { });
                                                    return method({ __ts2gml_env_25: __ts2gml_env_25, __ts2gml_receiver: __ts2gml_env_31_self, __ts2gml_closure: true }, function () {
                                                        var __ts2gml_env_25 = self.__ts2gml_env_25;
                                                        with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                                                            var __ts2gml_env_32_self = method_get_self(function () { });
                                                            return method({ __ts2gml_env_25: __ts2gml_env_25, __ts2gml_receiver: __ts2gml_env_32_self, __ts2gml_closure: true }, function () {
                                                                var __ts2gml_env_25 = self.__ts2gml_env_25;
                                                                with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                                                                    return __ts2gml_guard_object(self, obj_scope_target, "self").value + __ts2gml_env_25.__ts2gml_capture_3;
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
};
self.nativeCaptured = function(__ts2gml_capture_4_parameter) {
    var __ts2gml_env_34_self = method_get_self(function () { });
    var __ts2gml_env_34 = { __ts2gml_capture_4: __ts2gml_capture_4_parameter };
    return method({ __ts2gml_env_34: __ts2gml_env_34, __ts2gml_receiver: __ts2gml_env_34_self, __ts2gml_closure: true }, function () {
        var __ts2gml_env_34 = self.__ts2gml_env_34;
        with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
            x += __ts2gml_env_34.__ts2gml_capture_4;
            return x;
        }
    });
};
self.throwingCaptured = function(__ts2gml_capture_5_parameter) {
    var __ts2gml_env_36_self = method_get_self(function () { });
    var __ts2gml_env_36_lexical = self;
    var __ts2gml_env_36 = { __ts2gml_capture_5: __ts2gml_capture_5_parameter };
    return method({ __ts2gml_env_36: __ts2gml_env_36, __ts2gml_receiver: __ts2gml_env_36_self, __ts2gml_this: __ts2gml_env_36_lexical, __ts2gml_closure: true }, function () {
        var __ts2gml_env_36 = self.__ts2gml_env_36;
        var __ts2gml_env_37_this = self.__ts2gml_this;
        with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
            var result = __ts2gml_env_37_this.value + __ts2gml_env_36.__ts2gml_capture_5;
            throw result;
        }
    });
};
self.otherFactory = function(__ts2gml_capture_6_parameter) {
    var __ts2gml_env_38_self = method_get_self(function () { });
    var __ts2gml_env_38 = { __ts2gml_capture_6: __ts2gml_capture_6_parameter };
    return method({ __ts2gml_env_38: __ts2gml_env_38, __ts2gml_receiver: __ts2gml_env_38_self, __ts2gml_closure: true }, function () {
        var __ts2gml_env_38 = self.__ts2gml_env_38;
        with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
            __ts2gml_env_38.__ts2gml_capture_6 += 1;
            return function () {
                return other.id;
            };
        }
    });
};
self.plainOtherFactory = function() {
    return function () {
        return other.id;
    };
};
self.argumentContexts = function(_callback) {
    var expectedOther = other.id;
    scopeContextExpect("spread callback argument keeps native other", (function (__ts2gml_unused, _callback) {
        var __ts2gml_callable = _callback;
        var __ts2gml_arguments = array_concat([], [other.id]);
        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
    })(undefined, _callback), expectedOther);
    var callbacks = [_callback];
    scopeContextExpect("indexed callback argument keeps native other", (function (__ts2gml_unused, callbacks) {
        var __ts2gml_receiver = callbacks;
        var __ts2gml_key = 0;
        var __ts2gml_method = __ts2gml_value_get(__ts2gml_receiver, __ts2gml_key);
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, [other.id]);
    })(undefined, callbacks), expectedOther);
    scopeContextExpect("indirect callback argument keeps native self", (function (__ts2gml_unused, callbacks) {
        var __ts2gml_receiver = callbacks;
        var __ts2gml_key = 0;
        var __ts2gml_method = __ts2gml_value_get(__ts2gml_receiver, __ts2gml_key);
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, [self.id]);
    })(undefined, callbacks), self.id);
};
self.checkedInvoke = function(_callback) {
    var expectedSelf = self.id;
    var expectedOther = other.id;
    try {
        return _callback();
    }
    finally {
        scopeContextExpect("callback restores caller self", self.id, expectedSelf);
        scopeContextExpect("callback restores caller other", other.id, expectedOther);
    }
};
