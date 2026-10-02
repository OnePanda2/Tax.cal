/* ============================================================================
   Tax.cal MCP tools — definitions (JSON Schema 2020-12) and dispatch.

   Every tool is a thin, read-only wrapper over packages/tax-core: the model
   supplies arguments, the shared engine does all arithmetic, and the result
   is returned as structuredContent (plus the same JSON as text for clients
   that only read text). Nothing is stored and no outbound request is made.
   ========================================================================== */
import {
  calculateTax, compareTaxRegimes, getTaxRules, compareCountries, ORDER
} from '../../packages/tax-core/src/index.js';

const COUNTRY_ENUM = [...ORDER];
const CURRENCY_ENUM = ['GBP', 'USD', 'CAD', 'AUD', 'EUR', 'INR'];
const CONF = { type: 'string', enum: ['high', 'medium', 'low', 'not_applicable', 'depends_on_inputs'] };
const NUM = { type: 'number' };
const STR = { type: 'string' };
const STR_LIST = { type: 'array', items: STR };
const SOURCE = {
  type: 'object',
  properties: { title: STR, publisher: STR, url: { type: ['string', 'null'] }, covers: STR },
  required: ['title', 'publisher', 'url']
};
const LINK = { type: 'object', properties: { label: STR, url: STR }, required: ['label', 'url'] };
const PERIOD = { type: 'object', description: 'First and last day of the tax year (ISO dates).', properties: { start: STR, end: STR }, required: ['start', 'end'] };
const DEFAULTS = {
  type: 'array',
  items: { type: 'object', properties: { field: STR, value: {}, material: { type: 'boolean' }, note: STR }, required: ['field', 'material', 'note'] }
};
const MONEY_INPUT = (desc) => ({ type: 'number', minimum: 0, description: desc });

const OLD_DEDUCTIONS = {
  type: 'object',
  additionalProperties: false,
  description: 'India, old regime only: annual amounts in INR the user says they can claim. Each is capped at its legal limit (80C ₹1.5 lakh, 80CCD(1B) ₹50,000, 80D up to ₹1 lakh, self-occupied home-loan interest ₹2 lakh). Omit unknown items rather than guessing.',
  properties: {
    section_80c: MONEY_INPUT('80C / section 123 investments: EPF, PPF, ELSS, life insurance, principal repayment, etc.'),
    section_80ccd_1b: MONEY_INPUT('Own additional NPS contribution under 80CCD(1B).'),
    section_80d: MONEY_INPUT('Health-insurance premiums under 80D / section 126.'),
    home_loan_interest: MONEY_INPUT('Interest on a loan for a self-occupied home.'),
    hra_exemption: MONEY_INPUT('Exempt house-rent allowance, already computed from rent and salary.'),
    other: MONEY_INPUT('Any other old-regime deduction the user is sure they qualify for.')
  }
};

const SPENDING = {
  type: 'object',
  additionalProperties: false,
  description: 'Optional MONTHLY spending in the country’s currency, used for the indirect-tax estimate. Omit it to use Tax.cal’s typical-household profile (reported in defaults_applied). Categories not given count as zero.',
  properties: {
    groceries: MONEY_INPUT('Groceries per month.'),
    dining: MONEY_INPUT('Eating out and takeaway per month.'),
    fuel: MONEY_INPUT('Vehicle fuel per month.'),
    shopping: MONEY_INPUT('Shopping and clothing per month.'),
    utilities: MONEY_INPUT('Utilities, phone and internet per month.'),
    entertainment: MONEY_INPUT('Subscriptions and entertainment per month.')
  }
};

const TAX_YEAR_DESC = 'Optional; omit for the current year. UK and Australia: "2026-27". US, Canada, Ireland, Germany, France, Netherlands, Spain, Italy: "2026". India: "2026-27" (also "FY 2026-27") = Tax Year 2026-27 under the Income-tax Act, 2025; "AY 2026-27" or "FY 2025-26" = the legacy year under the Income-tax Act, 1961.';

const ANNOTATIONS = (title) => ({ title, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });

