function semanticSparseCondition(values, index) {
    return !!__ts2gml_value_get(values, index);
}

function semanticSparseEqual(values, index) {
    return __ts2gml_value_get(values, index) == false;
}

function semanticSparseStored(values) {
    var value = __ts2gml_value_get(values, 0);
    return !!value;
}

function semanticSparseNumber(values, index) {
    return __ts2gml_value_get(values, index) == 0;
}

function semanticTypedEqual(left, right) {
    return left == right;
}

function semanticTypedChoose(enabled, left, right, mode) {
    return enabled && left == right && !(mode == "idle");
}

function semanticFallback(value, fallback) { 
return (function (__ts2gml_logical_789_1, fallback) {
    return __ts2gml_value_truthy(__ts2gml_logical_789_1) ? __ts2gml_logical_789_1 : fallback;
})(value, fallback); }

function semanticAnd(flag, value) { 
return (function (__ts2gml_logical_862_1, value) {
    return __ts2gml_value_truthy(__ts2gml_logical_862_1) ? value : __ts2gml_logical_862_1;
})(flag, value); }

function semanticCondition(value) { 
return (__ts2gml_value_truthy(value) ? 1 : 0); }

function semanticEquality(value) { 
return __ts2gml_value_equal_number(value, 1); }

function semanticDefault(data) {
    var __ts2gml_destructure_1066_1 = data, __ts2gml_default_1066_2 = variable_struct_get(__ts2gml_destructure_1066_1, "value"), value = is_undefined(__ts2gml_default_1066_2) ? 5 : __ts2gml_default_1066_2;
    return value;
}

function semanticParameter(value = 5) { 
return value; }

function semanticField(data, key) { 
return variable_struct_get(data, key); }

function semanticEffect(counter) { 
counter.count += 1; 
return 9; }

function semanticLazy(value, counter) { 
return (function (__ts2gml_logical_1358_1, counter) {
    return __ts2gml_value_truthy(__ts2gml_logical_1358_1) ? __ts2gml_logical_1358_1 : semanticEffect(counter);
})(value, counter); }

function semanticConditionalEffect(state, label, value) {
    state.trace += label;
    return value;
}

function SemanticWorker() constructor {
    self.length = 3;
    self.weapon = undefined;
    self.receiverReads = 0;
    static map = function(_value) {
        return _value + 1;
    };
    static onEndStep = function(_amount = 1) {
        self.length += _amount;
    };
    static endStep = function() {
        if (__ts2gml_value_truthy(self.weapon)) {
            self.weapon.onEndStep();
        }
    };
    static readWeapon = function() {
        self.receiverReads += 1;
        return self.weapon;
    };
}

