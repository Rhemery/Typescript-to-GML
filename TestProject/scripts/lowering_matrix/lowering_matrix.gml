global.LOWERING_MATRIX_GLOBAL = 17;

function loweringMatrixAdd(left, right) {
    return left + right;
}

function loweringMatrixOptional(value) {
    return (function (__ts2gml_optional_108_1) {
        return __ts2gml_value_nullish(__ts2gml_optional_108_1) ? undefined : (function (__ts2gml_optional_108_2) {
            return __ts2gml_value_nullish(__ts2gml_optional_108_2) ? undefined : __ts2gml_optional_108_2.value;
        })(__ts2gml_optional_108_1.branch);
    })(value);
}

function loweringMatrixSetEffect() {
    global.loweringMatrixEffect = 1;
    return 9;
}

function LoweringMatrixBase(_base) constructor {
    self.base = 1;
    self.base = _base;
}

function LoweringMatrixStruct(_base) : LoweringMatrixBase(_base) constructor {
    self.doubled = self.double();
    static double = function() {
        return self.base * 2;
    };
    static add = function(_left, _right) {
        return self.base + _left + _right;
    };
}

function LoweringMatrixNamedMembers() constructor {
    self.length = 7;
    static concat = function(_left, _right) {
        return _left + _right;
    };
    static entries = function(_value) {
        return _value + 1;
    };
    static includes = function(_value, _offset) {
        return __ts2gml_value_equal(_value, _offset);
    };
    static indexOf = function(_value, _offset) {
        return _value + _offset;
    };
    static join = function(_separator) {
        return _separator;
    };
    static keys = function(_value) {
        return _value + 2;
    };
    static pop = function(_value) {
        return _value + 3;
    };
    static push = function(_left, _right) {
        return _left * _right;
    };
    static reverse = function(_value) {
        return _value + 4;
    };
    static shift = function(_value) {
        return _value + 5;
    };
    static sort = function(_value, _ascending) {
        return _value + ((__ts2gml_value_truthy(_ascending) ? 1 : 0));
    };
    static unshift = function(_left, _right) {
        return _left - _right;
    };
    static values = function(_value) {
        return _value + 6;
    };
}

function LoweringMatrixStatics() constructor {
    self.count = 100;
}

method(__ts2gml_class_statics(LoweringMatrixStatics, true), function() {
    self.read = method(undefined, function() {
        return variable_struct_get(__ts2gml_class_statics(self.__ts2gml_class), "count");
    });
    self.add = method(undefined, function(_value) {
        __ts2gml_class_statics(self.__ts2gml_class).count += _value;
        return variable_struct_get(__ts2gml_class_statics(self.__ts2gml_class), "count");
    });
    self.identity = method(undefined, function() {
        return self.__ts2gml_class;
    });
    self.reader = method(undefined, function() {
        return method(self, function () { return variable_struct_get(__ts2gml_class_statics(self.__ts2gml_class), "count"); });
    });
    self.push = method(undefined, function(_value) {
        return variable_struct_get(__ts2gml_class_statics(self.__ts2gml_class), "count") + _value;
    });
    self.count = 2;
    self.initial = __ts2gml_class_statics(self.__ts2gml_class).read();
    self.label = undefined;
})();

function LoweringMatrixStaticChild() : LoweringMatrixStatics() constructor {}

method(__ts2gml_class_statics(LoweringMatrixStaticChild, true), function() {
    static_set(self, __ts2gml_class_statics(LoweringMatrixStatics));
})();