/* ---- calculate_tax ------------------------------------------------------ */
const CALCULATE_TAX = {
  name: 'calculate_tax',
  title: 'Calculate tax (Tax.cal)',
  description: [
    'Calculate one employee’s estimated tax for a supported country and tax year with Tax.cal’s deterministic rules: income tax, employee social contributions, state/provincial or regional income tax, and (optionally) an estimate of the VAT/GST/sales tax and fuel duty inside everyday spending.',
    'Returns amounts, effective rates, net and monthly take-home pay, a line-by-line breakdown, per-component confidence, the defaults it applied, assumptions, exclusions, official sources and the rule version. Use it for every tax figure instead of doing tax arithmetic yourself.',
    'Salary/employment income only. Countries: UK (England, Wales, Northern Ireland), US (all states + DC — filing_status and region are required), CA (province required), AU, IE, DE, FR, NL, ES, IT, IN (Tax Year 2026-27; the new regime is the default).',
    'If a required input is missing the tool returns a missing_input error naming the field — ask the user for it rather than guessing.'
  ].join(' '),
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['country', 'gross_income'],
    properties: {
      country: { type: 'string', enum: COUNTRY_ENUM, description: 'Country code: UK, US, CA, AU, IE, DE, FR, NL, ES, IT or IN.' },
      gross_income: { type: 'number', minimum: 0, description: 'Annual gross salary before tax, in the country’s own currency (GBP, USD, CAD, AUD, EUR or INR). Convert lakh/crore to a plain number: ₹15 lakh = 1500000. Convert monthly pay to annual.' },
      tax_year: { type: 'string', description: TAX_YEAR_DESC },
      income_type: { type: 'string', enum: ['employment'], description: 'Only salary/employment income is supported.' },
      filing_status: { type: 'string', enum: ['single', 'married_filing_jointly'], description: 'US only, and required there. Ask the user if they have not said.' },
      region: { type: 'string', description: 'US: two-letter state code (e.g. CA, NY, TX) — required. Canada: province code (e.g. ON, BC, QC) — required. UK: optional "england", "wales" or "northern_ireland" (Scotland is not supported). Leave out for every other country.' },
      regime: { type: 'string', enum: ['new', 'old'], description: 'India only. "new" (section 202) is the statutory default; use compare_tax_regimes to see both.' },
      residency: { type: 'string', enum: ['resident', 'non_resident'], description: 'India only. Defaults to resident; non-residents (NRIs) get no rebate.' },
      age_band: { type: 'string', enum: ['below_60', '60_to_79', '80_plus'], description: 'India only; changes the old-regime exemption limit for resident seniors.' },
      old_regime_deductions: OLD_DEDUCTIONS,
      has_children: { type: 'boolean', description: 'Germany only: whether the employee has children (the childless care-insurance surcharge applies otherwise).' },
      monthly_spending: SPENDING,
      include_indirect_estimate: { type: 'boolean', description: 'Include the indirect-tax estimate (default true).' }
    }
  },
  outputSchema: {
    type: 'object',
    required: ['country', 'country_name', 'tax_year', 'tax_year_label', 'currency', 'gross_income', 'taxable_income', 'direct_tax', 'social_contributions', 'regional_tax', 'total_direct_tax', 'indirect_tax_estimate', 'total_estimated_tax', 'effective_rate', 'net_income', 'monthly_net_income', 'breakdown', 'defaults_applied', 'notes', 'confidence', 'assumptions', 'exclusions', 'sources', 'rule_version', 'last_verified', 'engine_version', 'disclaimer', 'learn_more'],
    properties: {
      country: { type: 'string', enum: COUNTRY_ENUM }, country_name: STR,
      tax_year: STR, tax_year_label: STR, tax_year_period: PERIOD, legal_basis: STR, currency: { type: 'string', enum: CURRENCY_ENUM },
      inputs: { type: 'object' },
      defaults_applied: DEFAULTS,
      gross_income: NUM, taxable_income: NUM,
      direct_tax: { type: 'number', description: 'National income tax (incl. India surcharge and cess; German solidarity surcharge).' },
      social_contributions: NUM, regional_tax: NUM, total_direct_tax: NUM,
      indirect_tax_estimate: {
        type: 'object',
        required: ['included'],
        properties: {
          included: { type: 'boolean' }, basis: { type: 'string', enum: ['typical_spending_profile', 'user_spending'] },
          total: NUM, consumption_tax: NUM, fuel_tax: NUM, method: STR, reason: STR,
          by_category: { type: 'array', items: { type: 'object', properties: { category: STR, label: STR, monthly_spend: NUM, effective_rate: NUM, nominal_rate: { type: ['number', 'null'] }, annual_tax: NUM, confidence: STR, reason: STR }, required: ['category', 'monthly_spend', 'effective_rate', 'annual_tax', 'confidence'] } }
        }
      },
      total_estimated_tax: NUM,
      effective_rate: { type: 'object', properties: { direct: NUM, total_including_indirect: NUM }, required: ['direct', 'total_including_indirect'] },
      net_income: NUM, monthly_net_income: NUM, monthly_direct_tax: NUM,
      breakdown: { type: 'array', items: { type: 'object', properties: { key: STR, label: STR, amount: NUM, kind: { type: 'string', enum: ['income_tax', 'social', 'regional', 'deduction', 'credit', 'info'] } }, required: ['key', 'label', 'amount', 'kind'] } },
      regime_comparison: { type: 'object', properties: { chosen_regime: STR, new_regime_tax: NUM, old_regime_tax: NUM, note: STR } },
      notes: STR_LIST,
      confidence: { type: 'object', properties: { direct_tax: CONF, social_contributions: CONF, regional_tax: CONF, indirect_tax: CONF }, required: ['direct_tax', 'social_contributions', 'regional_tax', 'indirect_tax'] },
      assumptions: STR_LIST, exclusions: STR_LIST,
      sources: { type: 'array', items: SOURCE },
      rule_version: STR, last_verified: STR, engine_version: STR, disclaimer: STR, learn_more: LINK
    }
  },
  annotations: ANNOTATIONS('Calculate tax (Tax.cal)'),
  handler: calculateTax
};

