function Weapon(_owner, _data) constructor {
    self.owner = undefined;
    self.name = undefined;
    self.damage = undefined;
    self.attack_speed = undefined;
    self.reload_time = undefined;
    self.projectile_speed = undefined;
    self.attack_action = undefined;
    self.owner = _owner;
    self.name = _data.name;
    self.damage = _data.damage;
    self.attack_speed = _data.attack_speed;
    self.reload_time = _data.reload_time;
    self.projectile_speed = _data.projectile_speed;
    self.attack_action = _data.attack_action;
}
