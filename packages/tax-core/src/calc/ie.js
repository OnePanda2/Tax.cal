import { bracketTax, pos } from '../util.js';

/* Irish PAYE employee: income tax − credits, USC and Class A PRSI. */
export function calcIE(R, input) {
  const y = input.gross;
  const it = R.incomeTax;
  const grossTax = Math.min(y, it.standardRateBand) * it.standardRate + pos(y - it.standardRateBand) * it.higherRate;
  const credits = it.credits.personal + Math.min(it.credits.employee, y * it.standardRate);
  const incomeTax = pos(grossTax - credits);

  const U = R.socialTax.usc;
  const usc = y <= U.exemptionLimit ? 0 : bracketTax(y, U.bands);

  // PRSI is assessed per week. For a steady salary: weekly pay, the threshold
  // and the tapered PRSI credit, at the rate in force in each part of 2026.
  const P = R.socialTax.prsi;
  const weekly = y / 52;
  let prsi = 0;
  if (weekly > P.weeklyThreshold) {
    const credit = weekly <= P.credit.taperEnd ? pos(P.credit.max - (weekly - P.credit.taperStart) / P.credit.taperDivisor) : 0;
    const totalMonths = P.periods.reduce((t, p) => t + p.months, 0);
    for (const p of P.periods) {
      prsi += pos(weekly * p.rate - credit) * 52 * (p.months / totalMonths);
    }
  }

  return {
    taxableIncome: y,
    incomeTax, social: usc + prsi, regional: 0,
    lines: [
      { key: 'income_tax_before_credits', label: 'Income tax before credits', amount: grossTax, kind: 'info' },
      { key: 'tax_credits', label: 'Personal + employee tax credits', amount: -Math.min(credits, grossTax), kind: 'credit' },
      { key: 'income_tax', label: 'Income tax (PAYE)', amount: incomeTax, kind: 'income_tax' },
      { key: 'usc', label: 'Universal Social Charge', amount: usc, kind: 'social' },
      { key: 'prsi', label: 'PRSI (Class A)', amount: prsi, kind: 'social' }
    ],
    notes: []
  };
}
