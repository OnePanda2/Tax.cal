import { pos } from '../util.js';

/* §32a EStG tariff (2026) on taxable income x, rounded down as the law does. */
export function deTariff(x, T) {
  x = Math.floor(x);
  if (x <= T.basicAllowance) return 0;
  let t;
  if (x <= T.zone2End) {
    const y = (x - T.basicAllowance) / 10000;
    t = (T.zone2.a * y + T.zone2.b) * y;
  } else if (x <= T.zone3End) {
    const z = (x - T.zone2End) / 10000;
    t = (T.zone3.a * z + T.zone3.b) * z + T.zone3.c;
  } else if (x <= T.zone4End) {
    t = T.zone4.rate * x - T.zone4.minus;
  } else {
    t = T.zone5.rate * x - T.zone5.minus;
  }
  return Math.floor(t);
}

/* German employee: social insurance, income tax and solidarity surcharge. */
export function calcDE(R, input) {
  const y = input.gross;
  const S = R.socialTax;
  const childless = input.childless !== false;   // Tax.cal's standard profile has no children

  const pension = Math.min(y, S.pension.ceiling) * S.pension.rate;
  const unemployment = Math.min(y, S.unemployment.ceiling) * S.unemployment.rate;
  const health = Math.min(y, S.health.ceiling) * (S.health.rate + S.health.avgSupplementHalf);
  const care = Math.min(y, S.care.ceiling) * (S.care.rate + (childless ? S.care.childlessSurcharge : 0));
  const social = pension + unemployment + health + care;

  const it = R.incomeTax;
  const deductibleProvision = pension + health * it.healthDeductibleShare + care;
  const zvE = pos(y - Math.min(it.werbungskostenPauschbetrag, y) - it.sonderausgabenPauschbetrag - deductibleProvision);
  const est = deTariff(zvE, it.tariff);

  const So = it.solidarity;
  const soli = est <= So.freigrenze ? 0 : Math.min(est * So.rate, (est - So.freigrenze) * So.mitigationRate);

  return {
    taxableIncome: zvE,
    incomeTax: est + soli, social, regional: 0,
    lines: [
      { key: 'taxable_income', label: 'Taxable income (zu versteuerndes Einkommen)', amount: zvE, kind: 'info' },
      { key: 'income_tax', label: 'Income tax (Einkommensteuer)', amount: est, kind: 'income_tax' },
      { key: 'solidarity_surcharge', label: 'Solidarity surcharge', amount: soli, kind: 'income_tax' },
      { key: 'pension_insurance', label: 'Pension insurance (9.3%)', amount: pension, kind: 'social' },
      { key: 'health_insurance', label: 'Health insurance (7.3% + 1.45%)', amount: health, kind: 'social' },
      { key: 'care_insurance', label: childless ? 'Care insurance (1.8% + 0.6% childless)' : 'Care insurance (1.8%)', amount: care, kind: 'social' },
      { key: 'unemployment_insurance', label: 'Unemployment insurance (1.3%)', amount: unemployment, kind: 'social' }
    ],
    notes: childless ? ['Childless care-insurance surcharge (0.6%) applied — the standard Tax.cal profile has no children.'] : []
  };
}
