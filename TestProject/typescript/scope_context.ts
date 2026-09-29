interface GMGlobal {
  scopeContextValue: number;
  closureContextCallback: () => number;
  closureGlobalFactory: (value: number) => () => number;
  closureGlobalRead: () => number;
}

gm_global.closureGlobalFactory = (value: number) => () => value;
gm_global.closureGlobalRead = gm_global.closureGlobalFactory(17);

// These locals share the script's initialization scope and are not globals.
let startupValue = 10;
const [startupFirst, startupSecond] = [startupValue, 4];
startupValue += startupSecond!;
const startupSnapshot = { value: startupValue };
scopeContextExpect("top-level local initializer", startupFirst, 10);
scopeContextExpect("top-level local mutation", startupSnapshot.value, 14);
scopeContextExpect("top-level local stays private", variable_global_exists("startupValue"), false);

function scopeContextExpect(label: string, actual: any, expected: any): void {
  if (actual !== expected) {
    throw `scope context '${label}' expected ${expected}, received ${actual}`;
  }
}

function scopeContextAdd(value: number): number {
  const increment = 2;
  return value + increment;
}

class ScopeContextStruct {
  value = 10;
  initialValue = this.value;
  callerValue = gm_other<obj_scope_runner>().value;

  constructor(value: number) {
    this.value = value;
  }

  fromParameter(value: number): number {
    return this.value + value;
  }

  fromLocal(): number {
    const value = 2;
    return this.value + value;
  }

  makeReader(): () => number {
    return () => this.value;
  }

  identity(): this {
    return this;
  }
}

class obj_scope_target extends GMObject {
  static total = 5;
  static increment(): number { this.total += 1; return this.total; }
  static identity(): typeof obj_scope_target { return this; }
  value = 20;
  on_step: () => void = () => {};
  lexicalReader: () => number = () => 0;
  contextReader: () => number = () => 0;
  readerFactory: () => () => number = () => () => 0;

  invoke(callback: () => number): number {
    return callback();
  }

  fromParameter(value: number): number {
    return this.value + value;
  }

  fromLocal(): number {
    const value = 3;
    return this.value + value;
  }

  callerValue(): number {
    return gm_other<obj_scope_target>().value;
  }

  extractedCallerValue(): number {
    return gm_other<obj_scope_runner>().value;
  }

  capturedReader(value: number): () => number { return () => value; }

  deepCaptured(value: number) {
    return () => () => () => () => () => () => () => () => gm_self<obj_scope_target>().value + value;
  }

  nativeCaptured(amount: number) {
    return () => { x += amount; return x; };
  }

  throwingCaptured(amount: number) {
    return () => { const result = this.value + amount; throw result; };
  }

  otherFactory(amount: number) {
    return () => {
      amount += 1;
      return function () {
        return gm_other().id;
      };
    };
  }

  plainOtherFactory() {
    return function () {
      return gm_other().id;
    };
  }

  argumentContexts(callback: (value: number) => number): void {
    const expectedOther = gm_other().id;
    scopeContextExpect("spread callback argument keeps native other",
      callback(...([gm_other().id] as [number])), expectedOther);
    const callbacks = [callback];
    scopeContextExpect("indexed callback argument keeps native other",
      callbacks[0]!(gm_other().id), expectedOther);
    scopeContextExpect("indirect callback argument keeps native self",
      callbacks[0]!(gm_self().id), this.id);
  }

  checkedInvoke(callback: () => number): number {
    const expectedSelf = this.id;
    const expectedOther = gm_other().id;
    try { return callback(); }
    finally {
      scopeContextExpect("callback restores caller self", gm_self().id, expectedSelf);
      scopeContextExpect("callback restores caller other", gm_other().id, expectedOther);
    }
  }
}

class obj_scope_runner extends GMObject {
  value = 40;
  enumState: EnumNumeric = EnumNumeric.Active;
  collisionContextPassed = false;
  projectile?: GMInstance<obj_scope_target>;
  capturedEventReader: () => number = () => 0;
  capturedCollisionReader: () => number = () => 0;
  capturedWithReader: () => number = () => 0;
  reboundProjectile?: GMInstance<obj_test_projectile>;

  constructor() {
    super();
    this.value = 41;
  }

