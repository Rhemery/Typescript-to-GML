class obj_test_projectile extends GMObject {
  spd = 0;
  on_step: (() => void) | undefined;
  onCreate() {}
  onStep() {
    if (!this.on_step) throw "on_step is not defined";
    this.on_step();
  }
}
