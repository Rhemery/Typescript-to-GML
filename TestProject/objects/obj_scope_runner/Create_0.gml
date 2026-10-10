self.callerValue = function() {
    __ts2gml_guard_object(other, obj_scope_target, "other");
    return other.value;
};
self.checkMethodCaptures = function(_target) {
    var __ts2gml_env_68_self = method_get_self(function () { });
    var __ts2gml_env_68_lexical = self;
    var __ts2gml_env_68 = { __ts2gml_capture_11: undefined, __ts2gml_capture_12: undefined, __ts2gml_capture_14: undefined };
    var ownerId = self.id;
    __ts2gml_env_68.__ts2gml_capture_11 = instance_create_depth(700, 700, 0, obj_test_projectile);
    __ts2gml_env_68.__ts2gml_capture_11.direction = 0;
    __ts2gml_env_68.__ts2gml_capture_11.spd = 5;
    __ts2gml_env_68.__ts2gml_capture_11.on_step = __ts2gml_value_method(__ts2gml_env_68.__ts2gml_capture_11, method({ __ts2gml_env_68: __ts2gml_env_68, __ts2gml_receiver: __ts2gml_env_68_self, __ts2gml_closure: true }, function () {
        var __ts2gml_env_68 = self.__ts2gml_env_68;
        with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
            x += lengthdir_x(__ts2gml_env_68.__ts2gml_capture_11.spd, direction);
            y += lengthdir_y(__ts2gml_env_68.__ts2gml_capture_11.spd, direction);
        }
    }));
    self.reboundProjectile = __ts2gml_env_68.__ts2gml_capture_11;
    __ts2gml_env_68.__ts2gml_capture_12 = 0;
    var original = method({ __ts2gml_env_68: __ts2gml_env_68, __ts2gml_receiver: __ts2gml_env_68_self, __ts2gml_closure: true }, function () {
        var __ts2gml_env_68 = self.__ts2gml_env_68;
        with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
            __ts2gml_env_68.__ts2gml_capture_12 += 1;
            return x + __ts2gml_env_68.__ts2gml_capture_12;
        }
    });
    var left = { x: 100 };
    var right = { x: 200 };
    var first = __ts2gml_value_method(left, original);
    var second = __ts2gml_value_method(right, original);
    scopeContextExpect("method original receiver", original(), self.x + 1);
    scopeContextExpect("method first receiver and shared mutation", first(), 102);
    scopeContextExpect("method second receiver and shared mutation", second(), 203);
    scopeContextExpect("method leaves original receiver unchanged", original(), self.x + 4);
    var rebound = __ts2gml_value_method(right, first);
    scopeContextExpect("method repeated rebinding", rebound(), 205);
    var bind = __ts2gml_value_method;
    var aliased = bind(left, original);
    scopeContextExpect("method alias preserves captured variables", aliased(), 106);
    var spread = (function (__ts2gml_unused, right, original) {
        var __ts2gml_callable = __ts2gml_value_method;
        var __ts2gml_arguments = array_concat([], [right, original]);
        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
    })(undefined, right, original);
    scopeContextExpect("method spread call preserves captured variables", spread(), 207);
    scopeContextExpect("method clones bindings but shares capture cells", __ts2gml_env_68.__ts2gml_capture_12, 7);
    var factory = function (__ts2gml_env_71_parameter_1) {
        var __ts2gml_env_71_self = method_get_self(function () { });
        var __ts2gml_env_71 = { __ts2gml_capture_13: undefined };
        __ts2gml_env_71.__ts2gml_capture_13 = 3;
        var callback = method({ __ts2gml_env_71: __ts2gml_env_71, __ts2gml_receiver: __ts2gml_env_71_self, __ts2gml_closure: true }, function () {
            var __ts2gml_env_71 = self.__ts2gml_env_71;
            with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                return x + __ts2gml_env_71.__ts2gml_capture_13;
            }
        });
        return (function (__ts2gml_unused, __ts2gml_env_71_parameter_1, callback) {
            var __ts2gml_callable = __ts2gml_value_method;
            var __ts2gml_arguments = array_concat([], [__ts2gml_env_71_parameter_1, callback]);
            return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
        })(undefined, __ts2gml_env_71_parameter_1, callback);
    };
    var fromFactory = factory(right);
    scopeContextExpect("method spread helper retains renamed factory parameter", fromFactory(), 203);
    __ts2gml_env_68.__ts2gml_capture_14 = 7;
    var arrow = method({ __ts2gml_env_68: __ts2gml_env_68, __ts2gml_receiver: __ts2gml_env_68_self, __ts2gml_this: __ts2gml_env_68_lexical, __ts2gml_closure: true }, function () {
        var __ts2gml_env_68 = self.__ts2gml_env_68;
        var __ts2gml_env_73_this = self.__ts2gml_this;
        with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
            return __ts2gml_env_73_this.value + __ts2gml_env_68.__ts2gml_capture_14 + x;
        }
    });
    var arrowBound = __ts2gml_value_method(left, arrow);
    scopeContextExpect("method arrow lexical this separate from native self", arrowBound(), self.value + 107);
    var nested = __ts2gml_value_method(left, method({ __ts2gml_env_68: __ts2gml_env_68, __ts2gml_receiver: __ts2gml_env_68_self, __ts2gml_this: __ts2gml_env_68_lexical, __ts2gml_closure: true }, function () {
        var __ts2gml_env_68 = self.__ts2gml_env_68;
        var __ts2gml_env_74_this = self.__ts2gml_this;
        with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
            var __ts2gml_env_74_self = method_get_self(function () { });
            return method({ __ts2gml_env_68: __ts2gml_env_68, __ts2gml_receiver: __ts2gml_env_74_self, __ts2gml_this: __ts2gml_env_74_this, __ts2gml_closure: true }, function (__ts2gml_capture_15_parameter) {
                var __ts2gml_env_68 = self.__ts2gml_env_68;
                var __ts2gml_env_75_this = self.__ts2gml_this;
                with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                    var __ts2gml_env_75_self = method_get_self(function () { });
                    var __ts2gml_env_75 = { __ts2gml_capture_15: __ts2gml_capture_15_parameter };
                    return method({ __ts2gml_env_68: __ts2gml_env_68, __ts2gml_env_75: __ts2gml_env_75, __ts2gml_receiver: __ts2gml_env_75_self, __ts2gml_this: __ts2gml_env_75_this, __ts2gml_closure: true }, function () {
                        var __ts2gml_env_68 = self.__ts2gml_env_68;
                        var __ts2gml_env_75 = self.__ts2gml_env_75;
                        var __ts2gml_env_76_this = self.__ts2gml_this;
                        with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                            return __ts2gml_env_76_this.value + __ts2gml_env_68.__ts2gml_capture_14 + __ts2gml_env_75.__ts2gml_capture_15 + x;
                        }
                    });
                }
            });
        }
    }));
    var nestedRead = (function (__ts2gml_unused, nested) {
        var __ts2gml_callable = nested();
        var __ts2gml_arguments = [3];
        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
    })(undefined, nested);
    scopeContextExpect("method nested scopes retain lexical and native contexts", nestedRead(), self.value + 110);
    var pure = method({ __ts2gml_env_68: __ts2gml_env_68, __ts2gml_closure: true }, function () {
        var __ts2gml_env_68 = self.__ts2gml_env_68;
        return __ts2gml_env_68.__ts2gml_capture_14;
    });
    var pureBound = __ts2gml_value_method(_target, pure);
    scopeContextExpect("method pure closure retains captures", pureBound(), 7);
    var unboundPlain = __ts2gml_value_method(undefined, function () {
        return x;
    });
    var unboundCapture = __ts2gml_value_method(undefined, method({ __ts2gml_env_68: __ts2gml_env_68, __ts2gml_receiver: __ts2gml_env_68_self, __ts2gml_closure: true }, function () {
        var __ts2gml_env_68 = self.__ts2gml_env_68;
        with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
            return x + __ts2gml_env_68.__ts2gml_capture_14;
        }
    }));
    scopeContextExpect("method undefined uses calling instance", unboundCapture(), unboundPlain() + 7);
    var packet = { x: 400, plain: unboundPlain, captured: unboundCapture };
    scopeContextExpect("method undefined uses calling struct", packet.captured(), packet.plain() + 7);
    var fromSelf = function () { return 0; };
    var fromOther = function () { return 0; };
    with (_target) {
        var __ts2gml_with_self_11675_1 = self;
        var __ts2gml_with_other_11675_2 = other;
        fromSelf = __ts2gml_value_method(self, unboundCapture);
        fromOther = __ts2gml_value_method(other, unboundCapture);
    }
    scopeContextExpect("method resolves native self before saving environment", fromSelf(), _target.x + 7);
    scopeContextExpect("method resolves native other before saving environment", fromOther(), self.x + 7);
    var thrower = method({ __ts2gml_env_68: __ts2gml_env_68, __ts2gml_closure: true }, function () {
        var __ts2gml_env_68 = self.__ts2gml_env_68;
        __ts2gml_env_68.__ts2gml_capture_12 += 1;
        throw __ts2gml_env_68.__ts2gml_capture_14;
    });
    var throwingBound = __ts2gml_value_method(left, thrower);
    var caught = 0;
    try {
        _target.checkedInvoke(throwingBound);
    }
    catch (error) {
        caught = error;
    }
    scopeContextExpect("method exception preserves captured value", caught, 7);
    scopeContextExpect("method exception preserves shared mutation", __ts2gml_env_68.__ts2gml_capture_12, 8);
    scopeContextExpect("method exception restores caller context", self.id, ownerId);
    show_debug_message("TS2GML_METHOD_CLOSURE_OK");
};
self.checkWithCaptures = function(__ts2gml_capture_16_parameter) {
    var __ts2gml_env_84_self = method_get_self(function () { });
    var __ts2gml_env_84 = { __ts2gml_capture_16: __ts2gml_capture_16_parameter, __ts2gml_capture_19: undefined, __ts2gml_capture_20: undefined, __ts2gml_capture_30: undefined, __ts2gml_capture_32: undefined };
    __ts2gml_env_84.__ts2gml_capture_19 = self.id;
    __ts2gml_env_84.__ts2gml_capture_20 = __ts2gml_env_84.__ts2gml_capture_16.id;
    var originalX = __ts2gml_env_84.__ts2gml_capture_16.x;
    var originalY = __ts2gml_env_84.__ts2gml_capture_16.y;
    __ts2gml_env_84.__ts2gml_capture_30 = { projectile_speed: 5, direction: 0 };
    var install = method({ __ts2gml_env_84: __ts2gml_env_84, __ts2gml_receiver: __ts2gml_env_84_self, __ts2gml_closure: true }, function (__ts2gml_capture_17_parameter) {
        var __ts2gml_env_84 = self.__ts2gml_env_84;
        with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
            var __ts2gml_env_85 = { __ts2gml_capture_17: __ts2gml_capture_17_parameter };
            with (__ts2gml_env_84.__ts2gml_capture_16) {
                var __ts2gml_with_self_15757_1 = self;
                var __ts2gml_with_other_15757_2 = other;
                var __ts2gml_env_86_self = method_get_self(function () { });
                __ts2gml_with_self_15757_1.on_step = method({ __ts2gml_env_85: __ts2gml_env_85, __ts2gml_receiver: __ts2gml_env_86_self, __ts2gml_closure: true }, function () {
                    var __ts2gml_env_85 = self.__ts2gml_env_85;
                    with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                        x += lengthdir_x(__ts2gml_env_85.__ts2gml_capture_17.projectile_speed, __ts2gml_env_85.__ts2gml_capture_17.direction);
                        y += lengthdir_y(__ts2gml_env_85.__ts2gml_capture_17.projectile_speed, __ts2gml_env_85.__ts2gml_capture_17.direction);
                    }
                });
            }
            return method({ __ts2gml_env_85: __ts2gml_env_85, __ts2gml_closure: true }, function () {
                var __ts2gml_env_85 = self.__ts2gml_env_85;
                __ts2gml_env_85.__ts2gml_capture_17 = { projectile_speed: 9, direction: 0 };
            });
        }
    });
    var replaceWeapon = install(__ts2gml_env_84.__ts2gml_capture_30);
    var step = __ts2gml_env_84.__ts2gml_capture_16.on_step;
    step();
    scopeContextExpect("weapon parameter crosses with and factory lifetime", __ts2gml_env_84.__ts2gml_capture_16.x, originalX + 5);
    scopeContextExpect("weapon callback moves selected instance y", __ts2gml_env_84.__ts2gml_capture_16.y, originalY);
    __ts2gml_env_84.__ts2gml_capture_30.projectile_speed = 7;
    var copied = { x: 900, run: step };
    copied.run();
    scopeContextExpect("weapon mutation visible through copied callback", __ts2gml_env_84.__ts2gml_capture_16.x, originalX + 12);
    scopeContextExpect("weapon callback does not move foreign caller", copied.x, 900);
    replaceWeapon();
    method_call(step, []);
    scopeContextExpect("weapon parameter reassignment shared across with", __ts2gml_env_84.__ts2gml_capture_16.x, originalX + 21);
    __ts2gml_env_84.__ts2gml_capture_16.x = originalX;
    __ts2gml_env_84.__ts2gml_capture_16.y = originalY;
    with (__ts2gml_env_84.__ts2gml_capture_16) {
        var __ts2gml_with_self_15757_3 = self;
        var __ts2gml_with_other_15757_4 = other;
        var __ts2gml_env_89_self = method_get_self(function () { });
        var __ts2gml_env_89_lexical = __ts2gml_with_other_15757_4;
        var __ts2gml_env_89 = { __ts2gml_capture_18: undefined, __ts2gml_capture_21: __ts2gml_with_self_15757_3, __ts2gml_capture_22: __ts2gml_with_other_15757_4 };
        __ts2gml_env_89.__ts2gml_capture_18 = 3;
        __ts2gml_env_89.__ts2gml_capture_21.lexicalReader = method({ __ts2gml_env_89: __ts2gml_env_89, __ts2gml_env_84: __ts2gml_env_84, __ts2gml_receiver: __ts2gml_env_89_self, __ts2gml_this: __ts2gml_env_89_lexical, __ts2gml_closure: true }, function () {
            var __ts2gml_env_89 = self.__ts2gml_env_89;
            var __ts2gml_env_84 = self.__ts2gml_env_84;
            var __ts2gml_env_90_this = self.__ts2gml_this;
            with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                __ts2gml_env_89.__ts2gml_capture_18 += 1;
                scopeContextExpect("captured with callback lexical this", __ts2gml_env_90_this.id, __ts2gml_env_84.__ts2gml_capture_19);
                scopeContextExpect("captured with callback native self", self.id, __ts2gml_env_84.__ts2gml_capture_20);
                scopeContextExpect("captured with self parameter", __ts2gml_env_89.__ts2gml_capture_21.id, __ts2gml_env_84.__ts2gml_capture_20);
                scopeContextExpect("captured with other parameter", __ts2gml_env_89.__ts2gml_capture_22.id, __ts2gml_env_84.__ts2gml_capture_19);
                return __ts2gml_env_90_this.value + __ts2gml_env_89.__ts2gml_capture_18;
            }
        });
        __ts2gml_env_89.__ts2gml_capture_21.contextReader = method({ __ts2gml_env_89: __ts2gml_env_89, __ts2gml_closure: true }, function () {
            var __ts2gml_env_89 = self.__ts2gml_env_89;
            return __ts2gml_env_89.__ts2gml_capture_21.value + __ts2gml_env_89.__ts2gml_capture_22.value + __ts2gml_env_89.__ts2gml_capture_18;
        });
    }
    self.capturedWithReader = __ts2gml_env_84.__ts2gml_capture_16.lexicalReader;
    scopeContextExpect("with body local shared with stored arrow", self.capturedWithReader(), self.value + 4);
    scopeContextExpect("with body local shared with ordinary function", __ts2gml_env_84.__ts2gml_capture_16.contextReader(), __ts2gml_env_84.__ts2gml_capture_16.value + self.value + 4);
    with (__ts2gml_env_84.__ts2gml_capture_16) {
        var __ts2gml_with_self_15757_5 = self;
        var __ts2gml_with_other_15757_6 = other;
        var __ts2gml_env_92 = { __ts2gml_capture_23: __ts2gml_with_self_15757_5, __ts2gml_capture_27: undefined };
        __ts2gml_env_92.__ts2gml_capture_27 = 3;
        with (__ts2gml_with_other_15757_6) {
            var __ts2gml_with_self_15757_7 = self;
            var __ts2gml_with_other_15757_8 = other;
            var __ts2gml_env_93 = { __ts2gml_capture_24: __ts2gml_with_self_15757_7, __ts2gml_capture_28: undefined };
            __ts2gml_env_93.__ts2gml_capture_28 = 4;
            with (__ts2gml_with_other_15757_8) {
                var __ts2gml_with_self_15757_9 = self;
                var __ts2gml_with_other_15757_10 = other;
                var __ts2gml_env_94_self = method_get_self(function () { });
                var __ts2gml_env_94_lexical = __ts2gml_with_other_15757_6;
                var __ts2gml_env_94 = { __ts2gml_capture_25: __ts2gml_with_self_15757_9, __ts2gml_capture_26: __ts2gml_with_other_15757_10, __ts2gml_capture_29: undefined };
                __ts2gml_env_94.__ts2gml_capture_29 = 5;
                __ts2gml_env_94.__ts2gml_capture_25.readerFactory = method({ __ts2gml_env_92: __ts2gml_env_92, __ts2gml_env_84: __ts2gml_env_84, __ts2gml_env_93: __ts2gml_env_93, __ts2gml_env_94: __ts2gml_env_94, __ts2gml_receiver: __ts2gml_env_94_self, __ts2gml_this: __ts2gml_env_94_lexical, __ts2gml_closure: true }, function () {
                    var __ts2gml_env_92 = self.__ts2gml_env_92;
                    var __ts2gml_env_84 = self.__ts2gml_env_84;
                    var __ts2gml_env_93 = self.__ts2gml_env_93;
                    var __ts2gml_env_94 = self.__ts2gml_env_94;
                    var __ts2gml_env_95_this = self.__ts2gml_this;
                    with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                        var __ts2gml_env_95_self = method_get_self(function () { });
                        return method({ __ts2gml_env_92: __ts2gml_env_92, __ts2gml_env_84: __ts2gml_env_84, __ts2gml_env_93: __ts2gml_env_93, __ts2gml_env_94: __ts2gml_env_94, __ts2gml_receiver: __ts2gml_env_95_self, __ts2gml_this: __ts2gml_env_95_this, __ts2gml_closure: true }, function () {
                            var __ts2gml_env_92 = self.__ts2gml_env_92;
                            var __ts2gml_env_84 = self.__ts2gml_env_84;
                            var __ts2gml_env_93 = self.__ts2gml_env_93;
                            var __ts2gml_env_94 = self.__ts2gml_env_94;
                            var __ts2gml_env_96_this = self.__ts2gml_this;
                            with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                                scopeContextExpect("deep captured with outer alias", __ts2gml_env_92.__ts2gml_capture_23.id, __ts2gml_env_84.__ts2gml_capture_20);
                                scopeContextExpect("deep captured with middle alias", __ts2gml_env_93.__ts2gml_capture_24.id, __ts2gml_env_84.__ts2gml_capture_19);
                                scopeContextExpect("deep captured with inner alias", __ts2gml_env_94.__ts2gml_capture_25.id, __ts2gml_env_84.__ts2gml_capture_20);
                                scopeContextExpect("deep captured with caller alias", __ts2gml_env_94.__ts2gml_capture_26.id, __ts2gml_env_84.__ts2gml_capture_19);
                                scopeContextExpect("deep captured with lexical this", __ts2gml_env_96_this.id, __ts2gml_env_84.__ts2gml_capture_19);
                                scopeContextExpect("deep captured with native self", self.id, __ts2gml_env_84.__ts2gml_capture_20);
                                return __ts2gml_env_92.__ts2gml_capture_27 + __ts2gml_env_93.__ts2gml_capture_28 + __ts2gml_env_94.__ts2gml_capture_29 + __ts2gml_env_84.__ts2gml_capture_30.projectile_speed;
                            }
                        });
                    }
                });
            }
        }
    }
    var deepRead = __ts2gml_env_84.__ts2gml_capture_16.readerFactory();
    scopeContextExpect("captures survive three with scopes and nested functions", deepRead(), 19);
    var extra1 = instance_create_depth(400, 400, 0, obj_scope_target);
    var extra2 = instance_create_depth(500, 400, 0, obj_scope_target);
    var readers = [];
    __ts2gml_env_84.__ts2gml_capture_32 = 0;
    with (obj_scope_target) {
        var __ts2gml_with_self_15757_11 = self;
        var __ts2gml_with_other_15757_12 = other;
        var __ts2gml_env_97 = { __ts2gml_capture_31: undefined };
        __ts2gml_env_97.__ts2gml_capture_31 = 0;
        __ts2gml_collection_push(readers, [method({ __ts2gml_env_97: __ts2gml_env_97, __ts2gml_env_84: __ts2gml_env_84, __ts2gml_closure: true }, function () {
                var __ts2gml_env_97 = self.__ts2gml_env_97;
                var __ts2gml_env_84 = self.__ts2gml_env_84;
                __ts2gml_env_97.__ts2gml_capture_31 += 1;
                __ts2gml_env_84.__ts2gml_capture_32 += 1;
                return __ts2gml_env_97.__ts2gml_capture_31;
            })]);
    }
    scopeContextExpect("with produces one environment per selected instance", __ts2gml_collection_length(readers), 3);
    scopeContextExpect("first with environment counter", (function (__ts2gml_unused, readers) {
        var __ts2gml_receiver = readers;
        var __ts2gml_key = 0;
        var __ts2gml_method = __ts2gml_value_get(__ts2gml_receiver, __ts2gml_key);
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, []);
    })(undefined, readers), 1);
    scopeContextExpect("second with environment counter", (function (__ts2gml_unused, readers) {
        var __ts2gml_receiver = readers;
        var __ts2gml_key = 1;
        var __ts2gml_method = __ts2gml_value_get(__ts2gml_receiver, __ts2gml_key);
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, []);
    })(undefined, readers), 1);
    scopeContextExpect("third with environment counter", (function (__ts2gml_unused, readers) {
        var __ts2gml_receiver = readers;
        var __ts2gml_key = 2;
        var __ts2gml_method = __ts2gml_value_get(__ts2gml_receiver, __ts2gml_key);
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, []);
    })(undefined, readers), 1);
    scopeContextExpect("with environments share enclosing binding", __ts2gml_env_84.__ts2gml_capture_32, 3);
    instance_destroy(extra1);
    instance_destroy(extra2);
    scopeContextExpect("first with local survives creator destruction", (function (__ts2gml_unused, readers) {
        var __ts2gml_receiver = readers;
        var __ts2gml_key = 0;
        var __ts2gml_method = __ts2gml_value_get(__ts2gml_receiver, __ts2gml_key);
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, []);
    })(undefined, readers), 2);
    scopeContextExpect("second with local survives creator destruction", (function (__ts2gml_unused, readers) {
        var __ts2gml_receiver = readers;
        var __ts2gml_key = 1;
        var __ts2gml_method = __ts2gml_value_get(__ts2gml_receiver, __ts2gml_key);
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, []);
    })(undefined, readers), 2);
    scopeContextExpect("third with local survives creator destruction", (function (__ts2gml_unused, readers) {
        var __ts2gml_receiver = readers;
        var __ts2gml_key = 2;
        var __ts2gml_method = __ts2gml_value_get(__ts2gml_receiver, __ts2gml_key);
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, []);
    })(undefined, readers), 2);
    scopeContextExpect("with captures restore enclosing native context", self.id, __ts2gml_env_84.__ts2gml_capture_19);
    show_debug_message("TS2GML_WITH_CLOSURE_OK");
};
self.checkClosureContexts = function(_target) {
    var __ts2gml_env_99_self = method_get_self(function () { });
    var __ts2gml_env_99_lexical = self;
    var __ts2gml_env_99 = { __ts2gml_capture_33: undefined, __ts2gml_capture_36: undefined, __ts2gml_capture_37: undefined, __ts2gml_capture_38: undefined, __ts2gml_capture_39: undefined };
    show_debug_message("TS2GML_CLOSURE_CONTEXT_BEGIN");
    var ownerId = self.id;
    var targetId = _target.id;
    var ownerValue = self.value;
    scopeContextExpect("closure initialized in global scope", global.closureGlobalRead(), 17);
    var expected = _target.value + 7;
    var read = (function (__ts2gml_unused, _target) {
        var __ts2gml_callable = (function (__ts2gml_unused, _target) {
            var __ts2gml_callable = (function (__ts2gml_unused, _target) {
                var __ts2gml_callable = (function (__ts2gml_unused, _target) {
                    var __ts2gml_callable = (function (__ts2gml_unused, _target) {
                        var __ts2gml_callable = (function (__ts2gml_unused, _target) {
                            var __ts2gml_callable = (function (__ts2gml_unused, _target) {
                                var __ts2gml_callable = _target.deepCaptured(7);
                                var __ts2gml_arguments = [];
                                return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                            })(undefined, _target);
                            var __ts2gml_arguments = [];
                            return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                        })(undefined, _target);
                        var __ts2gml_arguments = [];
                        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                    })(undefined, _target);
                    var __ts2gml_arguments = [];
                    return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                })(undefined, _target);
                var __ts2gml_arguments = [];
                return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
            })(undefined, _target);
            var __ts2gml_arguments = [];
            return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
        })(undefined, _target);
        var __ts2gml_arguments = [];
        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
    })(undefined, _target);
    scopeContextExpect("deep object callback direct", read(), expected);
    scopeContextExpect("deep object callback foreign caller", _target.checkedInvoke(read), expected);
    var copied = { value: 900, read: read };
    scopeContextExpect("deep object callback struct caller", copied.read(), expected);
    var nativeCall = method_call(read, []);
    scopeContextExpect("deep object callback method_call", nativeCall, expected);
    global.closureContextCallback = read;
    var bridge = __ts2gml_value_method(copied, function () {
        return global.closureContextCallback();
    });
    scopeContextExpect("deep object callback explicitly bound bridge", bridge(), expected);
    scopeContextExpect("bound bridge restores owner self", self.id, ownerId);
    __ts2gml_env_99.__ts2gml_capture_33 = 0;
    _target.argumentContexts(method({ __ts2gml_env_99: __ts2gml_env_99, __ts2gml_closure: true }, function (value) {
        var __ts2gml_env_99 = self.__ts2gml_env_99;
        __ts2gml_env_99.__ts2gml_capture_33 += 1;
        return value;
    }));
    scopeContextExpect("indirect argument context callbacks ran", __ts2gml_env_99.__ts2gml_capture_33, 3);
    scopeContextExpect("captured callback exposes a struct environment", is_struct(method_get_self(read)) != 0, true);
    var reboundTarget = instance_create_depth(600, 600, 0, obj_scope_target);
    reboundTarget.value = 90;
    var rebound = __ts2gml_value_method(reboundTarget, read);
    scopeContextExpect("explicit rebinding retains the capture environment", rebound(), 97);
    scopeContextExpect("rebinding does not mutate original callback", read(), expected);
    instance_destroy(reboundTarget);
    with (_target) {
        var __ts2gml_with_self_20791_1 = self;
        var __ts2gml_with_other_20791_2 = other;
        scopeContextExpect("captured callback from with", read(), expected);
        scopeContextExpect("with self restored after closure", self.id, targetId);
        scopeContextExpect("with other restored after closure", other.id, ownerId);
        with (__ts2gml_with_other_20791_2) {
            var __ts2gml_with_self_20791_3 = self;
            var __ts2gml_with_other_20791_4 = other;
            with (__ts2gml_with_other_20791_4) {
                var __ts2gml_with_self_20791_5 = self;
                var __ts2gml_with_other_20791_6 = other;
                scopeContextExpect("captured callback from three with scopes", method_call(read, []), expected);
                scopeContextExpect("deep with self after closure", self.id, targetId);
                scopeContextExpect("deep with other after closure", other.id, ownerId);
                scopeContextExpect("deep with previous alias survives", __ts2gml_with_other_20791_6.id, ownerId);
                scopeContextExpect("deep with middle alias survives", __ts2gml_with_self_20791_3.id, ownerId);
                scopeContextExpect("deep with inner alias survives", __ts2gml_with_self_20791_5.id, targetId);
            }
        }
        // These captures belong to the factory invocation, not the inline with.
        var lexicalFactory = method(__ts2gml_with_other_20791_2, function (__ts2gml_capture_34_parameter) {
            var __ts2gml_env_105_self = method_get_self(function () { });
            var __ts2gml_env_105_lexical = self;
            var __ts2gml_env_105 = { __ts2gml_capture_34: __ts2gml_capture_34_parameter };
            return method({ __ts2gml_env_105: __ts2gml_env_105, __ts2gml_receiver: __ts2gml_env_105_self, __ts2gml_this: __ts2gml_env_105_lexical, __ts2gml_closure: true }, function () {
                var __ts2gml_env_105 = self.__ts2gml_env_105;
                var __ts2gml_env_106_this = self.__ts2gml_this;
                with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                    var __ts2gml_env_106_self = method_get_self(function () { });
                    return method({ __ts2gml_env_105: __ts2gml_env_105, __ts2gml_receiver: __ts2gml_env_106_self, __ts2gml_this: __ts2gml_env_106_this, __ts2gml_closure: true }, function () {
                        var __ts2gml_env_105 = self.__ts2gml_env_105;
                        var __ts2gml_env_107_this = self.__ts2gml_this;
                        with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                            return __ts2gml_env_107_this.value + __ts2gml_env_105.__ts2gml_capture_34;
                        }
                    });
                }
            });
        });
        var nativeFactory = function (__ts2gml_capture_35_parameter) {
            var __ts2gml_env_108_self = method_get_self(function () { });
            var __ts2gml_env_108 = { __ts2gml_capture_35: __ts2gml_capture_35_parameter };
            return method({ __ts2gml_env_108: __ts2gml_env_108, __ts2gml_receiver: __ts2gml_env_108_self, __ts2gml_closure: true }, function () {
                var __ts2gml_env_108 = self.__ts2gml_env_108;
                with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                    return __ts2gml_guard_object(self, obj_scope_target, "self").value + __ts2gml_env_108.__ts2gml_capture_35;
                }
            });
        };
        __ts2gml_with_self_20791_1.readerFactory = lexicalFactory(3);
        __ts2gml_with_self_20791_1.contextReader = nativeFactory(4);
        scopeContextExpect("with enclosing caller alias", __ts2gml_with_other_20791_2.id, ownerId);
    }
    var lexical = _target.readerFactory();
    scopeContextExpect("factory within with preserves outer lexical this", lexical(), ownerValue + 3);
    scopeContextExpect("ordinary factory within with preserves native self", _target.contextReader(), _target.value + 4);
    scopeContextExpect("with context restored to method owner", self.id, ownerId);
    var originalX = _target.x;
    var move = _target.nativeCaptured(6);
    scopeContextExpect("captured native instance variable", move(), originalX + 6);
    scopeContextExpect("captured native write belongs to target", _target.x, originalX + 6);
    _target.x = originalX;
    __ts2gml_env_99.__ts2gml_capture_36 = 3;
    var map = method({ __ts2gml_env_99: __ts2gml_env_99, __ts2gml_receiver: __ts2gml_env_99_self, __ts2gml_this: __ts2gml_env_99_lexical, __ts2gml_closure: true }, function (value, index) {
        var __ts2gml_env_99 = self.__ts2gml_env_99;
        var __ts2gml_env_110_this = self.__ts2gml_this;
        with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
            return value * __ts2gml_env_99.__ts2gml_capture_36 + __ts2gml_env_110_this.value + index;
        }
    });
    var mapped = array_map([1, 2, 3], map);
    scopeContextExpect("native array_map capture first", __ts2gml_value_get(mapped, 0), ownerValue + 3);
    scopeContextExpect("native array_map capture last", __ts2gml_value_get(mapped, 2), ownerValue + 11);
    __ts2gml_env_99.__ts2gml_capture_37 = 2;
    var filtered = array_filter([1, 2, 3], method({ __ts2gml_env_99: __ts2gml_env_99, __ts2gml_closure: true }, function (value) {
        var __ts2gml_env_99 = self.__ts2gml_env_99;
        return value >= __ts2gml_env_99.__ts2gml_capture_37;
    }));
    scopeContextExpect("native array_filter capture", __ts2gml_collection_join(filtered, []), "2,3");
    __ts2gml_env_99.__ts2gml_capture_38 = 0;
    array_foreach([1, 2, 3], method({ __ts2gml_env_99: __ts2gml_env_99, __ts2gml_receiver: __ts2gml_env_99_self, __ts2gml_this: __ts2gml_env_99_lexical, __ts2gml_closure: true }, function (value) {
        var __ts2gml_env_99 = self.__ts2gml_env_99;
        var __ts2gml_env_112_this = self.__ts2gml_this;
        with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
            __ts2gml_env_99.__ts2gml_capture_38 += value + __ts2gml_env_112_this.value;
        }
    }));
    scopeContextExpect("native array_foreach shared mutation and self", __ts2gml_env_99.__ts2gml_capture_38, 6 + ownerValue * 3);
    __ts2gml_env_99.__ts2gml_capture_39 = -1;
    var sorted = [1, 3, 2];
    array_sort(sorted, method({ __ts2gml_env_99: __ts2gml_env_99, __ts2gml_closure: true }, function (left, right) {
        var __ts2gml_env_99 = self.__ts2gml_env_99;
        return (left - right) * __ts2gml_env_99.__ts2gml_capture_39;
    }));
    scopeContextExpect("native array_sort captured comparator", __ts2gml_collection_join(sorted, []), "3,2,1");
    scopeContextExpect("native callback calls restore owner", self.id, ownerId);
    var thrower = _target.throwingCaptured(2);
    var caught = false;
    try {
        _target.checkedInvoke(thrower);
    }
    catch (__ts2gml_caught_20791_7) {
        caught = true;
    }
    scopeContextExpect("captured callback exception observed", caught, true);
    scopeContextExpect("captured exception restores self", self.id, ownerId);
    scopeContextExpect("captured callback still works after throw", read(), expected);
    var otherFactory = _target.otherFactory(1);
    var returnedOther = otherFactory();
    var ordinaryOther = _target.plainOtherFactory();
    scopeContextExpect("returned noncapturing function has its own other", returnedOther(), ordinaryOther());
    scopeContextExpect("returned function other through same receiver", _target.checkedInvoke(returnedOther), _target.checkedInvoke(ordinaryOther));
    var transient = instance_create_depth(500, 500, 0, obj_scope_target);
    var pure = transient.capturedReader(19);
    var bound = (function (__ts2gml_unused, transient) {
        var __ts2gml_callable = (function (__ts2gml_unused, transient) {
            var __ts2gml_callable = (function (__ts2gml_unused, transient) {
                var __ts2gml_callable = (function (__ts2gml_unused, transient) {
                    var __ts2gml_callable = (function (__ts2gml_unused, transient) {
                        var __ts2gml_callable = (function (__ts2gml_unused, transient) {
                            var __ts2gml_callable = (function (__ts2gml_unused, transient) {
                                var __ts2gml_callable = transient.deepCaptured(3);
                                var __ts2gml_arguments = [];
                                return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                            })(undefined, transient);
                            var __ts2gml_arguments = [];
                            return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                        })(undefined, transient);
                        var __ts2gml_arguments = [];
                        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                    })(undefined, transient);
                    var __ts2gml_arguments = [];
                    return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                })(undefined, transient);
                var __ts2gml_arguments = [];
                return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
            })(undefined, transient);
            var __ts2gml_arguments = [];
            return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
        })(undefined, transient);
        var __ts2gml_arguments = [];
        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
    })(undefined, transient);
    instance_deactivate_object(transient);
    scopeContextExpect("pure capture survives inactive creator", pure(), 19);
    scopeContextExpect("context closure follows inactive with semantics", bound(), undefined);
    instance_activate_object(transient);
    scopeContextExpect("context closure works after activation", bound(), 23);
    instance_destroy(transient);
    scopeContextExpect("pure capture survives destroyed creator", pure(), 19);
    scopeContextExpect("context closure follows destroyed with semantics", bound(), undefined);
    show_debug_message("TS2GML_CLOSURE_CONTEXT_OK");
};
self.value = 41;
{
    var __ts2gml_env_49_self = method_get_self(function () { });
    var __ts2gml_env_49_lexical = self;
    var __ts2gml_env_49 = { __ts2gml_capture_7: undefined, __ts2gml_capture_8: undefined };
    __ts2gml_guard_object(self, obj_scope_runner, "self");
}
scopeContextExpect("enum object field across files", self.enumState, EnumNumeric.Active);
__ts2gml_env_49.__ts2gml_capture_7 = 3;
self.capturedEventReader = method({ __ts2gml_env_49: __ts2gml_env_49, __ts2gml_receiver: __ts2gml_env_49_self, __ts2gml_this: __ts2gml_env_49_lexical, __ts2gml_closure: true }, function () {
    var __ts2gml_env_49 = self.__ts2gml_env_49;
    var __ts2gml_env_50_this = self.__ts2gml_this;
    with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
        return __ts2gml_env_49.__ts2gml_capture_7 + __ts2gml_env_50_this.value;
    }
});
__ts2gml_env_49.__ts2gml_capture_7 = 5;
var temporary = instance_create_depth(0, 0, 0, obj_scope_target);
var detached = temporary.capturedReader(17);
instance_destroy(temporary);
scopeContextExpect("closure survives creating instance", detached(), 17);
__ts2gml_env_49.__ts2gml_capture_8 = self;
var nativeSelf = method({ __ts2gml_env_49: __ts2gml_env_49, __ts2gml_receiver: __ts2gml_env_49_self, __ts2gml_closure: true }, function () {
    var __ts2gml_env_49 = self.__ts2gml_env_49;
    with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
        __ts2gml_guard_object(self, obj_scope_runner, "self");
        scopeContextExpect("closure native self", self, __ts2gml_env_49.__ts2gml_capture_8);
        return __ts2gml_env_49.__ts2gml_capture_7;
    }
});
scopeContextExpect("closure guarded native context", nativeSelf(), 5);
scopeContextExpect("object static before instance", __ts2gml_class_statics(obj_scope_target).increment(), 6);
scopeContextExpect("object static identity", __ts2gml_class_statics(obj_scope_target).identity(), obj_scope_target);
var value = 2;
scopeContextExpect("event field/local", self.value + value, 43);
scopeContextExpect("event self", self, self);
global.scopeContextValue = 50;
scopeContextExpect("global", global.scopeContextValue, 50);
scopeContextExpect("script parameter/local", scopeContextAdd(3), 5);
var data = new ScopeContextStruct(12);
scopeContextExpect("constructor field initializer", data.initialValue, 10);
scopeContextExpect("constructor assignment", data.value, 12);
scopeContextExpect("constructor other", data.callerValue, 41);
scopeContextExpect("struct field/parameter", data.fromParameter(3), 15);
scopeContextExpect("struct field/local", data.fromLocal(), 14);
scopeContextExpect("struct self", data.identity(), data);
var target = instance_create_depth(0, 0, 0, obj_scope_target);
self.checkClosureContexts(target);
self.checkWithCaptures(target);
self.checkMethodCaptures(target);
scopeContextExpect("object variable", target.value, 20);
scopeContextExpect("object field/parameter", target.fromParameter(4), 24);
scopeContextExpect("object field/local", target.fromLocal(), 23);
scopeContextExpect("direct method other", target.callerValue(), target.value);
var targetCaller = target.extractedCallerValue;
scopeContextExpect("extracted method other", targetCaller(), self.value);
var structReader = data.makeReader();
scopeContextExpect("struct arrow direct", structReader(), 12);
scopeContextExpect("struct arrow callback", target.invoke(structReader), 12);
var objectReader = method(self, function () { return self.value; });
scopeContextExpect("object arrow direct", objectReader(), 41);
scopeContextExpect("object arrow callback", target.invoke(objectReader), 41);
var literal = { value: 99, read: method(self, function () { return self.value; }) };
var callbackArray = [method(self, function () { return self.value; })];
scopeContextExpect("struct literal arrow", literal.read(), 41);
scopeContextExpect("array literal arrow", (function (__ts2gml_unused, callbackArray) {
    var __ts2gml_receiver = callbackArray;
    var __ts2gml_key = 0;
    var __ts2gml_method = __ts2gml_value_get(__ts2gml_receiver, __ts2gml_key);
    __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
    return method_call(__ts2gml_method, []);
})(undefined, callbackArray), 41);
scopeContextExpect("method binding", method_get_self(self.callerValue), self.id);
scopeContextExpect("callback other", target.invoke(self.callerValue), target.value);
var amount = 3;
with (obj_scope_target) {
    var __ts2gml_with_self_7669_1 = self;
    var __ts2gml_with_other_7669_2 = other;
    scopeContextExpect("with self", __ts2gml_with_self_7669_1.value, 20);
    scopeContextExpect("with other", __ts2gml_with_other_7669_2.value, 41);
    __ts2gml_with_self_7669_1.value += amount;
    __ts2gml_with_other_7669_2.value += 1;
}
scopeContextExpect("with local capture", target.value, 23);
scopeContextExpect("with lexical this", self.value, 42);
with (obj_scope_target) {
    var __ts2gml_with_self_8073_1 = self;
    var __ts2gml_with_other_8073_2 = other;
    with (obj_scope_target) {
        var __ts2gml_with_self_8073_3 = self;
        var __ts2gml_with_other_8073_4 = other;
        __ts2gml_with_self_8073_3.value += 1;
        __ts2gml_with_other_8073_4.value += 2;
        __ts2gml_with_other_8073_2.value += 4;
        __ts2gml_with_other_8073_2.value += 8;
    }
    scopeContextExpect("nested with native self alias", __ts2gml_with_self_8073_1.value, 26);
}
scopeContextExpect("nested with self/other", target.value, 26);
scopeContextExpect("nested with lexical this", self.value, 54);
with (instance_create_depth(100, 100, 0, obj_scope_target)) {
    var __ts2gml_with_self_8579_1 = self;
    var __ts2gml_with_other_8579_2 = other;
    scopeContextExpect("with callback native other alias", __ts2gml_with_other_8579_2.value, __ts2gml_with_other_8579_2.value);
    __ts2gml_with_self_8579_1.direction = 0;
    __ts2gml_with_self_8579_1.on_step = function () {
        x += lengthdir_x(5, direction);
        y += lengthdir_y(5, direction);
    };
    __ts2gml_with_self_8579_1.lexicalReader = method(__ts2gml_with_other_8579_2, function () { return self.value; });
    __ts2gml_with_self_8579_1.contextReader = function () {
        __ts2gml_guard_object(self, obj_scope_target, "self");
        return self.value;
    };
    __ts2gml_with_self_8579_1.readerFactory = method(__ts2gml_with_other_8579_2, function () { return method(self, function () { return self.value; }); });
    __ts2gml_with_other_8579_2.projectile = __ts2gml_with_self_8579_1;
}
var collisionSurface = surface_create(1, 1);
surface_set_target(collisionSurface);
draw_clear(c_white);
surface_reset_target();
var collisionSprite = sprite_create_from_surface(collisionSurface, 0, 0, 1, 1, false, false, 0, 0);
surface_free(collisionSurface);
self.sprite_index = collisionSprite;
target.sprite_index = collisionSprite;
self.alarm[0] = 2;