function semanticContractRun() {
    scopeContextExpect("missing typed boolean element truthiness", semanticSparseCondition([], 0), false);
    scopeContextExpect("missing typed boolean element equality", semanticSparseEqual([], 0), false);
    scopeContextExpect("missing stored typed boolean truthiness", semanticSparseStored([]), false);
    scopeContextExpect("missing typed number element equality", semanticSparseNumber([], 0), false);
    for (var __ts2gml_iteration_values_1821_1 = [0, -0, -1, 0.25, 1], __ts2gml_iteration_index_1821_2 = 0; __ts2gml_iteration_index_1821_2 < array_length(__ts2gml_iteration_values_1821_1); __ts2gml_iteration_index_1821_2++) {
        var left = __ts2gml_value_get(__ts2gml_iteration_values_1821_1, __ts2gml_iteration_index_1821_2);
        for (var __ts2gml_iteration_values_1821_3 = [0, -1, 0.25, 1], __ts2gml_iteration_index_1821_4 = 0; __ts2gml_iteration_index_1821_4 < array_length(__ts2gml_iteration_values_1821_3); __ts2gml_iteration_index_1821_4++) {
            var right = __ts2gml_value_get(__ts2gml_iteration_values_1821_3, __ts2gml_iteration_index_1821_4);
            scopeContextExpect("typed native number comparison", semanticTypedEqual(left, right), left == right);
            scopeContextExpect("typed native boolean condition", semanticTypedChoose(true, left, right, "active"), left == right);
            scopeContextExpect("typed native boolean false", semanticTypedChoose(false, left, right, "active"), false);
            scopeContextExpect("typed native string comparison", semanticTypedChoose(true, left, right, "idle"), false);
        }
    }
    var native_boolean = instance_exists(undefined) != 0;
    scopeContextExpect("native API result is normalized boolean", is_bool(native_boolean) != 0, true);
    for (var index = 0; index < 2; index++) {
        var enabled = index == 1;
        var state = { trace: "" };
        var selected = semanticConditionalEffect(state, "A", enabled) && semanticConditionalEffect(state, "B", true);
        scopeContextExpect("typed boolean short circuit value", selected, enabled);
        scopeContextExpect("typed boolean short circuit effects", state.trace, (enabled ? "AB" : "A"));
    }
    show_debug_message("TS2GML_TYPED_PRIMITIVE_CONTRACT_OK");
    semanticClosuresRun();
    scopeContextExpect("logical operand", semanticFallback(0, 5), 5);
    scopeContextExpect("logical local", semanticAnd(true, 42), 42);
    scopeContextExpect("logical false", semanticAnd(false, 42), false);
    var counter = { count: 0 };
    scopeContextExpect("short circuit result", semanticLazy(2, counter), 2);
    scopeContextExpect("short circuit effect", counter.count, 0);
    scopeContextExpect("deferred local result", semanticLazy(0, counter), 9);
    scopeContextExpect("deferred local effect", counter.count, 1);
    scopeContextExpect("negative condition", semanticCondition(-2), 1);
    scopeContextExpect("fraction condition", semanticCondition(0.25), 1);
    scopeContextExpect("empty condition", semanticCondition(""), 0);
    scopeContextExpect("string condition", semanticCondition("yes"), 1);
    scopeContextExpect("null condition", semanticCondition(pointer_null), 0);
    // All eight paths, including non-boolean truthiness. The trace catches eager
    // branches, repeated conditions, and reordered side effects in either runtime.
    for (var index = 0; index < 8; index++) {
        var first = (index < 4 ? "" : 0.25);
        var second = (index % 4 < 2 ? pointer_null : "yes");
        var third = (index % 2 == 0 ? undefined : -2);
        var state = { trace: "" };
        var falseChain = (__ts2gml_value_truthy(semanticConditionalEffect(state, "A", first)) ? semanticConditionalEffect(state, "h", 10)
            : (__ts2gml_value_truthy(semanticConditionalEffect(state, "B", second)) ? semanticConditionalEffect(state, "e", 20)
                : (__ts2gml_value_truthy(semanticConditionalEffect(state, "C", third)) ? semanticConditionalEffect(state, "x", 30)
                    : semanticConditionalEffect(state, "k", 40))));
        scopeContextExpect(string_concat("conditional false chain value ", index), falseChain, __ts2gml_value_get([40, 30, 20, 20, 10, 10, 10, 10], index));
        scopeContextExpect(string_concat("conditional false chain effects ", index), state.trace, __ts2gml_value_get(["ABCk", "ABCx", "ABe", "ABe", "Ah", "Ah", "Ah", "Ah"], index));
        state.trace = "";
        var trueChain = (__ts2gml_value_truthy(semanticConditionalEffect(state, "A", first)) ? (__ts2gml_value_truthy(semanticConditionalEffect(state, "B", second)) ? (__ts2gml_value_truthy(semanticConditionalEffect(state, "C", third)) ? semanticConditionalEffect(state, "h", 10)
            : semanticConditionalEffect(state, "e", 20))
            : semanticConditionalEffect(state, "x", 30))
            : semanticConditionalEffect(state, "k", 40));
        scopeContextExpect(string_concat("conditional true chain value ", index), trueChain, __ts2gml_value_get([40, 40, 40, 40, 30, 30, 20, 10], index));
        scopeContextExpect(string_concat("conditional true chain effects ", index), state.trace, __ts2gml_value_get(["Ak", "Ak", "Ak", "Ak", "ABx", "ABx", "ABCe", "ABCh"], index));
        state.trace = "";
        var condition = ((__ts2gml_value_truthy((__ts2gml_value_truthy(semanticConditionalEffect(state, "A", first)) ? semanticConditionalEffect(state, "B", second)
            : semanticConditionalEffect(state, "C", third)))) ? semanticConditionalEffect(state, "h", 10)
            : semanticConditionalEffect(state, "e", 20));
        scopeContextExpect(string_concat("conditional condition value ", index), condition, __ts2gml_value_get([20, 10, 20, 10, 20, 20, 10, 10], index));
        scopeContextExpect(string_concat("conditional condition effects ", index), state.trace, __ts2gml_value_get(["ACe", "ACh", "ACe", "ACh", "ABe", "ABe", "ABh", "ABh"], index));
    }
    scopeContextExpect("strict boolean", semanticEquality(true), false);
    scopeContextExpect("strict number", semanticEquality(1), true);
    scopeContextExpect("null default", semanticDefault({ value: pointer_null }), pointer_null);
    scopeContextExpect("missing default", semanticDefault({}), 5);
    scopeContextExpect("null parameter", semanticParameter(pointer_null), pointer_null);
    scopeContextExpect("missing parameter", semanticParameter(), 5);
    scopeContextExpect("round tie", __ts2gml_value_round(2.5), 3);
    scopeContextExpect("round negative tie", __ts2gml_value_round(-1.5), -1);
    var next = __ts2gml_value_random;
    var sample = next();
    scopeContextExpect("random alias range", sample >= 0 && sample < 1, true);
    scopeContextExpect("string index", __ts2gml_value_get("abc", 0), "a");
    scopeContextExpect("struct index", semanticField({ score: 7 }, "score"), 7);
    scopeContextExpect("emoji literal", "😀", "😀");
    var worker = new SemanticWorker();
    scopeContextExpect("authored map", worker.map(2), 3);
    __ts2gml_value_set_length(worker, 8);
    scopeContextExpect("authored length write", __ts2gml_collection_length(worker), 8);
    var optionalOwner = new SemanticWorker();
    var optionalEffects = { count: 0 };
    optionalOwner.endStep();
    {
        var __ts2gml_optional_1821_5 = optionalOwner.readWeapon();
        if (__ts2gml_value_truthy(__ts2gml_optional_1821_5)) {
            __ts2gml_optional_1821_5.onEndStep(semanticEffect(optionalEffects));
        }
    }
    scopeContextExpect("optional missing receiver evaluated once", optionalOwner.receiverReads, 1);
    scopeContextExpect("optional missing receiver skips arguments", optionalEffects.count, 0);
    optionalOwner.weapon = pointer_null;
    optionalOwner.endStep();
    {
        var __ts2gml_optional_1821_6 = optionalOwner.readWeapon();
        if (__ts2gml_value_truthy(__ts2gml_optional_1821_6)) {
            __ts2gml_optional_1821_6.onEndStep(semanticEffect(optionalEffects));
        }
    }
    scopeContextExpect("optional null receiver evaluated once", optionalOwner.receiverReads, 2);
    scopeContextExpect("optional null receiver skips arguments", optionalEffects.count, 0);
    optionalOwner.weapon = worker;
    optionalOwner.endStep();
    scopeContextExpect("optional method receiver", __ts2gml_collection_length(worker), 9);
    {
        var __ts2gml_optional_1821_7 = optionalOwner.readWeapon();
        if (__ts2gml_value_truthy(__ts2gml_optional_1821_7)) {
            __ts2gml_optional_1821_7.onEndStep(semanticEffect(optionalEffects));
        }
    }
    scopeContextExpect("optional present receiver evaluated once", optionalOwner.receiverReads, 3);
    scopeContextExpect("optional present receiver evaluates arguments", optionalEffects.count, 1);
    scopeContextExpect("optional call preserves this", __ts2gml_collection_length(worker), 18);
    if (__ts2gml_value_truthy(optionalOwner.weapon)) {
        {
            var __ts2gml_optional_1821_8 = optionalOwner.weapon.readWeapon();
            if (__ts2gml_value_truthy(__ts2gml_optional_1821_8)) {
                __ts2gml_optional_1821_8.onEndStep(semanticEffect(optionalEffects));
            }
        }
    }
    scopeContextExpect("optional nested receiver evaluated once", worker.receiverReads, 1);
    scopeContextExpect("optional nested receiver skips arguments", optionalEffects.count, 1);
    if (true) {
        if (__ts2gml_value_truthy(optionalOwner.weapon)) {
            if (__ts2gml_value_truthy(optionalOwner.weapon.weapon)) {
                optionalOwner.weapon.weapon.onEndStep(semanticEffect(optionalEffects));
            }
        }
    }
    else
        semanticEffect(optionalEffects);
    scopeContextExpect("optional guard preserves enclosing else", optionalEffects.count, 1);
    var optionalAmount = [2];
    if (__ts2gml_value_truthy(optionalOwner.weapon)) {
        (function (__ts2gml_unused, optionalOwner, optionalAmount) {
            var __ts2gml_receiver = optionalOwner.weapon;
            var __ts2gml_method = __ts2gml_receiver.onEndStep;
            __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
            return method_call(__ts2gml_method, array_concat([], optionalAmount));
        })(undefined, optionalOwner, optionalAmount);
    }
    scopeContextExpect("optional spread call preserves this", __ts2gml_collection_length(worker), 20);
    var values = [3, 1];
    __ts2gml_collection_push(values, [2]);
    __ts2gml_collection_push(values, [4]);
    scopeContextExpect("optional includes", __ts2gml_collection_includes(values, [2]), true);
    scopeContextExpect("optional join", __ts2gml_collection_join(values, []), "3,1,2,4");
    __ts2gml_collection_sort(values, [function (left, right) { return left - right; }]);
    scopeContextExpect("array sort", __ts2gml_collection_join(values, []), "1,2,3,4");
    __ts2gml_value_set_length(values, 2);
    scopeContextExpect("array truncate", __ts2gml_collection_join(values, []), "1,2");
    __ts2gml_value_set_length(values, 4);
    scopeContextExpect("array grow", __ts2gml_value_get(values, 3), undefined);
    __ts2gml_value_set(values, 2, 8);
    (function (__ts2gml_assignment_1821_9) {
        return __ts2gml_value_set(__ts2gml_assignment_1821_9[0], __ts2gml_assignment_1821_9[1], __ts2gml_value_get(__ts2gml_assignment_1821_9[0], __ts2gml_assignment_1821_9[1]) + 1);
    })([values, 2]);
    scopeContextExpect("array update", __ts2gml_value_get(values, 2), 9);
    var fractions = [0.3, 0.1, 0.2];
    __ts2gml_collection_sort(fractions, [function (left, right) { return left - right; }]);
    scopeContextExpect("fraction comparator", __ts2gml_value_get(fractions, 0), 0.1);
    var stable = [{ key: 2, order: 1 }, { key: 1, order: 2 }, { key: 2, order: 3 }];
    __ts2gml_collection_sort(stable, [function (left, right) { return left.key - right.key; }]);
    scopeContextExpect("stable comparator", __ts2gml_value_get(stable, 1).order, 1);
    scopeContextExpect("stable comparator second", __ts2gml_value_get(stable, 2).order, 3);
    (function (__ts2gml_assignment_1821_10) {
        return __ts2gml_value_set(__ts2gml_assignment_1821_10[0], __ts2gml_assignment_1821_10[1], __ts2gml_value_get(__ts2gml_assignment_1821_10[0], __ts2gml_assignment_1821_10[1]) + 1);
    })([values, 2]);
    scopeContextExpect("postfix array mutation", __ts2gml_value_get(values, 2), 10);
    (function (__ts2gml_assignment_1821_11) {
        return __ts2gml_value_set(__ts2gml_assignment_1821_11[0], __ts2gml_assignment_1821_11[1], __ts2gml_value_get(__ts2gml_assignment_1821_11[0], __ts2gml_assignment_1821_11[1]) + 1);
    })([values, 2]);
    scopeContextExpect("prefix array mutation", __ts2gml_value_get(values, 2), 11);
    var mixed = [1, false];
    scopeContextExpect("includes strict types", __ts2gml_collection_includes(mixed, [true]), false);
    scopeContextExpect("indexOf strict types", __ts2gml_collection_index_of(mixed, [true]), -1);
    scopeContextExpect("indexOf omitted offset", __ts2gml_collection_index_of(values, [11]), 2);
    scopeContextExpect("includes negative offset", __ts2gml_collection_includes(values, [11, -2]), true);
    var minimum = __ts2gml_value_min;
    var maximum = __ts2gml_value_max;
    scopeContextExpect("min one argument", minimum(7), 7);
    scopeContextExpect("max one argument", maximum(7), 7);
    scopeContextExpect("min no arguments", __ts2gml_value_min() > 10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000.0, true);
    scopeContextExpect("max no arguments", __ts2gml_value_max() < -10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000.0, true);
    scopeContextExpect("template emoji", string_concat("start😀", 1, "😀end"), "start😀1😀end");
    scopeContextExpect("numeric literal formats", 255 + 2 + 7 + 1000, 1264);
    scopeContextExpect("small scientific literal", 0.00000001 * 100000000, 1);
}

