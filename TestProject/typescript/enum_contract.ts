enum EnumNumeric {
  Idle,
  Active = 4,
  Next,
  Flags = Active | 8,
  Negative = -2,
  Fraction = 1.5,
  Small = 0.0001,
  Smaller = 0.00001,
  Tiny = 1e-7,
  NegativeSmall = -1e-7,
  Large = 1e21,
  Alias = Active,
}

enum EnumText {
  Idle = "idle",
  Active = "active",
  Alias = Active,
  "with-dash" = "dash",
}

enum EnumMixed { No = 0, Yes = "yes" }
const enum EnumBits { First = 1, Second = First << 1 }
enum EnumMerged { First = 7 }
enum EnumMerged { Second = First + 1 }
enum EnumEmpty {}

function enumLocal(seed: number) {
  let calls = 0;
  const next = () => { calls += 1; return seed; };
  enum Local { First = next(), Second = First + 1, Alias = First }
  scopeContextExpect("enum initializer once", calls, 1);
  scopeContextExpect("enum computed reverse", Local[seed], "Alias");
  return () => Local.Second;
}

function enumContractRun(): void {
  scopeContextExpect("enum implicit zero", EnumNumeric.Idle, 0);
  scopeContextExpect("enum explicit", EnumNumeric.Active, 4);
  scopeContextExpect("enum increment", EnumNumeric.Next, 5);
  scopeContextExpect("enum flags", EnumNumeric.Flags, 12);
  scopeContextExpect("enum negative", EnumNumeric.Negative, -2);
  scopeContextExpect("enum fraction", EnumNumeric.Fraction, 1.5);
  scopeContextExpect("enum reverse", EnumNumeric[0], "Idle");
  scopeContextExpect("enum duplicate reverse", EnumNumeric[4], "Alias");
  scopeContextExpect("enum negative reverse", EnumNumeric[-2], "Negative");
  scopeContextExpect("enum fraction reverse", EnumNumeric[1.5], "Fraction");
  scopeContextExpect("enum string numeric reverse", EnumNumeric["1.5"], "Fraction");
  scopeContextExpect("enum small reverse", EnumNumeric[0.0001], "Small");
  scopeContextExpect("enum smaller reverse", EnumNumeric[0.00001], "Smaller");
  scopeContextExpect("enum small string reverse", EnumNumeric["0.00001"], "Smaller");
  scopeContextExpect("enum exponent reverse", EnumNumeric["1e-7"], "Tiny");
  scopeContextExpect("enum negative exponent reverse", EnumNumeric["-1e-7"], "NegativeSmall");
  scopeContextExpect("enum large reverse", EnumNumeric["1e+21"], "Large");
  scopeContextExpect("enum missing reverse", EnumNumeric[99], undefined);
  scopeContextExpect("enum string", EnumText.Active, "active");
  scopeContextExpect("enum string alias", EnumText.Alias, "active");
  scopeContextExpect("enum quoted key", EnumText["with-dash"], "dash");
  scopeContextExpect("enum string no reverse", "active" in EnumText, false);
  scopeContextExpect("enum mixed number", EnumMixed.No, 0);
  scopeContextExpect("enum mixed string", EnumMixed.Yes, "yes");
  const numericValues: EnumNumeric[] = [];
  const textValues: EnumText[] = [];
  const mixedValues: EnumMixed[] = [];
  numericValues.push(EnumNumeric.Active);
  textValues.push(EnumText.Active);
  mixedValues.push(EnumMixed.Yes);
  scopeContextExpect("enum numeric collection guard", numericValues[0], 4);
  scopeContextExpect("enum string collection guard", textValues[0], "active");
  scopeContextExpect("enum mixed collection guard", mixedValues[0], "yes");
  scopeContextExpect("enum const", EnumBits.Second, 2);
  scopeContextExpect("enum merged", EnumMerged.Second, 8);
  scopeContextExpect("enum empty", typeof EnumEmpty, "object");
  const alias = EnumNumeric;
  const copy = { ...EnumNumeric };
  scopeContextExpect("enum numeric key in", 0 in copy, true);
  delete copy[0];
  scopeContextExpect("enum numeric key delete", 0 in copy, false);
  scopeContextExpect("enum object alias", alias === EnumNumeric, true);
  scopeContextExpect("enum alias lookup", alias.Active, 4);
  const { Active } = EnumNumeric;
  scopeContextExpect("enum destructuring", Active, 4);
  let members = 0;
  for (const key in EnumText) { members += 1; }
  scopeContextExpect("enum enumeration", members, 4);
  const first = enumLocal(10);
  const second = enumLocal(20);
  scopeContextExpect("enum local closure", first(), 11);
  scopeContextExpect("enum separate calls", second(), 21);
  console.log("TS2GML_ENUM_CONTRACT_OK");
}
