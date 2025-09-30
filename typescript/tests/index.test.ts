import { describe, it, expect } from 'vitest';
import { version } from '../src/index';

describe('Dapr Agents TypeScript', () => {
  it('should have the correct version', () => {
    expect(version).toBe('0.1.0');
  });
});