/* ---- compare_tax_regimes ------------------------------------------------ */
const REGIME_OUT = {
  type: 'object',
  required: ['name', 'taxable_income', 'total_tax', 'effective_rate', 'monthly_tax', 'net_income'],
  properties: {
    name: STR, standard_deduction: NUM, deductions_allowed: NUM,
    deductions_detail: { type: 'array', items: { type: 'object', properties: { item: STR, claimed: NUM, allowed: NUM, cap: { type: ['number', 'null'] } } } },
    taxable_income: NUM, tax_on_slabs: NUM, rebate: NUM, rebate_marginal_relief_applied: { type: 'boolean' },
    surcharge_rate: NUM, surcharge: NUM, surcharge_marginal_relief: NUM, cess: NUM,
    total_tax: NUM, effective_rate: NUM, monthly_tax: NUM, net_income: NUM, monthly_net_income: NUM
  }
};

const COMPARE_TAX_REGIMES = {
  name: 'compare_tax_regimes',
  title: 'Compare India’s tax regimes (Tax.cal)',
  description: [
    'Compare India’s new tax regime (section 202, the default) with the old regime for a salaried individual, side by side: taxable income, rebate, surcharge, cess, total tax, monthly tax and take-home pay for each, the difference, and the total old-regime deductions at which the two would cost the same.',
    'Reports numbers only and does not recommend a regime. Pass the old-regime deductions the user says they have (80C, 80D, 80CCD(1B), home-loan interest, HRA exemption); without them the old regime is shown with the standard deduction only.',
    'India only: other countries have a single regime (use calculate_tax).'
  ].join(' '),
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['gross_income'],
    properties: {
      country: { type: 'string', enum: ['IN'], description: 'Always "IN" (optional).' },
      gross_income: { type: 'number', minimum: 0, description: 'Annual gross salary in INR (₹20 lakh = 2000000).' },
      tax_year: { type: 'string', description: 'Optional. "2026-27" (Tax Year 2026-27, Income-tax Act, 2025) or the legacy "AY 2026-27" / "FY 2025-26" (Income-tax Act, 1961).' },
      residency: { type: 'string', enum: ['resident', 'non_resident'], description: 'Defaults to resident.' },
      age_band: { type: 'string', enum: ['below_60', '60_to_79', '80_plus'], description: 'Changes the old-regime exemption limit for resident seniors.' },
      old_regime_deductions: OLD_DEDUCTIONS
    }
  },
  outputSchema: {
    type: 'object',
    required: ['country', 'tax_year', 'tax_year_label', 'currency', 'gross_income', 'regimes', 'difference', 'old_regime_breakeven_deductions', 'explanation', 'eligibility_caveats', 'defaults_applied', 'assumptions', 'sources', 'rule_version', 'last_verified', 'disclaimer', 'learn_more'],
    properties: {
      country: { type: 'string', enum: ['IN'] }, country_name: STR, tax_year: STR, tax_year_label: STR, tax_year_period: PERIOD, legal_basis: STR, currency: { type: 'string', enum: ['INR'] },
      gross_income: NUM, inputs: { type: 'object' }, defaults_applied: DEFAULTS,
      regimes: { type: 'object', properties: { new: REGIME_OUT, old: REGIME_OUT }, required: ['new', 'old'] },
      difference: { type: 'object', properties: { old_minus_new: NUM, lower_estimated_tax: { type: 'string', enum: ['new', 'old', 'equal'] } }, required: ['old_minus_new', 'lower_estimated_tax'] },
      old_regime_breakeven_deductions: { type: ['number', 'null'], description: 'Total old-regime deductions and exemptions at which both regimes give the same tax; null if no amount would.' },
      explanation: STR_LIST, eligibility_caveats: STR_LIST,
      confidence: { type: 'object' },
      assumptions: STR_LIST, exclusions: STR_LIST,
      sources: { type: 'array', items: SOURCE },
      rule_version: STR, last_verified: STR, engine_version: STR, disclaimer: STR, learn_more: LINK
    }
  },
  annotations: ANNOTATIONS('Compare India’s tax regimes (Tax.cal)'),
  handler: compareTaxRegimes
};

