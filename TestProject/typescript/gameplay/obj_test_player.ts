class obj_test_player extends GMObject {
  health = 100;
  weapon!: Weapon;

  onCreate() {
    this.weapon = new Weapon(gm_self(), {
      name: "Rifle",
      damage: 1,
      attack_speed: 1,
      reload_time: 1,
      projectile_speed: 50,
      attack_action: (owner, weapon) => {
        gm_with<obj_test_projectile>(
          instance_create_depth(
            this.x,
            this.y,
            this.depth,
            obj_test_projectile,
          ),
          (self, other) => {
            self.on_step = () => {
              x += lengthdir_x(weapon.projectile_speed, weapon.direction);
              y += lengthdir_y(weapon.projectile_speed, weapon.direction);
            };
          },
        );
      },
    });

    this.weapon = new Weapon(gm_self(), {
      name: "Rifle",
      damage: 1,
      attack_speed: 1,
      reload_time: 1,
      projectile_speed: 50,
      attack_action: (owner, weapon) => {
        const projectile = instance_create_depth(
          this.x,
          this.y,
          this.depth,
          obj_test_projectile,
        );
        projectile.direction = weapon.direction;
        projectile.spd = weapon.projectile_speed;
        projectile.on_step = method(projectile, function () {
          x += lengthdir_x(projectile.spd, direction);
          y += lengthdir_y(projectile.spd, direction);
        });
      },
    });
  }

  onStep() {
    this.x += 1;
  }

  takeDamage(amount: number) {
    this.health -= amount;
  }
}
