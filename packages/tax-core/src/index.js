/* Public entry point of @taxcal/tax-core. Everything that calculates tax in
   Tax.cal — the website bundle, the page builders, the MCP server and the
   tests — imports from here. */
export { ENGINE_VERSION, compute, runDirect, directTaxFor, indirectEstimate, categoryRate, marginalRate,
  illustrativeSavingsCeiling, estimateSavings, getEntry, getRules, resolveRegion, legacyCountry, displayYear,
  minConfidence, repRegion } from './engine.js';
export { ORDER, COUNTRIES, US_STATES, CA_PROVINCES, SAVINGS_CAP } from './countries.js';
export { CATEGORIES, CATEGORY_IDS, defaultSpending } from './categories.js';
export { FX, convert, usdPerUnit } from './fx.js';
export { shareCardModel, regionName, SITE_HOST } from './share.js';
export { calculateTax, compareTaxRegimes, getTaxRules, compareCountries, supportedJurisdictions, breakevenDeductions, SITE } from './api.js';
export { InputError } from './validate.js';
export { regimeFromSalary, regimeTax } from './calc/in.js';
export { deTariff } from './calc/de.js';
export { bracketTax, formatMoney, pct } from './util.js';
