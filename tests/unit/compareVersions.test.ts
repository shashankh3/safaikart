import { compareVersions } from '../../src/core/updates/compareVersions';

describe('compareVersions', () => {
  it('should return -1 when v1 < v2', () => {
    expect(compareVersions('1.9.0', '1.10.0')).toBe(-1);
    expect(compareVersions('0.9.9', '1.0.0')).toBe(-1);
    expect(compareVersions('2.0', '2.0.1')).toBe(-1);
  });

  it('should return 1 when v1 > v2', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
    expect(compareVersions('2.0.1', '2.0')).toBe(1);
    expect(compareVersions('2.1.0', '2.0.9')).toBe(1);
  });

  it('should return 0 when v1 == v2', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('2.1', '2.1.0')).toBe(0);
    expect(compareVersions('1.2.3.4', '1.2.3.4')).toBe(0);
  });

  it('should handle malformed or missing segments sanely', () => {
    expect(compareVersions('', '1.0')).toBe(0);
    expect(compareVersions('1.0.a', '1.0.1')).toBe(-1);
    expect(compareVersions('1.0.1', '1.0.a')).toBe(1);
    expect(compareVersions('1.0.a', '1.0.b')).toBe(0); // Both NaN
  });
});
