function StaticContractParent() constructor {
    __ts2gml_class_statics(StaticContractParent).constructions += 1;
}

method(__ts2gml_class_statics(StaticContractParent, true), function() {
    self.value = 10;
    self.unset = 7;
    self.constructions = 0;
})();

function StaticContractChild() : StaticContractParent() constructor {}

method(__ts2gml_class_statics(StaticContractChild, true), function() {
    static_set(self, __ts2gml_class_statics(StaticContractParent));
    self.read = method(undefined, function() {
        return variable_struct_get(__ts2gml_class_statics(self.__ts2gml_class), "value");
    });
    self.readMissing = method(undefined, function() {
        return variable_struct_get(__ts2gml_class_statics(self.__ts2gml_class), "missing");
    });
    self.readUnset = method(undefined, function() {
        return variable_struct_get(__ts2gml_class_statics(self.__ts2gml_class), "unset");
    });
    self.readOptional = method(undefined, function() {
        return (function (__ts2gml_optional_981_1) {
            return __ts2gml_value_nullish(__ts2gml_optional_981_1) ? undefined : __ts2gml_optional_981_1.value;
        })(variable_struct_get(__ts2gml_class_statics(self.__ts2gml_class), "optional"));
    });
    self.readOptionalClass = method(undefined, function() {
        return (function (__ts2gml_optional_1072_1) {
            return __ts2gml_value_nullish(__ts2gml_optional_1072_1) ? undefined : variable_struct_get(__ts2gml_optional_1072_1, "missing");
        })(__ts2gml_class_statics(self.__ts2gml_class));
    });
    self.before = __ts2gml_class_statics(self.__ts2gml_class).read();
    self.missingBefore = __ts2gml_class_statics(self.__ts2gml_class).readMissing();
    self.unsetBefore = __ts2gml_class_statics(self.__ts2gml_class).readUnset();
    self.optionalBefore = __ts2gml_class_statics(self.__ts2gml_class).readOptional();
    self.optionalClassBefore = __ts2gml_class_statics(self.__ts2gml_class).readOptionalClass();
    self.value = 20;
    self.missing = 30;
    self.unset = undefined;
    self.optional = undefined;
})();

function StaticContractWrite() constructor {}

method(__ts2gml_class_statics(StaticContractWrite, true), function() {
    self.initialize = method(undefined, function() {
        __ts2gml_class_statics(self.__ts2gml_class).later = 9;
        return variable_struct_get(__ts2gml_class_statics(self.__ts2gml_class), "later");
    });
    self.before = __ts2gml_class_statics(self.__ts2gml_class).initialize();
    self.later = undefined;
})();

function staticContractRun() {
    scopeContextExpect("static initialization does not construct", variable_struct_get(__ts2gml_class_statics(StaticContractParent), "constructions"), 0);
    scopeContextExpect("static initializer reads inherited field", variable_struct_get(__ts2gml_class_statics(StaticContractChild), "before"), 10);
    scopeContextExpect("static missing field reads undefined", variable_struct_get(__ts2gml_class_statics(StaticContractChild), "missingBefore"), undefined);
    scopeContextExpect("static unset field initially inherits", variable_struct_get(__ts2gml_class_statics(StaticContractChild), "unsetBefore"), 7);
    scopeContextExpect("static unset declaration hides parent", variable_struct_get(__ts2gml_class_statics(StaticContractChild), "unset"), undefined);
    scopeContextExpect("static optional missing field", variable_struct_get(__ts2gml_class_statics(StaticContractChild), "optionalBefore"), undefined);
    scopeContextExpect("static optional class missing field", variable_struct_get(__ts2gml_class_statics(StaticContractChild), "optionalClassBefore"), undefined);
    scopeContextExpect("static child initialized field", __ts2gml_class_statics(StaticContractChild).read(), 20);
    scopeContextExpect("static parent remains unchanged", variable_struct_get(__ts2gml_class_statics(StaticContractParent), "value"), 10);
    scopeContextExpect("static earlier initializer writes later field", variable_struct_get(__ts2gml_class_statics(StaticContractWrite), "before"), 9);
    scopeContextExpect("static declaration resets earlier write", variable_struct_get(__ts2gml_class_statics(StaticContractWrite), "later"), undefined);
    var instance = new StaticContractChild();
    scopeContextExpect("static construction runs exactly once", variable_struct_get(__ts2gml_class_statics(StaticContractParent), "constructions"), 1);
    scopeContextExpect("static construction preserves snapshot", variable_struct_get(__ts2gml_class_statics(StaticContractChild), "before"), 10);
    scopeContextExpect("static instance exists", is_instanceof(instance, StaticContractParent), true);
    show_debug_message("TS2GML_STATIC_CONTRACT_OK");
}

function NativeStaticContract() constructor {
    static shared = __ts2gml_class_statics(NativeStaticContract).initialize();
    static data = ({ value: 1 });
    static read = function() {
        return self.shared;
    };
    static increment = function() {
        self.shared += 1;
    };
}

method(__ts2gml_class_statics(NativeStaticContract, true), function() {
    self.initialize = method(undefined, function() {
        __ts2gml_class_statics(self.__ts2gml_class).initializations += 1;
        return 12;
    });
    self.initializations = 0;
    self.shared = 100;
})();

function NativeStaticContractChild() : NativeStaticContract() constructor {
    static shared = 40;
}

method(__ts2gml_class_statics(NativeStaticContractChild, true), function() {
    static_set(self, __ts2gml_class_statics(NativeStaticContract));
})();

function nativeStaticContractRun() {
    scopeContextExpect("native static initializes lazily", variable_struct_get(__ts2gml_class_statics(NativeStaticContract), "initializations"), 0);
    var a = new NativeStaticContract();
    var b = new NativeStaticContract();
    scopeContextExpect("native static initializes once", variable_struct_get(__ts2gml_class_statics(NativeStaticContract), "initializations"), 1);
    scopeContextExpect("native static reads first instance", a.read(), 12);
    scopeContextExpect("native static reads second instance", b.read(), 12);
    a.shared = 40;
    scopeContextExpect("native static instance write shadows", a.read(), 40);
    scopeContextExpect("native static instance write leaves peer", b.read(), 12);
    b.increment();
    scopeContextExpect("native static method write shadows", b.read(), 13);
    var c = new NativeStaticContract();
    scopeContextExpect("native static later instance reads shared value", c.read(), 12);
    a.data.value = 8;
    scopeContextExpect("native static struct reference is shared", b.data.value, 8);
    var child = new NativeStaticContractChild();
    scopeContextExpect("native static child overrides shared field", child.read(), 40);
    scopeContextExpect("native static parent storage survives override", c.read(), 12);
    scopeContextExpect("native static parent initializer stays once", variable_struct_get(__ts2gml_class_statics(NativeStaticContract), "initializations"), 1);
    scopeContextExpect("native and TypeScript static names are separate", variable_struct_get(__ts2gml_class_statics(NativeStaticContract), "shared"), 100);
    show_debug_message("TS2GML_NATIVE_STATIC_CONTRACT_OK");
}
