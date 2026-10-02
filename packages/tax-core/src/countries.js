/* Registry: the one place that lists the supported jurisdictions. Every other
   country list in the product (selectors, pages, sitemap, MCP enums) is
   derived from ORDER and COUNTRIES. */
import * as UK from './rules/uk.js';
import * as US from './rules/us.js';
import * as CA from './rules/ca.js';
import * as AU from './rules/au.js';
import * as IE from './rules/ie.js';
import * as DE from './rules/de.js';
import * as FR from './rules/fr.js';
import * as NL from './rules/nl.js';
import * as ES from './rules/es.js';
import * as IT from './rules/it.js';
import * as IN from './rules/in.js';
import { calcUK } from './calc/uk.js';
import { calcUS } from './calc/us.js';
import { calcCA } from './calc/ca.js';
import { calcAU } from './calc/au.js';
import { calcIE } from './calc/ie.js';
import { calcDE } from './calc/de.js';
import { calcFR } from './calc/fr.js';
import { calcNL } from './calc/nl.js';
import { calcES } from './calc/es.js';
import { calcIT } from './calc/it.js';
import { calcIN } from './calc/in.js';

export const ORDER = Object.freeze(['UK', 'US', 'CA', 'AU', 'IE', 'DE', 'FR', 'NL', 'ES', 'IT', 'IN']);

const entry = (mod, calc, regions) => Object.freeze({
  profile: mod.PROFILE, rules: mod.RULES, defaultYear: mod.DEFAULT_YEAR, calc, regions: regions || null,
  yearAliases: mod.YEAR_ALIASES || null
});

export const COUNTRIES = Object.freeze({
  UK: entry(UK, calcUK),
  US: entry(US, calcUS, US.US_STATES),
  CA: entry(CA, calcCA, CA.CA_PROVINCES),
  AU: entry(AU, calcAU),
  IE: entry(IE, calcIE),
  DE: entry(DE, calcDE),
  FR: entry(FR, calcFR),
  NL: entry(NL, calcNL),
  ES: entry(ES, calcES),
  IT: entry(IT, calcIT),
  IN: entry(IN, calcIN)
});

export const US_STATES = US.US_STATES;
export const CA_PROVINCES = CA.CA_PROVINCES;

/* Illustrative caps of each country's main tax-advantaged contribution
   (local currency), used only by the "you could keep up to" heuristic.
   India is deliberately absent: see illustrativeSavingsCeiling(). */
export const SAVINGS_CAP = Object.freeze({ UK: 60000, US: 23500, CA: 32000, AU: 30000, IE: 25000, DE: 28000, FR: 35000, NL: 15000, ES: 1500, IT: 5164 });
