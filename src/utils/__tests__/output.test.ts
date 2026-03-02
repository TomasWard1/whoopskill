import { describe, it, expect } from 'vitest';
import { resolveFormat } from '../output.js';

describe('resolveFormat', () => {
  it('returns json when format is json', () => {
    expect(resolveFormat('json')).toBe('json');
    expect(resolveFormat('json', true)).toBe('json');
    expect(resolveFormat('json', false)).toBe('json');
  });

  it('returns pretty when format is pretty', () => {
    expect(resolveFormat('pretty')).toBe('pretty');
    expect(resolveFormat('pretty', true)).toBe('pretty');
    expect(resolveFormat('pretty', false)).toBe('pretty');
  });

  it('returns pretty when auto + TTY', () => {
    expect(resolveFormat('auto', true)).toBe('pretty');
  });

  it('returns json when auto + piped', () => {
    expect(resolveFormat('auto', false)).toBe('json');
  });
});
