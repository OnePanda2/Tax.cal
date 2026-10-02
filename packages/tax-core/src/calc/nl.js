import { bracketTax, pos } from '../util.js';

export function labourCredit(income, LC) {
  for (const s of LC.segments) {
    if (income <= s.upTo) return pos(s.base + s.rate * (income - s.from));
  }
  return 0;
}

export function generalCredit(income, GC) {
  return income <= GC.phaseOutStart ? GC.max : pos(GC.max - GC.phaseOutRate * (income - GC.phaseOutStart));
}

/* Dutch Box 1 for an employee below AOW age. */
export function calcNL(R, input) {
  const y = input.gross;
  const it = R.incomeTax;
  const box1 = bracketTax(y, it.box1);
  const ahk = generalCredit(y, it.generalCredit);
  const ak = labourCredit(y, it.labourCredit);
  const incomeTax = pos(box1 - ahk - ak);
  return {
    taxableIncome: y,
    incomeTax, social: 0, regional: 0,
    lines: [
      { key: 'box1_before_credits', label: 'Box 1 tax + national insurance before credits', amount: box1, kind: 'info' },
      { key: 'general_tax_credit', label: 'General tax credit (algemene heffingskorting)', amount: -Math.min(ahk, box1), kind: 'credit' },
      { key: 'labour_tax_credit', label: 'Labour tax credit (arbeidskorting)', amount: -Math.min(ak, pos(box1 - ahk)), kind: 'credit' },
      { key: 'income_tax', label: 'Income tax + national insurance (Box 1)', amount: incomeTax, kind: 'income_tax' }
    ],
    notes: []
  };
}
