class obj_test_player extends GMObject {
  health = 100;

  onCreate() {
    this.x = 64;
    this.y = 64;
  }

  onStep() {
    this.x += 1;
  }

  takeDamage(amount: number) {
    this.health -= amount;
  }
}
