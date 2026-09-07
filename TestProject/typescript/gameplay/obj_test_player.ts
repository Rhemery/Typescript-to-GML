class obj_test_player extends GMObject {
  health = 100;

  protected onCreate() {
    this.x = 64;
    this.y = 64;
  }

  protected onStep() {
    this.x += 1;
  }

  takeDamage(amount: number) {
    this.health -= amount;
  }
}
