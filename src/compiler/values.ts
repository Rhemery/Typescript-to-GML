export const valueRuntimeScriptName = "__ts2gml_values";

export function usesValueRuntime(gml: string): boolean {
  return /\b__ts2gml_value_\w+\s*\(/.test(gml);
}

export const valueRuntimeGml = `function __ts2gml_value_nullish(_value) {
    return is_undefined(_value) || (is_ptr(_value) && _value == pointer_null);
}

function __ts2gml_value_truthy(_value) {
    if (__ts2gml_value_nullish(_value)) return false;
    if (is_bool(_value)) return _value;
    if (is_numeric(_value)) return _value != 0 && !is_nan(_value);
    if (is_string(_value)) return string_length(_value) != 0;
    return true;
}

function __ts2gml_value_equal(_left, _right) {
    if (is_undefined(_left) || is_undefined(_right)) return is_undefined(_left) && is_undefined(_right);
    if (is_bool(_left) != is_bool(_right)) return false;
    if (is_string(_left) != is_string(_right)) return false;
    if (is_ptr(_left) != is_ptr(_right)) return false;
    if (is_numeric(_left) != is_numeric(_right)) return false;
    if (is_numeric(_left) && (is_nan(_left) || is_nan(_right))) return false;
    return _left == _right;
}

function __ts2gml_value_round(_value) {
    if (is_nan(_value) || is_infinity(_value)) return _value;
    var _floor = floor(_value);
    return _value - _floor < 0.5 ? _floor : _floor + 1;
}

function __ts2gml_value_random() { return random(1); }

function __ts2gml_value_min() {
    var _result = infinity;
    for (var _index = 0; _index < argument_count; _index += 1) {
        var _value = argument[_index];
        if (is_nan(_value)) return _value;
        if (_value < _result) _result = _value;
    }
    return _result;
}

function __ts2gml_value_max() {
    var _result = -infinity;
    for (var _index = 0; _index < argument_count; _index += 1) {
        var _value = argument[_index];
        if (is_nan(_value)) return _value;
        if (_value > _result) _result = _value;
    }
    return _result;
}

function __ts2gml_value_get(_target, _key) {
    if (is_array(_target)) {
        if (!is_numeric(_key)) throw "TS2GML: an array index must be numeric";
        return _key >= 0 && _key < array_length(_target) && floor(_key) == _key ? _target[_key] : undefined;
    }
    if (is_string(_target)) {
        if (!is_numeric(_key)) throw "TS2GML: a string index must be numeric";
        return _key >= 0 && _key < string_length(_target) && floor(_key) == _key ? string_char_at(_target, _key + 1) : undefined;
    }
    if (is_struct(_target)) return variable_struct_get(_target, string(_key));
    if (instance_exists(_target)) return variable_instance_get(_target, string(_key));
    throw "TS2GML: indexed access requires an array, string, struct, or instance";
}

function __ts2gml_value_set(_target, _key, _value) {
    if (is_array(_target)) {
        if (!is_numeric(_key) || _key < 0 || floor(_key) != _key) throw "TS2GML: invalid array index";
        var _previous = array_length(_target);
        for (var _index = _previous; _index < _key; _index += 1) _target[_index] = undefined;
        array_set(_target, _key, _value);
    } else if (is_struct(_target)) variable_struct_set(_target, string(_key), _value);
    else if (!is_string(_target) && instance_exists(_target)) variable_instance_set(_target, string(_key), _value);
    else throw "TS2GML: indexed assignment requires an array, struct, or instance";
    return _value;
}

function __ts2gml_value_set_length(_target, _value) {
    if (is_array(_target)) {
        if (!is_numeric(_value) || _value < 0 || floor(_value) != _value) throw "TS2GML: invalid array length";
        var _previous = array_length(_target);
        array_resize(_target, _value);
        for (var _index = _previous; _index < _value; _index += 1) _target[_index] = undefined;
    } else __ts2gml_value_set(_target, "length", _value);
    return _value;
}
`;
