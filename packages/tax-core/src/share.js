/* The "Tax Wrapped" share card, as data. app.js draws exactly these strings
   on a canvas; keeping them here means a test can check that every field the
   card shows comes from the engine result (the v18 card read r.usState, a
   field the engine never returned, and printed "United States · undefined"). */
import { formatMoney, pct } from './util.js';
import { getEntry } from './engine.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const SITE_HOST = 'taxcal.siddheshthapa.com';

export function regionName(countryKey, region) {
  if (!region) return null;
  const tbl = getEntry(countryKey).regions || {};
  return tbl[region] ? tbl[region].name : null;
}

export function shareCardModel(r) {
  const rn = regionName(r.countryKey, r.region);
  const d = r.taxFreedomDay;
  return {
    wordmark: 'Tax.cal',
    countryLine: r.country.flag + '  ' + r.country.name + (rn ? ' · ' + rn : ''),
    rate: pct(r.effRate, 0),
    rateCaption: 'OF MY INCOME GOES TO TAX',
    headline: 'That’s ' + formatMoney(r.taxTotal, r.currency) + ' a year',
    seenLabel: 'Tax you see', seenValue: formatMoney(r.visible, r.currency),
    hiddenLabel: 'Tax you don’t', hiddenValue: formatMoney(r.hidden, r.currency),
    freedomLine: 'I work until ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' just to pay it.',
    footer: 'Estimate · check yours at ' + SITE_HOST,
    ringFraction: Math.max(0, Math.min(r.effRate, 1))
  };
}
