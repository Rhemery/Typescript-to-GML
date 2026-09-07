function __ts2gml_class_statics(_class, _create = false) {
    static _classes = [];
    static _values = [];
    if (is_undefined(_class)) return undefined;
    for (var _index = 0; _index < array_length(_classes); _index += 1) {
        if (_classes[_index] == _class) return _values[_index];
    }
    if (!_create) throw "Class statics accessed before class initialization.";
    var _value = { __ts2gml_class: _class };
    array_push(_classes, _class);
    array_push(_values, _value);
    return _value;
}
