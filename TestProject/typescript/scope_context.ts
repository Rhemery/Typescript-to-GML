interface GMGlobal {
  scopeContextValue: number;
}

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
  value = 20;

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
    return gm_other<obj_scope_runner>().value;
  }
}

class obj_scope_runner extends GMObject {
  value = 40;
  collisionContextPassed = false;

  constructor() {
    super();
    this.value = 41;
  }

  onCreate() {
    const value = 2;
    scopeContextExpect("event field/local", this.value + value, 43);
    scopeContextExpect("event self", this, gm_self);

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
    scopeContextExpect("object variable", target.value, 20);
    scopeContextExpect("object field/parameter", target.fromParameter(4), 24);
    scopeContextExpect("object field/local", target.fromLocal(), 23);
    scopeContextExpect("direct method other", target.callerValue(), target.value);
    const targetCaller = target.callerValue;
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

    this.gm_with(obj_scope_target, (selected, runner) => {
      gm_with<obj_scope_target, obj_scope_target>(obj_scope_target, (nested, outer) => {
        nested.value += 1;
        outer.value += 2;
        runner.value += 4;
        this.value += 8;
      });
    });
    scopeContextExpect("nested with self/other", target.value, 26);
    scopeContextExpect("nested with lexical this", this.value, 54);

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
    const value = 2;
    scopeContextExpect("collision self/local", this.value + value, 56);
    scopeContextExpect("collision other", other.value, 26);
    this.collisionContextPassed = true;
  }

  onAlarm0() {
    scopeContextExpect("collision event ran", this.collisionContextPassed, true);
    console.log("TS2GML_SCOPE_CONTEXT_OK");
    game_end(0);
  }

  callerValue(): number {
    return gm_other<obj_scope_target>().value;
  }
}

class TestRoom extends GMRoom {
  onCreate() {
    exception_unhandled_handler((exception: GMStruct) => {
      console.error(`TS2GML_SCOPE_CONTEXT_ERROR: ${exception.longMessage}`);
      game_end(1);
    });
    loweringMatrixRun();
    scopeContextExpect("room self", this, gm_self);
    instance_create_depth(0, 0, 0, obj_scope_runner);
  }
}