  onCreate() {
    scopeContextExpect("enum object field across files", this.enumState, EnumNumeric.Active);
    let capturedValue = 3;
    this.capturedEventReader = () => capturedValue + this.value;
    capturedValue = 5;
    const temporary = instance_create_depth(0, 0, 0, obj_scope_target);
    const detached = temporary.capturedReader(17);
    instance_destroy(temporary);
    scopeContextExpect("closure survives creating instance", detached(), 17);
    const expectedSelf = this;
    const nativeSelf = () => {
      scopeContextExpect("closure native self", gm_self<obj_scope_runner>(), expectedSelf);
      return capturedValue;
    };
    scopeContextExpect("closure guarded native context", nativeSelf(), 5);
    scopeContextExpect("object static before instance", obj_scope_target.increment(), 6);
    scopeContextExpect("object static identity", obj_scope_target.identity(), obj_scope_target);
    const value = 2;
    scopeContextExpect("event field/local", this.value + value, 43);
    scopeContextExpect("event self", this, gm_self<obj_scope_runner>());

    gm_global.scopeContextValue = 50;
    scopeContextExpect("global", gm_global.scopeContextValue, 50);
    scopeContextExpect("script parameter/local", scopeContextAdd(3), 5);

    const data = new ScopeContextStruct(12);
    scopeContextExpect("constructor field initializer", data.initialValue, 10);
    scopeContextExpect("constructor assignment", data.value, 12);
    scopeContextExpect("constructor other", data.callerValue, 41);
    scopeContextExpect("struct field/parameter", data.fromParameter(3), 15);
    scopeContextExpect("struct field/local", data.fromLocal(), 14);
    scopeContextExpect("struct self", data.identity(), data);

    const target = instance_create_depth(0, 0, 0, obj_scope_target);
    this.checkClosureContexts(target);
    this.checkWithCaptures(target);
    this.checkMethodCaptures(target);
    scopeContextExpect("object variable", target.value, 20);
    scopeContextExpect("object field/parameter", target.fromParameter(4), 24);
    scopeContextExpect("object field/local", target.fromLocal(), 23);
    scopeContextExpect("direct method other", target.callerValue(), target.value);
    const targetCaller = target.extractedCallerValue;
    scopeContextExpect("extracted method other", targetCaller(), this.value);

    const structReader = data.makeReader();
    scopeContextExpect("struct arrow direct", structReader(), 12);
    scopeContextExpect("struct arrow callback", target.invoke(structReader), 12);

    const objectReader = () => this.value;
    scopeContextExpect("object arrow direct", objectReader(), 41);
    scopeContextExpect("object arrow callback", target.invoke(objectReader), 41);
    const literal = { value: 99, read: () => this.value };
    const callbackArray = [() => this.value];
    scopeContextExpect("struct literal arrow", literal.read(), 41);
    scopeContextExpect("array literal arrow", callbackArray[0]!(), 41);
    scopeContextExpect("method binding", method_get_self(this.callerValue), this.id);
    scopeContextExpect("callback other", target.invoke(this.callerValue), target.value);

    const amount = 3;
    this.gm_with(obj_scope_target, (selected, runner) => {
      scopeContextExpect("with self", selected.value, 20);
      scopeContextExpect("with other", runner.value, 41);
      selected.value += amount;
      this.value += 1;
    });
    scopeContextExpect("with local capture", target.value, 23);
    scopeContextExpect("with lexical this", this.value, 42);

    this.gm_with(obj_scope_target, (self, other) => {
      gm_with<obj_scope_target, obj_scope_target>(obj_scope_target, (nested, outer) => {
        nested.value += 1;
        outer.value += 2;
        other.value += 4;
        this.value += 8;
      });
      scopeContextExpect("nested with native self alias", self.value, 26);
    });
    scopeContextExpect("nested with self/other", target.value, 26);
    scopeContextExpect("nested with lexical this", this.value, 54);
    gm_with<obj_scope_target, obj_scope_runner>(instance_create_depth(100, 100, 0, obj_scope_target), (self, other) => {
      scopeContextExpect("with callback native other alias", other.value, this.value);
      self.direction = 0;
      self.on_step = () => {
        x += lengthdir_x(5, direction);
        y += lengthdir_y(5, direction);
      };
      self.lexicalReader = () => this.value;
      self.contextReader = function () {
        return gm_self<obj_scope_target>().value;
      };
      self.readerFactory = () => () => this.value;
      this.projectile = self;
    });

    const collisionSurface = surface_create(1, 1);
    surface_set_target(collisionSurface);
    draw_clear(c_white);
    surface_reset_target();
    const collisionSprite = sprite_create_from_surface(
      collisionSurface,
      0,
      0,
      1,
      1,
      false,
      false,
      0,
      0,
    );
    surface_free(collisionSurface);
    this.sprite_index = collisionSprite;
    target.sprite_index = collisionSprite;
    this.alarm[0] = 2;
  }

