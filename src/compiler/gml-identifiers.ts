const gmlIdentifierPattern = /^[A-Z_a-z]\w*$/;

export function isGmlIdentifier(value: string): boolean {
  return value.length <= 64 && gmlIdentifierPattern.test(value);
}
