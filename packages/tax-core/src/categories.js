/* Spending categories used by the indirect-tax estimate. `def` is the default
   monthly spend as a fraction of MONTHLY gross pay — the "typical household"
   profile used when someone has not entered their own spending. It is an
   internal Tax.cal assumption, reported as such wherever it is applied. */
import { deepFreeze } from './util.js';

export const CATEGORIES = deepFreeze([
  { id: 'groceries',     label: 'Groceries',             emoji: '🛒', def: 0.055 },
  { id: 'dining',        label: 'Eating out & takeaway', emoji: '🍽️', def: 0.035 },
  { id: 'fuel',          label: 'Fuel / petrol',         emoji: '⛽', def: 0.030 },
  { id: 'shopping',      label: 'Shopping & clothing',   emoji: '🛍️', def: 0.045 },
  { id: 'utilities',     label: 'Utilities & bills',     emoji: '💡', def: 0.040 },
  { id: 'entertainment', label: 'Subscriptions & fun',   emoji: '🎬', def: 0.020 }
]);

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

/* The typical-household spending profile for a salary (monthly amounts,
   rounded to 10 like the calculator's pre-fill). */
export function defaultSpending(grossAnnual) {
  const out = {};
  for (const c of CATEGORIES) out[c.id] = Math.round((grossAnnual / 12 * c.def) / 10) * 10;
  return out;
}