function loweringMatrixRun() {
    semanticContractRun();
    staticContractRun();
    nativeStaticContractRun();
    scopeContextExpect("static before construction", variable_struct_get(__ts2gml_class_statics(LoweringMatrixStatics), "initial"), 2);
    scopeContextExpect("uninitialized static", variable_struct_get(__ts2gml_class_statics(LoweringMatrixStatics), "label"), undefined);
    scopeContextExpect("inherited static", __ts2gml_class_statics(LoweringMatrixStaticChild).read(), 2);
    scopeContextExpect("static receiver identity", __ts2gml_class_statics(LoweringMatrixStaticChild).identity(), LoweringMatrixStaticChild);
    __ts2gml_class_statics(LoweringMatrixStaticChild).count = 7;
    scopeContextExpect("child static write", __ts2gml_class_statics(LoweringMatrixStaticChild).read(), 7);
    scopeContextExpect("parent static unchanged", __ts2gml_class_statics(LoweringMatrixStatics).read(), 2);
    var staticAlias = LoweringMatrixStaticChild;
    __ts2gml_class_statics(staticAlias).count += 1;
    scopeContextExpect("aliased static", variable_struct_get(__ts2gml_class_statics(staticAlias), "count"), 8);
    scopeContextExpect("static spread call", (function (__ts2gml_unused, staticAlias) {
        var __ts2gml_receiver = __ts2gml_class_statics(staticAlias);
        var __ts2gml_method = __ts2gml_receiver.add;
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, array_concat([], [3]));
    })(undefined, staticAlias), 11);
    scopeContextExpect("static collection name", __ts2gml_collection_push(__ts2gml_class_statics(staticAlias), [1]), 12);
    var staticReader = __ts2gml_class_statics(staticAlias).reader();
    scopeContextExpect("static lexical arrow", staticReader(), 11);
    var staticInstance = new LoweringMatrixStatics();
    scopeContextExpect("static and instance field", staticInstance.count, 100);
    scopeContextExpect("construction preserves static", __ts2gml_class_statics(LoweringMatrixStatics).read(), 2);
    scopeContextExpect("top-level global", global.LOWERING_MATRIX_GLOBAL, 17);
    var count = 0;
    for (var __ts2gml_do_first_1921_1 = true; __ts2gml_do_first_1921_1 || __ts2gml_value_truthy(count < 3); __ts2gml_do_first_1921_1 = false) {
        count++;
        if (__ts2gml_value_truthy(count < 3))
            continue;
    }
    scopeContextExpect("do-while continue", count, 3);
    var once = 0;
    for (var __ts2gml_do_first_1921_2 = true; __ts2gml_do_first_1921_2 || __ts2gml_value_truthy(false); __ts2gml_do_first_1921_2 = false) {
        once++;
    }
    scopeContextExpect("do-while first iteration", once, 1);
    var caught = 0;
    try {
        throw 7;
    }
    catch (__ts2gml_caught_1921_3) {
        caught = 7;
    }
    finally {
        caught += 1;
    }
    scopeContextExpect("bindingless catch/finally", caught, 8);
    var spread = array_concat([], [0], [1, 2], [3], [4]);
    scopeContextExpect("array spread length", array_length(spread), 5);
    scopeContextExpect("array spread value", __ts2gml_value_get(spread, 4), 4);
    var pair = [2, 3];
    scopeContextExpect("script spread call", (function (__ts2gml_unused, pair) {
        var __ts2gml_callable = loweringMatrixAdd;
        var __ts2gml_arguments = array_concat([], pair);
        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
    })(undefined, pair), 5);
    var clone = (function (__ts2gml_parts, __ts2gml_excluded, __ts2gml_ignore_nullish) {
        var __ts2gml_result = {};
        for (var __ts2gml_part_index = 0; __ts2gml_part_index < array_length(__ts2gml_parts); __ts2gml_part_index++) {
            var __ts2gml_part = __ts2gml_parts[__ts2gml_part_index];
            if (__ts2gml_ignore_nullish && __ts2gml_value_nullish(__ts2gml_part))
                continue;
            var __ts2gml_names = variable_struct_get_names(__ts2gml_part);
            for (var __ts2gml_name_index = 0; __ts2gml_name_index < array_length(__ts2gml_names); __ts2gml_name_index++) {
                var __ts2gml_name = __ts2gml_names[__ts2gml_name_index];
                if (!array_contains(__ts2gml_excluded, __ts2gml_name)) {
                    variable_struct_set(__ts2gml_result, __ts2gml_name, variable_struct_get(__ts2gml_part, __ts2gml_name));
                }
            }
        }
        return __ts2gml_result;
    })([{ before: 1 }, { middle: 2 }, { after: 3 }], [], true);
    scopeContextExpect("object spread", clone.before + clone.middle + clone.after, 6);
    var __ts2gml_destructure_1921_4 = [1, undefined, 3, 4], first = 0 < array_length(__ts2gml_destructure_1921_4) ? __ts2gml_destructure_1921_4[0] : undefined, __ts2gml_default_1921_5 = 1 < array_length(__ts2gml_destructure_1921_4) ? __ts2gml_destructure_1921_4[1] : undefined, second = is_undefined(__ts2gml_default_1921_5) ? 2 : __ts2gml_default_1921_5, tail = 2 < array_length(__ts2gml_destructure_1921_4) ? array_copy_while(__ts2gml_destructure_1921_4, function () {
        return true;
    }, 2) : [];
    scopeContextExpect("array destructuring", first + second, 3);
    scopeContextExpect("array rest", array_length(tail), 2);
    scopeContextExpect("array rest value", __ts2gml_value_get(tail, 1), 4);
    var __ts2gml_destructure_1921_6 = { nested: { value: 5 }, label: "ok", extra: 9 }, __ts2gml_destructure_1921_7 = variable_struct_get(__ts2gml_destructure_1921_6, "nested"), nestedValue = variable_struct_get(__ts2gml_destructure_1921_7, "value"), renamed = variable_struct_get(__ts2gml_destructure_1921_6, "label"), objectRest = (function (__ts2gml_parts, __ts2gml_excluded, __ts2gml_ignore_nullish) {
        var __ts2gml_result = {};
        for (var __ts2gml_part_index = 0; __ts2gml_part_index < array_length(__ts2gml_parts); __ts2gml_part_index++) {
            var __ts2gml_part = __ts2gml_parts[__ts2gml_part_index];
            if (__ts2gml_ignore_nullish && __ts2gml_value_nullish(__ts2gml_part))
                continue;
            var __ts2gml_names = variable_struct_get_names(__ts2gml_part);
            for (var __ts2gml_name_index = 0; __ts2gml_name_index < array_length(__ts2gml_names); __ts2gml_name_index++) {
                var __ts2gml_name = __ts2gml_names[__ts2gml_name_index];
                if (!array_contains(__ts2gml_excluded, __ts2gml_name)) {
                    variable_struct_set(__ts2gml_result, __ts2gml_name, variable_struct_get(__ts2gml_part, __ts2gml_name));
                }
            }
        }
        return __ts2gml_result;
    })([__ts2gml_destructure_1921_6], ["nested", "label"], false);
    scopeContextExpect("object destructuring", nestedValue, 5);
    scopeContextExpect("object rename", renamed, "ok");
    scopeContextExpect("object rest", objectRest.extra, 9);
    var arrayTotal = 0;
    for (var __ts2gml_iteration_values_1921_8 = [1, 2, 3], __ts2gml_iteration_index_1921_9 = 0; __ts2gml_iteration_index_1921_9 < array_length(__ts2gml_iteration_values_1921_8); __ts2gml_iteration_index_1921_9++) {
        var value = __ts2gml_value_get(__ts2gml_iteration_values_1921_8, __ts2gml_iteration_index_1921_9);
        arrayTotal += value;
    }
    scopeContextExpect("for-of", arrayTotal, 6);
    var keyCount = 0;
    for (var __ts2gml_iteration_values_1921_10 = variable_struct_get_names({ first: 1, second: 2 }), __ts2gml_iteration_index_1921_11 = 0; __ts2gml_iteration_index_1921_11 < array_length(__ts2gml_iteration_values_1921_10); __ts2gml_iteration_index_1921_11++) {
        var key = __ts2gml_value_get(__ts2gml_iteration_values_1921_10, __ts2gml_iteration_index_1921_11);
        if (__ts2gml_value_truthy((function (__ts2gml_logical_1921_12, key) {
            return __ts2gml_value_truthy(__ts2gml_logical_1921_12) ? __ts2gml_logical_1921_12 : __ts2gml_value_equal(key, "second");
        })(__ts2gml_value_equal(key, "first"), key)))
            keyCount++;
    }
    scopeContextExpect("for-in", keyCount, 2);
    var optionalValue = { branch: { value: 11 } };
    scopeContextExpect("optional chain value", loweringMatrixOptional(optionalValue), 11);
    scopeContextExpect("optional chain undefined", loweringMatrixOptional(undefined), undefined);
    var square = function (value) { return value * value; };
    scopeContextExpect("typeof undefined", (function (__ts2gml_typeof_value) {
        if (is_undefined(__ts2gml_typeof_value))
            return "undefined";
        if (is_bool(__ts2gml_typeof_value))
            return "boolean";
        if (is_numeric(__ts2gml_typeof_value))
            return "number";
        if (is_string(__ts2gml_typeof_value))
            return "string";
        if (is_callable(__ts2gml_typeof_value))
            return "function";
        return "object";
    })(undefined), "undefined");
    scopeContextExpect("typeof boolean", (function (__ts2gml_typeof_value) {
        if (is_undefined(__ts2gml_typeof_value))
            return "undefined";
        if (is_bool(__ts2gml_typeof_value))
            return "boolean";
        if (is_numeric(__ts2gml_typeof_value))
            return "number";
        if (is_string(__ts2gml_typeof_value))
            return "string";
        if (is_callable(__ts2gml_typeof_value))
            return "function";
        return "object";
    })(true), "boolean");
    scopeContextExpect("typeof number", (function (__ts2gml_typeof_value) {
        if (is_undefined(__ts2gml_typeof_value))
            return "undefined";
        if (is_bool(__ts2gml_typeof_value))
            return "boolean";
        if (is_numeric(__ts2gml_typeof_value))
            return "number";
        if (is_string(__ts2gml_typeof_value))
            return "string";
        if (is_callable(__ts2gml_typeof_value))
            return "function";
        return "object";
    })(1), "number");
    scopeContextExpect("typeof string", (function (__ts2gml_typeof_value) {
        if (is_undefined(__ts2gml_typeof_value))
            return "undefined";
        if (is_bool(__ts2gml_typeof_value))
            return "boolean";
        if (is_numeric(__ts2gml_typeof_value))
            return "number";
        if (is_string(__ts2gml_typeof_value))
            return "string";
        if (is_callable(__ts2gml_typeof_value))
            return "function";
        return "object";
    })("value"), "string");
    scopeContextExpect("typeof function", (function (__ts2gml_typeof_value) {
        if (is_undefined(__ts2gml_typeof_value))
            return "undefined";
        if (is_bool(__ts2gml_typeof_value))
            return "boolean";
        if (is_numeric(__ts2gml_typeof_value))
            return "number";
        if (is_string(__ts2gml_typeof_value))
            return "string";
        if (is_callable(__ts2gml_typeof_value))
            return "function";
        return "object";
    })(square), "function");
    scopeContextExpect("typeof object", (function (__ts2gml_typeof_value) {
        if (is_undefined(__ts2gml_typeof_value))
            return "undefined";
        if (is_bool(__ts2gml_typeof_value))
            return "boolean";
        if (is_numeric(__ts2gml_typeof_value))
            return "number";
        if (is_string(__ts2gml_typeof_value))
            return "string";
        if (is_callable(__ts2gml_typeof_value))
            return "function";
        return "object";
    })({}), "object");
    scopeContextExpect("typeof null", "object", "object");
    scopeContextExpect("in operator", variable_struct_exists(clone, "middle"), true);
    var structure = new LoweringMatrixStruct(3);
    scopeContextExpect("constructor inheritance", structure.base, 3);
    scopeContextExpect("field calling method", structure.doubled, 6);
    scopeContextExpect("instanceof child", is_instanceof(structure, LoweringMatrixStruct), true);
    scopeContextExpect("instanceof parent", is_instanceof(structure, LoweringMatrixBase), true);
    scopeContextExpect("method spread call", (function (__ts2gml_unused, structure, pair) {
        var __ts2gml_receiver = structure;
        var __ts2gml_method = __ts2gml_receiver.add;
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, array_concat([], pair));
    })(undefined, structure, pair), 8);
    var namedMembers = new LoweringMatrixNamedMembers();
    scopeContextExpect("authored length member", __ts2gml_collection_length(namedMembers), 7);
    scopeContextExpect("authored concat member", __ts2gml_collection_concat(namedMembers, [2, 3]), 5);
    scopeContextExpect("authored entries member", __ts2gml_collection_entries(namedMembers, [4]), 5);
    scopeContextExpect("authored includes member", __ts2gml_collection_includes(namedMembers, [6, 6]), true);
    scopeContextExpect("authored indexOf member", __ts2gml_collection_index_of(namedMembers, [7, 8]), 15);
    scopeContextExpect("authored join member", __ts2gml_collection_join(namedMembers, ["joined"]), "joined");
    scopeContextExpect("authored keys member", __ts2gml_collection_keys(namedMembers, [9]), 11);
    scopeContextExpect("authored pop member", __ts2gml_collection_pop(namedMembers, [10]), 13);
    scopeContextExpect("authored push member", __ts2gml_collection_push(namedMembers, [3, 4]), 12);
    scopeContextExpect("authored reverse member", __ts2gml_collection_reverse(namedMembers, [11]), 15);
    scopeContextExpect("authored shift member", __ts2gml_collection_shift(namedMembers, [12]), 17);
    scopeContextExpect("authored sort member", __ts2gml_collection_sort(namedMembers, [13, true]), 14);
    scopeContextExpect("authored unshift member", __ts2gml_collection_unshift(namedMembers, [15, 2]), 13);
    scopeContextExpect("authored values member", __ts2gml_collection_values(namedMembers, [14]), 20);
    var holey = [1, undefined, 3];
    scopeContextExpect("array hole length", array_length(holey), 3);
    scopeContextExpect("array hole value", __ts2gml_value_truthy(is_undefined(__ts2gml_value_get(holey, 1))), true);
    var nativeValues = [1, 2];
    scopeContextExpect("array push result", __ts2gml_collection_push(nativeValues, [__ts2gml_guard_value(3, ["number"], "number", "push() argument 1")]), 3);
    var runtimeGuardCaught = false;
    try {
        var wrongValue = "not a number";
        __ts2gml_collection_push(nativeValues, [__ts2gml_guard_value(wrongValue, ["number"], "number", "push() argument 1")]);
    }
    catch (__ts2gml_caught_1921_13) {
        runtimeGuardCaught = true;
    }
    scopeContextExpect("maximum array guard", runtimeGuardCaught, true);
    scopeContextExpect("array length property", __ts2gml_collection_length(nativeValues), 3);
    __ts2gml_collection_reverse(nativeValues, []);
    scopeContextExpect("array reverse", __ts2gml_value_get(nativeValues, 0), 3);
    __ts2gml_remove(nativeValues, 1);
    scopeContextExpect("array delete", __ts2gml_collection_length(nativeValues), 2);
    var map = new __ts2gml_Map([["score", 1]]);
    map.set(__ts2gml_guard_value("lives", ["string"], "string", "set() argument 1"), __ts2gml_guard_value(3, ["number"], "number", "set() argument 2"));
    scopeContextExpect("map get", map.get("lives"), 3);
    scopeContextExpect("map size", map.size, 2);
    scopeContextExpect("map delete keyword", __ts2gml_remove(map, "score"), true);
    scopeContextExpect("map delete removed key", map.has("score"), false);
    var mapKeys = array_concat([], __ts2gml_collection_keys(map, []));
    scopeContextExpect("map keys", __ts2gml_value_get(mapKeys, 0), "lives");
    var set = new __ts2gml_Set(["ready", "ready"]);
    set.add(__ts2gml_guard_value("running", ["string"], "string", "add() argument 1"));
    scopeContextExpect("set unique size", set.size, 2);
    scopeContextExpect("set has", set.has("running"), true);
    scopeContextExpect("set delete keyword", __ts2gml_remove(set, "ready"), true);
    var list = new __ts2gml_List([1, 2]);
    __ts2gml_collection_push(list, [__ts2gml_guard_value(3, ["number"], "number", "push() argument 1")]);
    scopeContextExpect("list get", list.get(2), 3);
    scopeContextExpect("list remove", list.remove(0), true);
    scopeContextExpect("list size", list.size, 2);
    var grid = new __ts2gml_Grid(2, 2);
    grid.set(1, 1, __ts2gml_guard_value("cell", ["string"], "string", "set() argument 3"));
    scopeContextExpect("grid get", grid.get(1, 1), "cell");
    var queue = new __ts2gml_Queue();
    queue.enqueue(__ts2gml_guard_value(1, ["number"], "number", "enqueue() argument 1")).enqueue(__ts2gml_guard_value(2, ["number"], "number", "enqueue() argument 1"));
    scopeContextExpect("queue order", queue.dequeue(), 1);
    var stack = new __ts2gml_Stack();
    __ts2gml_collection_push(__ts2gml_collection_push(stack, [__ts2gml_guard_value(1, ["number"], "number", "push() argument 1")]), [__ts2gml_guard_value(2, ["number"], "number", "push() argument 1")]);
    scopeContextExpect("stack order", __ts2gml_collection_pop(stack, []), 2);
    var priority = new __ts2gml_PriorityQueue();
    priority.add(__ts2gml_guard_value("later", ["string"], "string", "add() argument 1"), 1).add(__ts2gml_guard_value("first", ["string"], "string", "add() argument 1"), 10);
    scopeContextExpect("priority max", priority.max(), "first");
    scopeContextExpect("priority delete max", priority.deleteMax(), "first");
    map.destroy();
    set.destroy();
    list.destroy();
    grid.destroy();
    queue.destroy();
    stack.destroy();
    priority.destroy();
    map.destroy();
    var replacementMap = new __ts2gml_Map();
    replacementMap.set(__ts2gml_guard_value("owned", ["string"], "string", "set() argument 1"), __ts2gml_guard_value(7, ["number"], "number", "set() argument 2"));
    var destroyedRejected = false;
    try {
        map.set(__ts2gml_guard_value("owned", ["string"], "string", "set() argument 1"), __ts2gml_guard_value(99, ["number"], "number", "set() argument 2"));
    }
    catch (__ts2gml_caught_1921_14) {
        destroyedRejected = true;
    }
    scopeContextExpect("destroyed collection rejects reuse", destroyedRejected, true);
    scopeContextExpect("destroyed collection preserves reused native handle", replacementMap.get("owned"), 7);
    replacementMap.destroy();
    var nativeMap = ds_map_create();
    ds_map_set(nativeMap, "ready", 1);
    scopeContextExpect("native predicate boolean", __ts2gml_value_truthy(ds_map_exists(nativeMap, "ready")), true);
    ds_map_destroy(nativeMap);
    var shorthandValue = 6;
    var shorthand = { shorthandValue: shorthandValue };
    scopeContextExpect("plain arrow", square(3), 9);
    scopeContextExpect("object shorthand", shorthand.shorthandValue, 6);
    scopeContextExpect("template string", string_concat("value=", 2), "value=2");
    scopeContextExpect("Math lowering", __ts2gml_value_max(2, power(2, 3)), 8);
    global.loweringMatrixEffect = 0;
    var nothing = (function (__ts2gml_void_1921_15) {
        return undefined;
    })(loweringMatrixSetEffect());
    scopeContextExpect("void result", nothing, undefined);
    scopeContextExpect("void side effect", global.loweringMatrixEffect, 1);
    var switched = 0;
    for (var index = 0; __ts2gml_value_truthy(index < 3); index++)
        switched += index;
    while (__ts2gml_value_truthy(switched < 4))
        switched++;
    switch (switched) {
        case 4:
            switched += 1;
            break;
        default:
            switched = -1;
    }
    scopeContextExpect("ordinary control flow", switched, 5);
}