function semanticClosureCounter(__ts2gml_env_25_parameter_1 = 0) {
    var __ts2gml_env_25 = { __ts2gml_capture_1: undefined };
    __ts2gml_env_25.__ts2gml_capture_1 = __ts2gml_env_25_parameter_1;
    var read = method({ __ts2gml_env_25: __ts2gml_env_25, __ts2gml_closure: true }, function () {
        var __ts2gml_env_25 = self.__ts2gml_env_25;
        return __ts2gml_env_25.__ts2gml_capture_1;
    });
    var add = method({ __ts2gml_env_25: __ts2gml_env_25, __ts2gml_closure: true }, function (amount = 1) {
        var __ts2gml_env_25 = self.__ts2gml_env_25;
        __ts2gml_env_25.__ts2gml_capture_1 += amount;
        return __ts2gml_env_25.__ts2gml_capture_1;
    });
    __ts2gml_env_25.__ts2gml_capture_1 += 2;
    return { read: read, add: add };
}

function semanticClosureChain(__ts2gml_capture_2_parameter) {
    var __ts2gml_env_28 = { __ts2gml_capture_2: __ts2gml_capture_2_parameter };
    return method({ __ts2gml_env_28: __ts2gml_env_28, __ts2gml_closure: true }, function (__ts2gml_capture_3_parameter) {
        var __ts2gml_env_28 = self.__ts2gml_env_28;
        var __ts2gml_env_29 = { __ts2gml_capture_3: __ts2gml_capture_3_parameter };
        return method({ __ts2gml_env_28: __ts2gml_env_28, __ts2gml_env_29: __ts2gml_env_29, __ts2gml_closure: true }, function (third) {
            var __ts2gml_env_28 = self.__ts2gml_env_28;
            var __ts2gml_env_29 = self.__ts2gml_env_29;
            return __ts2gml_env_28.__ts2gml_capture_2 + __ts2gml_env_29.__ts2gml_capture_3 + third;
        });
    });
}

