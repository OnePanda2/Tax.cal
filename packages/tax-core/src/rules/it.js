/* Italy — IRPEF with the employee credits, regional and municipal surcharges
   (represented by Milan, Lombardy), and INPS employee contributions. */
import { INF, deepFreeze } from '../util.js';

export const PROFILE = deepFreeze({
  key: 'IT', iso: 'IT', name: 'Italy', article: '', flag: '🇮🇹', slug: 'italy',
  currency: { code: 'EUR', symbol: '€', locale: 'it-IT' },
  incomeName: 'Income tax (IRPEF)', socialName: 'Social security (INPS)', consumptionName: 'VAT (IVA)',
  note: 'Single employee. Includes the employee credits, the 2026 cuneo fiscale credit, and regional + municipal surcharges at Milan (Lombardy) rates.',
  tips: [
    ['Fondo pensione (pension fund)', 'Contributions up to €5,164/yr come off your taxable income — the main personal lever in Italy.'],
    ['Claim your detrazioni', 'Medical costs, renovations (bonus casa) and dependents all reduce IRPEF — keep every receipt.'],
    ['Check your busta paga', 'Make sure your employer applies your work credits (detrazioni da lavoro) so you are not overtaxed each month.']
  ]
});

export const RULES = deepFreeze({
  '2026': {
    country: 'IT',
    taxYear: '2026',
    taxYearLabel: 'Periodo d’imposta 2026 (calendar year)',
    period: { start: '2026-01-01', end: '2026-12-31' },
    calendarYear: 2026,
    legalBasis: 'TUIR (DPR 917/1986, artt. 11 and 13) as amended by the legge di bilancio 2026; L. 207/2024 (cuneo fiscale); INPS circolare 6/2026',
    currency: 'EUR',
    ruleVersion: 'IT-2026-v2',
    lastVerified: '2026-10-02',
    status: 'current',
    incomeTax: {
      brackets: [[0.23, 28000], [0.33, 50000], [0.43, INF]],
      employeeCredit: { flat: 1955, flatTo: 15000, mid: { base: 1910, extra: 1190, to: 28000 }, high: { base: 1910, to: 50000 }, bonus65: { from: 25000, to: 35000, amount: 65 } },
      cuneoCredit: { full: 1000, fullFrom: 20000, fullTo: 32000, phaseOutTo: 40000 },
      regionalSurcharge: { name: 'Lombardy', brackets: [[0.0123, 15000], [0.0158, 28000], [0.0172, 50000], [0.0173, INF]] },
      municipalSurcharge: { name: 'Milan', rate: 0.008, exemptUpTo: 23000 }
    },
    socialTax: {
      rate: 0.0919,
      additionalRate: 0.01, additionalFrom: 56224,
      ceiling: 122295
    },
    indirectTax: {
      name: 'VAT (IVA)',
      standardRate: 0.22,
      categories: {
        groceries: { effectiveRate: 0.06, nominalRate: 0.04, confidence: 'med', reason: 'Staples at 4%, much other food at 10%, household goods at 22%.' },
        dining: { effectiveRate: 0.0909, nominalRate: 0.10, confidence: 'high', reason: 'Restaurant services at 10%.' },
        fuel: { effectiveRate: 0.58, nominalRate: null, confidence: 'med', reason: 'Excise (accise) plus VAT as a rough share of the pump price.' },
        shopping: { effectiveRate: 0.1803, nominalRate: 0.22, confidence: 'high', reason: 'Standard 22% rate: 22/122 of a tax-inclusive price.' },
        utilities: { effectiveRate: 0.13, nominalRate: null, confidence: 'med', reason: 'Energy excise plus VAT (10% on household energy); telecoms at 22%.' },
        entertainment: { effectiveRate: 0.1803, nominalRate: 0.22, confidence: 'high', reason: 'Mostly standard-rated.' }
      }
    },
    confidence: { direct_tax: 'medium', social_contributions: 'high', regional_tax: 'not_applicable', indirect_tax: 'medium' },
    assumptions: [
      'Single private-sector employee for the full year with only employment income, first insured after 1995 (contribution ceiling applies).',
      'IRPEF on income after INPS contributions; employee credit (art. 13 TUIR) and the 2026 cuneo fiscale credit for incomes €20,000–€40,000.',
      'Regional surcharge at Lombardy’s rates and municipal surcharge at Milan’s 0.8% (exempt up to €23,000) as a representative locality.'
    ],
    exclusions: [
      'The cuneo fiscale cash bonus for incomes up to €20,000 and the €1,200 trattamento integrativo — so tax under €20,000 is overstated.',
      'Other regions and municipalities (surcharges range roughly from 1.2% to over 4%).',
      'Family credits and deductible expenses (medical, mortgage interest, renovations).'
    ],
    sources: [
      { id: 'ade-irpef', title: 'Aliquote e calcolo dell’Irpef', publisher: 'Agenzia delle Entrate', url: 'https://www.agenziaentrate.gov.it/portale/imposta-sul-reddito-delle-persone-fisiche-irpef-/aliquote-e-calcolo-dell-irpef', covers: '23% to €28,000; 33% to €50,000 (from 2026); 43% above' },
      { id: 'mef-lb-2026', title: 'Principali misure della legge di bilancio 2026', publisher: 'Ministero dell’Economia e delle Finanze', url: 'https://www.mef.gov.it/focus/Principali-misure-della-legge-di-bilancio-2026/', covers: 'Second bracket cut from 35% to 33%' },
      { id: 'ade-circ-2-2026', title: 'Circolare n. 2/E del 24 febbraio 2026', publisher: 'Agenzia delle Entrate', url: 'https://www.agenziaentrate.gov.it/portale/documents/d/guest/circolare-n-2-del-24-febbraio-2026', covers: 'Employee credits and the cuneo fiscale credit (€1,000 for €20,000–€32,000, phasing out to €40,000)' },
      { id: 'inps-circ-6-2026', title: 'INPS circolare n. 6 del 30 gennaio 2026', publisher: 'INPS', url: null, covers: '2026 contribution ceiling €122,295; +1% above €56,224' },
      { id: 'mef-addreg-lombardia', title: 'Addizionale regionale all’IRPEF — Regione Lombardia', publisher: 'MEF — Dipartimento delle Finanze', url: 'https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/addregirpef/addregirpef.php?reg=10', covers: 'Lombardy rates 1.23% / 1.58% / 1.72% / 1.73%' },
      { id: 'milano-addcom', title: 'Addizionale comunale Irpef', publisher: 'Comune di Milano', url: 'https://www.comune.milano.it/en/argomenti/tributi/addizionale-comunale-irpef', covers: '0.8%, exempt up to €23,000' }
    ]
  }
});

export const DEFAULT_YEAR = '2026';