  onCollision_obj_scope_target(other: GMInstance<obj_scope_target>) {
    const collided = other;
    const bonus = 2;
    this.capturedCollisionReader = () => collided.value + bonus;
    const value = 2;
    scopeContextExpect("collision self/local", this.value + value, 56);
    scopeContextExpect("collision other", other.value, 26);
    this.collisionContextPassed = true;
  }

  onAlarm0() {
    scopeContextExpect("method-bound projectile ran in a real Step event", this.reboundProjectile!.x > 700, true);
    scopeContextExpect("method-bound projectile keeps native direction", this.reboundProjectile!.y, 700);
    scopeContextExpect("with capture survives until a later event", this.capturedWithReader(), this.value + 5);
    scopeContextExpect("closure collision context copied to a local", this.capturedCollisionReader(), 28);
    scopeContextExpect("closure event lifetime", this.capturedEventReader(), this.value + 5);
    scopeContextExpect("collision event ran", this.collisionContextPassed, true);
    const projectile = this.projectile!;
    const step = projectile.on_step;
    scopeContextExpect("with callback binding", method_get_self(step), projectile.id);
    step();
    scopeContextExpect("with callback movement x", projectile.x, 105);
    scopeContextExpect("with callback movement y", projectile.y, 100);
    scopeContextExpect("with callback lexical this", projectile.lexicalReader(), this.value);
    scopeContextExpect("with callback function self", projectile.contextReader(), projectile.value);
    const reader = projectile.readerFactory();
    scopeContextExpect("with callback nested arrow", reader(), this.value);
    console.log("TS2GML_SCOPE_CONTEXT_OK");
    game_end(0);
  }

  callerValue(): number {
    return gm_other<obj_scope_target>().value;
  }

  checkMethodCaptures(target: GMInstance<obj_scope_target>): void {
    const ownerId = this.id;
    const projectile = instance_create_depth(700, 700, 0, obj_test_projectile);
    projectile.direction = 0;
    projectile.spd = 5;
    projectile.on_step = method(projectile, function () {
      x += lengthdir_x(projectile.spd, direction);
      y += lengthdir_y(projectile.spd, direction);
    });
    this.reboundProjectile = projectile;

    let calls = 0;
    const original = function () { calls += 1; return x + calls; };
    const left = { x: 100 };
    const right = { x: 200 };
    const first = method(left, original);
    const second = method(right, original);
    scopeContextExpect("method original receiver", original(), this.x + 1);
    scopeContextExpect("method first receiver and shared mutation", first(), 102);
    scopeContextExpect("method second receiver and shared mutation", second(), 203);
    scopeContextExpect("method leaves original receiver unchanged", original(), this.x + 4);
    const rebound = method(right, first);
    scopeContextExpect("method repeated rebinding", rebound(), 205);
    const bind = method;
    const aliased = bind(left, original);
    scopeContextExpect("method alias preserves captured variables", aliased(), 106);
    const spread = method(...([right, original] as [GMStruct, () => number]));
    scopeContextExpect("method spread call preserves captured variables", spread(), 207);
    scopeContextExpect("method clones bindings but shares capture cells", calls, 7);
    const factory = (receiver: GMStruct) => {
      const delta = 3;
      const callback = () => x + delta;
      return method(...([receiver, callback] as [GMStruct, () => number]));
    };
    const fromFactory = factory(right);
    scopeContextExpect("method spread helper retains renamed factory parameter", fromFactory(), 203);

    const offset = 7;
    const arrow = () => this.value + offset + x;
    const arrowBound = method(left, arrow);
    scopeContextExpect("method arrow lexical this separate from native self", arrowBound(), this.value + 107);
    const nested = method(left, () => (amount: number) => () => this.value + offset + amount + x);
    const nestedRead = nested()(3);
    scopeContextExpect("method nested scopes retain lexical and native contexts", nestedRead(), this.value + 110);
    const pure = () => offset;
    const pureBound = method(target, pure);
    scopeContextExpect("method pure closure retains captures", pureBound(), 7);

    const unboundPlain = method(undefined, function () {
      return x;
    });
    const unboundCapture = method(undefined, function () { return x + offset; });
    scopeContextExpect("method undefined uses calling instance", unboundCapture(), unboundPlain() + 7);
    const packet = { x: 400, plain: unboundPlain, captured: unboundCapture };
    scopeContextExpect("method undefined uses calling struct", packet.captured(), packet.plain() + 7);
    let fromSelf: () => number = () => 0;
    let fromOther: () => number = () => 0;
    gm_with(target, () => {
      fromSelf = method(gm_self(), unboundCapture);
      fromOther = method(gm_other(), unboundCapture);
    });
    scopeContextExpect("method resolves native self before saving environment", fromSelf(), target.x + 7);
    scopeContextExpect("method resolves native other before saving environment", fromOther(), this.x + 7);

    const thrower = function () { calls += 1; throw offset; };
    const throwingBound = method(left, thrower);
    let caught = 0;
    try { target.checkedInvoke(throwingBound); } catch (error) { caught = error as number; }
    scopeContextExpect("method exception preserves captured value", caught, 7);
    scopeContextExpect("method exception preserves shared mutation", calls, 8);
    scopeContextExpect("method exception restores caller context", this.id, ownerId);
    console.log("TS2GML_METHOD_CLOSURE_OK");
  }