function semanticClosureNamed(__ts2gml_capture_4_parameter) {
    var __ts2gml_env_31 = { __ts2gml_capture_4: __ts2gml_capture_4_parameter };
    var read = method({ __ts2gml_env_31: __ts2gml_env_31, __ts2gml_closure: true }, function () {
        var __ts2gml_env_31 = self.__ts2gml_env_31;
        return __ts2gml_env_31.__ts2gml_capture_4;
    });
    __ts2gml_env_31.__ts2gml_capture_4 += 1;
    return read;
}

function SemanticClosureOwner(__ts2gml_capture_5_parameter) constructor {
    self.value = 10;
    self.read = function () { return 0; };
    static make = function(__ts2gml_capture_7_parameter) {
        var __ts2gml_env_36_self = method_get_self(function () { });
        var __ts2gml_env_36_lexical = self;
        var __ts2gml_env_36 = { __ts2gml_capture_7: __ts2gml_capture_7_parameter };
        return method({ __ts2gml_env_36: __ts2gml_env_36, __ts2gml_receiver: __ts2gml_env_36_self, __ts2gml_this: __ts2gml_env_36_lexical, __ts2gml_closure: true }, function () {
            var __ts2gml_env_36 = self.__ts2gml_env_36;
            var __ts2gml_env_37_this = self.__ts2gml_this;
            with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                __ts2gml_env_37_this.value += __ts2gml_env_36.__ts2gml_capture_7;
                return __ts2gml_env_37_this.value;
            }
        });
    };
    static nested = function(__ts2gml_capture_8_parameter) {
        var __ts2gml_env_38_self = method_get_self(function () { });
        var __ts2gml_env_38_lexical = self;
        var __ts2gml_env_38 = { __ts2gml_capture_8: __ts2gml_capture_8_parameter };
        return method({ __ts2gml_env_38: __ts2gml_env_38, __ts2gml_receiver: __ts2gml_env_38_self, __ts2gml_this: __ts2gml_env_38_lexical, __ts2gml_closure: true }, function () {
            var __ts2gml_env_38 = self.__ts2gml_env_38;
            var __ts2gml_env_39_this = self.__ts2gml_this;
            with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                var __ts2gml_env_39_self = method_get_self(function () { });
                return method({ __ts2gml_env_38: __ts2gml_env_38, __ts2gml_receiver: __ts2gml_env_39_self, __ts2gml_this: __ts2gml_env_39_this, __ts2gml_closure: true }, function () {
                    var __ts2gml_env_38 = self.__ts2gml_env_38;
                    var __ts2gml_env_40_this = self.__ts2gml_this;
                    with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                        return __ts2gml_env_40_this.value + __ts2gml_env_38.__ts2gml_capture_8;
                    }
                });
            }
        });
    };
    static aliased = function() {
        var __ts2gml_env_41 = { __ts2gml_capture_9: undefined };
        __ts2gml_env_41.__ts2gml_capture_9 = self;
        return method({ __ts2gml_env_41: __ts2gml_env_41, __ts2gml_closure: true }, function () {
            var __ts2gml_env_41 = self.__ts2gml_env_41;
            return __ts2gml_env_41.__ts2gml_capture_9.value;
        });
    };
    {
        var __ts2gml_env_33_self = method_get_self(function () { });
        var __ts2gml_env_33_lexical = self;
        var __ts2gml_env_33 = { __ts2gml_capture_5: __ts2gml_capture_5_parameter, __ts2gml_capture_6: undefined };
        __ts2gml_env_33.__ts2gml_capture_6 = 2;
    }
    self.read = method({ __ts2gml_env_33: __ts2gml_env_33, __ts2gml_receiver: __ts2gml_env_33_self, __ts2gml_this: __ts2gml_env_33_lexical, __ts2gml_closure: true }, function () {
        var __ts2gml_env_33 = self.__ts2gml_env_33;
        var __ts2gml_env_34_this = self.__ts2gml_this;
        with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
            return __ts2gml_env_33.__ts2gml_capture_5 + __ts2gml_env_33.__ts2gml_capture_6 + __ts2gml_env_34_this.value;
        }
    });
    __ts2gml_env_33.__ts2gml_capture_5 += 1;
}

