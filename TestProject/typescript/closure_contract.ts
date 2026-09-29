// Shared by the JavaScript contract test and the real GameMaker VM fixture.
// Sixteen factory levels mix arrows and ordinary functions; the leaf callbacks
// capture all levels, and sibling branches deliberately share only some of them.
function closureContractDeep(seed: number) {
  const readSeed = () => seed;
  const branch = (level1: number) => {
    return function(level2: number) {
      return (level3: number) => {
        return function(level4: number) {
          return (level5: number) => {
            return function(level6: number) {
              return (level7: number) => {
                return function(level8: number) {
                  return (level9: number) => {
                    return function(level10: number) {
                      return (level11: number) => {
                        return function(level12: number) {
                          return (level13: number) => {
                            return function(level14: number) {
                              return (level15: number) => {
                                return function(level16: number) {
                                  return {
                                    read: () => seed + level1 + level2 + level3 + level4 + level5 + level6 + level7 + level8 + level9 + level10 + level11 + level12 + level13 + level14 + level15 + level16,
                                    bump: (amount: number) => {
                                      seed += amount; level1 += amount; level8 += amount; level16 += amount;
                                      return seed + level1 + level2 + level3 + level4 + level5 + level6 + level7 + level8 + level9 + level10 + level11 + level12 + level13 + level14 + level15 + level16;
                                    }
                                  };
                                };
                              };
                            };
                          };
                        };
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    };
  };
  return { readSeed, branch };
}

class ClosureContractBase {
  value = 10;
  static value = 100;
  readConstructor: () => number = () => 0;
  fieldFactory = (amount: number) => () => this.value + amount;
  constructor(value: number) {
    this.value = value;
    this.readConstructor = () => value + this.value;
    value += 1;
  }
  factory(amount: number) {
    return {
      read: () => this.value + amount,
      nested: () => (extra: number) => () => this.value + amount + extra,
      array: [() => this.value + amount],
    };
  }
  literalFactories() {
    return {
      value: 999,
      factory: (amount: number) => () => this.value + amount,
      array: [(amount: number) => () => this.value + amount],
    };
  }
  contextNames(self: number, other: number) { return () => this.value + self + other; }
  static factory(amount: number) {
    return () => (extra: number) => () => this.value + amount + extra;
  }
}

class ClosureContractChild extends ClosureContractBase {
  static value = 200;
  readChild: () => number = () => 0;
  constructor(value: number) {
    super(value);
    const extra = 3;
    this.readChild = () => value + extra + this.value;
    value += 2;
  }
}

function closureContractDefaults(first = 3, second = first + 1) {
  return (amount = 2) => { first += amount; return first + second; };
}

function closureContractShadow(value: number) {
  const outer = () => value;
  const middle = (value: number) => {
    const inner = (value: number) => () => value;
    const read = () => value;
    value += 1;
    return { read, inner };
  };
  return { outer, middle };
}

function closureContractRun(): void {
  console.log("TS2GML_CLOSURE_DEEP_BEGIN");
  const root = closureContractDeep(100);
  const middle = root.branch(1)(2)(3)(4)(5)(6)(7)(8);
  console.log("TS2GML_CLOSURE_DEEP_MIDDLE");
  const first = middle(9)(10)(11)(12)(13)(14)(15)(16);
  const second = middle(90)(100)(110)(120)(130)(140)(150)(160);
  scopeContextExpect("deep initial sum", first.read(), 236);
  scopeContextExpect("deep sibling initial sum", second.read(), 1136);
  scopeContextExpect("deep write across four environments", first.bump(1), 240);
  scopeContextExpect("deep sibling shares ancestors", second.read(), 1139);
  scopeContextExpect("deep sibling write", second.bump(2), 1147);
  scopeContextExpect("deep leaf storage stays independent", first.read(), 246);
  scopeContextExpect("deep owner sees leaf mutation", root.readSeed(), 103);
  const independent = closureContractDeep(500).branch(1)(2)(3)(4)(5)(6)(7)(8)(9)(10)(11)(12)(13)(14)(15)(16);
  scopeContextExpect("deep independent invocation", independent.read(), 636);
  console.log("TS2GML_CLOSURE_RECEIVERS_BEGIN");

  const owner = new ClosureContractChild(10);
  const foreign = new ClosureContractChild(50);
  scopeContextExpect("base constructor capture", owner.readConstructor(), 21);
  scopeContextExpect("derived constructor capture", owner.readChild(), 25);
  const packet = owner.factory(5);
  const detached = packet.read;
  const { read: destructured } = packet;
  const forwarded = { value: 1000, read: packet.read };
  const noArguments: [] = [];
  scopeContextExpect("captured arrow in struct", packet.read(), 15);
  scopeContextExpect("captured arrow detached", detached(), 15);
  scopeContextExpect("captured arrow destructured", destructured(), 15);
  scopeContextExpect("captured arrow copied to foreign struct", forwarded.read(), 15);
  scopeContextExpect("captured arrow property spread call", forwarded.read(...noArguments), 15);
  const readKey = "read";
  scopeContextExpect("captured arrow computed property call", forwarded[readKey](), 15);
  const factoryKey = "factory";
  const dynamicPacket = owner[factoryKey](2);
  scopeContextExpect("ordinary method computed property receiver", dynamicPacket.read(), 12);
  const ordinarySpread = owner.factory(...([3] as [number]));
  scopeContextExpect("ordinary method spread receiver", ordinarySpread.read(), 13);
  scopeContextExpect("captured arrow in array", packet.array[0]!(), 15);
  const nested = packet.nested();
  const deepRead = nested(3);
  owner.value = 20;
  scopeContextExpect("nested lexical receiver remains live", deepRead(), 28);
  scopeContextExpect("sibling lexical receiver remains live", detached(), 25);
  scopeContextExpect("independent constructor capture", foreign.readConstructor(), 101);
  const field = owner.fieldFactory(2);
  scopeContextExpect("field initializer factory", field(), 22);
  const literal = owner.literalFactories();
  const literalFactory = literal.factory;
  const literalRead = literalFactory(4);
  scopeContextExpect("factory in struct literal retains lexical this", literalRead(), 24);
  const arrayFactory = literal.array[0]!;
  const arrayRead = arrayFactory(6);
  scopeContextExpect("factory in array literal retains lexical this", arrayRead(), 26);
  const contextNames = owner.contextNames(2, 3);
  scopeContextExpect("captured parameters named self and other", contextNames(), 25);
  const staticRoot = ClosureContractChild.factory(7);
  const staticMiddle = staticRoot();
  const staticRead = staticMiddle(8);
  scopeContextExpect("inherited static factory receiver", staticRead(), 215);
  ClosureContractChild.value = 300;
  scopeContextExpect("static receiver remains live", staticRead(), 315);
  scopeContextExpect("static base remains independent", ClosureContractBase.value, 100);
  console.log("TS2GML_CLOSURE_BINDINGS_BEGIN");

  const defaults = closureContractDefaults();
  scopeContextExpect("captured dependent parameter defaults", defaults(), 9);
  scopeContextExpect("captured parameter default reuses shared binding", defaults(3), 12);
  const shadow = closureContractShadow(10);
  const shadowMiddle = shadow.middle(20);
  const shadowLeaf = shadowMiddle.inner(30);
  scopeContextExpect("shadow outer symbol", shadow.outer(), 10);
  scopeContextExpect("shadow middle symbol", shadowMiddle.read(), 21);
  scopeContextExpect("shadow leaf symbol", shadowLeaf(), 30);

  let left = 1, right = left + 2;
  const pair = () => left + right;
  left += 1;
  scopeContextExpect("multi-declarator initializer order", pair(), 5);
  let delayed: number;
  const later = () => delayed;
  delayed = 9;
  scopeContextExpect("uninitialized capture assigned later", later(), 9);
  const early = () => declaredLater;
  const declaredLater = 13;
  scopeContextExpect("callback created before binding initialization", early(), 13);
  var hoisted: number;
  const readHoisted = () => hoisted;
  hoisted = 17;
  scopeContextExpect("captured var initialization", readHoisted(), 17);

  let odd: (depth: number) => boolean;
  const even = (depth: number): boolean => depth === 0 ? true : odd(depth - 1);
  odd = (depth: number): boolean => depth === 0 ? false : even(depth - 1);
  scopeContextExpect("mutually recursive captured callbacks", even(12), true);
  scopeContextExpect("mutual recursion other branch", odd(11), true);

  let visits = 0;
  const tick = () => { visits += 1; return visits; };
  const lazy = (value: number | undefined) => (value ?? tick()) || tick();
  scopeContextExpect("logical defined branch skips captures", lazy(7), 7);
  scopeContextExpect("logical missing branch invokes capture", lazy(undefined), 1);
  scopeContextExpect("logical zero invokes second branch", lazy(0), 2);
  scopeContextExpect("logical side effects occur once", visits, 2);
  const array = [10, 20];
  let indexReads = 0;
  const index = () => { indexReads += 1; return 0; };
  const update = () => { array[index()]! += visits; return array[0]; };
  scopeContextExpect("captured indexed assignment", update(), 12);
  scopeContextExpect("captured index evaluated once", indexReads, 1);
  let optionalCalls = 0;
  const optionalPacket = { run: () => { optionalCalls += 1; return optionalCalls; } };
  optionalPacket?.run(...noArguments);
  scopeContextExpect("optional spread callback retains environment", optionalCalls, 1);
  const packetFactory = () => optionalPacket;
  packetFactory()?.run(...noArguments);
  scopeContextExpect("optional factory spread callback retains environment", optionalCalls, 2);
  const invoke = (read: () => number) => read();
  scopeContextExpect("closure factory inside spread argument",
    invoke(...([((amount: number) => () => amount)(5)] as [() => number])), 5);
  const initial = 10;
  const slot = { run: (amount: number) => initial + amount };
  const changeSlot = () => { slot.run = (amount: number) => 100 + amount; return 2; };
  scopeContextExpect("spread selects callback before argument side effects", slot.run(...([changeSlot()] as [number])), 12);
  scopeContextExpect("spread argument callback replacement persists", slot.run(2), 102);
  const spread: [number] = [4];
  scopeContextExpect("captured callback spread call", defaults(...spread), 16);

  let completed = 0;
  const finish = (fail: boolean) => {
    try {
      completed += 1;
      if (fail) throw "closure test";
      return completed;
    } finally {
      completed += 10;
    }
  };
  scopeContextExpect("closure return through finally", finish(false), 1);
  scopeContextExpect("closure finally shares binding", completed, 11);
  try { finish(true); } catch { completed += 100; }
  scopeContextExpect("closure throw through finally", completed, 122);
  const readCompleted = () => completed;
  scopeContextExpect("closure remains callable after exception", readCompleted(), 122);

  let shared = 0;
  const readers: Array<() => number> = [];
  for (let iteration = 0; iteration < 3; iteration++) {
    shared += 1;
    readers.push(() => shared);
  }
  scopeContextExpect("loop-created callbacks share function binding", readers[0]!(), 3);
  shared += 1;
  scopeContextExpect("loop-created second callback sees mutation", readers[1]!(), 4);
  const isolated: Array<() => number> = [];
  for (let iteration = 0; iteration < 3; iteration++) {
    isolated.push(closureContractShadow(iteration).outer);
  }
  scopeContextExpect("per-call environments inside loop first", isolated[0]!(), 0);
  scopeContextExpect("per-call environments inside loop last", isolated[2]!(), 2);
  console.log("TS2GML_CLOSURE_CONTRACT_OK");
}