/* ---- get_tax_rules ------------------------------------------------------ */
const GET_TAX_RULES = {
  name: 'get_tax_rules',
  title: 'Look up Tax.cal’s tax rules',
  description: [
    'Return the rules Tax.cal uses: income-tax rates and thresholds, deductions, credits and rebates, social contributions, regional tax, the indirect-tax category assumptions, supported scope, assumptions, exclusions, official sources, the rule version and the date the rules were last verified.',
    'With a country: that country’s full rules for one tax year (lookup "country"). Without a country: an overview of every supported country with its tax year, rule version and last-verified date, plus the assumptions shared by all countries and, for topic "indirect_tax", how VAT/GST/sales tax is estimated (lookup "overview").',
    'Use it to answer “what does Tax.cal support?”, “when were these rules checked?” or “what assumptions does Tax.cal use for indirect tax?”. It performs no calculation on the user’s figures.'
  ].join(' '),
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      country: { type: 'string', enum: COUNTRY_ENUM, description: 'Country code. Omit for the cross-country overview.' },
      tax_year: { type: 'string', description: TAX_YEAR_DESC + ' Needs a country.' },
      topic: { type: 'string', enum: ['all', 'income_tax', 'social_contributions', 'regional_tax', 'indirect_tax', 'scope', 'sources'], description: 'Limit the answer to one part of the rules (default "all").' }
    }
  },
  outputSchema: {
    type: 'object',
    required: ['lookup', 'topic', 'engine_version', 'assumptions', 'exclusions', 'sources', 'learn_more'],
    properties: {
      lookup: { type: 'string', enum: ['country', 'overview'] },
      topic: STR, engine_version: STR,
      country: { type: 'string', enum: COUNTRY_ENUM }, country_name: STR, tax_year: STR, tax_year_label: STR, tax_year_period: PERIOD,
      status: { type: 'string', enum: ['current', 'legacy'] }, legal_basis: STR, currency: STR,
      rule_version: STR, last_verified: STR,
      supported_tax_years: { type: 'array', items: { type: 'object', properties: { tax_year: STR, label: STR, period: PERIOD, status: STR } } },
      countries: {
        type: 'array',
        description: 'Overview only: every supported country and the freshness of its rules.',
        items: { type: 'object', required: ['country', 'tax_year', 'rule_version', 'last_verified'], properties: { country: STR, country_name: STR, currency: STR, tax_year: STR, tax_year_label: STR, tax_year_period: PERIOD, status: STR, rule_version: STR, last_verified: STR, supported_tax_years: STR_LIST, confidence: { type: 'object' } } }
      },
      income_tax: {}, social_contributions: {}, regional_tax: {}, regions: { type: 'array' }, indirect_tax: { type: 'object' }, scope: { type: 'object' },
      terminology: { type: 'object' },
      confidence: { type: 'object' }, assumptions: STR_LIST, exclusions: STR_LIST,
      sources: { type: 'array', items: SOURCE }, notes: STR_LIST, learn_more: LINK
    }
  },
  annotations: ANNOTATIONS('Look up Tax.cal’s tax rules'),
  handler: getTaxRules
};

