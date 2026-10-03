class StaticContractParent {
  static value = 10;
  static unset: number | undefined = 7;
  static constructions = 0;
  constructor() { StaticContractParent.constructions += 1; }
}

class StaticContractChild extends StaticContractParent {
  static before = this.read();
  static missingBefore = this.readMissing();
  static unsetBefore = this.readUnset();
  static optionalBefore = this.readOptional();
  static optionalClassBefore = this.readOptionalClass();
  static value = 20;
  static missing = 30;
  static unset: number | undefined;
  static optional: { value: number } | undefined;
  constructor() { super(); }
  static read() { return this.value; }
  static readMissing() { return this.missing; }
  static readUnset() { return this.unset; }
  static readOptional() { return this.optional?.value; }
  static readOptionalClass() { return this?.missing; }
}

class StaticContractWrite {
  static before = this.initialize();
  static later: number | undefined;
  static initialize() { this.later = 9; return this.later; }
}

function staticContractRun(): void {
  scopeContextExpect("static initialization does not construct", StaticContractParent.constructions, 0);
  scopeContextExpect("static initializer reads inherited field", StaticContractChild.before, 10);
  scopeContextExpect("static missing field reads undefined", StaticContractChild.missingBefore, undefined);
  scopeContextExpect("static unset field initially inherits", StaticContractChild.unsetBefore, 7);
  scopeContextExpect("static unset declaration hides parent", StaticContractChild.unset, undefined);
  scopeContextExpect("static optional missing field", StaticContractChild.optionalBefore, undefined);
  scopeContextExpect("static optional class missing field", StaticContractChild.optionalClassBefore, undefined);
  scopeContextExpect("static child initialized field", StaticContractChild.read(), 20);
  scopeContextExpect("static parent remains unchanged", StaticContractParent.value, 10);
  scopeContextExpect("static earlier initializer writes later field", StaticContractWrite.before, 9);
  scopeContextExpect("static declaration resets earlier write", StaticContractWrite.later, undefined);
  const instance = new StaticContractChild();
  scopeContextExpect("static construction runs exactly once", StaticContractParent.constructions, 1);
  scopeContextExpect("static construction preserves snapshot", StaticContractChild.before, 10);
  scopeContextExpect("static instance exists", instance instanceof StaticContractParent, true);
  show_debug_message("TS2GML_STATIC_CONTRACT_OK");
}

class NativeStaticContract {
  static initializations = 0;
  static shared = 100;
  shared = gm_static(() => NativeStaticContract.initialize());
  data = gm_static(() => ({ value: 1 }));
  static initialize() { this.initializations += 1; return 12; }
  read() { return this.shared; }
  increment() { this.shared += 1; }
}

class NativeStaticContractChild extends NativeStaticContract {
  shared = gm_static(() => 40);
  constructor() { super(); }
}

function nativeStaticContractRun(): void {
  scopeContextExpect("native static initializes lazily", NativeStaticContract.initializations, 0);
  const a = new NativeStaticContract();
  const b = new NativeStaticContract();
  scopeContextExpect("native static initializes once", NativeStaticContract.initializations, 1);
  scopeContextExpect("native static reads first instance", a.read(), 12);
  scopeContextExpect("native static reads second instance", b.read(), 12);
  a.shared = 40;
  scopeContextExpect("native static instance write shadows", a.read(), 40);
  scopeContextExpect("native static instance write leaves peer", b.read(), 12);
  b.increment();
  scopeContextExpect("native static method write shadows", b.read(), 13);
  const c = new NativeStaticContract();
  scopeContextExpect("native static later instance reads shared value", c.read(), 12);
  a.data.value = 8;
  scopeContextExpect("native static struct reference is shared", b.data.value, 8);
  const child = new NativeStaticContractChild();
  scopeContextExpect("native static child overrides shared field", child.read(), 40);
  scopeContextExpect("native static parent storage survives override", c.read(), 12);
  scopeContextExpect("native static parent initializer stays once", NativeStaticContract.initializations, 1);
  scopeContextExpect("native and TypeScript static names are separate", NativeStaticContract.shared, 100);
  show_debug_message("TS2GML_NATIVE_STATIC_CONTRACT_OK");
}
