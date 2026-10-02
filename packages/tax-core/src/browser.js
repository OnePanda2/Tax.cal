/* Browser entry: bundled by scripts/build-core.mjs into assets/tax-core.js.
   Publishes the same engine under the globals the site already uses
   (window.TAXCAL_DATA, window.TaxEngine), so app.js and the Plus pages keep
   working while every number comes from the shared core. */
import { ENGINE_VERSION, compute, directTaxFor, estimateSavings, legacyCountry, getRules, getEntry } from './engine.js';
import { ORDER, US_STATES, CA_PROVINCES, SAVINGS_CAP } from './countries.js';
import { CATEGORIES } from './categories.js';
import { FX, convert, usdPerUnit } from './fx.js';
import { shareCardModel, regionName } from './share.js';
import { regimeFromSalary, breakevenDeductions } from './calc/in.js';

const countries = {};
for (const k of ORDER) countries[k] = legacyCountry(k);
const fxUSD = {};
for (const code of Object.keys(FX.perEUR)) fxUSD[code] = usdPerUnit(code);

window.TAXCAL_DATA = {
  meta: { updated: 'October 2026', taxYear: '2026', engineVersion: ENGINE_VERSION, fxDate: FX.date },
  fxUSD, fx: FX,
  categories: CATEGORIES,
  countries,
  order: ORDER,
  usStates: US_STATES,
  caProvinces: CA_PROVINCES,
  regionTable: { US: US_STATES, CA: CA_PROVINCES },
  savingsCap: SAVINGS_CAP
};

window.TaxEngine = {
  version: ENGINE_VERSION,
  compute, directTaxFor, convert, estimateSavings, shareCardModel, regionName,
  /* India: old-regime deductions needed to match the new regime. */
  indiaBreakeven(gross, opts) {
    const R = getRules('IN', opts && opts.taxYear);
    return breakevenDeductions(R, { gross, residency: (opts && opts.residency) || 'resident', ageBand: (opts && opts.ageBand) || 'below_60' });
  },
  indiaRegime(gross, regime, opts) {
    const R = getRules('IN', opts && opts.taxYear);
    return regimeFromSalary(R, regime, { gross, residency: 'resident', ageBand: 'below_60', ...(opts || {}) });
  },
  rulesMeta(key) {
    const R = getRules(key);
    return { taxYear: R.taxYear, taxYearLabel: R.taxYearLabel, ruleVersion: R.ruleVersion, lastVerified: R.lastVerified, confidence: R.confidence, assumptions: R.assumptions, exclusions: R.exclusions, sources: R.sources, regionsCount: getEntry(key).regions ? Object.keys(getEntry(key).regions).length : 0 };
  }
};
