/**
 * Compares two semantic version strings.
 * Returns -1 if v1 < v2
 * Returns 1 if v1 > v2
 * Returns 0 if v1 == v2
 */
export function compareVersions(v1: string, v2: string): number {
  if (!v1 || !v2) return 0;
  
  const parts1 = v1.split('.').map(p => parseInt(p, 10));
  const parts2 = v2.split('.').map(p => parseInt(p, 10));
  
  const len = Math.max(parts1.length, parts2.length);
  
  for (let i = 0; i < len; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    
    // Handle NaN in case of malformed versions
    if (isNaN(num1) || isNaN(num2)) {
      continue;
    }
    
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  
  return 0;
}
