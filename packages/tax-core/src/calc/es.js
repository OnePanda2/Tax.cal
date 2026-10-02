import { bracketTax, pos } from '../util.js';

export function workIncomeReduction(rn, W) {
  if (rn <= W.fullTo) return W.full;
  if (rn <= W.midTo) return pos(W.full - W.midSlope * (rn - W.fullTo));
  if (rn <= W.tailTo) return pos(W.tailBase - W.tailSlope * (rn - W.midTo));
  return 0;
}

/* Spanish employee: social security and IRPF on a representative combined scale. */
export function calcES(R, input) {
  const y = input.gross;
  const S = R.socialTax;
  const social = Math.min(y, S.annualCeiling) * S.rate;

  const it = R.incomeTax;
  const rn = pos(y - social - it.otherExpenses);           // rendimiento neto del trabajo
  const reduction = Math.min(workIncomeReduction(rn, it.workIncomeReduction), rn);
  const base = pos(rn - reduction);
  const quota = pos(bracketTax(base, it.combinedScale) - bracketTax(Math.min(it.personalMinimum, base), it.combinedScale));

  return {
    taxableIncome: base,
    incomeTax: quota, social, regional: 0,
    lines: [
      { key: 'net_work_income', label: 'Net work income (after social security and €2,000)', amount: rn, kind: 'info' },
      { key: 'work_income_reduction', label: 'Work-income reduction (art. 20)', amount: reduction, kind: 'deduction' },
      { key: 'income_tax', label: 'IRPF (state + representative regional scale)', amount: quota, kind: 'income_tax' },
      { key: 'social_security', label: 'Social security (6.50%)', amount: social, kind: 'social' }
    ],
    notes: []
  };
}
