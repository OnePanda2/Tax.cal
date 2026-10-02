/* Approximate exchange rates — used ONLY to put one salary into another
   currency for the cross-country comparison. Never used in any domestic tax
   calculation, and not a cost-of-living or purchasing-power adjustment.

   Source: ECB euro foreign exchange reference rates for 1 October 2026,
   quoted as units of each currency per 1 EUR. Update the date and the rates
   together; nothing else needs to change. */
import { deepFreeze } from './util.js';

export const FX = deepFreeze({
  base: 'EUR',
  date: '2026-10-01',
  perEUR: { EUR: 1, USD: 1.1298, GBP: 0.85373, CAD: 1.6095, AUD: 1.6255, INR: 108.832 },
  source: {
    title: 'Euro foreign exchange reference rates (1 October 2026)',
    publisher: 'European Central Bank',
    url: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html'
  },
  note: 'Approximate, dated reference rates used only to express one salary in another currency. Exchange rates move daily; this is not a cost-of-living or purchasing-power comparison.'
});

/* Convert between any two supported currencies. Throws on an unknown code:
   silently treating a missing rate as 1 is exactly the bug that once put
   Canada and Australia at parity with the US dollar. */
export function convert(amount, from, to) {
  const a = FX.perEUR[from];
  const b = FX.perEUR[to];
  if (!a) throw new Error('No exchange rate for ' + from);
  if (!b) throw new Error('No exchange rate for ' + to);
  return (amount / a) * b;
}

/* US dollars per one unit of `code` (kept for the legacy browser API). */
export function usdPerUnit(code) {
  return convert(1, code, 'USD');
}
