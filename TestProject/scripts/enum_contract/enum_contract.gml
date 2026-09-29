#macro EnumNumeric variable_global_get("__ts2gml_enum_EnumNumeric")

variable_global_set("__ts2gml_enum_EnumNumeric", {});

__ts2gml_value_set(EnumNumeric, __ts2gml_value_set(EnumNumeric, "Idle", 0), "Idle");

__ts2gml_value_set(EnumNumeric, __ts2gml_value_set(EnumNumeric, "Active", 4), "Active");

__ts2gml_value_set(EnumNumeric, __ts2gml_value_set(EnumNumeric, "Next", 5), "Next");

__ts2gml_value_set(EnumNumeric, __ts2gml_value_set(EnumNumeric, "Flags", 12), "Flags");

__ts2gml_value_set(EnumNumeric, __ts2gml_value_set(EnumNumeric, "Negative", -2), "Negative");

__ts2gml_value_set(EnumNumeric, __ts2gml_value_set(EnumNumeric, "Fraction", 1.5), "Fraction");

__ts2gml_value_set(EnumNumeric, __ts2gml_value_set(EnumNumeric, "Small", 0.0001), "Small");

__ts2gml_value_set(EnumNumeric, __ts2gml_value_set(EnumNumeric, "Smaller", 0.00001), "Smaller");

__ts2gml_value_set(EnumNumeric, __ts2gml_value_set(EnumNumeric, "Tiny", 0.0000001), "Tiny");

__ts2gml_value_set(EnumNumeric, __ts2gml_value_set(EnumNumeric, "NegativeSmall", -0.0000001), "NegativeSmall");

__ts2gml_value_set(EnumNumeric, __ts2gml_value_set(EnumNumeric, "Large", 1000000000000000000000.0), "Large");

__ts2gml_value_set(EnumNumeric, __ts2gml_value_set(EnumNumeric, "Alias", 4), "Alias");

#macro EnumText variable_global_get("__ts2gml_enum_EnumText")

variable_global_set("__ts2gml_enum_EnumText", {});

__ts2gml_value_set(EnumText, "Idle", "idle");

__ts2gml_value_set(EnumText, "Active", "active");

__ts2gml_value_set(EnumText, "Alias", "active");

__ts2gml_value_set(EnumText, "with-dash", "dash");

#macro EnumMixed variable_global_get("__ts2gml_enum_EnumMixed")

variable_global_set("__ts2gml_enum_EnumMixed", {});

__ts2gml_value_set(EnumMixed, __ts2gml_value_set(EnumMixed, "No", 0), "No");

__ts2gml_value_set(EnumMixed, "Yes", "yes");

#macro EnumBits variable_global_get("__ts2gml_enum_EnumBits")

variable_global_set("__ts2gml_enum_EnumBits", {});

__ts2gml_value_set(EnumBits, __ts2gml_value_set(EnumBits, "First", 1), "First");

__ts2gml_value_set(EnumBits, __ts2gml_value_set(EnumBits, "Second", 2), "Second");

#macro EnumMerged variable_global_get("__ts2gml_enum_EnumMerged")

variable_global_set("__ts2gml_enum_EnumMerged", {});

__ts2gml_value_set(EnumMerged, __ts2gml_value_set(EnumMerged, "First", 7), "First");

__ts2gml_value_set(EnumMerged, __ts2gml_value_set(EnumMerged, "Second", 8), "Second");

#macro EnumEmpty variable_global_get("__ts2gml_enum_EnumEmpty")

variable_global_set("__ts2gml_enum_EnumEmpty", {});

function enumLocal(__ts2gml_capture_2_parameter) {
    var __ts2gml_env_1 = { __ts2gml_capture_1: undefined, __ts2gml_capture_2: __ts2gml_capture_2_parameter, __ts2gml_capture_3: undefined };
    __ts2gml_env_1.__ts2gml_capture_1 = 0;
    var next = method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_closure: true }, function () {
        var __ts2gml_env_1 = self.__ts2gml_env_1;
        __ts2gml_env_1.__ts2gml_capture_1 += 1;
        return __ts2gml_env_1.__ts2gml_capture_2;
    });
    __ts2gml_env_1.__ts2gml_capture_3 = {};
    __ts2gml_value_set(__ts2gml_env_1.__ts2gml_capture_3, __ts2gml_value_set(__ts2gml_env_1.__ts2gml_capture_3, "First", next()), "First");
    __ts2gml_value_set(__ts2gml_env_1.__ts2gml_capture_3, __ts2gml_value_set(__ts2gml_env_1.__ts2gml_capture_3, "Second", __ts2gml_value_get(__ts2gml_env_1.__ts2gml_capture_3, "First") + 1), "Second");
    __ts2gml_value_set(__ts2gml_env_1.__ts2gml_capture_3, __ts2gml_value_set(__ts2gml_env_1.__ts2gml_capture_3, "Alias", __ts2gml_value_get(__ts2gml_env_1.__ts2gml_capture_3, "First")), "Alias");
    scopeContextExpect("enum initializer once", __ts2gml_env_1.__ts2gml_capture_1, 1);
    scopeContextExpect("enum computed reverse", __ts2gml_value_get(__ts2gml_env_1.__ts2gml_capture_3, __ts2gml_env_1.__ts2gml_capture_2), "Alias");
    return method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_closure: true }, function () {
        var __ts2gml_env_1 = self.__ts2gml_env_1;
        return __ts2gml_env_1.__ts2gml_capture_3.Second;
    });
}

