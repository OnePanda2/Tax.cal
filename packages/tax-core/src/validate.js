/* Strict validation for every external caller (MCP tools, future APIs).
   Nothing from outside is trusted: not the client, not the model.

   Each validator throws an InputError carrying a stable machine code, the
   offending field, and a message written to be shown to (or acted on by) the
   person asking — e.g. "I need your filing status to calculate this". */
import { COUNTRIES, ORDER, US_STATES, CA_PROVINCES } from './countries.js';
import { CATEGORY_IDS } from './categories.js';
import { OLD_DEDUCTION_KEYS } from './calc/in.js';

export class InputError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = 'InputError';
    this.code = code;
    Object.assign(this, extra);
  }
  toJSON() {
    const out = { code: this.code, message: this.message };
    for (const k of ['field', 'allowed', 'hint', 'max', 'supported']) if (this[k] !== undefined) out[k] = this[k];
    return out;
  }
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_STRING = 64;

export function plainObject(v, field) {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) {
    throw new InputError('invalid_input', `${field} must be a JSON object.`, { field });
  }
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) throw new InputError('invalid_input', `${field} must be a plain JSON object.`, { field });
  for (const k of Object.keys(v)) {
    if (FORBIDDEN_KEYS.has(k)) throw new InputError('invalid_input', `${field} contains a forbidden key "${k}".`, { field: field + '.' + k });
  }
  return v;
}

export function onlyKeys(obj, allowed, field) {
  for (const k of Object.keys(obj)) {
    if (!allowed.includes(k)) {
      throw new InputError('invalid_input', `Unknown field "${k}"${field ? ' in ' + field : ''}.`, { field: field ? field + '.' + k : k, allowed });
    }
  }
}

export function amount(v, field, max, hint) {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new InputError('invalid_input', `${field} must be a number${hint ? ' (' + hint + ')' : ''}.`, { field });
  }
  if (v < 0) throw new InputError('out_of_range', `${field} cannot be negative.`, { field });
  if (v > max) throw new InputError('out_of_range', `${field} is above the supported maximum (${max}).`, { field, max });
  return v;
}

export function str(v, field) {
  if (typeof v !== 'string') throw new InputError('invalid_input', `${field} must be a string.`, { field });
  if (v.length === 0 || v.length > MAX_STRING) throw new InputError('invalid_input', `${field} must be 1–${MAX_STRING} characters.`, { field });
  return v.trim();
}

export function bool(v, field) {
  if (typeof v !== 'boolean') throw new InputError('invalid_input', `${field} must be true or false.`, { field });
  return v;
}

export function oneOf(v, field, allowed, message) {
  const s = str(v, field).toLowerCase();
  if (!allowed.includes(s)) throw new InputError('invalid_input', message || `${field} must be one of: ${allowed.join(', ')}.`, { field, allowed });
  return s;
}

/* Country: ISO-style code, case-insensitive. "GB" is accepted for the UK. */
export function country(v) {
  if (v === undefined) throw new InputError('missing_input', 'I need the country (for example "IN", "UK", "US").', { field: 'country', allowed: [...ORDER] });
  const s = str(v, 'country').toUpperCase();
  const key = s === 'GB' ? 'UK' : s;
  if (!COUNTRIES[key]) {
    throw new InputError('unsupported_country', `Tax.cal does not cover "${v}". Supported: ${ORDER.join(', ')}.`, { field: 'country', allowed: [...ORDER] });
  }
  return key;
}

/* Max plausible annual income per currency unit (absurd-value guard). */
export function maxIncome(key) {
  return COUNTRIES[key].profile.currency.code === 'INR' ? 1e11 : 1e9;
}

export function taxYear(key, v) {
  const e = COUNTRIES[key];
  const supported = Object.keys(e.rules);
  if (v === undefined) return { year: e.defaultYear, defaulted: true, note: null };
  const raw = str(v, 'tax_year');
  const norm = raw.toUpperCase().replace(/\s+/g, ' ').replace(/[–—]/g, '-').replace(/(\d{4})\/(\d{2})/, '$1-$2');
  if (e.yearAliases && e.yearAliases[norm]) return { year: e.yearAliases[norm].year, defaulted: false, note: e.yearAliases[norm].note };
  if (supported.includes(norm)) return { year: norm, defaulted: false, note: null };
  throw new InputError('unsupported_tax_year', `Tax year "${raw}" is not supported for ${e.profile.name}. Supported: ${supported.map((y) => e.rules[y].taxYearLabel).join('; ')}.`, { field: 'tax_year', supported });
}

const REGION_TABLES = { US: US_STATES, CA: CA_PROVINCES };
const UK_NATIONS = ['england', 'wales', 'northern_ireland', 'scotland'];

