/* Small, dependency-free helpers shared by every calculator. */

export const INF = Infinity;

/* Tax over absolute thresholds: table = [[rate, upTo], ...], ascending, the last
   upTo being Infinity. Income at or below `floor` is untaxed by this table. */
export function bracketTax(x, table, floor = 0) {
  let tax = 0;
  let prev = floor;
  for (const [rate, upTo] of table) {
    if (x <= prev) break;
    tax += (Math.min(x, upTo) - prev) * rate;
    prev = upTo;
  }
  return tax;
}

export const pos = (x) => (x > 0 ? x : 0);
export const min = Math.min;
export const max = Math.max;

/* Round to cents. Used only for presentation of results, never mid-calculation. */
export const round2 = (x) => Math.round(x * 100) / 100;

/* Number formatting that works in browsers, Node and Workers. */
export function formatMoney(amount, currency, digits = 0) {
  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency', currency: currency.code,
      minimumFractionDigits: digits, maximumFractionDigits: digits
    }).format(digits === 0 ? Math.round(amount) : amount);
  } catch (e) {
    return currency.symbol + Math.round(amount).toLocaleString('en');
  }
}

export const pct = (x, dp = 1) => (x * 100).toFixed(dp) + '%';

/* Deep-freeze rule data so no caller can mutate the single source of truth. */
export function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
}
