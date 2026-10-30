// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Blucca
'use strict';

// JSON-only structural equality helper for browser compatibility
// Compares parsed JSON values only: object key order ignored, arrays order matters
function jsonDeepEqual(a, b) {
  // Handle primitive values and null/undefined
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  
  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!jsonDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  // Handle objects (not arrays)
  if (typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    
    // Check all keys in a exist in b with equal values
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!jsonDeepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  
  // Handle numbers, strings, booleans
  return a === b;
}

module.exports = { jsonDeepEqual };