function enumContractRun() {
    scopeContextExpect("enum implicit zero", EnumNumeric.Idle, 0);
    scopeContextExpect("enum explicit", EnumNumeric.Active, 4);
    scopeContextExpect("enum increment", EnumNumeric.Next, 5);
    scopeContextExpect("enum flags", EnumNumeric.Flags, 12);
    scopeContextExpect("enum negative", EnumNumeric.Negative, -2);
    scopeContextExpect("enum fraction", EnumNumeric.Fraction, 1.5);
    scopeContextExpect("enum reverse", __ts2gml_value_get(EnumNumeric, 0), "Idle");
    scopeContextExpect("enum duplicate reverse", __ts2gml_value_get(EnumNumeric, 4), "Alias");
    scopeContextExpect("enum negative reverse", __ts2gml_value_get(EnumNumeric, -2), "Negative");
    scopeContextExpect("enum fraction reverse", __ts2gml_value_get(EnumNumeric, 1.5), "Fraction");
    scopeContextExpect("enum string numeric reverse", __ts2gml_value_get(EnumNumeric, "1.5"), "Fraction");
    scopeContextExpect("enum small reverse", __ts2gml_value_get(EnumNumeric, 0.0001), "Small");
    scopeContextExpect("enum smaller reverse", __ts2gml_value_get(EnumNumeric, 0.00001), "Smaller");
    scopeContextExpect("enum small string reverse", __ts2gml_value_get(EnumNumeric, "0.00001"), "Smaller");
    scopeContextExpect("enum exponent reverse", __ts2gml_value_get(EnumNumeric, "1e-7"), "Tiny");
    scopeContextExpect("enum negative exponent reverse", __ts2gml_value_get(EnumNumeric, "-1e-7"), "NegativeSmall");
    scopeContextExpect("enum large reverse", __ts2gml_value_get(EnumNumeric, "1e+21"), "Large");
    scopeContextExpect("enum missing reverse", __ts2gml_value_get(EnumNumeric, 99), undefined);
    scopeContextExpect("enum string", EnumText.Active, "active");
    scopeContextExpect("enum string alias", EnumText.Alias, "active");
    scopeContextExpect("enum quoted key", __ts2gml_value_get(EnumText, "with-dash"), "dash");
    scopeContextExpect("enum string no reverse", variable_struct_exists(EnumText, "active"), false);
    scopeContextExpect("enum mixed number", EnumMixed.No, 0);
    scopeContextExpect("enum mixed string", EnumMixed.Yes, "yes");
    var numericValues = [];
    var textValues = [];
    var mixedValues = [];
    __ts2gml_collection_push(numericValues, [__ts2gml_guard_value(EnumNumeric.Active, ["union", [["literal", 0], ["literal", 4], ["literal", 5], ["literal", 12], ["literal", -2], ["literal", 1.5], ["literal", 0.0001], ["literal", 0.00001], ["literal", 0.0000001], ["literal", -0.0000001], ["literal", 1000000000000000000000.0]]], "EnumNumeric", "push() argument 1")]);
    __ts2gml_collection_push(textValues, [__ts2gml_guard_value(EnumText.Active, ["union", [["literal", "idle"], ["literal", "active"], ["literal", "dash"]]], "EnumText", "push() argument 1")]);
    __ts2gml_collection_push(mixedValues, [__ts2gml_guard_value(EnumMixed.Yes, ["union", [["literal", 0], ["literal", "yes"]]], "EnumMixed", "push() argument 1")]);
    scopeContextExpect("enum numeric collection guard", __ts2gml_value_get(numericValues, 0), 4);
    scopeContextExpect("enum string collection guard", __ts2gml_value_get(textValues, 0), "active");
    scopeContextExpect("enum mixed collection guard", __ts2gml_value_get(mixedValues, 0), "yes");
    scopeContextExpect("enum const", EnumBits.Second, 2);
    scopeContextExpect("enum merged", EnumMerged.Second, 8);
    scopeContextExpect("enum empty", (function (__ts2gml_typeof_value) {
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
    })(EnumEmpty), "object");
    var alias = EnumNumeric;
    var copy = (function (__ts2gml_parts, __ts2gml_excluded, __ts2gml_ignore_nullish) {
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
    })([EnumNumeric], [], true);
    scopeContextExpect("enum numeric key in", variable_struct_exists(copy, __ts2gml_value_key(0)), true);
    __ts2gml_remove(copy, 0);
    scopeContextExpect("enum numeric key delete", variable_struct_exists(copy, __ts2gml_value_key(0)), false);
    scopeContextExpect("enum object alias", __ts2gml_value_equal(alias, EnumNumeric), true);
    scopeContextExpect("enum alias lookup", alias.Active, 4);
    var __ts2gml_destructure_3103_1 = EnumNumeric, Active = variable_struct_get(__ts2gml_destructure_3103_1, "Active");
    scopeContextExpect("enum destructuring", Active, 4);
    var members = 0;
    for (var __ts2gml_iteration_values_3103_2 = variable_struct_get_names(EnumText), __ts2gml_iteration_index_3103_3 = 0; __ts2gml_iteration_index_3103_3 < array_length(__ts2gml_iteration_values_3103_2); __ts2gml_iteration_index_3103_3++) {
        var key = __ts2gml_value_get(__ts2gml_iteration_values_3103_2, __ts2gml_iteration_index_3103_3);
        members += 1;
    }
    scopeContextExpect("enum enumeration", members, 4);
    var first = enumLocal(10);
    var second = enumLocal(20);
    scopeContextExpect("enum local closure", first(), 11);
    scopeContextExpect("enum separate calls", second(), 21);
    show_debug_message("TS2GML_ENUM_CONTRACT_OK");
}
