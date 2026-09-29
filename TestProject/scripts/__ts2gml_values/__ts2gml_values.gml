function __ts2gml_value_nullish(_value) {
    return is_undefined(_value) || (is_ptr(_value) && _value == pointer_null);
}

function __ts2gml_value_method(_receiver, _function) {
    var _bound = method(_receiver, _function);
    if (!is_method(_function)) return _bound;
    var _scope = method_get_self(_function);
    if (!is_struct(_scope) || !variable_struct_exists(_scope, "__ts2gml_closure")) return _bound;
    // Keep the capture cells and lexical receiver shared when copying the binding.
    var _environment = {};
    var _names = variable_struct_get_names(_scope);
    for (var _index = 0; _index < array_length(_names); _index += 1) {
        var _name = _names[_index];
        variable_struct_set(_environment, _name, variable_struct_get(_scope, _name));
    }
    _environment.__ts2gml_receiver = method_get_self(_bound);
    return method(_environment, _bound);
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

function __ts2gml_value_key(_key) {
    if (!is_numeric(_key) || is_bool(_key)) return string(_key);
    if (sign(_key) == 0) return "0";
    if (is_nan(_key)) return "NaN";
    if (is_infinity(_key)) return _key < 0 ? "-Infinity" : "Infinity";
    // string(real) rounds fractional keys. JSON retains numeric precision;
    // normalize its decimal/exponent spelling to JavaScript property keys.
    var _sign = sign(_key) < 0 ? "-" : "";
    var _digits = string_lower(json_stringify(abs(_key)));
    var _exponent_at = string_pos("e", _digits);
    var _exponent = 0;
    if (_exponent_at > 0) {
        _exponent = real(string_delete(_digits, 1, _exponent_at));
        _digits = string_copy(_digits, 1, _exponent_at - 1);
    }
    var _point = string_pos(".", _digits);
    if (_point == 0) _point = string_length(_digits) + 1;
    else _digits = string_delete(_digits, _point, 1);
    _point = _point - 1 + _exponent;
    while (string_length(_digits) > 1 && string_char_at(_digits, 1) == "0") {
        _digits = string_delete(_digits, 1, 1);
        _point -= 1;
    }
    // Choose the shortest decimal that round-trips to this exact real. Use
    // sign(difference) because GML equality applies a near-zero tolerance.
    for (var _precision = 1; _precision < string_length(_digits); _precision += 1) {
        var _rounded = string_copy(_digits, 1, _precision);
        if (ord(string_char_at(_digits, _precision + 1)) >= ord("5")) {
            var _carry = _precision;
            while (_carry > 0 && string_char_at(_rounded, _carry) == "9") _carry -= 1;
            if (_carry == 0) _rounded = "1" + string_repeat("0", _precision);
            else _rounded = string_copy(_rounded, 1, _carry - 1)
                + chr(ord(string_char_at(_rounded, _carry)) + 1) + string_repeat("0", _precision - _carry);
        }
        var _candidate = real(_rounded + "e" + string(_point - _precision));
        if (sign(_candidate - abs(_key)) == 0) {
            _point += string_length(_rounded) - _precision;
            _digits = _rounded;
            break;
        }
    }
    while (string_length(_digits) > 1 && string_char_at(_digits, string_length(_digits)) == "0") {
        _digits = string_delete(_digits, string_length(_digits), 1);
    }
    var _length = string_length(_digits);
    if (_point > 0 && _point <= 21) {
        if (_point >= _length) return _sign + _digits + string_repeat("0", _point - _length);
        return _sign + string_insert(".", _digits, _point + 1);
    }
    if (_point <= 0 && _point > -6) return _sign + "0." + string_repeat("0", -_point) + _digits;
    return _sign + string_char_at(_digits, 1) + (_length > 1 ? "." + string_delete(_digits, 1, 1) : "")
        + "e" + (_point > 0 ? "+" : "") + string(_point - 1);
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
    if (is_struct(_target)) return variable_struct_get(_target, __ts2gml_value_key(_key));
    if (instance_exists(_target)) return variable_instance_get(_target, __ts2gml_value_key(_key));
    throw "TS2GML: indexed access requires an array, string, struct, or instance";
}

function __ts2gml_value_set(_target, _key, _value) {
    if (is_array(_target)) {
        if (!is_numeric(_key) || _key < 0 || floor(_key) != _key) throw "TS2GML: invalid array index";
        var _previous = array_length(_target);
        for (var _index = _previous; _index < _key; _index += 1) _target[_index] = undefined;
        array_set(_target, _key, _value);
    } else if (is_struct(_target)) variable_struct_set(_target, __ts2gml_value_key(_key), _value);
    else if (!is_string(_target) && instance_exists(_target)) variable_instance_set(_target, __ts2gml_value_key(_key), _value);
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
