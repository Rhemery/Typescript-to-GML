var value = 2;
scopeContextExpect("collision self/local", self.value + value, 56);
scopeContextExpect("collision other", other.value, 26);
self.collisionContextPassed = true;