method(__ts2gml_class_statics(SemanticClosureOwner, true), function() {
    self.make = method(undefined, function(__ts2gml_capture_10_parameter) {
        var __ts2gml_env_43_self = method_get_self(function () { });
        var __ts2gml_env_43_lexical = self.__ts2gml_class;
        var __ts2gml_env_43 = { __ts2gml_capture_10: __ts2gml_capture_10_parameter };
        return method({ __ts2gml_env_43: __ts2gml_env_43, __ts2gml_receiver: __ts2gml_env_43_self, __ts2gml_this: __ts2gml_env_43_lexical, __ts2gml_closure: true }, function () {
            var __ts2gml_env_43 = self.__ts2gml_env_43;
            var __ts2gml_env_44_this = self.__ts2gml_this;
            with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                return variable_struct_get(__ts2gml_class_statics(__ts2gml_env_44_this), "value") + __ts2gml_env_43.__ts2gml_capture_10;
            }
        });
    });
    self.value = 30;
})();

function semanticClosuresRun() {
    var __ts2gml_env_45 = { __ts2gml_capture_11: undefined, __ts2gml_capture_12: undefined, __ts2gml_capture_13: undefined, __ts2gml_capture_15: undefined, __ts2gml_capture_16: undefined, __ts2gml_capture_17: undefined, __ts2gml_capture_18: undefined, __ts2gml_capture_19: undefined, __ts2gml_capture_20: undefined };
    var first = semanticClosureCounter(5);
    var second = semanticClosureCounter();
    scopeContextExpect("closure outer mutation", first.read(), 7);
    scopeContextExpect("closure sibling mutation", first.add(), 8);
    scopeContextExpect("closure shared read", first.read(), 8);
    scopeContextExpect("closure independent calls", second.read(), 2);
    scopeContextExpect("closure default argument", second.add(3), 5);
    var middle = semanticClosureChain(1);
    var inner = middle(2);
    scopeContextExpect("closure transitive capture", inner(3), 6);
    scopeContextExpect("closure separate intermediate calls", (function (__ts2gml_unused, middle) {
        var __ts2gml_callable = middle(4);
        var __ts2gml_arguments = [5];
        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
    })(undefined, middle), 10);
    var named = semanticClosureNamed(8);
    scopeContextExpect("closure named function", named(), 9);
    var owner = new SemanticClosureOwner(3);
    var read = owner.read;
    scopeContextExpect("closure constructor parameter", read(), 16);
    var add = owner.make(2);
    scopeContextExpect("closure lexical this", add(), 12);
    scopeContextExpect("closure this shared state", read(), 18);
    var nested = owner.nested(5);
    scopeContextExpect("closure nested lexical this", (function (__ts2gml_unused, nested) {
        var __ts2gml_callable = nested();
        var __ts2gml_arguments = [];
        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
    })(undefined, nested), 17);
    var aliased = owner.aliased();
    scopeContextExpect("closure captured receiver value", aliased(), 12);
    var staticRead = __ts2gml_class_statics(SemanticClosureOwner).make(4);
    scopeContextExpect("closure static this", staticRead(), 34);
    __ts2gml_env_45.__ts2gml_capture_11 = 1;
    var expression = method({ __ts2gml_env_45: __ts2gml_env_45, __ts2gml_closure: true }, function () {
        var __ts2gml_env_45 = self.__ts2gml_env_45;
        __ts2gml_env_45.__ts2gml_capture_11 += 2;
        return { local: __ts2gml_env_45.__ts2gml_capture_11 };
    });
    scopeContextExpect("closure function expression", expression().local, 3);
    scopeContextExpect("closure mutation visible to owner", __ts2gml_env_45.__ts2gml_capture_11, 3);
    var zero = function () { return 0; };
    __ts2gml_env_45.__ts2gml_capture_12 = zero;
    var indirect = method({ __ts2gml_env_45: __ts2gml_env_45, __ts2gml_closure: true }, function () {
        var __ts2gml_env_45 = self.__ts2gml_env_45;
        return __ts2gml_env_45.__ts2gml_capture_12();
    });
    __ts2gml_env_45.__ts2gml_capture_12 = function () { return 7; };
    scopeContextExpect("closure function-valued binding", indirect(), 7);
    __ts2gml_env_45.__ts2gml_capture_13 = method({ __ts2gml_env_45: __ts2gml_env_45, __ts2gml_closure: true }, function (depth) {
        var __ts2gml_env_45 = self.__ts2gml_env_45;
        return (depth == 0 ? 1 : __ts2gml_env_45.__ts2gml_capture_13(depth - 1) + 1);
    });
    scopeContextExpect("closure recursive variable", __ts2gml_env_45.__ts2gml_capture_13(3), 4);
    __ts2gml_env_45.__ts2gml_capture_15 = 9;
    var shadow = function (__ts2gml_capture_14_parameter) {
        var __ts2gml_env_51 = { __ts2gml_capture_14: __ts2gml_capture_14_parameter };
        return method({ __ts2gml_env_51: __ts2gml_env_51, __ts2gml_closure: true }, function () {
            var __ts2gml_env_51 = self.__ts2gml_env_51;
            return __ts2gml_env_51.__ts2gml_capture_14;
        });
    };
    scopeContextExpect("closure shadowed parameter", (function (__ts2gml_unused, shadow) {
        var __ts2gml_callable = shadow(4);
        var __ts2gml_arguments = [];
        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
    })(undefined, shadow), 4);
    var readValue = method({ __ts2gml_env_45: __ts2gml_env_45, __ts2gml_closure: true }, function () {
        var __ts2gml_env_45 = self.__ts2gml_env_45;
        return __ts2gml_env_45.__ts2gml_capture_15;
    });
    scopeContextExpect("closure shadow leaves outer binding", readValue(), 9);
    __ts2gml_env_45.__ts2gml_capture_19 = [3, 1, 2];
    __ts2gml_env_45.__ts2gml_capture_16 = -1;
    __ts2gml_collection_sort(__ts2gml_env_45.__ts2gml_capture_19, [method({ __ts2gml_env_45: __ts2gml_env_45, __ts2gml_closure: true }, function (left, right) {
            var __ts2gml_env_45 = self.__ts2gml_env_45;
            return (left - right) * __ts2gml_env_45.__ts2gml_capture_16;
        })]);
    scopeContextExpect("closure native comparator", __ts2gml_collection_join(__ts2gml_env_45.__ts2gml_capture_19, []), "3,2,1");
    __ts2gml_env_45.__ts2gml_capture_17 = { value: 8 };
    __ts2gml_env_45.__ts2gml_capture_18 = 3;
    var optionalRead = method({ __ts2gml_env_45: __ts2gml_env_45, __ts2gml_closure: true }, function () {
        var __ts2gml_env_45 = self.__ts2gml_env_45;
        return (function (__ts2gml_logical_13259_1, __ts2gml_env_45) {
            return __ts2gml_value_nullish(__ts2gml_logical_13259_1) ? __ts2gml_env_45.__ts2gml_capture_18 : __ts2gml_logical_13259_1;
        })((function (__ts2gml_optional_13259_2) {
            return __ts2gml_value_nullish(__ts2gml_optional_13259_2) ? undefined : __ts2gml_optional_13259_2.value;
        })(__ts2gml_env_45.__ts2gml_capture_17), __ts2gml_env_45);
    });
    scopeContextExpect("closure optional lowering", optionalRead(), 8);
    __ts2gml_env_45.__ts2gml_capture_17 = undefined;
    scopeContextExpect("closure optional fallback capture", optionalRead(), 3);
    __ts2gml_env_45.__ts2gml_capture_20 = 2;
    var update = method({ __ts2gml_env_45: __ts2gml_env_45, __ts2gml_closure: true }, function () {
        var __ts2gml_env_45 = self.__ts2gml_env_45;
        (function (__ts2gml_assignment_13259_3, __ts2gml_env_45) {
            return __ts2gml_value_set(__ts2gml_assignment_13259_3[0], __ts2gml_assignment_13259_3[1], __ts2gml_value_get(__ts2gml_assignment_13259_3[0], __ts2gml_assignment_13259_3[1]) + __ts2gml_env_45.__ts2gml_capture_20);
        })([__ts2gml_env_45.__ts2gml_capture_19, 0], __ts2gml_env_45);
        return __ts2gml_value_get(__ts2gml_env_45.__ts2gml_capture_19, 0);
    });
    scopeContextExpect("closure indexed mutation", update(), 5);
    __ts2gml_env_45.__ts2gml_capture_20 = 4;
    scopeContextExpect("closure indexed mutation shared operand", update(), 9);
}
