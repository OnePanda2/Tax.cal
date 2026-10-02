import assert from 'node:assert/strict';

/* Exact-to-the-cent comparison by default. Deterministic direct-tax maths
   should not need a broad tolerance; where one is used, it is stated. */
export function close(actual, expected, tol = 0.005, msg = '') {
  assert.ok(Number.isFinite(actual), `${msg} expected a finite number, got ${actual}`);
  assert.ok(Math.abs(actual - expected) <= tol, `${msg} expected ${expected}, got ${actual} (tol ${tol})`);
}

export const line = (calc, key) => {
  const l = calc.lines.find((x) => x.key === key);
  assert.ok(l, `line ${key} missing`);
  return l.amount;
};
