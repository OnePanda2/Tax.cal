import { bracketTax, pos } from '../util.js';

/* Art. 13 TUIR employee credit (2025+ formula) on total income R. */
export function employeeCredit(R, E) {
  let c = 0;
  if (R <= E.flatTo) c = E.flat;
  else if (R <= E.mid.to) c = E.mid.base + E.mid.extra * (E.mid.to - R) / (E.mid.to - E.flatTo);
  else if (R <= E.high.to) c = E.high.base * (E.high.to - R) / (E.high.to - E.mid.to);
  if (R > E.bonus65.from && R <= E.bonus65.to) c += E.bonus65.amount;
  return c;
}

/* L. 207/2024 additional credit for incomes €20,000–€40,000. */
export function cuneoCredit(R, C) {
  if (R <= C.fullFrom || R > C.phaseOutTo) return 0;
  if (R <= C.fullTo) return C.full;
  return C.full * (C.phaseOutTo - R) / (C.phaseOutTo - C.fullTo);
}

/* Italian employee: INPS, IRPEF with credits, Lombardy + Milan surcharges. */
export function calcIT(Rules, input) {
  const y = input.gross;
  const S = Rules.socialTax;
  const capped = Math.min(y, S.ceiling);
  const inps = capped * S.rate + pos(capped - S.additionalFrom) * S.additionalRate;

  const it = Rules.incomeTax;
  const R = pos(y - inps);                       // reddito complessivo
  const gross = bracketTax(R, it.brackets);
  const credits = employeeCredit(R, it.employeeCredit) + cuneoCredit(R, it.cuneoCredit);
  const irpef = pos(gross - credits);

  const regionalSurcharge = R > 0 ? bracketTax(R, it.regionalSurcharge.brackets) : 0;
  const municipalSurcharge = R > it.municipalSurcharge.exemptUpTo ? R * it.municipalSurcharge.rate : 0;

  return {
    taxableIncome: R,
    incomeTax: irpef, social: inps, regional: regionalSurcharge + municipalSurcharge,
    lines: [
      { key: 'irpef_gross', label: 'IRPEF before credits', amount: gross, kind: 'info' },
      { key: 'employee_credits', label: 'Employee credits (detrazioni + cuneo fiscale)', amount: -Math.min(credits, gross), kind: 'credit' },
      { key: 'income_tax', label: 'IRPEF', amount: irpef, kind: 'income_tax' },
      { key: 'regional_surcharge', label: 'Regional surcharge (Lombardy)', amount: regionalSurcharge, kind: 'regional' },
      { key: 'municipal_surcharge', label: 'Municipal surcharge (Milan)', amount: municipalSurcharge, kind: 'regional' },
      { key: 'inps', label: 'INPS contributions (9.19%)', amount: inps, kind: 'social' }
    ],
    notes: R <= 20000 ? ['The cuneo fiscale cash bonus and the €1,200 trattamento integrativo for lower incomes are not included, so tax here is overstated.'] : []
  };
}
