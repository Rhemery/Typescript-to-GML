type WeaponData<Weapon = any> = {
  name: string;
  damage: number;
  attack_speed: number;
  reload_time: number;
  projectile_speed: number;
  attack_action: (owner: GMInstance, weapon: Weapon) => void;
};

class Weapon {
  owner: GMInstance;
  name: string;
  damage: number;
  attack_speed: number;
  reload_time: number;
  projectile_speed: number;
  attack_action: (owner: GMInstance, weapon: Weapon) => void;

  constructor(owner: GMInstance, data: WeaponData) {
    this.owner = owner;
    this.name = data.name;
    this.damage = data.damage;
    this.attack_speed = data.attack_speed;
    this.reload_time = data.reload_time;
    this.projectile_speed = data.projectile_speed;
    this.attack_action = data.attack_action;
  }
}
