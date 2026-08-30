self.callerValue = function() {
    return other.value;
};
self.value = 41;
var value = 2;
scopeContextExpect("event field/local", self.value + value, 43);
scopeContextExpect("event self", self, self);
global.scopeContextValue = 50;
scopeContextExpect("global", global.scopeContextValue, 50);
scopeContextExpect("script parameter/local", scopeContextAdd(3), 5);
var data = new ScopeContextStruct(12);
scopeContextExpect("constructor field initializer", data.initialValue, 10);
scopeContextExpect("constructor assignment", data.value, 12);
scopeContextExpect("constructor other", data.callerValue, 41);
scopeContextExpect("struct field/parameter", data.fromParameter(3), 15);
scopeContextExpect("struct field/local", data.fromLocal(), 14);
scopeContextExpect("struct self", data.identity(), data);
var target = instance_create_depth(0, 0, 0, obj_scope_target);
scopeContextExpect("object variable", target.value, 20);
scopeContextExpect("object field/parameter", target.fromParameter(4), 24);
scopeContextExpect("object field/local", target.fromLocal(), 23);
scopeContextExpect("direct method other", target.callerValue(), target.value);
var targetCaller = target.callerValue;
scopeContextExpect("extracted method other", targetCaller(), self.value);
var structReader = data.makeReader();
scopeContextExpect("struct arrow direct", structReader(), 12);
scopeContextExpect("struct arrow callback", target.invoke(structReader), 12);
var objectReader = method(self, function () { return self.value; });
scopeContextExpect("object arrow direct", objectReader(), 41);
scopeContextExpect("object arrow callback", target.invoke(objectReader), 41);
var literal = { value: 99, read: method(self, function () { return self.value; }) };
var callbackArray = [method(self, function () { return self.value; })];
scopeContextExpect("struct literal arrow", literal.read(), 41);
scopeContextExpect("array literal arrow", callbackArray[0](), 41);
scopeContextExpect("method binding", method_get_self(self.callerValue), self.id);
scopeContextExpect("callback other", target.invoke(self.callerValue), target.value);
var amount = 3;
with (obj_scope_target) {
    var __ts2gml_with_self_3436_1 = self;
    var __ts2gml_with_other_3436_2 = other;
    scopeContextExpect("with self", __ts2gml_with_self_3436_1.value, 20);
    scopeContextExpect("with other", __ts2gml_with_other_3436_2.value, 41);
    __ts2gml_with_self_3436_1.value += amount;
    __ts2gml_with_other_3436_2.value += 1;
}
scopeContextExpect("with local capture", target.value, 23);
scopeContextExpect("with lexical this", self.value, 42);
with (obj_scope_target) {
    var __ts2gml_with_self_3840_1 = self;
    var __ts2gml_with_other_3840_2 = other;
    with (obj_scope_target) {
        var __ts2gml_with_self_3840_3 = self;
        var __ts2gml_with_other_3840_4 = other;
        __ts2gml_with_self_3840_3.value += 1;
        __ts2gml_with_other_3840_4.value += 2;
        __ts2gml_with_other_3840_2.value += 4;
        __ts2gml_with_other_3840_2.value += 8;
    }
}
scopeContextExpect("nested with self/other", target.value, 26);
scopeContextExpect("nested with lexical this", self.value, 54);
var collisionSurface = surface_create(1, 1);
surface_set_target(collisionSurface);
draw_clear(c_white);
surface_reset_target();
var collisionSprite = sprite_create_from_surface(collisionSurface, 0, 0, 1, 1, false, false, 0, 0);
surface_free(collisionSurface);
self.sprite_index = collisionSprite;
target.sprite_index = collisionSprite;
self.alarm[0] = 2;
