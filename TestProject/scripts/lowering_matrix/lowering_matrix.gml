(function () {
    var LOWERING_MATRIX_GLOBAL = 17;
    global.LOWERING_MATRIX_GLOBAL = LOWERING_MATRIX_GLOBAL;
})();

function loweringMatrixAdd(left, right) {
    return left + right;
}

function loweringMatrixOptional(value) {
    return (function (__ts2gml_optional_104_1) {
        return (__ts2gml_optional_104_1 ?? undefined) == undefined ? undefined : (function (__ts2gml_optional_104_2) {
            return (__ts2gml_optional_104_2 ?? undefined) == undefined ? undefined : __ts2gml_optional_104_2.value;
        })(__ts2gml_optional_104_1.branch);
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

function loweringMatrixRun() {
    scopeContextExpect("top-level global", global.LOWERING_MATRIX_GLOBAL, 17);
    var count = 0;
    for (var __ts2gml_do_first_631_1 = true; __ts2gml_do_first_631_1 || count < 3; __ts2gml_do_first_631_1 = false) {
        count++;
        if (count < 3)
            continue;
    }
    scopeContextExpect("do-while continue", count, 3);
    var once = 0;
    for (var __ts2gml_do_first_631_2 = true; __ts2gml_do_first_631_2 || false; __ts2gml_do_first_631_2 = false) {
        once++;
    }
    scopeContextExpect("do-while first iteration", once, 1);
    var caught = 0;
    try {
        throw 7;
    }
    catch (__ts2gml_caught_631_3) {
        caught = 7;
    }
    finally {
        caught += 1;
    }
    scopeContextExpect("bindingless catch/finally", caught, 8);
    var spread = array_concat([], [0], [1, 2], [3], [4]);
    scopeContextExpect("array spread length", array_length(spread), 5);
    scopeContextExpect("array spread value", spread[4], 4);
    var pair = [2, 3];
    scopeContextExpect("script spread call", (function (__ts2gml_callable, __ts2gml_arguments) {
        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
    })(loweringMatrixAdd, array_concat([], pair)), 5);
    var clone = (function (__ts2gml_parts, __ts2gml_excluded, __ts2gml_ignore_nullish) {
        var __ts2gml_result = {};
        for (var __ts2gml_part_index = 0; __ts2gml_part_index < array_length(__ts2gml_parts); __ts2gml_part_index++) {
            var __ts2gml_part = __ts2gml_parts[__ts2gml_part_index];
            if (__ts2gml_ignore_nullish && (__ts2gml_part ?? undefined) == undefined)
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
    var __ts2gml_destructure_631_4 = [1, undefined, 3, 4], first = 0 < array_length(__ts2gml_destructure_631_4) ? __ts2gml_destructure_631_4[0] : undefined, second = (1 < array_length(__ts2gml_destructure_631_4) ? __ts2gml_destructure_631_4[1] : undefined) ?? 2, tail = 2 < array_length(__ts2gml_destructure_631_4) ? array_copy_while(__ts2gml_destructure_631_4, function () {
        return true;
    }, 2) : [];
    scopeContextExpect("array destructuring", first + second, 3);
    scopeContextExpect("array rest", array_length(tail), 2);
    scopeContextExpect("array rest value", tail[1], 4);
    var __ts2gml_destructure_631_5 = { nested: { value: 5 }, label: "ok", extra: 9 }, __ts2gml_destructure_631_6 = variable_struct_get(__ts2gml_destructure_631_5, "nested"), nestedValue = variable_struct_get(__ts2gml_destructure_631_6, "value"), renamed = variable_struct_get(__ts2gml_destructure_631_5, "label"), objectRest = (function (__ts2gml_parts, __ts2gml_excluded, __ts2gml_ignore_nullish) {
        var __ts2gml_result = {};
        for (var __ts2gml_part_index = 0; __ts2gml_part_index < array_length(__ts2gml_parts); __ts2gml_part_index++) {
            var __ts2gml_part = __ts2gml_parts[__ts2gml_part_index];
            if (__ts2gml_ignore_nullish && (__ts2gml_part ?? undefined) == undefined)
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
    })([__ts2gml_destructure_631_5], ["nested", "label"], false);
    scopeContextExpect("object destructuring", nestedValue, 5);
    scopeContextExpect("object rename", renamed, "ok");
    scopeContextExpect("object rest", objectRest.extra, 9);
    var arrayTotal = 0;
    for (var __ts2gml_iteration_values_631_7 = [1, 2, 3], __ts2gml_iteration_index_631_8 = 0; __ts2gml_iteration_index_631_8 < array_length(__ts2gml_iteration_values_631_7); __ts2gml_iteration_index_631_8++) {
        var value = __ts2gml_iteration_values_631_7[__ts2gml_iteration_index_631_8];
        arrayTotal += value;
    }
    scopeContextExpect("for-of", arrayTotal, 6);
    var keyCount = 0;
    for (var __ts2gml_iteration_values_631_9 = variable_struct_get_names({ first: 1, second: 2 }), __ts2gml_iteration_index_631_10 = 0; __ts2gml_iteration_index_631_10 < array_length(__ts2gml_iteration_values_631_9); __ts2gml_iteration_index_631_10++) {
        var key = __ts2gml_iteration_values_631_9[__ts2gml_iteration_index_631_10];
        if (key == "first" || key == "second")
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
    scopeContextExpect("method spread call", (function (__ts2gml_receiver, __ts2gml_arguments) {
        return method_call(method(__ts2gml_receiver, __ts2gml_receiver.add), __ts2gml_arguments);
    })(structure, array_concat([], pair)), 8);
    var holey = [1, undefined, 3];
    scopeContextExpect("array hole length", array_length(holey), 3);
    scopeContextExpect("array hole value", is_undefined(holey[1]), true);
    var shorthandValue = 6;
    var shorthand = { shorthandValue: shorthandValue };
    scopeContextExpect("plain arrow", square(3), 9);
    scopeContextExpect("object shorthand", shorthand.shorthandValue, 6);
    scopeContextExpect("template string", string_concat("value=", 2), "value=2");
    scopeContextExpect("Math lowering", max(2, power(2, 3)), 8);
    global.loweringMatrixEffect = 0;
    var nothing = (function (__ts2gml_void_631_11) {
        return undefined;
    })(loweringMatrixSetEffect());
    scopeContextExpect("void result", nothing, undefined);
    scopeContextExpect("void side effect", global.loweringMatrixEffect, 1);
    var switched = 0;
    for (var index = 0; index < 3; index++)
        switched += index;
    while (switched < 4)
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