  checkWithCaptures(target: GMInstance<obj_scope_target>): void {
    const ownerId = this.id;
    const targetId = target.id;
    const originalX = target.x;
    const originalY = target.y;
    const weapon = { projectile_speed: 5, direction: 0 };
    const install = (weapon: { projectile_speed: number; direction: number }) => {
      gm_with<obj_scope_target, obj_scope_runner>(target, (self, other) => {
        self.on_step = () => {
          x += lengthdir_x(weapon.projectile_speed, weapon.direction);
          y += lengthdir_y(weapon.projectile_speed, weapon.direction);
        };
      });
      return () => { weapon = { projectile_speed: 9, direction: 0 }; };
    };
    const replaceWeapon = install(weapon);
    const step = target.on_step;
    step();
    scopeContextExpect("weapon parameter crosses with and factory lifetime", target.x, originalX + 5);
    scopeContextExpect("weapon callback moves selected instance y", target.y, originalY);
    weapon.projectile_speed = 7;
    const copied = { x: 900, run: step };
    copied.run();
    scopeContextExpect("weapon mutation visible through copied callback", target.x, originalX + 12);
    scopeContextExpect("weapon callback does not move foreign caller", copied.x, 900);
    replaceWeapon();
    method_call(step, []);
    scopeContextExpect("weapon parameter reassignment shared across with", target.x, originalX + 21);
    target.x = originalX;
    target.y = originalY;

    gm_with<obj_scope_target, obj_scope_runner>(target, (self, other) => {
      let amount = 3;
      self.lexicalReader = () => {
        amount += 1;
        scopeContextExpect("captured with callback lexical this", this.id, ownerId);
        scopeContextExpect("captured with callback native self", gm_self().id, targetId);
        scopeContextExpect("captured with self parameter", self.id, targetId);
        scopeContextExpect("captured with other parameter", other.id, ownerId);
        return this.value + amount;
      };
      self.contextReader = function () {
        return self.value + other.value + amount;
      };
    });
    this.capturedWithReader = target.lexicalReader;
    scopeContextExpect("with body local shared with stored arrow", this.capturedWithReader(), this.value + 4);
    scopeContextExpect("with body local shared with ordinary function", target.contextReader(), target.value + this.value + 4);

    gm_with<obj_scope_target, obj_scope_runner>(target, (outer, caller) => {
      const outerLocal = 3;
      gm_with<obj_scope_runner, obj_scope_target>(caller, (middle, previous) => {
        const middleLocal = 4;
        gm_with<obj_scope_target, obj_scope_runner>(previous, (inner, previousCaller) => {
          const innerLocal = 5;
          inner.readerFactory = () => () => {
            scopeContextExpect("deep captured with outer alias", outer.id, targetId);
            scopeContextExpect("deep captured with middle alias", middle.id, ownerId);
            scopeContextExpect("deep captured with inner alias", inner.id, targetId);
            scopeContextExpect("deep captured with caller alias", previousCaller.id, ownerId);
            scopeContextExpect("deep captured with lexical this", this.id, ownerId);
            scopeContextExpect("deep captured with native self", gm_self().id, targetId);
            return outerLocal + middleLocal + innerLocal + weapon.projectile_speed;
          };
        });
      });
    });
    const deepRead = target.readerFactory();
    scopeContextExpect("captures survive three with scopes and nested functions", deepRead(), 19);

    const extra1 = instance_create_depth(400, 400, 0, obj_scope_target);
    const extra2 = instance_create_depth(500, 400, 0, obj_scope_target);
    const readers: Array<() => number> = [];
    let shared = 0;
    gm_with(obj_scope_target, () => {
      let perInstance = 0;
      readers.push(() => { perInstance += 1; shared += 1; return perInstance; });
    });
    scopeContextExpect("with produces one environment per selected instance", readers.length, 3);
    scopeContextExpect("first with environment counter", readers[0]!(), 1);
    scopeContextExpect("second with environment counter", readers[1]!(), 1);
    scopeContextExpect("third with environment counter", readers[2]!(), 1);
    scopeContextExpect("with environments share enclosing binding", shared, 3);
    instance_destroy(extra1);
    instance_destroy(extra2);
    scopeContextExpect("first with local survives creator destruction", readers[0]!(), 2);
    scopeContextExpect("second with local survives creator destruction", readers[1]!(), 2);
    scopeContextExpect("third with local survives creator destruction", readers[2]!(), 2);
    scopeContextExpect("with captures restore enclosing native context", gm_self().id, ownerId);
    console.log("TS2GML_WITH_CLOSURE_OK");
  }

