self.takeDamage = function(_amount) {
    self.health -= _amount;
};
self.weapon = new Weapon(self, {
    name: "Rifle",
    damage: 1,
    attack_speed: 1,
    reload_time: 1,
    projectile_speed: 50,
    attack_action: method(self, function (__ts2gml_env_2_parameter_1, __ts2gml_capture_1_parameter) {
        var __ts2gml_env_2 = { __ts2gml_capture_1: __ts2gml_capture_1_parameter };
        with (instance_create_depth(self.x, self.y, self.depth, obj_test_projectile)) {
            var __ts2gml_with_self_96_1 = self;
            var __ts2gml_with_other_96_2 = other;
            var __ts2gml_env_3_self = method_get_self(function () { });
            __ts2gml_with_self_96_1.on_step = method({ __ts2gml_env_2: __ts2gml_env_2, __ts2gml_receiver: __ts2gml_env_3_self, __ts2gml_closure: true }, function () {
                var __ts2gml_env_2 = self.__ts2gml_env_2;
                with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                    x += lengthdir_x(__ts2gml_env_2.__ts2gml_capture_1.projectile_speed, __ts2gml_env_2.__ts2gml_capture_1.direction);
                    y += lengthdir_y(__ts2gml_env_2.__ts2gml_capture_1.projectile_speed, __ts2gml_env_2.__ts2gml_capture_1.direction);
                }
            });
        }
    }),
});
self.weapon = new Weapon(self, {
    name: "Rifle",
    damage: 1,
    attack_speed: 1,
    reload_time: 1,
    projectile_speed: 50,
    attack_action: method(self, function (__ts2gml_env_5_parameter_1, __ts2gml_env_5_parameter_2) {
        var __ts2gml_env_5_self = method_get_self(function () { });
        var __ts2gml_env_5 = { __ts2gml_capture_2: undefined };
        __ts2gml_env_5.__ts2gml_capture_2 = instance_create_depth(self.x, self.y, self.depth, obj_test_projectile);
        __ts2gml_env_5.__ts2gml_capture_2.direction = __ts2gml_env_5_parameter_2.direction;
        __ts2gml_env_5.__ts2gml_capture_2.spd = __ts2gml_env_5_parameter_2.projectile_speed;
        __ts2gml_env_5.__ts2gml_capture_2.on_step = __ts2gml_value_method(__ts2gml_env_5.__ts2gml_capture_2, method({ __ts2gml_env_5: __ts2gml_env_5, __ts2gml_receiver: __ts2gml_env_5_self, __ts2gml_closure: true }, function () {
            var __ts2gml_env_5 = self.__ts2gml_env_5;
            with ((__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver)) {
                x += lengthdir_x(__ts2gml_env_5.__ts2gml_capture_2.spd, direction);
                y += lengthdir_y(__ts2gml_env_5.__ts2gml_capture_2.spd, direction);
            }
        }));
    }),
});