/* ---- compare_countries -------------------------------------------------- */
const COMPARE_COUNTRIES = {
  name: 'compare_countries',
  title: 'Compare tax across countries (Tax.cal)',
  description: [
    'Compare the direct tax on the same gross income across supported countries, converting the amount at dated, approximate ECB reference exchange rates. Returns each country’s income tax, social contributions, regional tax and direct-tax rate (optionally an indirect-tax estimate), in the order requested.',
    'It compares tax rules only. It is not a cost-of-living or purchasing-power comparison and does not rank countries as better or worse. Representative assumptions: US federal + FICA without state tax, Canada in Ontario, India new regime.'
  ].join(' '),
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['gross_income', 'currency'],
    properties: {
      gross_income: { type: 'number', minimum: 0, description: 'Annual gross salary in the given currency.' },
      currency: { type: 'string', enum: CURRENCY_ENUM, description: 'Currency of gross_income.' },
      countries: { type: 'array', items: { type: 'string', enum: COUNTRY_ENUM }, minItems: 1, maxItems: COUNTRY_ENUM.length, description: 'Countries to include, in the order to show them (default: all).' },
      include_indirect_estimate: { type: 'boolean', description: 'Also estimate tax inside spending with the typical profile (default false).' }
    }
  },
  outputSchema: {
    type: 'object',
    required: ['gross_income', 'currency', 'rows', 'order', 'fx', 'caveats', 'disclaimer', 'learn_more'],
    properties: {
      gross_income: NUM, currency: STR,
      rows: { type: 'array', items: { type: 'object', required: ['country', 'currency', 'gross_income_local', 'total_direct_tax', 'direct_rate', 'confidence'], properties: { country: STR, country_name: STR, tax_year: STR, currency: STR, gross_income_local: NUM, direct_tax: NUM, social_contributions: NUM, regional_tax: NUM, total_direct_tax: NUM, direct_rate: NUM, confidence: STR, representative_assumption: STR, rule_version: STR, indirect_tax_estimate: NUM, total_rate_including_indirect: NUM } } },
      order: STR,
      fx: { type: 'object', required: ['source', 'date', 'rates_per_EUR'], properties: { source: { type: 'object' }, date: STR, base: STR, rates_per_EUR: { type: 'object' }, note: STR } },
      caveats: STR_LIST, engine_version: STR, disclaimer: STR, learn_more: LINK
    }
  },
  annotations: ANNOTATIONS('Compare tax across countries (Tax.cal)'),
  handler: compareCountries
};

export const TOOLS = [CALCULATE_TAX, COMPARE_TAX_REGIMES, GET_TAX_RULES, COMPARE_COUNTRIES];
const BY_NAME = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

/* The descriptor sent in tools/list (no handler). Deterministic order. */
export function toolDescriptors() {
  return TOOLS.map(({ handler, ...d }) => d);
}

export function hasTool(name) {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(BY_NAME, name);
}

/* Run a tool. Returns { result: CallToolResult, meta } where meta carries
   only what may be logged: the tool, the validated country and the outcome
   — never the arguments. */
export function callTool(name, args) {
  const tool = BY_NAME[name];
  const out = tool.handler(args === undefined ? {} : args);
  if (out.ok) {
    const country = out.result.country || null;
    return {
      result: { content: [{ type: 'text', text: JSON.stringify(out.result) }], structuredContent: out.result, isError: false },
      meta: { tool: name, country: ORDER.includes(country) ? country : null, ok: true }
    };
  }
  const e = out.error;
  return {
    result: { content: [{ type: 'text', text: e.message + '\n' + JSON.stringify({ error: e }) }], isError: true },
    meta: { tool: name, country: null, ok: false, code: e.code }
  };
}
