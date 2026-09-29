export const collectionRuntimeGml = `function __ts2gml_collection_handle(_handle) {
    if (is_undefined(_handle)) throw "TS2GML: this collection has been destroyed";
    return _handle;
}

function __ts2gml_remove(_target, _key) {
    if (is_array(_target)) {
        if (_key < 0 || _key >= array_length(_target)) return true;
        array_delete(_target, _key, 1);
        return true;
    }
    if (is_real(_target)) {
        if (ds_exists(_target, ds_type_list)) {
            if (_key >= 0 && _key < ds_list_size(_target)) ds_list_delete(_target, _key);
            return true;
        }
        if (ds_exists(_target, ds_type_map)) {
            if (ds_map_exists(_target, _key)) ds_map_delete(_target, _key);
            return true;
        }
        if (ds_exists(_target, ds_type_priority)) {
            if (!is_undefined(ds_priority_find_priority(_target, _key))) ds_priority_delete_value(_target, _key);
            return true;
        }
    }
    if (!is_struct(_target)) return true;
    if (variable_struct_exists(_target, "__ts2gml_collection_kind")) {
        return _target.remove(_key);
    }
    _key = __ts2gml_value_key(_key);
    var _exists = variable_struct_exists(_target, _key);
    if (_exists) variable_struct_remove(_target, _key);
    return true;
}

function __ts2gml_collection_kind_of(_target) {
    if (!is_struct(_target) || !variable_struct_exists(_target, "__ts2gml_collection_kind")) return undefined;
    return _target.__ts2gml_collection_kind;
}

function __ts2gml_call_member(_target, _function, _arguments) {
    return method_call(method(_target, _function), _arguments);
}

function __ts2gml_collection_concat(_target, _arguments) {
    if (is_string(_target)) return string_concat_ext(array_concat([_target], _arguments));
    var _kind = __ts2gml_collection_kind_of(_target);
    if (is_array(_target) || _kind == "List") {
        var _result = is_array(_target) ? array_concat([], _target) : _target.toArray();
        for (var _index = 0; _index < array_length(_arguments); _index += 1) {
            var _value = _arguments[_index];
            if (is_array(_value)) _result = array_concat(_result, _value); else array_push(_result, _value);
        }
        return _result;
    }
    return __ts2gml_call_member(_target, _target.concat, _arguments);
}

function __ts2gml_collection_entries(_target, _arguments) {
    if (is_array(_target)) {
        var _result = array_create(array_length(_target));
        for (var _index = 0; _index < array_length(_target); _index += 1) {
            _result[_index] = [_index, _target[_index]];
        }
        return _result;
    }
    return __ts2gml_call_member(_target, _target.entries, _arguments);
}

function __ts2gml_collection_includes(_target, _arguments) {
    var _value = array_length(_arguments) > 0 ? _arguments[0] : undefined;
    var _offset = array_length(_arguments) > 1 ? _arguments[1] : 0;
    if (is_string(_target)) {
        if (is_undefined(_offset)) _offset = 0;
        return string_pos_ext(_value, _target, _offset + 1) > 0;
    }
    if (is_array(_target)) {
        if (is_undefined(_offset)) _offset = 0;
        var _length = array_length(_target);
        var _start = _offset < 0 ? max(0, _length + ceil(_offset)) : floor(_offset);
        for (var _index = _start; _index < _length; _index += 1) {
            var _item = _target[_index];
            if (__ts2gml_value_equal(_item, _value) || (is_numeric(_item) && is_numeric(_value) && is_nan(_item) && is_nan(_value))) return true;
        }
        return false;
    }
    var _kind = __ts2gml_collection_kind_of(_target);
    if (_kind == "List" || _kind == "Set") return _target.has(_value);
    return __ts2gml_call_member(_target, _target.includes, _arguments);
}

function __ts2gml_collection_index_of(_target, _arguments) {
    var _value = array_length(_arguments) > 0 ? _arguments[0] : undefined;
    var _offset = array_length(_arguments) > 1 ? _arguments[1] : 0;
    if (is_string(_target)) {
        if (is_undefined(_offset)) _offset = 0;
        return string_pos_ext(_value, _target, _offset + 1) - 1;
    }
    if (is_array(_target)) {
        if (is_undefined(_offset)) _offset = 0;
        var _length = array_length(_target);
        var _start = _offset < 0 ? max(0, _length + ceil(_offset)) : floor(_offset);
        for (var _index = _start; _index < _length; _index += 1) {
            if (__ts2gml_value_equal(_target[_index], _value)) return _index;
        }
        return -1;
    }
    if (__ts2gml_collection_kind_of(_target) == "List") return _target.indexOf(_value);
    return __ts2gml_call_member(_target, _target.indexOf, _arguments);
}

function __ts2gml_collection_join(_target, _arguments) {
    if (is_array(_target) || __ts2gml_collection_kind_of(_target) == "List") {
        var _separator = array_length(_arguments) > 0 ? _arguments[0] : ",";
        if (is_undefined(_separator)) _separator = ",";
        return is_array(_target) ? string_join_ext(_separator, _target) : _target.join(_separator);
    }
    return __ts2gml_call_member(_target, _target.join, _arguments);
}

function __ts2gml_collection_keys(_target, _arguments) {
    if (is_array(_target)) {
        return array_create_ext(array_length(_target), function(_index) { return _index; });
    }
    return __ts2gml_call_member(_target, _target.keys, _arguments);
}

function __ts2gml_collection_length(_target) {
    if (is_array(_target)) return array_length(_target);
    if (is_string(_target)) return string_length(_target);
    var _kind = __ts2gml_collection_kind_of(_target);
    if (!is_undefined(_kind) && _kind != "Grid") return _target.size;
    return _target.length;
}

function __ts2gml_collection_pop(_target, _arguments) {
    if (is_array(_target)) return array_pop(_target);
    var _kind = __ts2gml_collection_kind_of(_target);
    if (_kind == "List" || _kind == "Stack") return _target.pop();
    return __ts2gml_call_member(_target, _target.pop, _arguments);
}

function __ts2gml_collection_push(_target, _arguments) {
    if (is_array(_target)) {
        for (var _index = 0; _index < array_length(_arguments); _index += 1) {
            array_push(_target, _arguments[_index]);
        }
        return array_length(_target);
    }
    var _kind = __ts2gml_collection_kind_of(_target);
    if (_kind != "List" && _kind != "Stack") return __ts2gml_call_member(_target, _target.push, _arguments);
    for (var _index = 0; _index < array_length(_arguments); _index += 1) {
        _target.push(_arguments[_index]);
    }
    if (_kind == "Stack") return _target;
    return _target.size;
}

function __ts2gml_collection_reverse(_target, _arguments) {
    if (is_array(_target)) {
        array_reverse_ext(_target);
        return _target;
    }
    if (__ts2gml_collection_kind_of(_target) == "List") return _target.reverse();
    return __ts2gml_call_member(_target, _target.reverse, _arguments);
}

function __ts2gml_collection_shift(_target, _arguments) {
    if (is_array(_target)) return array_shift(_target);
    if (__ts2gml_collection_kind_of(_target) == "List") return _target.shift();
    return __ts2gml_call_member(_target, _target.shift, _arguments);
}

function __ts2gml_collection_sort(_target, _arguments) {
    var _order = array_length(_arguments) > 0 ? _arguments[0] : undefined;
    if (is_array(_target)) {
        if (is_undefined(_order)) throw "TS2GML: array sort requires an explicit comparator";
        // Insertion sort is stable and accepts any negative/positive comparator result.
        for (var _index = 1; _index < array_length(_target); _index += 1) {
            var _value = _target[_index];
            var _position = _index;
            while (_position > 0 && _order(_target[_position - 1], _value) > 0) {
                _target[_position] = _target[_position - 1];
                _position -= 1;
            }
            _target[_position] = _value;
        }
        return _target;
    }
    var _kind = __ts2gml_collection_kind_of(_target);
    if (_kind == "List") return _target.sort(_order);
    if (_kind == "Grid") return _target.sort(_order, array_length(_arguments) > 1 ? _arguments[1] : true);
    return __ts2gml_call_member(_target, _target.sort, _arguments);
}

function __ts2gml_collection_unshift(_target, _arguments) {
    if (is_array(_target)) {
        for (var _index = array_length(_arguments) - 1; _index >= 0; _index -= 1) {
            array_insert(_target, 0, _arguments[_index]);
        }
        return array_length(_target);
    }
    if (__ts2gml_collection_kind_of(_target) != "List") return __ts2gml_call_member(_target, _target.unshift, _arguments);
    for (var _index = array_length(_arguments) - 1; _index >= 0; _index -= 1) {
        _target.insert(0, _arguments[_index]);
    }
    return _target.size;
}

function __ts2gml_collection_values(_target, _arguments) {
    if (is_array(_target)) return array_concat([], _target);
    return __ts2gml_call_member(_target, _target.values, _arguments);
}

function __ts2gml_Grid(_width, _height) constructor {
    __ts2gml_collection_kind = "Grid";
    __ds = ds_grid_create(_width, _height);
    width = _width;
    height = _height;
    static add = function(_x, _y, _value) { ds_grid_add(__ts2gml_collection_handle(__ds), _x, _y, _value); return self; };
    static clear = function(_value) { ds_grid_clear(__ts2gml_collection_handle(__ds), _value); };
    static remove = function(_x, _y) { if (is_array(_x)) { _y = _x[1]; _x = _x[0]; } ds_grid_set(__ts2gml_collection_handle(__ds), _x, _y, undefined); return true; };
    static destroy = function() { if (!is_undefined(__ds)) ds_grid_destroy(__ds); __ds = undefined; };
    static get = function(_x, _y) { return ds_grid_get(__ts2gml_collection_handle(__ds), _x, _y); };
    static has = function(_value) { return ds_grid_value_exists(__ts2gml_collection_handle(__ds), 0, 0, width - 1, height - 1, _value) != 0; };
    static multiply = function(_x, _y, _value) { ds_grid_multiply(__ts2gml_collection_handle(__ds), _x, _y, _value); return self; };
    static resize = function(_width, _height) { ds_grid_resize(__ts2gml_collection_handle(__ds), _width, _height); width = _width; height = _height; return self; };
    static set = function(_x, _y, _value) { ds_grid_set(__ts2gml_collection_handle(__ds), _x, _y, _value); return self; };
    static shuffle = function() { ds_grid_shuffle(__ts2gml_collection_handle(__ds)); return self; };
    static sort = function(_column, _ascending) { if (is_undefined(_ascending)) _ascending = true; ds_grid_sort(__ts2gml_collection_handle(__ds), _column, _ascending); return self; };
}

function __ts2gml_List(_values) constructor {
    __ts2gml_collection_kind = "List";
    __ds = ds_list_create();
    size = 0;
    if (!is_undefined(_values)) {
        for (var _index = 0; _index < array_length(_values); _index += 1) ds_list_add(__ts2gml_collection_handle(__ds), _values[_index]);
        size = ds_list_size(__ts2gml_collection_handle(__ds));
    }
    static add = function(_value) { ds_list_add(__ts2gml_collection_handle(__ds), _value); size += 1; return self; };
    static clear = function() { ds_list_clear(__ts2gml_collection_handle(__ds)); size = 0; };
    static remove = function(_index) { if (_index < 0 || _index >= size) return false; ds_list_delete(__ts2gml_collection_handle(__ds), _index); size -= 1; return true; };
    static destroy = function() { if (!is_undefined(__ds)) ds_list_destroy(__ds); __ds = undefined; size = 0; };
    static get = function(_index) { return ds_list_find_value(__ts2gml_collection_handle(__ds), _index); };
    static has = function(_value) { return ds_list_find_index(__ts2gml_collection_handle(__ds), _value) >= 0; };
    static indexOf = function(_value) { return ds_list_find_index(__ts2gml_collection_handle(__ds), _value); };
    static insert = function(_index, _value) { ds_list_insert(__ts2gml_collection_handle(__ds), _index, _value); size = ds_list_size(__ts2gml_collection_handle(__ds)); return self; };
    static pop = function() { if (size == 0) return undefined; var _value = ds_list_find_value(__ts2gml_collection_handle(__ds), size - 1); ds_list_delete(__ts2gml_collection_handle(__ds), size - 1); size -= 1; return _value; };
    static push = function(_value) { ds_list_add(__ts2gml_collection_handle(__ds), _value); size += 1; return size; };
    static set = function(_index, _value) { ds_list_set(__ts2gml_collection_handle(__ds), _index, _value); size = ds_list_size(__ts2gml_collection_handle(__ds)); return self; };
    static shift = function() { if (size == 0) return undefined; var _value = ds_list_find_value(__ts2gml_collection_handle(__ds), 0); ds_list_delete(__ts2gml_collection_handle(__ds), 0); size -= 1; return _value; };
    static shuffle = function() { ds_list_shuffle(__ts2gml_collection_handle(__ds)); return self; };
    static sort = function(_ascending) { if (is_undefined(_ascending)) _ascending = true; ds_list_sort(__ts2gml_collection_handle(__ds), _ascending); return self; };
    static toArray = function() { var _result = array_create(size); for (var _index = 0; _index < size; _index += 1) _result[_index] = ds_list_find_value(__ts2gml_collection_handle(__ds), _index); return _result; };
    static values = function() { return self.toArray(); };
    static keys = function() { return array_create_ext(size, function(_index) { return _index; }); };
    static entries = function() { var _result = array_create(size); for (var _index = 0; _index < size; _index += 1) _result[_index] = [_index, ds_list_find_value(__ts2gml_collection_handle(__ds), _index)]; return _result; };
    static concat = function(_values) { return array_concat(self.toArray(), _values); };
    static join = function(_separator) { if (is_undefined(_separator)) _separator = ","; return string_join_ext(_separator, self.toArray()); };
    static reverse = function() { var _values = self.toArray(); ds_list_clear(__ts2gml_collection_handle(__ds)); for (var _index = array_length(_values) - 1; _index >= 0; _index -= 1) ds_list_add(__ts2gml_collection_handle(__ds), _values[_index]); return self; };
}

function __ts2gml_Map(_entries) constructor {
    __ts2gml_collection_kind = "Map";
    __ds = ds_map_create();
    size = 0;
    if (!is_undefined(_entries)) {
        for (var _index = 0; _index < array_length(_entries); _index += 1) {
            var _entry = _entries[_index];
            if (!ds_map_exists(__ts2gml_collection_handle(__ds), _entry[0])) size += 1;
            ds_map_set(__ts2gml_collection_handle(__ds), _entry[0], _entry[1]);
        }
    }
    static clear = function() { ds_map_clear(__ts2gml_collection_handle(__ds)); size = 0; };
    static remove = function(_key) { var _exists = ds_map_exists(__ts2gml_collection_handle(__ds), _key) != 0; if (_exists) { ds_map_delete(__ts2gml_collection_handle(__ds), _key); size -= 1; } return _exists; };
    static destroy = function() { if (!is_undefined(__ds)) ds_map_destroy(__ds); __ds = undefined; size = 0; };
    static get = function(_key) { return ds_map_find_value(__ts2gml_collection_handle(__ds), _key); };
    static has = function(_key) { return ds_map_exists(__ts2gml_collection_handle(__ds), _key) != 0; };
    static set = function(_key, _value) { if (!ds_map_exists(__ts2gml_collection_handle(__ds), _key)) size += 1; ds_map_set(__ts2gml_collection_handle(__ds), _key, _value); return self; };
    static keys = function() { return ds_map_keys_to_array(__ts2gml_collection_handle(__ds)); };
    static values = function() { return ds_map_values_to_array(__ts2gml_collection_handle(__ds)); };
    static entries = function() { var _keys = ds_map_keys_to_array(__ts2gml_collection_handle(__ds)); var _result = array_create(array_length(_keys)); for (var _index = 0; _index < array_length(_keys); _index += 1) { var _key = _keys[_index]; _result[_index] = [_key, ds_map_find_value(__ts2gml_collection_handle(__ds), _key)]; } return _result; };
}

function __ts2gml_PriorityQueue(_entries) constructor {
    __ts2gml_collection_kind = "PriorityQueue";
    __ds = ds_priority_create();
    size = 0;
    if (!is_undefined(_entries)) { for (var _index = 0; _index < array_length(_entries); _index += 1) { ds_priority_add(__ts2gml_collection_handle(__ds), _entries[_index][0], _entries[_index][1]); size += 1; } }
    static add = function(_value, _priority) { ds_priority_add(__ts2gml_collection_handle(__ds), _value, _priority); size += 1; return self; };
    static changePriority = function(_value, _priority) { ds_priority_change_priority(__ts2gml_collection_handle(__ds), _value, _priority); return self; };
    static clear = function() { ds_priority_clear(__ts2gml_collection_handle(__ds)); size = 0; };
    static remove = function(_value) { var _priority = ds_priority_find_priority(__ts2gml_collection_handle(__ds), _value); if (is_undefined(_priority)) return false; ds_priority_delete_value(__ts2gml_collection_handle(__ds), _value); size = ds_priority_size(__ts2gml_collection_handle(__ds)); return true; };
    static deleteMax = function() { if (size == 0) return undefined; size -= 1; return ds_priority_delete_max(__ts2gml_collection_handle(__ds)); };
    static deleteMin = function() { if (size == 0) return undefined; size -= 1; return ds_priority_delete_min(__ts2gml_collection_handle(__ds)); };
    static destroy = function() { if (!is_undefined(__ds)) ds_priority_destroy(__ds); __ds = undefined; size = 0; };
    static getPriority = function(_value) { return ds_priority_find_priority(__ts2gml_collection_handle(__ds), _value); };
    static max = function() { return ds_priority_find_max(__ts2gml_collection_handle(__ds)); };
    static min = function() { return ds_priority_find_min(__ts2gml_collection_handle(__ds)); };
}

function __ts2gml_Queue(_values) constructor {
    __ts2gml_collection_kind = "Queue";
    __ds = ds_queue_create();
    size = 0;
    if (!is_undefined(_values)) { for (var _index = 0; _index < array_length(_values); _index += 1) { ds_queue_enqueue(__ts2gml_collection_handle(__ds), _values[_index]); size += 1; } }
    static clear = function() { ds_queue_clear(__ts2gml_collection_handle(__ds)); size = 0; };
    static dequeue = function() { if (size == 0) return undefined; size -= 1; return ds_queue_dequeue(__ts2gml_collection_handle(__ds)); };
    static remove = function() { return false; };
    static destroy = function() { if (!is_undefined(__ds)) ds_queue_destroy(__ds); __ds = undefined; size = 0; };
    static enqueue = function(_value) { ds_queue_enqueue(__ts2gml_collection_handle(__ds), _value); size += 1; return self; };
    static head = function() { return ds_queue_head(__ts2gml_collection_handle(__ds)); };
    static tail = function() { return ds_queue_tail(__ts2gml_collection_handle(__ds)); };
}

function __ts2gml_Set(_values) constructor {
    __ts2gml_collection_kind = "Set";
    __ds = ds_list_create();
    size = 0;
    if (!is_undefined(_values)) { for (var _index = 0; _index < array_length(_values); _index += 1) { var _value = _values[_index]; if (ds_list_find_index(__ts2gml_collection_handle(__ds), _value) < 0) { ds_list_add(__ts2gml_collection_handle(__ds), _value); size += 1; } } }
    static add = function(_value) { if (ds_list_find_index(__ts2gml_collection_handle(__ds), _value) < 0) { ds_list_add(__ts2gml_collection_handle(__ds), _value); size += 1; } return self; };
    static clear = function() { ds_list_clear(__ts2gml_collection_handle(__ds)); size = 0; };
    static remove = function(_value) { var _index = ds_list_find_index(__ts2gml_collection_handle(__ds), _value); if (_index < 0) return false; ds_list_delete(__ts2gml_collection_handle(__ds), _index); size -= 1; return true; };
    static destroy = function() { if (!is_undefined(__ds)) ds_list_destroy(__ds); __ds = undefined; size = 0; };
    static has = function(_value) { return ds_list_find_index(__ts2gml_collection_handle(__ds), _value) >= 0; };
    static values = function() { var _result = array_create(size); for (var _index = 0; _index < size; _index += 1) _result[_index] = ds_list_find_value(__ts2gml_collection_handle(__ds), _index); return _result; };
    static keys = function() { return self.values(); };
    static entries = function() { var _result = array_create(size); for (var _index = 0; _index < size; _index += 1) { var _value = ds_list_find_value(__ts2gml_collection_handle(__ds), _index); _result[_index] = [_value, _value]; } return _result; };
}

function __ts2gml_Stack(_values) constructor {
    __ts2gml_collection_kind = "Stack";
    __ds = ds_stack_create();
    size = 0;
    if (!is_undefined(_values)) { for (var _index = 0; _index < array_length(_values); _index += 1) { ds_stack_push(__ts2gml_collection_handle(__ds), _values[_index]); size += 1; } }
    static clear = function() { ds_stack_clear(__ts2gml_collection_handle(__ds)); size = 0; };
    static remove = function() { return false; };
    static destroy = function() { if (!is_undefined(__ds)) ds_stack_destroy(__ds); __ds = undefined; size = 0; };
    static peek = function() { return ds_stack_top(__ts2gml_collection_handle(__ds)); };
    static pop = function() { if (size == 0) return undefined; size -= 1; return ds_stack_pop(__ts2gml_collection_handle(__ds)); };
    static push = function(_value) { ds_stack_push(__ts2gml_collection_handle(__ds), _value); size += 1; return self; };
}`;
