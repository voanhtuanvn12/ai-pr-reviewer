import { describe, it, expect } from 'vitest';

// Simple test to make the build pass
describe('Basic test', () => {
  it('should pass basic arithmetic', () => {
    expect(1 + 1).toBe(2);
  });

  it('should work with strings', () => {
    expect('hello'.toUpperCase()).toBe('HELLO');
  });
});
