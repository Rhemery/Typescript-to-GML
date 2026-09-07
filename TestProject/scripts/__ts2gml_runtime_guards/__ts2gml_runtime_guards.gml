function __ts2gml_guard_object(_value, _expected, _context) {
    if (!instance_exists(_value)) {
        throw string_concat("ts2gml runtime type guard: ", _context, " is not an instance of ", object_get_name(_expected));
    }
    var _actual = _value.object_index;
    if (_actual != _expected && !object_is_ancestor(_actual, _expected)) {
        throw string_concat("ts2gml runtime type guard: ", _context, " is ", object_get_name(_actual), ", expected ", object_get_name(_expected));
    }
    return _value;
}

function __ts2gml_value_matches(_value, _descriptor) {
    var _kind = _descriptor[0];
    var _actual;
    var _index;
    var _members;
    switch (_kind) {
        case "number": return is_real(_value);
        case "string": return is_string(_value);
        case "boolean": return is_bool(_value);
        case "undefined": return is_undefined(_value);
        case "null": return is_ptr(_value) && _value == pointer_null;
        case "literal": return __ts2gml_value_equal(_value, _descriptor[1]);
        case "object":
            if (!instance_exists(_value)) return false;
            _actual = _value.object_index;
            return _actual == _descriptor[1] || object_is_ancestor(_actual, _descriptor[1]);
        case "constructor": return is_struct(_value) && is_instanceof(_value, _descriptor[1]);
        case "array":
            if (!is_array(_value)) return false;
            for (_index = 0; _index < array_length(_value); _index += 1) {
                if (!__ts2gml_value_matches(_value[_index], _descriptor[1])) return false;
            }
            return true;
        case "union":
            _members = _descriptor[1];
            for (_index = 0; _index < array_length(_members); _index += 1) {
                if (__ts2gml_value_matches(_value, _members[_index])) return true;
            }
            return false;
        case "never": return false;
    }
    return true;
}

function __ts2gml_guard_value(_value, _descriptor, _expected, _context) {
    if (!__ts2gml_value_matches(_value, _descriptor)) {
        throw string_concat("ts2gml runtime type guard: ", _context, " expected ", _expected);
    }
    return _value;
}