export function region(key, v) {
  const tbl = REGION_TABLES[key];
  if (tbl) {
    const label = key === 'US' ? 'state' : 'province';
    if (v === undefined) {
      throw new InputError('missing_input', `I need the ${label} to calculate ${key === 'US' ? 'state income tax' : 'provincial income tax'} (use a two-letter code such as ${key === 'US' ? '"CA", "NY" or "TX"' : '"ON", "BC" or "QC"'}).`, { field: 'region', allowed: Object.keys(tbl) });
    }
    const s = str(v, 'region');
    const code = s.toUpperCase();
    if (tbl[code]) return code;
    const byName = Object.keys(tbl).find((k) => tbl[k].name.toLowerCase() === s.toLowerCase());
    if (byName) return byName;
    throw new InputError('unsupported_region', `"${s}" is not a recognised ${label}. Use a two-letter code.`, { field: 'region', allowed: Object.keys(tbl) });
  }
  if (key === 'UK') {
    if (v === undefined) return null;
    const s = oneOf(v, 'region', UK_NATIONS);
    if (s === 'scotland') throw new InputError('unsupported_region', 'Scottish income-tax bands are not supported yet. Tax.cal covers England, Wales and Northern Ireland.', { field: 'region', allowed: ['england', 'wales', 'northern_ireland'] });
    return s;
  }
  if (v !== undefined) throw new InputError('invalid_input', `region is only used for US states, Canadian provinces and UK nations — leave it out for ${COUNTRIES[key].profile.name}.`, { field: 'region' });
  return null;
}

export function filingStatus(key, v) {
  if (key === 'US') {
    if (v === undefined) throw new InputError('missing_input', 'I need your filing status to calculate this accurately: "single" or "married_filing_jointly".', { field: 'filing_status', allowed: ['single', 'married_filing_jointly'] });
    const s = oneOf(v, 'filing_status', ['single', 'married_filing_jointly', 'mfj', 'head_of_household', 'married_filing_separately']);
    if (s === 'head_of_household' || s === 'married_filing_separately') {
      throw new InputError('unsupported_scope', `Filing status "${s}" is not modelled yet. Supported: single, married_filing_jointly.`, { field: 'filing_status', allowed: ['single', 'married_filing_jointly'] });
    }
    return s === 'single' ? 'single' : 'mfj';
  }
  if (v === undefined) return 'single';
  const s = str(v, 'filing_status').toLowerCase();
  if (s !== 'single') throw new InputError('unsupported_scope', `Tax.cal calculates one individual in ${COUNTRIES[key].profile.name}; joint or family filing is not modelled. Leave filing_status out or use "single".`, { field: 'filing_status', allowed: ['single'] });
  return 'single';
}

export const UNSUPPORTED_INCOME = {
  self_employment: 'self-employment or freelance income',
  business: 'business or professional income',
  capital_gains: 'capital gains',
  rental: 'rental income',
  pension: 'pension income',
  dividends: 'dividends',
  interest: 'interest income'
};

/* supported: e.g. "India Tax Year 2026-27", so the message says what IS covered. */
export function incomeType(v, supported) {
  if (v === undefined) return 'employment';
  const s = str(v, 'income_type').toLowerCase();
  if (s === 'employment' || s === 'salary' || s === 'wages') return 'employment';
  if (UNSUPPORTED_INCOME[s]) {
    const lead = supported ? `${supported} is supported, but this calculation currently supports salaried individual income only` : 'Tax.cal currently calculates salary/employment income only';
    throw new InputError('unsupported_scope', `${lead}, not ${UNSUPPORTED_INCOME[s]}. For that, use the tax authority's own tools or a qualified professional.`, { field: 'income_type', allowed: ['employment'] });
  }
  throw new InputError('invalid_input', 'income_type must be "employment".', { field: 'income_type', allowed: ['employment'] });
}

export function spending(v, max) {
  plainObject(v, 'monthly_spending');
  onlyKeys(v, CATEGORY_IDS, 'monthly_spending');
  const out = {};
  for (const id of CATEGORY_IDS) {
    if (v[id] !== undefined) out[id] = amount(v[id], 'monthly_spending.' + id, max);
  }
  return out;
}

export function oldDeductions(v, max) {
  plainObject(v, 'old_regime_deductions');
  onlyKeys(v, OLD_DEDUCTION_KEYS, 'old_regime_deductions');
  const out = {};
  for (const k of OLD_DEDUCTION_KEYS) if (v[k] !== undefined) out[k] = amount(v[k], 'old_regime_deductions.' + k, max);
  return out;
}

/* Fields each country accepts beyond the common ones. */
export const COUNTRY_FIELDS = {
  US: ['filing_status', 'region'],
  CA: ['region'],
  UK: ['region'],
  IN: ['regime', 'residency', 'age_band', 'old_regime_deductions'],
  DE: ['has_children']
};
const FIELD_OWNER = { regime: 'India', residency: 'India', age_band: 'India', old_regime_deductions: 'India', has_children: 'Germany' };

export function assertApplicable(key, args, fields) {
  const allowedHere = COUNTRY_FIELDS[key] || [];
  for (const f of fields) {
    if (args[f] === undefined) continue;
    if (f === 'region' || f === 'filing_status') continue; // handled with country-specific messages
    if (!allowedHere.includes(f)) {
      throw new InputError('invalid_input', `${f} only applies to ${FIELD_OWNER[f] || 'other countries'} — leave it out for ${COUNTRIES[key].profile.name}.`, { field: f });
    }
  }
}
