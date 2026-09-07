function semanticFallback(value, fallback) { 
return (function (__ts2gml_logical_0_1, fallback) {
    return __ts2gml_value_truthy(__ts2gml_logical_0_1) ? __ts2gml_logical_0_1 : fallback;
})(value, fallback); }

function semanticAnd(flag, value) { 
return (function (__ts2gml_logical_73_1, value) {
    return __ts2gml_value_truthy(__ts2gml_logical_73_1) ? value : __ts2gml_logical_73_1;
})(flag, value); }

function semanticCondition(value) { 
return __ts2gml_value_truthy(value) ? 1 : 0; }

function semanticEquality(value) { 
return __ts2gml_value_equal(value, 1); }

function semanticDefault(data) {
    var __ts2gml_destructure_250_1 = data, __ts2gml_default_250_2 = variable_struct_get(__ts2gml_destructure_250_1, "value"), value = is_undefined(__ts2gml_default_250_2) ? 5 : __ts2gml_default_250_2;
    return value;
}

function semanticParameter(value = 5) { 
return value; }

function semanticField(data, key) { 
return __ts2gml_value_get(data, key); }

function semanticEffect(counter) { 
counter.count += 1; 
return 9; }

function semanticLazy(value, counter) { 
return (function (__ts2gml_logical_514_1, counter) {
    return __ts2gml_value_truthy(__ts2gml_logical_514_1) ? __ts2gml_logical_514_1 : semanticEffect(counter);
})(value, counter); }

function SemanticWorker() constructor {
    self.length = 3;
    static map = function(_value) {
        return _value + 1;
    };
}

function semanticContractRun() {
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
    scopeContextExpect("random alias range", (function (__ts2gml_logical_675_1, sample) {
        return __ts2gml_value_truthy(__ts2gml_logical_675_1) ? sample < 1 : __ts2gml_logical_675_1;
    })(sample >= 0, sample), true);
    scopeContextExpect("string index", __ts2gml_value_get("abc", 0), "a");
    scopeContextExpect("struct index", semanticField({ score: 7 }, "score"), 7);
    scopeContextExpect("emoji literal", "😀", "😀");
    var worker = new SemanticWorker();
    scopeContextExpect("authored map", worker.map(2), 3);
    __ts2gml_value_set_length(worker, 8);
    scopeContextExpect("authored length write", __ts2gml_collection_length(worker), 8);
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
    (function (__ts2gml_assignment_675_2) {
        return __ts2gml_value_set(__ts2gml_assignment_675_2[0], __ts2gml_assignment_675_2[1], __ts2gml_value_get(__ts2gml_assignment_675_2[0], __ts2gml_assignment_675_2[1]) + 1);
    })([values, 2]);
    scopeContextExpect("array update", __ts2gml_value_get(values, 2), 9);
    var fractions = [0.3, 0.1, 0.2];
    __ts2gml_collection_sort(fractions, [function (left, right) { return left - right; }]);
    scopeContextExpect("fraction comparator", __ts2gml_value_get(fractions, 0), 0.1);
    var stable = [{ key: 2, order: 1 }, { key: 1, order: 2 }, { key: 2, order: 3 }];
    __ts2gml_collection_sort(stable, [function (left, right) { return left.key - right.key; }]);
    scopeContextExpect("stable comparator", __ts2gml_value_get(stable, 1).order, 1);
    scopeContextExpect("stable comparator second", __ts2gml_value_get(stable, 2).order, 3);
    (function (__ts2gml_assignment_675_3) {
        return __ts2gml_value_set(__ts2gml_assignment_675_3[0], __ts2gml_assignment_675_3[1], __ts2gml_value_get(__ts2gml_assignment_675_3[0], __ts2gml_assignment_675_3[1]) + 1);
    })([values, 2]);
    scopeContextExpect("postfix array mutation", __ts2gml_value_get(values, 2), 10);
    (function (__ts2gml_assignment_675_4) {
        return __ts2gml_value_set(__ts2gml_assignment_675_4[0], __ts2gml_assignment_675_4[1], __ts2gml_value_get(__ts2gml_assignment_675_4[0], __ts2gml_assignment_675_4[1]) + 1);
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