  checkClosureContexts(target: GMInstance<obj_scope_target>): void {
    console.log("TS2GML_CLOSURE_CONTEXT_BEGIN");
    const ownerId = this.id;
    const targetId = target.id;
    const ownerValue = this.value;
    scopeContextExpect("closure initialized in global scope", gm_global.closureGlobalRead(), 17);
    const expected = target.value + 7;
    const read = target.deepCaptured(7)()()()()()()();
    scopeContextExpect("deep object callback direct", read(), expected);
    scopeContextExpect("deep object callback foreign caller", target.checkedInvoke(read), expected);
    const copied = { value: 900, read };
    scopeContextExpect("deep object callback struct caller", copied.read(), expected);
    const nativeCall = method_call(read, []);
    scopeContextExpect("deep object callback method_call", nativeCall, expected);
    gm_global.closureContextCallback = read;
    const bridge = method(copied, function () {
      return gm_global.closureContextCallback();
    });
    scopeContextExpect("deep object callback explicitly bound bridge", bridge(), expected);
    scopeContextExpect("bound bridge restores owner self", this.id, ownerId);
    let argumentVisits = 0;
    target.argumentContexts((value) => { argumentVisits += 1; return value; });
    scopeContextExpect("indirect argument context callbacks ran", argumentVisits, 3);
    scopeContextExpect("captured callback exposes a struct environment", is_struct(method_get_self(read)), true);
    const reboundTarget = instance_create_depth(600, 600, 0, obj_scope_target);
    reboundTarget.value = 90;
    const rebound = method(reboundTarget, read);
    scopeContextExpect("explicit rebinding retains the capture environment", rebound(), 97);
    scopeContextExpect("rebinding does not mutate original callback", read(), expected);
    instance_destroy(reboundTarget);

    this.gm_with<obj_scope_target>(target, (selected, caller) => {
      scopeContextExpect("captured callback from with", read(), expected);
      scopeContextExpect("with self restored after closure", gm_self().id, targetId);
      scopeContextExpect("with other restored after closure", gm_other().id, ownerId);
      gm_with<obj_scope_runner, obj_scope_target>(caller, (middle, outer) => {
        gm_with<obj_scope_target, obj_scope_runner>(outer, (inner, previous) => {
          scopeContextExpect("captured callback from three with scopes", method_call(read, []), expected);
          scopeContextExpect("deep with self after closure", gm_self().id, targetId);
          scopeContextExpect("deep with other after closure", gm_other().id, ownerId);
          scopeContextExpect("deep with previous alias survives", previous.id, ownerId);
          scopeContextExpect("deep with middle alias survives", middle.id, ownerId);
          scopeContextExpect("deep with inner alias survives", inner.id, targetId);
        });
      });
      // These captures belong to the factory invocation, not the inline with.
      const lexicalFactory = (amount: number) => () => () => this.value + amount;
      const nativeFactory = function (amount: number) {
        return () => gm_self<obj_scope_target>().value + amount;
      };
      selected.readerFactory = lexicalFactory(3);
      selected.contextReader = nativeFactory(4);
      scopeContextExpect("with enclosing caller alias", caller.id, ownerId);
    });
    const lexical = target.readerFactory();
    scopeContextExpect("factory within with preserves outer lexical this", lexical(), ownerValue + 3);
    scopeContextExpect("ordinary factory within with preserves native self", target.contextReader(), target.value + 4);
    scopeContextExpect("with context restored to method owner", this.id, ownerId);

    const originalX = target.x;
    const move = target.nativeCaptured(6);
    scopeContextExpect("captured native instance variable", move(), originalX + 6);
    scopeContextExpect("captured native write belongs to target", target.x, originalX + 6);
    target.x = originalX;
    const multiplier = 3;
    const map = (value: number, index: number) => value * multiplier + this.value + index;
    const mapped = array_map([1, 2, 3], map);
    scopeContextExpect("native array_map capture first", mapped[0], ownerValue + 3);
    scopeContextExpect("native array_map capture last", mapped[2], ownerValue + 11);
    const threshold = 2;
    const filtered = array_filter([1, 2, 3], (value) => value >= threshold);
    scopeContextExpect("native array_filter capture", filtered.join(), "2,3");
    let total = 0;
    array_foreach([1, 2, 3], (value: number) => { total += value + this.value; });
    scopeContextExpect("native array_foreach shared mutation and self", total, 6 + ownerValue * 3);
    const order = -1;
    const sorted = [1, 3, 2];
    array_sort(sorted, (left, right) => (left - right) * order);
    scopeContextExpect("native array_sort captured comparator", sorted.join(), "3,2,1");
    scopeContextExpect("native callback calls restore owner", this.id, ownerId);

    const thrower = target.throwingCaptured(2);
    let caught = false;
    try { target.checkedInvoke(thrower); } catch { caught = true; }
    scopeContextExpect("captured callback exception observed", caught, true);
    scopeContextExpect("captured exception restores self", this.id, ownerId);
    scopeContextExpect("captured callback still works after throw", read(), expected);
    const otherFactory = target.otherFactory(1);
    const returnedOther = otherFactory();
    const ordinaryOther = target.plainOtherFactory();
    scopeContextExpect("returned noncapturing function has its own other", returnedOther(), ordinaryOther());
    scopeContextExpect("returned function other through same receiver", target.checkedInvoke(returnedOther), target.checkedInvoke(ordinaryOther));
    const transient = instance_create_depth(500, 500, 0, obj_scope_target);
    const pure = transient.capturedReader(19);
    const bound = transient.deepCaptured(3)()()()()()()();
    instance_deactivate_object(transient);
    scopeContextExpect("pure capture survives inactive creator", pure(), 19);
    scopeContextExpect("context closure follows inactive with semantics", bound(), undefined);
    instance_activate_object(transient);
    scopeContextExpect("context closure works after activation", bound(), 23);
    instance_destroy(transient);
    scopeContextExpect("pure capture survives destroyed creator", pure(), 19);
    scopeContextExpect("context closure follows destroyed with semantics", bound(), undefined);
    console.log("TS2GML_CLOSURE_CONTEXT_OK");
  }
}

class TestRoom extends GMRoom {
  onCreate() {
    exception_unhandled_handler((exception: GMStruct) => {
      console.error(`TS2GML_SCOPE_CONTEXT_ERROR: ${exception.longMessage}`);
      game_end(1);
    });
    let roomValue = 2;
    const readRoom = () => roomValue;
    roomValue = 4;
    scopeContextExpect("closure room creation locals", readRoom(), 4);
    closureContractRun();
    enumContractRun();
    loweringMatrixRun();
    scopeContextExpect("room self", this, gm_self());
    instance_create_depth(0, 0, 0, obj_scope_runner);
  }
}
